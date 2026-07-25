# Manueller Testplan – ShortText Enter 1.0.0

## Testumgebung und Status

- Datum der lokalen statischen Prüfung: 2026-07-24
- Betriebssystem der Erstellung: Windows
- Thunderbird 140 ESR: **nicht in dieser Arbeitsumgebung verfügbar**
- Thunderbird 153: XPI in einem vollständig isolierten Headless-Testprofil als Version 1.0.0 registriert; `active: true`, `appDisabled: false`
- Interaktive Installation und Editor-Interaktion: **nicht getestet**
- Lokal geprüft: JSON-Syntax und Manifestwerte, PNG-Signaturen/-Abmessungen, unerwünschte Quellmuster, Build-Ausführung, XPI-Archivstruktur und SHA-256

Ein Punkt darf erst nach realer Ausführung in Thunderbird von `[ ]` auf `[x]` gesetzt und um Ergebnis, Thunderbird-Version sowie Datum ergänzt werden. Nicht ausgeführte Thunderbird-Tests sind ausdrücklich als **nicht getestet** zu behandeln.

## Installation

- [ ] XPI kann in Thunderbird 140 ESR installiert werden. **Nicht getestet**
- [ ] Add-on wird ohne Manifestfehler aktiviert. **Thunderbird 140 ESR nicht getestet; in Thunderbird 153 headless aktiv registriert**
- [ ] Einstellungsseite öffnet sich. **Nicht getestet**
- [ ] Neuer Compose-Tab lädt das Skript. **Nicht getestet**
- [ ] Bereits offenes Verfassenfenster wird geschlossen und neu geöffnet. **Nicht getestet**

## Einstellungen

- [ ] Beispieleintrag erscheint nur beim ersten Start.
- [ ] Gelöschter Beispieleintrag erscheint nach Neustart nicht erneut.
- [ ] Eintrag hinzufügen.
- [ ] Eintrag bearbeiten; ID und Aktivstatus bleiben erhalten.
- [ ] Bearbeitung abbrechen.
- [ ] Eintrag nach Bestätigung löschen.
- [ ] Aktiv/Inaktiv wird sofort gespeichert.
- [ ] Suche filtert Kurztext und Volltext, ohne Daten zu ändern.
- [ ] Leerer Kurztext wird abgelehnt.
- [ ] Leerer Volltext wird abgelehnt.
- [ ] Kurztext mit Leerzeichen, Tab oder Zeilenumbruch wird abgelehnt.
- [ ] Duplikat `mfg` und `MFG` wird bei ignorierter Groß-/Kleinschreibung abgelehnt.
- [ ] Mehrzeiliger Volltext wird gespeichert.
- [ ] Helles und dunkles Farbschema sind lesbar.
- [ ] Tab-Reihenfolge und sichtbare Fokusmarkierungen funktionieren.
- [ ] Statusmeldungen werden über `role="status"` ausgegeben.
- [ ] Fehler werden über `role="alert"` ausgegeben.
- [ ] Export erzeugt eine gültige UTF-8-JSON-Datei.
- [ ] Export enthält nur Einstellungen und Textbausteine.
- [ ] Gültiger Import im Modus Zusammenführen funktioniert.
- [ ] Duplikate werden beim Zusammenführen übersprungen.
- [ ] Gültiger Import im Modus Ersetzen funktioniert.
- [ ] Abbruch der Ersetzen-Bestätigung lässt Daten unverändert.
- [ ] Ungültiges JSON wird ohne Teilimport abgelehnt.
- [ ] Falsches Format oder falsche Version wird abgelehnt.
- [ ] Ungültiger Datensatz lässt alle vorhandenen Daten unverändert.
- [ ] Importmeldung nennt importierte, übersprungene und abgelehnte Einträge.

Alle Punkte dieses Abschnitts: **nicht in Thunderbird getestet**.

## E-Mail-Editor

Die folgende Matrix jeweils für neue HTML-E-Mail, neue Reintext-E-Mail, Antwort und Weiterleitung ausführen:

1. [ ] `mfg` + Enter ersetzt korrekt.
2. [ ] `MFG` + Enter ersetzt standardmäßig korrekt.
3. [ ] Unbekanntes Wort + Enter bleibt unverändert; Enter arbeitet normal.
4. [ ] `Vielen Dank mfg` ersetzt nur `mfg`.
5. [ ] Cursor mitten im Text bleibt nach Ersetzung korrekt.
6. [ ] `mfg ` + Enter ersetzt nicht.
7. [ ] `mfg,` + Enter ersetzt ohne exakten Eintrag nicht.
8. [ ] Ein exakt gespeichertes `mfg,` wird ersetzt.
9. [ ] Deaktivierter Eintrag ersetzt nicht.
10. [ ] Bei Auslösetaste „Enter" bleiben Shift+Enter, Strg+Enter und Alt+Enter unverändert; Strg+Enter kann weiterhin senden.
11. [ ] Bei Auslösetaste „Shift+Enter" löst nur Shift+Enter aus; einfaches Enter, Strg+Enter und Alt+Enter bleiben unverändert.
12. [ ] Bei Auslösetaste „Strg+Enter" löst nur Strg+Enter aus; einfaches Enter, Shift+Enter und Alt+Enter bleiben unverändert.
13. [ ] Bei Auslösetaste „Alt+Enter" löst nur Alt+Enter aus; einfaches Enter, Shift+Enter und Strg+Enter bleiben unverändert.
13a. [ ] Meta+Enter bleibt bei jeder Auslösetasteneinstellung unverändert.
13b. [ ] In den Einstellungen ist immer genau eine Auslösetaste ausgewählt; ein Versuch, die aktive Checkbox ohne Auswahl einer anderen abzuwählen, wird rückgängig gemacht.
13c. [ ] Ein Wechsel der Auslösetaste wirkt sich sofort auf bereits offene Verfassenfenster aus.
14. [ ] Markierter Text + Enter wird nicht abgefangen.
15. [ ] Enter während IME-Komposition wird nicht abgefangen.
16. [ ] Signatur bleibt unverändert.
17. [ ] Zitierter Antworttext bleibt unverändert.
18. [ ] Formatierung außerhalb der Cursorstelle bleibt erhalten.
19. [ ] Token über benachbarte Inline-Textknoten wird erkannt.
20. [ ] Eine Block- oder `<br>`-Grenze beendet die rückwärtige Tokensuche.
21. [ ] Mehrzeiliger Volltext wird korrekt als Klartext eingesetzt.
22. [ ] Interne Zeilenumbrüche bleiben erhalten.
23. [ ] Bei aktivem `appendEnter` folgt genau ein zusätzlicher normaler Zeilenumbruch.
24. [ ] Bei inaktivem `appendEnter` folgt kein zusätzlicher Zeilenumbruch.
25. [ ] `Strg + Z` macht die Änderung möglichst als zusammenhängenden Schritt rückgängig.
26. [ ] Zwei gleichzeitig geöffnete Verfassenfenster funktionieren.
27. [ ] Änderungen in den Einstellungen werden in offenen Compose-Fenstern übernommen.
28. [ ] 1.000 aktive Einträge verursachen keine merkbare Verzögerung.
29. [ ] Thunderbird-Neustart behält Daten.
30. [ ] Add-on-Update behält Daten.
31. [ ] Unbekanntes Wort verzögert normales Enter nicht merkbar.
32. [ ] Ein absichtlich provozierter Speicherfehler beschädigt Nachricht und Daten nicht.

Alle Punkte dieses Abschnitts: **nicht getestet, da keine Thunderbird-Testumgebung verfügbar ist**.

## Protokollvorlage

```text
Datum:
Thunderbird-Version:
Betriebssystem:
Nachrichtenformat:
Testnummer:
Ergebnis: Bestanden / Fehlgeschlagen
Beobachtung:
```
