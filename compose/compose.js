(() => {
  "use strict";

  const LISTENER_MARKER = "__shortTextEnterListenerInstalled";
  if (globalThis[LISTENER_MARKER]) {
    return;
  }
  globalThis[LISTENER_MARKER] = true;

  const api = globalThis.browser ?? globalThis.messenger;
  const TRIGGER_KEYS = new Set(["enter", "shiftEnter", "ctrlEnter", "altEnter"]);
  let snippetMap = new Map();
  let caseSensitive = false;
  let appendEnter = true;
  let triggerKey = "enter";
  let cacheReady = false;

  function normalizeKey(value) {
    return caseSensitive ? value : value.toLocaleLowerCase();
  }

  async function rebuildCache() {
    try {
      const stored = await api.storage.local.get(["snippets", "settings"]);
      const snippets = Array.isArray(stored.snippets) ? stored.snippets : [];
      caseSensitive = stored.settings?.caseSensitive === true;
      appendEnter = stored.settings?.appendEnter !== false;
      triggerKey = TRIGGER_KEYS.has(stored.settings?.triggerKey) ? stored.settings.triggerKey : "enter";
      const nextMap = new Map();

      for (const snippet of snippets) {
        if (
          snippet?.enabled === true &&
          typeof snippet.shortcut === "string" &&
          snippet.shortcut.length > 0 &&
          typeof snippet.fullText === "string"
        ) {
          nextMap.set(normalizeKey(snippet.shortcut), snippet.fullText);
        }
      }

      snippetMap = nextMap;
      cacheReady = true;
    } catch (error) {
      cacheReady = false;
      console.error("[ShortText Enter] Textbausteine konnten nicht geladen werden.", error);
    }
  }

  function isEditableElement(element) {
    return element instanceof Element && (
      element.isContentEditable ||
      (element === document.body && document.designMode === "on")
    );
  }

  function findEditingHost(node) {
    let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) {
      return null;
    }
    if (element.closest(
      ".moz-signature, .moz-cite-prefix, blockquote[type='cite'], [contenteditable='false']"
    )) {
      return null;
    }
    if (!element.isContentEditable && document.designMode !== "on") {
      return null;
    }
    while (element.parentElement?.isContentEditable) {
      element = element.parentElement;
    }
    if (isEditableElement(element)) {
      return element;
    }
    if (document.designMode === "on" && document.body.contains(node)) {
      return document.body;
    }
    return null;
  }

  function isLineBoundary(node) {
    if (!(node instanceof Element)) {
      return false;
    }
    if (node.tagName === "BR") {
      return true;
    }
    const display = getComputedStyle(node).display;
    return display === "block" || display === "list-item" || display === "table-cell";
  }

  function rightmostTextPoint(node, editingHost) {
    let current = node;
    if (current !== editingHost && isLineBoundary(current)) {
      return null;
    }
    while (current?.nodeType === Node.ELEMENT_NODE) {
      if (current !== node && isLineBoundary(current)) {
        return null;
      }
      if (current.childNodes.length === 0) {
        return null;
      }
      let child = current.lastChild;
      while (child?.nodeType === Node.TEXT_NODE && child.data.length === 0) {
        child = child.previousSibling;
      }
      if (!child) {
        return null;
      }
      current = child;
      if (current?.nodeType === Node.ELEMENT_NODE && isLineBoundary(current)) {
        return null;
      }
    }
    if (current?.nodeType === Node.TEXT_NODE && current.data.length > 0) {
      return { node: current, offset: current.data.length };
    }
    return null;
  }

  function previousTextPoint(node, offset, editingHost) {
    if (node.nodeType === Node.TEXT_NODE && offset > 0) {
      return { node, offset };
    }

    let current = node;
    let childIndex = offset;
    if (current.nodeType === Node.TEXT_NODE) {
      const parent = current.parentNode;
      if (!parent) {
        return null;
      }
      childIndex = Array.prototype.indexOf.call(parent.childNodes, current);
      current = parent;
    }

    while (current && current !== editingHost) {
      if (childIndex > 0) {
        const candidate = current.childNodes[childIndex - 1];
        return rightmostTextPoint(candidate, editingHost);
      }
      const parent = current.parentNode;
      if (!parent || (current instanceof Element && isLineBoundary(current))) {
        return null;
      }
      childIndex = Array.prototype.indexOf.call(parent.childNodes, current);
      current = parent;
    }

    if (current === editingHost && childIndex > 0) {
      return rightmostTextPoint(current.childNodes[childIndex - 1], editingHost);
    }
    return null;
  }

  function findToken(range, editingHost) {
    let point = { node: range.startContainer, offset: range.startOffset };
    let token = "";
    let start = null;

    while (true) {
      point = previousTextPoint(point.node, point.offset, editingHost);
      if (!point) {
        break;
      }
      const character = point.node.data.charAt(point.offset - 1);
      if (/\s/u.test(character)) {
        break;
      }
      token = character + token;
      start = { node: point.node, offset: point.offset - 1 };
      point = start;
    }

    if (!token || !start) {
      return null;
    }
    return { token, start };
  }

  function replaceSelectionWithText(text) {
    if (document.queryCommandSupported?.("insertText")) {
      return document.execCommand("insertText", false, text);
    }
    return false;
  }

  function insertPlainTextFallback(selection, text) {
    const activeRange = selection.getRangeAt(0);
    activeRange.deleteContents();
    const fragment = document.createDocumentFragment();
    const lines = text.split(/\r\n?|\n/u);
    for (let index = 0; index < lines.length; index += 1) {
      if (index > 0) {
        fragment.append(document.createElement("br"));
      }
      fragment.append(document.createTextNode(lines[index]));
    }
    const lastNode = fragment.lastChild;
    activeRange.insertNode(fragment);
    if (lastNode) {
      activeRange.setStartAfter(lastNode);
      activeRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(activeRange);
    }
  }

  function insertNormalEnter(selection) {
    if (document.execCommand("insertParagraph", false)) {
      return;
    }
    insertPlainTextFallback(selection, "\n");
  }

  function matchesTriggerCombination(event) {
    if (event.key !== "Enter" || event.metaKey || event.isComposing) {
      return false;
    }
    switch (triggerKey) {
      case "shiftEnter":
        return event.shiftKey && !event.ctrlKey && !event.altKey;
      case "ctrlEnter":
        return event.ctrlKey && !event.shiftKey && !event.altKey;
      case "altEnter":
        return event.altKey && !event.ctrlKey && !event.shiftKey;
      default:
        return !event.shiftKey && !event.ctrlKey && !event.altKey;
    }
  }

  function handleKeydown(event) {
    if (!matchesTriggerCombination(event) || !cacheReady) {
      return;
    }

    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount !== 1 || !selection.isCollapsed) {
        return;
      }

      const range = selection.getRangeAt(0);
      const editingHost = findEditingHost(range.startContainer);
      if (!editingHost || !editingHost.contains(range.startContainer)) {
        return;
      }

      const tokenInfo = findToken(range, editingHost);
      if (!tokenInfo) {
        return;
      }

      const fullText = snippetMap.get(normalizeKey(tokenInfo.token));
      if (fullText === undefined) {
        return;
      }

      const replacementRange = document.createRange();
      replacementRange.setStart(tokenInfo.start.node, tokenInfo.start.offset);
      replacementRange.setEnd(range.startContainer, range.startOffset);

      event.preventDefault();
      event.stopPropagation();
      selection.removeAllRanges();
      selection.addRange(replacementRange);

      if (!replaceSelectionWithText(fullText)) {
        insertPlainTextFallback(selection, fullText);
      }
      if (appendEnter) {
        insertNormalEnter(selection);
      }
    } catch (error) {
      console.error("[ShortText Enter] Ersetzung fehlgeschlagen.", error);
    }
  }

  function handleStorageChange(changes, areaName) {
    if (areaName === "local" && (changes.snippets || changes.settings)) {
      void rebuildCache();
    }
  }

  function cleanup() {
    document.removeEventListener("keydown", handleKeydown, true);
    api.storage.onChanged.removeListener(handleStorageChange);
    globalThis[LISTENER_MARKER] = false;
  }

  document.addEventListener("keydown", handleKeydown, true);
  api.storage.onChanged.addListener(handleStorageChange);
  window.addEventListener("unload", cleanup, { once: true });
  void rebuildCache();
})();
