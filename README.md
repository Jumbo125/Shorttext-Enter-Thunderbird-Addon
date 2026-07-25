# ShortText Enter

> **Hinweis:** Dieses Add-on (Code, Dokumentation und Build-Skripte) wurde mit Unterstützung von KI (Claude Code) erstellt.

ShortText Enter ist eine vollständig lokale Thunderbird-MailExtension. Sie ersetzt im Nachrichtentext einen selbst definierten Kurztext beim Drücken einer wählbaren Enter-Kombination (Enter, Shift+Enter, Strg+Enter oder Alt+Enter) durch den zugehörigen Volltext und fügt anschließend standardmäßig genau einen normalen Zeilenumbruch ein.

Beispiel: Der Kurztext `mfg` mit dem Volltext `Mit freundlichen Grüßen` wird durch `mfg` + Enter eingesetzt. Ohne Treffer verändert oder blockiert das Add-on Enter nicht.

## Voraussetzungen

- Thunderbird 128 oder neuer
- primär für Thunderbird 140 ESR entwickelt
- keine Internetverbindung und keine zusätzliche Laufzeitumgebung erforderlich

Eine maximale Thunderbird-Version ist nicht festgelegt.

## Installation der XPI

1. Thunderbird öffnen.
2. **Add-ons und Themes** öffnen.
3. Das Zahnradmenü öffnen.
4. **Add-on aus Datei installieren** auswählen.
5. Die gebaute Datei `dist/shorttext-enter-<Version>.xpi` auswählen.
6. Die angezeigten Berechtigungen bestätigen.

Nach einer Installation oder Aktualisierung müssen bereits offene Verfassenfenster geschlossen und neu geöffnet werden. Das registrierte Compose-Skript wird automatisch in neu geöffneten Verfassenfenstern geladen.

## Einstellungen und Verwendung

1. Unter **Add-ons und Themes** bei ShortText Enter die **Einstellungen** öffnen.
2. Einen Kurztext ohne Leerzeichen eingeben, zum Beispiel `mfg`.
3. Den gewünschten Volltext eingeben und **Hinzufügen** wählen.
4. Eine neue Nachricht, Antwort oder Weiterleitung öffnen.
5. Im Nachrichtentext `mfg` schreiben und die eingestellte Auslösetaste drücken (standardmäßig die normale Enter-Taste).

Nur das zusammenhängende Token direkt links vom Cursor wird geprüft. Groß-/Kleinschreibung wird standardmäßig ignoriert. Satzzeichen gehören zum Token: `mfg,` trifft deshalb nur auf einen exakt so gespeicherten Kurztext. Steht direkt links vom Cursor ein Leerzeichen, findet keine Ersetzung statt. Deaktivierte Einträge werden ignoriert.

Unter **Verhalten** ist genau eine Auslösetaste aktiv: Enter, Shift+Enter, Strg+Enter oder Alt+Enter (Standard: Enter). Alle jeweils anderen Tastenkombinationen bleiben unverändert; ist beispielsweise Strg+Enter als Auslöser gewählt, bleibt Strg+Enter trotzdem für Thunderbirds Sendefunktion verfügbar, weil die Ersetzung nur bei einem Treffer blockiert. Meta+Enter und Enter während IME-Komposition werden unabhängig von der Auswahl nie abgefangen. Markierter Text wird nicht ersetzt.

Ebenfalls unter **Verhalten** kann festgelegt werden, ob Groß-/Kleinschreibung beachtet und ob nach der Ersetzung der normale Zeilenumbruch eingefügt wird.

## JSON-Import und -Export

**JSON exportieren** lädt `shorttext-enter-backup.json` mit Textbausteinen und Add-on-Einstellungen herunter. E-Mails, Kontodaten und Thunderbird-Profildaten sind nicht enthalten.

Vor **JSON importieren** wird der Importmodus gewählt:

- **Mit vorhandenen Einträgen zusammenführen:** Vorhandene Einträge bleiben erhalten; importierte Duplikate werden übersprungen.
- **Vorhandene Einträge ersetzen:** Nach einer zusätzlichen Bestätigung wird die bestehende Liste vollständig ersetzt.

Die Datei wird vollständig validiert, bevor Daten gespeichert werden. Ungültiges JSON, unbekannte Formatversionen oder ungültige Textbausteine ändern keine vorhandenen Daten. Importierte Inhalte werden weder ausgeführt noch als HTML gerendert.

## Lokale Datenspeicherung und Datenschutz

Gespeichert werden ausschließlich Kurztexte, Volltexte, Aktivstatus, die Einstellungen `caseSensitive`, `appendEnter` und `triggerKey` sowie das Initialisierungskennzeichen. Die Speicherung erfolgt über `browser.storage.local` im lokalen Thunderbird-Profil.

Das Add-on:

- stellt keine Netzwerkverbindung her,
- erfasst keine Nutzungs-, Konto- oder Nachrichtendaten,
- speichert und protokolliert keine E-Mails,
- enthält keine Telemetrie oder Werbung,
- lädt keinen Remote-Code, keine externen Schriften und keine externen Stylesheets.

## Temporäres Laden für die Entwicklung

1. In Thunderbird **Add-ons und Themes** öffnen.
2. Über das Zahnrad **Add-ons debuggen** öffnen.
3. **Temporäres Add-on laden** wählen.
4. `shorttext-enter/manifest.json` auswählen.
5. Neue Verfassenfenster erst nach dem Laden öffnen.

Ein temporär geladenes Add-on wird beim Beenden von Thunderbird entfernt; die Quelldateien bleiben unverändert.

## Build

Die XPI ist ein ZIP-kompatibles Archiv, in dessen Wurzel `manifest.json` liegt. Nur die für den Betrieb nötigen Dateien werden eingepackt: `manifest.json`, `background.js`, `compose/`, `options/` und `icons/`. Entwicklungsdateien wie `tools/`, `tests/`, `README.md`, `CHANGELOG.md`, `LICENSE` und vorhandene Build-Ausgaben werden nicht eingepackt.

### Windows

In PowerShell im Projektordner:

```powershell
.\build.ps1
```

### Linux und macOS

Das Programm `zip` muss vorhanden sein. Im Projektordner:

```sh
chmod +x build.sh
./build.sh
```

Beide Skripte fragen interaktiv nach der Versionsnummer (Eingabetaste ohne Eingabe übernimmt die aktuelle Version aus `manifest.json`), tragen eine geänderte Version in `manifest.json` ein, bereinigen `dist` und erzeugen `dist/shorttext-enter-<Version>.xpi`.

## Technischer Aufbau

- Manifest V3 mit `storage`, `compose` und `scripting`
- idempotente Registrierung von `compose/compose.js` über `browser.scripting.compose.registerScripts()`
- einmaliger Speicher-Cache als `Map`, Aktualisierung über `browser.storage.onChanged`
- lokale DOM-Ersetzung über `Selection`, `Range` und `execCommand`
- sichere Einstellungsoberfläche ohne Inline-Handler oder ungeprüftes `innerHTML`

## Bekannte Einschränkungen

- Unterstützt ausschließlich Klartextbausteine, kein HTML, keine Bilder, Anhänge oder Variablen.
- Ersetzt wird nur bei der eingestellten Auslösetaste und nur das Token unmittelbar links vom Cursor.
- Bereits offene Verfassenfenster erhalten das Compose-Skript nach Installation oder Update nicht rückwirkend.
- Die Rückgängig-Gruppierung hängt vom Editor und Nachrichtenformat Thunderbirds ab; `Strg + Z` ist deshalb manuell zu prüfen.
- Eine signierte Veröffentlichung über addons.thunderbird.net ist nicht Bestandteil dieses lokalen Builds.

Die vollständige manuelle Prüfliste und der dokumentierte Teststatus stehen in `tests/manual-testplan.md`.
