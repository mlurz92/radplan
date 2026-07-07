# AGENT.md — Entwicklungsrichtlinien für KI-Codierungssysteme in RadPlan

> Diese Datei richtet sich an alle agentischen KI-Codierer (wie Claude, Gemini oder andere AI Agents), die Modifikationen, Erweiterungen oder Fehlerbehebungen an der RadPlan-Codebasis vornehmen. Sie definiert die verbindlichen Architekturregeln, Programmierrichtlinien und Verifikationsprozesse, die eingehalten werden müssen, um die Code-Integrität und Stabilität der Anwendung zu wahren.

---

## 1. Kern-Charakteristika & Restriktionen

RadPlan ist eine **Single-Page-Application (SPA) ohne Build-Pipeline**. 
* **Keine Bundler/Transpiler:** Es dürfen keine webpack-, Vite-, esbuild-, Babel- oder sonstige Build-Schritte für die Laufzeit hinzugefügt oder vorausgesetzt werden. Der Code muss direkt im Browser lauffähig sein.
* **Reines ECMAScript-Module (ESM):** Alle JavaScript-Dateien werden über `<script type="module">` geladen.
  * **Pflicht:** Bei jedem `import`-Statement muss die Dateiendung `.js` explizit angegeben werden (z. B. `import { state } from "./state.js";` statt `./state`).
* **Verwendung externer Bibliotheken:** Zusätzliche Bibliotheken dürfen **nur per CDN** am Ende der `index.html` eingebunden werden. Lokale Kopien in `node_modules` dienen ausschließlich Entwicklungs- und Testzwecken und werden nicht mit deployed.
* **Design-System & CSS:**
  * RadPlan nutzt reines CSS3 ohne Präprozessoren (kein SASS/LESS) und ohne Utility-Frameworks (kein TailwindCSS).
  * Verwende konsequent das semantische Token-System aus [css/core.css](file:///c:/Users/marku/Desktop/radplan-main/css/core.css). Ad-hoc-Farbwerte, feste Schatten oder eigene Radien im CSS sind untersagt.
  * Verwende für Animationen die Dauer- und Easing-Variablen aus `core.css` (`--dur-2`, `--ease-spring` etc.).

---

## 2. Architektur & Zustandsmanagement

### 2.1 Datenfluss & Speicher-Muster
* Der Zustand der Pläne wird global im Objekt `DATA` in [js/state.js](file:///c:/Users/marku/Desktop/radplan-main/js/state.js) verwaltet.
* **Offline-First:** Jede Änderung wird über `saveToStorage()` lokal im `localStorage` gesichert und zeitverzögert (debounced um 260 ms) per API an den KV-Speicher synchronisiert.
* **Optimistische Nebenläufigkeit:** Bei 409-Konflikten wird die Funktion `mergeThreeWay()` ausgeführt. Änderungen an dieser Logik müssen zwingend die entsprechenden Unittests bestehen.

### 2.2 Zellspezifische Datenbereinigung
* Um die Speicherlast und Datenintegrität zu wahren, dürfen leere Zellen keine Fragmente in der JSON-Struktur hinterlassen. Jede Änderung muss die Zelle bereinigen:
  ```js
  // Muster zur Bereinigung leerer Zellen in assignments
  if (Object.keys(cellData).length === 0) {
    delete md.assignments[emp][day];
  }
  ```
* Wird ein Mitarbeiter aus dem Plan gelöscht (`removeEmployee()`), müssen auch alle dessen Kommentare aus `md.comments` entfernt werden.

### 2.3 UI-Updates & DOM-Handling
* **Kein Full-Rerender:** Beim Editieren einer Zelle darf niemals die gesamte Tabelle neu gerendert werden. Verwende stattdessen:
  * `updateGridCell(emp, day)` für gezielte Zell-Updates.
  * `updateGridStatsAndHeader(touchedDays)` für das Aktualisieren der betroffenen Tages-Indikatoren und der Statistikleiste.

---

## 3. Der Neural Scheduler (Auto-Plan)

* Die Scheduling-Logik liegt in [js/autoplan.js](file:///c:/Users/marku/Desktop/radplan-main/js/autoplan.js). Sie berechnet den Dienstplan anhand des *Neural Fitness Index (NFI)*.
* **Harte Constraints (K.-o.-Kriterien):**
  * Nach einem Bereitschaftsdienst (`D`) folgt am Folgetag zwingend dienstfrei (`F`).
  * Facharzt-Qualifikation für Wochenend-BD und alle Hintergrunddienste (`HG`).
* **Sonderregeln (`SPECIAL_RULES`):**
  * Versuche niemals, Regeln aus `SPECIAL_RULES` direkt im Code hart zu prüfen. Nutze ausschließlich die in [js/constants.js](file:///c:/Users/marku/Desktop/radplan-main/js/constants.js) deklarierten Getter-Funktionen (`getReducedBdTarget`, `isNoBdWeekday` etc.).

---

## 4. Sicherheits- & Lifecycle-Schranken (Verbindlich)

* **Autoplan-Mutex:** Während der Berechnung (`state.isAutoplanRunning === true`) müssen sämtliche Tastenkombinationen, Klick-Events auf Gitterzellen, Undo/Redo-Aktionen sowie das Schließen des Berechnungs-Overlays unterbunden werden.
* **Popover-Lifecycle:** Beim Öffnen und Schließen von Gitter-Popovers müssen alle im DOM befindlichen Popover-Elemente (`.cell-quick-popover`) synchron gesucht, deren Animationen gestoppt, Timeouts gelöscht und die Knoten entfernt werden. Dies verhindert flackernde Race-Conditions.
* **CSV-Encoding:** Alle neuen CSV-Exporte müssen mit dem UTF-8 Byte Order Mark (`\uFEFF`) eingeleitet werden, damit Umlaute in Microsoft Excel korrekt dargestellt werden.

---

## 5. Typsicherheit & Code-Qualität

RadPlan nutzt TypeScript zur statischen Code-Analyse, obwohl es reiner JavaScript-Code ist.
* **Typdefinitionen:** Alle Typen sind in [js/types.js](file:///c:/Users/marku/Desktop/radplan-main/js/types.js) mittels JSDoc-Kommentaren definiert.
* **JSDoc-Kastration:** Wenn dynamische Eigenschaften an DOM-Elemente gehängt werden, müssen diese zur Typsicherung per JSDoc gecastet werden:
  ```javascript
  /** @type {HTMLElement & { _removeTimerId?: number }} */
  const el = (anchorEl);
  ```

---

## 6. Verifikations-Pipeline (Vor jedem Commit ausführen!)

Jede Änderung muss lokal die vollständige Verifikations-Pipeline durchlaufen. 

```bash
# 1. Testsuite ausführen (156 Tests, prüft Engine, Scheduler & State-Merge)
npm test

# 2. Statische Typanalyse ausführen (Darf keine Fehler melden)
npm run typecheck

# 3. Linter ausführen (ESLint auf Code-Styling prüfen)
npm run lint

# 4. Code-Formatierung vereinheitlichen (Prettier)
npm run format
```

> **Achtung bei Unittests:** Während der Testsuite meldet die Konsole eventuell `forceSyncWithServer Network/Parse Error: [TypeError: Failed to parse URL...]`. Dies ist ein normales Verhalten in der Node.js-Testumgebung (da relative HTTP-Pfade in Node ohne Base-URL nicht nativ aufgelöst werden) und wird vom State-Manager korrekt abgefangen. Es stellt keinen Testfehler dar.

---

## 7. Dateireferenz für Erweiterungen

* **Zell-Interaktionen:** Änderungen am Zuweisungs-Gitter müssen in [js/render-grid.js](file:///c:/Users/marku/Desktop/radplan-main/js/render-grid.js) und [js/quick-actions.js](file:///c:/Users/marku/Desktop/radplan-main/js/quick-actions.js) erfolgen.
* **Auswertungen:** Neue Analysen oder Diagramme müssen in die modularisierte Struktur unter [js/analytics/](file:///c:/Users/marku/Desktop/radplan-main/js/analytics/) integriert und in [js/analytics/engine.js](file:///c:/Users/marku/Desktop/radplan-main/js/analytics/engine.js) registriert werden.
* **Druck/Export:** Anpassungen an der Druckvorschau oder dem PDF-Export gehören in [js/printpreview.js](file:///c:/Users/marku/Desktop/radplan-main/js/printpreview.js) und [css/print.css](file:///c:/Users/marku/Desktop/radplan-main/css/print.css).
