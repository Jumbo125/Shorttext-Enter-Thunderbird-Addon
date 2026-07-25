"use strict";

const api = globalThis.browser ?? globalThis.messenger;
const SCRIPT_ID = "shorttext-enter-compose";
const TRIGGER_KEYS = Object.freeze(["enter", "shiftEnter", "ctrlEnter", "altEnter"]);
const DEFAULT_SETTINGS = Object.freeze({
  caseSensitive: false,
  appendEnter: true,
  triggerKey: "enter"
});

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

async function initializeStorage() {
  try {
    const stored = await api.storage.local.get(["initialized", "snippets", "settings"]);
    if (stored.initialized === true) {
      const patch = {};
      if (!Array.isArray(stored.snippets)) {
        patch.snippets = [];
      }
      if (!stored.settings || typeof stored.settings !== "object") {
        patch.settings = { ...DEFAULT_SETTINGS };
      } else {
        const settings = {
          caseSensitive: stored.settings.caseSensitive === true,
          appendEnter: stored.settings.appendEnter !== false,
          triggerKey: TRIGGER_KEYS.includes(stored.settings.triggerKey)
            ? stored.settings.triggerKey
            : DEFAULT_SETTINGS.triggerKey
        };
        if (
          settings.caseSensitive !== stored.settings.caseSensitive ||
          settings.appendEnter !== stored.settings.appendEnter ||
          settings.triggerKey !== stored.settings.triggerKey
        ) {
          patch.settings = settings;
        }
      }
      if (Object.keys(patch).length > 0) {
        await api.storage.local.set(patch);
      }
      return;
    }

    await api.storage.local.set({
      initialized: true,
      snippets: [{
        id: createId(),
        shortcut: "mfg",
        fullText: "Mit freundlichen Grüßen",
        enabled: true
      }],
      settings: { ...DEFAULT_SETTINGS }
    });
  } catch (error) {
    console.error("[ShortText Enter] Initialisierung des lokalen Speichers fehlgeschlagen.", error);
  }
}

async function registerComposeScript() {
  try {
    const registered = await api.scripting.compose.getRegisteredScripts({
      ids: [SCRIPT_ID]
    });
    if (registered.some((script) => script.id === SCRIPT_ID)) {
      return;
    }
    await api.scripting.compose.registerScripts([{
      id: SCRIPT_ID,
      js: ["compose/compose.js"],
      runAt: "document_idle"
    }]);
  } catch (error) {
    console.error("[ShortText Enter] Registrierung des Compose-Skripts fehlgeschlagen.", error);
  }
}

async function start() {
  await initializeStorage();
  await registerComposeScript();
}

void start();
