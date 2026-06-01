Hier ist die extrem detaillierte, vollständig tiefgreifende und strukturierte `README.md` für **RadPlan**, die exakt auf dem aktuellen Code-Stand basiert und jeden noch so kleinen Aspekt der Architektur, der UI/UX-Designsprache und der Domänenlogik beleuchtet.

---

# ☢️ RadPlan — Systemarchitektur & Vollständige Dokumentation

**RadPlan** ist eine hochmoderne, vollständig responsive und intelligente Web-Applikation zur digitalen Dienstplanung in der Klinik für Radiologie & Nuklearmedizin. Sie vereint ein exzellentes, auf Usability getrimmtes UI (Glassmorphism, Dark Mode) mit einem extrem leistungsstarken algorithmischen Backend (**RadPlan Neural Scheduler**), um Dienstpläne fair, regelkonform und automatisiert zu erstellen.

Die Architektur basiert auf modernem **Vanilla JavaScript (ES6 Modules)**, verzichtet auf schwerfällige Frameworks und erreicht dadurch eine rasante Performance und Zero-Lag-Interaktionen.

---

## 1. 🎨 UI, UX & Design-Philosophie

Die Benutzeroberfläche von RadPlan ist so gestaltet, dass sie auf großen Desktop-Monitoren maximale Übersicht bietet, auf mobilen Geräten (Smartphones, Tablets) aber zu einer App-nativen Erfahrung transformiert wird.

### 1.1 Visuelle Identität (Glassmorphism & Deep Dark Mode)

* **Farbpalette:** Die Anwendung nutzt ein tiefes "Navy"-Farbschema (`--navy-900` bis `--navy-400`) als Hintergrund, gepaart mit einem dynamischen Hintergrund-Gradienten (Mesh-Gradient mit dezenten Akzenten in Cyan und Indigo).
* **Materialien:** Nahezu alle UI-Elemente (Header, Modals, Flyouts) nutzen **Glassmorphism** (`backdrop-filter: blur(16px)` bis `24px` und transparente weiße/dunkle Layer mit zarten Rändern). Dies verleiht der App räumliche Tiefe und Eleganz.
* **Typografie:** Die App verwendet **IBM Plex Sans** für weiche, gut lesbare Texte und **IBM Plex Mono** für Daten, Arbeitsplatz-Codes, Metriken und Tabellen (ermöglicht perfekte vertikale Ausrichtung durch Tabular Nums).
* **Farbcodierung (Tags & Badges):** * Arbeitsplätze und Status haben strikt zugeordnete, konsistente Farben (z.B. `MR` in Blau (`#DBEAFE`), `CT` in Orange (`#FFEDD5`), Urlaub `U` in Violett, Krank `K` in Rot).
* Bereitschaftsdienst (`D`) ist immer in Warn-Rot (`#EF4444`) und Hintergrunddienst (`HG`) in Hellblau (`#0EA5E9`) gehalten.



### 1.2 UX-Mikrointeraktionen & "Der perfekte Touch"

* **Feedback & Animationen:** Jeder Klick, jede Hover-Aktion und jede Modal-Öffnung ist durch GSAP oder flüssige CSS-Transitions (`cubic-bezier(0.34, 1.2, 0.64, 1)`) animiert. Buttons skalieren bei Klick ("Active-State", `scale(0.96)`).
* **Kontextmenü (Right-Click):** Ein völlig custom-gebautes Kontextmenü (`contextmenu.js`) überschreibt den Standard-Rechtsklick auf Mitarbeiternamen in der Tabelle. Es erscheint animiert direkt am Mauszeiger und bietet Shortcuts zum Öffnen des Profils oder zum Löschen des Mitarbeiters.
* **Toast-Notifications:** Ein schwebendes Feedback-System (unten rechts auf Desktop, mittig über der Nav-Bar auf Mobile), das Aktionen (Speichern, Löschen, Server-Sync) mit feinen Einblendungs-Animationen quittiert.
* **Hover-States der Tabelle:** Hovert man über eine Tabellenzeile, ändert sich die Hintergrundfarbe subtil, der linke Rand-Indikator leuchtet stärker auf, und das Mitarbeiter-Profil-Icon wird sanft eingeblendet.
* **Grid Keyboard Navigation:** Eine unsichtbare Power-User-Funktion. Mit Pfeiltasten kann im Grid navigiert werden. Drückt man Ziffern `1-8`, wird sofort ein Arbeitsplatz zugeteilt, `D`/`H` toggeln die Dienste, `Entf` löscht die Zelle. Eine kleine Hint-Bar unten (`#grid-kbd-hint`) zeigt dies elegant an.

### 1.3 Responsives Verhalten & Mobile App-Feeling

* Die Applikation registriert die Viewport-Breite (Breakpoint bei `600px`).
* **Mobile Switch:** Unter 600px verschwindet die komplexe Grid-Tabelle vollständig. Stattdessen wird eine vertikale, kartenbasierte scrollbare Liste (`mobile-day-list`) gerendert.
* **Bottom Navigation:** Eine native App-ähnliche Bottom-Bar (Mitarbeitende, Planung, Menü) ersetzt den Top-Header-Aktionsbereich. Die CSS-Variable `--safe-bottom` (`env(safe-area-inset-bottom)`) sorgt dafür, dass auf iPhones keine Überlappung mit der Home-Indikator-Linie stattfindet.
* **Mobile Sheet Modals:** Auf Mobile öffnen sich Modals (z.B. Tagesdetails) von unten als "Bottom Sheets" mit abgerundeten oberen Ecken und Slide-Up-Animation.

---

## 2. 🧠 RadPlan Neural Scheduler (AutoPlan-Algorithmus)

Das absolute Herzstück der Anwendung, lokalisiert in `autoplan.js`. Dieser Algorithmus teilt die Dienste (`D` und `HG`) automatisch für einen ganzen Monat ein. Er ist kein simples Randomisierungs-Skript, sondern ein hochkomplexer, Constraint-basierter heuristischer Solver.

### 2.1 Constraint-Analyse & Metadaten

Der Algorithmus lädt zunächst alle historischen Daten des aktuellen Jahres (`collectHistoricalDutyStats`), um die bisherige Arbeitslast (Werktags-Dienste, Samstags-Dienste, Feiertagsdienste) jedes Arztes exakt zu kennen.

* **Harte Constraints (Penaltys = -Infinity):**
* Ist der Arzt an dem Tag im Urlaub/Krank/Abwesend?
* Hat der Arzt bereits Dienste an den direkten Vor- oder Folgetagen?
* Regelverletzungen: Ein AA darf keinen Samstag-BD machen. Ein "befreiter" Arzt (`DUTY_EXEMPT`) macht gar keine Dienste.
* Spezifische Konflikte: *Mammographie-Konflikt* (Bestimmte Oberärztin darf keinen HG machen, wenn spezifische AAs BD haben). *CT-Leadership-Konflikt* (Dr. Becker / Dr. Martin dürfen sich nicht überschneiden).


* **Weiche Constraints (Scoring-System):**
* Dienst-Wünsche (`BD_WISH`, `HG_WISH`) geben massive Pluspunkte.
* Streuung (Jeder sollte exakt seine "Target"-Anzahl an Diensten bekommen).
* Wochenend-Limit (Normalerweise 1 Wochenende pro Monat, wird bestraft, wenn überschritten).
* Dienst-F-Dienst-F (DFDF) wird weich bestraft, um Erschöpfung zu vermeiden.



### 2.2 Der 7-Phasen-Ablauf

1. **Phase 1 & 2 (Wochenend- & Werktags-BD):** Zuerst werden die kritischen, schwer zu besetzenden Feiertage/Wochenenden für den Bereitschaftsdienst (`D`) mit den besten "Scores" besetzt. Danach folgen die Werktage.
2. **Phase 3 (Auto-F & FZA-Kompensation):** Folgt auf einen `D` automatisch der Folgetag, wird dieser fest als `F` (Frei) markiert. *Sonderlogik:* Hat Dr. Becker einen Samstags-BD, sucht der Algorithmus den nächsten freien Werktag und bucht automatisiert einen `FZA` (Freizeitausgleich) ein!
3. **Phase 4 (HG-Wochenend-Kopplung):** Hier wird "Teamwork" simuliert. Macht ein AA am Freitag BD, zwingt der Algorithmus den FA, der am Samstag BD macht, den Freitags-HG zu übernehmen.
4. **Phase 5 (HG-Verteilung):** Verteilung der restlichen HG-Dienste primär an die Fach- und Oberärzte, unter Berücksichtigung der "Ideal-HG"-Formel (welche die BD-Last gegenrechnet).
5. **Phase 6 (Deep-Search Multi-Zyklus-Optimierung):** Der Algorithmus durchläuft bis zu 25 Metaheuristik-Zyklen. In jedem Zyklus versucht er, einen Tag mit einem anderen Arzt zu "swappen" (`tryImproveDay`). Wird die *globale* Penalty dadurch geringer, wird der Swap behalten (Greedy-Descent-Ansatz).
6. **Phase 7 (Coverage Repair):** Finden sich keine perfekten Ärzte, lockert der Algorithmus in einer Eskalationsstufe harte Regeln (z.B. den 3-Tages-Mindestabstand), um offene Lücken (Gaps) als Ultima Ratio zu füllen. Erzeugt entsprechende Warnungen (`KRITISCH`).

### 2.3 Visualisierung (Neural Graph) & NFI

Während der Algorithmus in Millisekunden läuft, drosselt RadPlan absichtlich die Anzeige (`await sleep`) und startet in `neuralgraph.js` eine beeindruckende 3D-Matrix (mit CSS 3D-Transforms `perspective`, `translateZ`, `rotateX/Y`).

* Man sieht live, wie Matrix-Zellen pulsieren (Rot für D, Blau für HG), wie bei "Deep-Swaps" Knoten überschrieben werden und Fehler (`KRITISCH`) rot glühen.
* Ein **Mini-Map Canvas** zeichnet die Berechnungs-Pulsschläge in Echtzeit auf ein Radar.
* **Score & Abschlussbericht:** Das Resultat gipfelt im **Neural Fitness Index (NFI)** (max. 100.0). Dieser wird in einem eigenen `modal-score-info` inklusive Formel-Breakdown (Lücken × Gewichtung, Spread, Erfüllte Wünsche, Berechnungs-Penalty) visualisiert.

---

## 3. 💾 Architektur & State Management

RadPlan verzichtet auf Redux oder Zustand, nutzt stattdessen ein dediziertes und hochperformantes File-Modul (`state.js` & `model.js`).

### 3.1 Datenmodell (`DATA`)

Die zentrale Struktur ist ein Dictionary, dessen Keys der Year-Month-String sind (z.B. `2026-4` für Mai 2026).
Jeder Monatsknoten (`md`) enthält:

* `employees`: Array von Strings (z.B. `["Dr. Lurz", "Fr. Dalitz"]`).
* `assignments`: Ein tiefes Objekt `[empName][dayNumber] = { assignment: "MR/CT", duty: "D" }`.
* `rbn`: Ein separates Objekt für die "RD Neurorad"-Zeile (externe Teleradiologie-Zuordnung), unabhängig von den internen Mitarbeitern.

### 3.2 Planungsmodus (Die Sandbox)

Die App besitzt einen echten **Planungsmodus** (aktivierbar über den Button im Header).

* Ist er aktiv, wird die `DATA`-Struktur geklont und in `planData` geladen.
* Es erscheint die gelbe `plan-bar` mit Warnblinklicht. Alles, was hier passiert, hat keinen Einfluss auf die Live-Daten.
* Das System führt einen kompletten **History-Stack** mit. Über Undo (Strg+Z) und Redo (Strg+Y) können Zuweisungen vor/zurück gespult werden.
* Erst bei Klick auf "Übernehmen" (`applyPlanToMain()`) wird der Entwurf gemergt.

### 3.3 Persistenz & Server-Sync

* Jede Änderung speichert debounce-gesteuert (`saveTimeout`, 120ms) den Zustand im lokalen `localStorage` (Offline-Fähigkeit).
* Gleichzeitig feuert die App per `fetch` ein POST an einen `/api`-Endpunkt. Es wird ein simples, aber effektives Concurrency-Modell gefahren (`serverLastModified`). Schreibt ein Kollege auf einem anderen Rechner zeitgleich einen Dienst, triggert der 409 Conflict den `radplan-sync-conflict` Event und lädt die neuesten Daten hart nach.
* Ein Heartbeat pollt alle 30 Sekunden im Hintergrund die API nach neuen Daten.

---

## 4. 🗂️ Modul- & Dateibeschreibung im Detail

Die Anwendung ist streng modular nach Verantwortlichkeiten getrennt.

### 📄 `index.html`

Das strukturelle Rückgrat. Beherbergt keine Inline-Scripts.

* Deklariert sämtliche Modals (`modal-editor`, `modal-profile`, `modal-emps`, `modal-dept`, `modal-autoplan`, `modal-ap-report`, `modal-score-info`) unsichtbar im DOM.
* Baut das semantische Gerüst für das Haupt-Grid (`#grid-wrapper` -> `table`).
* Inkludiert Chart.js (für die Analytics) und GSAP (für erweiterte Animationen).

### 📄 `js/constants.js`

Das Herz des statischen Wissens.

* **Arbeitsplätze & Status:** Definiert Arrays (`WORKPLACES`, `STATUSES`) inklusive Farb-Codes (Hex) für Badges. `CODE_MAP` macht diese O(1) zugreifbar.
* **Personal-Metadaten (`EMP_META`):** Speichert die exakte Hirarchie der Klinik. Wer ist "Leitender Oberarzt", welche Telefonnummer (z.B. "4002"), welche Spezialisierung, wer ist wessen Stellvertreter.
* **Kalender-Mathematik:** Komplexe Datumsfunktionen: Feiertagsberechnung in Sachsen (`getSaxonyHolidays`, abhängig vom berechneten Osterdatum `easterDate`), Kalenderwochen-Ermittlung nach ISO 8601 (`isoWeekNumber`), Wochentagsabfragen.

### 📄 `js/state.js`

Globale Zustandsverwaltung.

* Hält `DATA`, `planMode`, `planSessions`.
* Besitzt den Sync-Zyklus (`flushSaveToServer`, `loadFromStorage`, `forceSyncWithServer`).
* Verwaltet App-Zustände wie das `multiEdit`-Objekt (Wenn User per Strg-Klick mehrere Tage für einen Mitarbeiter im Editor markieren).

### 📄 `js/model.js`

Der Daten-Mutator.

* Behandelt ausschließlich Lese- und Schreibzugriffe auf `DATA`.
* Garantierte Integrität: `ensurePostBDFreiDays()` läuft nach jedem Sync und prüft, ob nach einem `D`-Dienst am Folgetag ein `F` (Frei) eingetragen ist. Wenn nicht, wird es kaskadierend hinzugefügt.
* Bietet `buildProfileStats` und `buildYearlyStats`, um Arrays und Dictionaries aufzubereiten, die später von `render.js` in Diagramme gepresst werden.

### 📄 `js/render.js`

Die Render-Engine (Vanilla DOM Manipulation).

* **Main Grid (`renderThead`, `renderTbody`, `renderTfoot`):** Baut iterativ über `createElement` und `innerHTML` das riesige DOM auf. Zuweisung von Farbcodes, Tooltips und Event-Listenern für Editor-Aufrufe.
* **Mobile Switch (`refreshResponsiveLayout`):** Kontrolliert über CSS-Variablen-Injektion (`--app-vw`, `--app-vh`) das exakte Viewport-Resizing. Rendered bei Mobile-Breakpoint das völlig andere DOM (`renderMobileDayList`).
* **Das Mitarbeiter-Profil (`openProfileModal`):** Liest die Statistik aus `model.js` und baut ein gigantisches Modal. Hier werden **Chart.js Instanzen** geladen: Ein Donut-Chart (für Arbeitsplatz-Verteilung), ein Bar-Chart (für Status), und ein komplexer Line/Bar-Hybrid (`pm-trend-canvas`) über den Jahresverlauf.
* **Abteilungsübersicht (`renderDeptContent`):** Eine hochkonzentrierte Tabelle, die die Coverage (Prozentuale Abdeckung) der Arbeitsplätze für das gesamte Team zeigt.

### 📄 `js/app.js`

Der Controller / Event-Orchestrator.

* Verdrahtet alle UI-Events (`wireEvents`).
* Handhabt die "Period Flyout" Logik (Wechsel des angezeigten Jahres/Monats ohne Page-Reload).
* Der Editor (`openEditor`, `saveEditor`): Steuert das UI des Zell-Editors. Erzeugt Chips für Multi-Select (z.B. MR + CT), überwacht Blockaden (Duty an andere Person vergeben), erlaubt Wunsch-Eintragungen.
* **Drag & Drop Import/Export:** Exportiert `DATA` als `.json`. Lässt den User per Drag&Drop JSON-Files in das `modal-import` ziehen (`handleDroppedFile`), verifiziert die Struktur und überschreibt das Backend.

### 📄 `js/autoplan.js`

Der Solver (bereits unter Punkt 2 detailliert beschrieben). Beeindruckend hier: Das ausgeklügelte `ruleTelemetryBucket` und das detaillierte Logging-Array, das erzeugt wird, um dem User am Ende im Report genau zu sagen, *warum* jemand an Tag X den Dienst Y bekommen hat (z.B. "Donnerstags-Dienst vor Urlaub priorisiert").

### 📄 `js/neuralgraph.js`

Visuelle Eye-Candy-Komponente. Generiert ein dynamisches CSS-3D Grid im Code und steuert CSS-Klassen (`pulse`, `error`, `rest`), um die Berechnungssimulation von `autoplan.js` darzustellen. Beinhaltet einen dedizierten HTML5-Canvas (`miniMapCtx`) für die Zeichnung von "Impuls-Punkten".

### 📄 `js/contextmenu.js`

Eine winzige, aber feine Klasse. Reagiert auf Rechtsklick, berechnet die Fenster-Kollision (`x + menuWidth > window.innerWidth`), und platziert ein absolut positioniertes, blur-hinterlegtes Menü über dem DOM.

### 🎨 Die CSS-Struktur

* **`core.css`:** Reset, Typografie, CSS-Variables (Tokens für Shadow, Radius, Colors). Hier liegt der komplexe `body::before` Mesh-Gradient. Definiert auch die globalen Modifier (`.is-mobile`, `.is-drag-selecting`).
* **`layout.css`:** Die Kernstruktur des Grids. Beinhaltet das komplexe "Sticky-Header"-Verhalten (`position: sticky`), zentriert die Tabelle in `#grid-wrapper` und stylt die filigranen Scrollbars (`::-webkit-scrollbar`). Enthält alle Mobile-Media-Queries.
* **`components.css`:** Kapselung der wiederverwendbaren UI-Elemente. Alle Buttons (`.mbtn`, `.hbtn`), Toast-Benachrichtigung, Drag&Drop-Zonen, Badges, Modals (`.modal`), Tooltips (`[data-tooltip]::after`) und deren Keyframe-Animationen (`@keyframes planPulse`).

---

## 5. 💡 Besondere Domänenlogik (Die "lächerlich kleinen Aspekte")

Was diese App so einzigartig macht, ist ihr Domänen-Wissen, das tief im Code verankert ist:

1. **D-F-D-F Regel:** Die App verabscheut es, einen Arzt "Dienst - Frei - Dienst - Frei" machen zu lassen, und bestraft diese Kombination im Algorithmus.
2. **Dr. Beckers Samstags-Kompensation:** Hat `Dr. Becker` samstags einen Bereitschaftsdienst, wird nicht nur ein normaler F-Tag generiert, sondern die App sucht im Code nach dem *nächsten verfügbaren Werktag*, prüft, ob eine andere Oberärztin in der Zeit Urlaub hat, und wenn nicht, bucht sie automatisch den Code `FZA` in den Live-Kalender.
3. **RD Neurorad (`RBN_ROW_KEY`):** Es gibt eine spezielle Zeile unter den Mitarbeitern, die nicht den Standard-Regeln gehorcht. Sie hat ein eigenes `DATA.rbn`-Objekt, andere Auswahlmöglichkeiten im Editor (bestimmte Namen wie "Prof. Schob (NRAD)") und ist farblich als "Externe Zeile" (Cyan-Blau) hervorgehoben.
4. **Drag-Selection:** User können auf dem Desktop mit gedrückter linker Maustaste über das Grid "wischen", um sofort mehrere Zellen für den Editor zu markieren. Der Hintergrund färbt sich dabei sofort orange ("Multi-Selected").
5. **Kind Krank / §15c:** Selbst feinste Abwesenheitsgründe aus dem Tarifvertrag/Personalwesen (`§15c` - Pflege naher Angehöriger) sind als Status-Codes hinterlegt und fließen korrekt in die "Total-Workdays" und "Coverage" Berechnungen ein.

---

*(Ende der Dokumentation)*
