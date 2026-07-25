"use strict";

const api = globalThis.browser ?? globalThis.messenger;
const TRIGGER_KEYS = Object.freeze(["enter", "shiftEnter", "ctrlEnter", "altEnter"]);
const DEFAULT_SETTINGS = Object.freeze({
  caseSensitive: false,
  appendEnter: true,
  triggerKey: "enter"
});

const elements = {
  form: document.querySelector("#snippet-form"),
  shortcut: document.querySelector("#shortcut"),
  fullText: document.querySelector("#full-text"),
  saveButton: document.querySelector("#save-button"),
  cancelButton: document.querySelector("#cancel-button"),
  search: document.querySelector("#search"),
  list: document.querySelector("#snippet-list"),
  emptyState: document.querySelector("#empty-state"),
  caseSensitive: document.querySelector("#case-sensitive"),
  appendEnter: document.querySelector("#append-enter"),
  triggerKeyInputs: Array.from(document.querySelectorAll("input[name='trigger-key']")),
  exportButton: document.querySelector("#export-button"),
  importButton: document.querySelector("#import-button"),
  importFile: document.querySelector("#import-file"),
  importMode: document.querySelector("#import-mode"),
  status: document.querySelector("#status"),
  error: document.querySelector("#error")
};

let snippets = [];
let settings = { ...DEFAULT_SETTINGS };
let editingId = null;

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

function showStatus(message) {
  elements.error.hidden = true;
  elements.status.textContent = message;
  elements.status.hidden = false;
}

function showError(message) {
  elements.status.hidden = true;
  elements.error.textContent = message;
  elements.error.hidden = false;
}

function normalizeShortcut(shortcut, selectedSettings = settings) {
  return selectedSettings.caseSensitive ? shortcut : shortcut.toLocaleLowerCase();
}

function validateSnippet(candidate, excludedId = null, collection = snippets, selectedSettings = settings) {
  const shortcut = typeof candidate.shortcut === "string" ? candidate.shortcut.trim() : "";
  const fullText = typeof candidate.fullText === "string" ? candidate.fullText : "";
  if (!shortcut) {
    throw new Error("Der Kurztext darf nicht leer sein.");
  }
  if (/\s/u.test(shortcut)) {
    throw new Error("Der Kurztext darf keine Leerzeichen, Tabulatoren oder Zeilenumbrüche enthalten.");
  }
  if (!fullText.trim()) {
    throw new Error("Der Volltext darf nicht leer sein.");
  }
  const normalized = normalizeShortcut(shortcut, selectedSettings);
  const duplicate = collection.some((snippet) => (
    snippet.id !== excludedId &&
    normalizeShortcut(snippet.shortcut, selectedSettings) === normalized
  ));
  if (duplicate) {
    throw new Error(`Der Kurztext „${shortcut}“ ist bereits vorhanden.`);
  }
  return { shortcut, fullText };
}

async function saveSnippets(nextSnippets) {
  await api.storage.local.set({ snippets: nextSnippets });
  snippets = nextSnippets;
}

async function saveSettings(nextSettings) {
  await api.storage.local.set({ settings: nextSettings });
  settings = nextSettings;
}

function createButton(label, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (className) {
    button.className = className;
  }
  button.addEventListener("click", handler);
  return button;
}

function renderList() {
  elements.list.replaceChildren();
  const query = elements.search.value.trim().toLocaleLowerCase();
  const filtered = snippets.filter((snippet) => (
    !query ||
    snippet.shortcut.toLocaleLowerCase().includes(query) ||
    snippet.fullText.toLocaleLowerCase().includes(query)
  ));

  for (const snippet of filtered) {
    const row = document.createElement("tr");
    const shortcutCell = document.createElement("td");
    shortcutCell.className = "shortcut-cell";
    shortcutCell.textContent = snippet.shortcut;

    const fullTextCell = document.createElement("td");
    const preview = document.createElement("div");
    preview.className = "preview";
    preview.textContent = snippet.fullText.replace(/\r\n?|\n/gu, " ↵ ");
    preview.title = snippet.fullText;
    fullTextCell.append(preview);

    const enabledCell = document.createElement("td");
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.className = "enabled-toggle";
    enabled.checked = snippet.enabled === true;
    enabled.setAttribute("aria-label", `Kurztext ${snippet.shortcut} aktivieren`);
    enabled.addEventListener("change", async () => {
      try {
        const next = snippets.map((item) => (
          item.id === snippet.id ? { ...item, enabled: enabled.checked } : item
        ));
        await saveSnippets(next);
        showStatus(`„${snippet.shortcut}“ ist jetzt ${enabled.checked ? "aktiv" : "inaktiv"}.`);
      } catch (error) {
        enabled.checked = !enabled.checked;
        console.error("[ShortText Enter] Aktivstatus konnte nicht gespeichert werden.", error);
        showError("Der Aktivstatus konnte nicht gespeichert werden. Vorhandene Daten blieben unverändert.");
      }
    });
    enabledCell.append(enabled);

    const actionCell = document.createElement("td");
    actionCell.className = "actions";
    actionCell.append(
      createButton("Bearbeiten", "", () => startEditing(snippet.id)),
      createButton("Löschen", "danger", () => void deleteSnippet(snippet.id))
    );
    row.append(shortcutCell, fullTextCell, enabledCell, actionCell);
    elements.list.append(row);
  }
  elements.emptyState.hidden = filtered.length !== 0;
}

function startEditing(id) {
  const snippet = snippets.find((item) => item.id === id);
  if (!snippet) {
    return;
  }
  editingId = id;
  elements.shortcut.value = snippet.shortcut;
  elements.fullText.value = snippet.fullText;
  elements.saveButton.textContent = "Änderungen speichern";
  elements.cancelButton.hidden = false;
  elements.shortcut.focus();
  elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEditing() {
  editingId = null;
  elements.form.reset();
  elements.saveButton.textContent = "Hinzufügen";
  elements.cancelButton.hidden = true;
}

async function deleteSnippet(id) {
  const snippet = snippets.find((item) => item.id === id);
  if (!snippet || !confirm(`Soll der Kurztext „${snippet.shortcut}“ wirklich gelöscht werden?`)) {
    return;
  }
  try {
    const next = snippets.filter((item) => item.id !== id);
    await saveSnippets(next);
    if (editingId === id) {
      cancelEditing();
    }
    renderList();
    showStatus(`Der Kurztext „${snippet.shortcut}“ wurde gelöscht.`);
  } catch (error) {
    console.error("[ShortText Enter] Löschen fehlgeschlagen.", error);
    showError("Der Textbaustein konnte nicht gelöscht werden. Vorhandene Daten blieben unverändert.");
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  let values;
  try {
    values = validateSnippet({
      shortcut: elements.shortcut.value,
      fullText: elements.fullText.value
    }, editingId);
  } catch (error) {
    showError(error instanceof Error ? error.message : "Die Eingaben sind ungültig.");
    return;
  }

  try {
    let next;
    let message;
    if (editingId) {
      next = snippets.map((snippet) => (
        snippet.id === editingId ? { ...snippet, ...values } : snippet
      ));
      message = `Der Kurztext „${values.shortcut}“ wurde aktualisiert.`;
    } else {
      next = [...snippets, {
        id: createId(),
        ...values,
        enabled: true
      }];
      message = `Der Kurztext „${values.shortcut}“ wurde hinzugefügt.`;
    }

    await saveSnippets(next);
    cancelEditing();
    renderList();
    showStatus(message);
  } catch (error) {
    console.error("[ShortText Enter] Speichern fehlgeschlagen.", error);
    showError("Der Textbaustein konnte nicht gespeichert werden. Vorhandene Daten blieben unverändert.");
  }
}

function applyTriggerKeySelection(triggerKey) {
  for (const input of elements.triggerKeyInputs) {
    input.checked = input.value === triggerKey;
  }
}

function handleTriggerKeyChange(changedInput) {
  if (!changedInput.checked) {
    // Genau eine Auslösetaste muss aktiv bleiben; ein Abwählen ohne
    // Auswahl einer anderen Kombination wird rückgängig gemacht.
    changedInput.checked = true;
    return;
  }
  applyTriggerKeySelection(changedInput.value);
  void handleSettingsChange();
}

async function handleSettingsChange() {
  const selectedTrigger = elements.triggerKeyInputs.find((input) => input.checked);
  const next = {
    caseSensitive: elements.caseSensitive.checked,
    appendEnter: elements.appendEnter.checked,
    triggerKey: selectedTrigger ? selectedTrigger.value : DEFAULT_SETTINGS.triggerKey
  };
  try {
    if (next.caseSensitive === false) {
      const seen = new Set();
      for (const snippet of snippets) {
        const key = snippet.shortcut.toLocaleLowerCase();
        if (seen.has(key)) {
          throw new Error("Groß-/Kleinschreibung kann nicht ignoriert werden, solange dadurch doppelte Kurztexte entstehen.");
        }
        seen.add(key);
      }
    }
    await saveSettings(next);
    showStatus("Die Einstellungen wurden gespeichert.");
  } catch (error) {
    elements.caseSensitive.checked = settings.caseSensitive;
    elements.appendEnter.checked = settings.appendEnter;
    applyTriggerKeySelection(settings.triggerKey);
    console.error("[ShortText Enter] Einstellungen konnten nicht gespeichert werden.", error);
    showError(error instanceof Error ? error.message : "Die Einstellungen konnten nicht gespeichert werden.");
  }
}

function exportBackup() {
  try {
    const backup = {
      format: "shorttext-enter",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: { ...settings },
      snippets: snippets.map(({ id, shortcut, fullText, enabled }) => ({
        id,
        shortcut,
        fullText,
        enabled
      }))
    };
    const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shorttext-enter-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showStatus(`${snippets.length} Textbaustein(e) wurden exportiert.`);
  } catch (error) {
    console.error("[ShortText Enter] Export fehlgeschlagen.", error);
    showError("Die JSON-Sicherung konnte nicht erstellt werden.");
  }
}

function validateImport(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Die Datei enthält kein gültiges Sicherungsobjekt.");
  }
  if (data.format !== "shorttext-enter" || data.version !== 1) {
    throw new Error("Format oder Version der Sicherungsdatei wird nicht unterstützt.");
  }
  if (
    !data.settings ||
    typeof data.settings.caseSensitive !== "boolean" ||
    typeof data.settings.appendEnter !== "boolean" ||
    (data.settings.triggerKey !== undefined && !TRIGGER_KEYS.includes(data.settings.triggerKey))
  ) {
    throw new Error("Die Einstellungen in der Sicherungsdatei sind ungültig.");
  }
  if (!Array.isArray(data.snippets)) {
    throw new Error("Die Textbausteinliste in der Sicherungsdatei fehlt.");
  }

  const importedSettings = {
    caseSensitive: data.settings.caseSensitive,
    appendEnter: data.settings.appendEnter,
    triggerKey: TRIGGER_KEYS.includes(data.settings.triggerKey)
      ? data.settings.triggerKey
      : DEFAULT_SETTINGS.triggerKey
  };
  const validated = [];
  const importedIds = new Set();
  for (const [index, candidate] of data.snippets.entries()) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      typeof candidate.id !== "string" ||
      candidate.id.trim() === "" ||
      typeof candidate.enabled !== "boolean"
    ) {
      throw new Error(`Textbaustein ${index + 1} besitzt ungültige Pflichtfelder.`);
    }
    if (importedIds.has(candidate.id)) {
      throw new Error(`Textbaustein ${index + 1} verwendet eine doppelte ID.`);
    }
    const values = validateSnippet(candidate, null, validated, importedSettings);
    validated.push({
      id: candidate.id,
      ...values,
      enabled: candidate.enabled
    });
    importedIds.add(candidate.id);
  }
  return { settings: importedSettings, snippets: validated };
}

async function importBackup(file) {
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch (error) {
    console.error("[ShortText Enter] Importdatei ist kein gültiges JSON.", error);
    showError("Die ausgewählte Datei ist keine gültige JSON-Datei. Es wurden keine Daten geändert.");
    return;
  }

  let imported;
  try {
    imported = validateImport(parsed);
  } catch (error) {
    console.error("[ShortText Enter] Importvalidierung fehlgeschlagen.", error);
    showError(`${error instanceof Error ? error.message : "Ungültige Sicherungsdatei"} Es wurden keine Daten geändert.`);
    return;
  }

  const mode = elements.importMode.value;
  if (
    mode === "replace" &&
    !confirm("Sollen alle vorhandenen Textbausteine durch die Einträge aus der Sicherung ersetzt werden?")
  ) {
    showStatus("Der Import wurde abgebrochen.");
    return;
  }

  let nextSnippets;
  let importedCount;
  let skippedCount = 0;
  if (mode === "replace") {
    nextSnippets = imported.snippets;
    importedCount = imported.snippets.length;
  } else {
    nextSnippets = [...snippets];
    const existingKeys = snippets.map((snippet) => normalizeShortcut(snippet.shortcut, imported.settings));
    const keys = new Set(existingKeys);
    if (keys.size !== existingKeys.length) {
      showError("Der Import würde durch die importierte Groß-/Kleinschreibung bestehende Kurztexte zu Duplikaten machen. Es wurden keine Daten geändert.");
      return;
    }
    importedCount = 0;
    for (const snippet of imported.snippets) {
      const key = normalizeShortcut(snippet.shortcut, imported.settings);
      if (keys.has(key)) {
        skippedCount += 1;
        continue;
      }
      const uniqueId = nextSnippets.some((item) => item.id === snippet.id) ? createId() : snippet.id;
      nextSnippets.push({ ...snippet, id: uniqueId });
      keys.add(key);
      importedCount += 1;
    }
  }

  try {
    await api.storage.local.set({
      snippets: nextSnippets,
      settings: imported.settings
    });
    snippets = nextSnippets;
    settings = imported.settings;
    cancelEditing();
    elements.caseSensitive.checked = settings.caseSensitive;
    elements.appendEnter.checked = settings.appendEnter;
    applyTriggerKeySelection(settings.triggerKey);
    renderList();
    showStatus(`Import abgeschlossen: ${importedCount} importiert, ${skippedCount} übersprungen, 0 abgelehnt.`);
  } catch (error) {
    console.error("[ShortText Enter] Import konnte nicht gespeichert werden.", error);
    showError(`Import fehlgeschlagen: 0 importiert, 0 übersprungen, ${imported.snippets.length} abgelehnt. Vorhandene Daten blieben unverändert.`);
  }
}

async function loadData() {
  try {
    const stored = await api.storage.local.get(["initialized", "snippets", "settings"]);
    snippets = Array.isArray(stored.snippets) ? stored.snippets : [];
    settings = {
      caseSensitive: stored.settings?.caseSensitive === true,
      appendEnter: stored.settings?.appendEnter !== false,
      triggerKey: TRIGGER_KEYS.includes(stored.settings?.triggerKey)
        ? stored.settings.triggerKey
        : DEFAULT_SETTINGS.triggerKey
    };
    elements.caseSensitive.checked = settings.caseSensitive;
    elements.appendEnter.checked = settings.appendEnter;
    applyTriggerKeySelection(settings.triggerKey);
    renderList();
  } catch (error) {
    console.error("[ShortText Enter] Einstellungen konnten nicht geladen werden.", error);
    showError("Die gespeicherten Daten konnten nicht geladen werden.");
  }
}

elements.form.addEventListener("submit", (event) => void handleSubmit(event));
elements.cancelButton.addEventListener("click", cancelEditing);
elements.search.addEventListener("input", renderList);
elements.caseSensitive.addEventListener("change", () => void handleSettingsChange());
elements.appendEnter.addEventListener("change", () => void handleSettingsChange());
for (const input of elements.triggerKeyInputs) {
  input.addEventListener("change", () => handleTriggerKeyChange(input));
}
elements.exportButton.addEventListener("click", exportBackup);
elements.importButton.addEventListener("click", () => elements.importFile.click());
elements.importFile.addEventListener("change", () => {
  const [file] = elements.importFile.files;
  elements.importFile.value = "";
  if (file) {
    void importBackup(file);
  }
});

void loadData();
