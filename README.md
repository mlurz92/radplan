# RadPlan — Digitaler Dienstplan für die Klinik für Radiologie & Nuklearmedizin

## 1. Systemarchitektur & Technologischer Befund

**RadPlan** ist eine vollumfängliche, responsive **Progressive Web App (PWA)** zur Dienst- und Arbeitsplatzplanung. Architektur basiert auf einem **Local-First-Ansatz** mit asynchroner Server-Synchronisation.

* **Zustandsverwaltung:** Zentraler State (`state.js`) steuert Planungsmodus, aktive Perioden und UI-Zustände.
* **Datenspeicherung:** Primäre Persistenz im `localStorage` (`radplan_v3`). Asynchrone Synchronisation gegen `/api` (REST) alle 30 Sekunden oder bei `visibilitychange`.
* **Offline-Fähigkeit:** Vollständig gegeben. **Kein** Blockieren der UI bei fehlender Netzwerkverbindung. Konfliktauflösung (HTTP 409) erzwingt Übernahme des Server-Snapshots via `forceSyncWithServer`.
* **Responsive Engine:** Dynamische CSS-Variablen (`--app-vw`, `--app-vh`) via `visualViewport`-API. **Kein** fehlerhaftes Layout durch mobile On-Screen-Tastaturen. Breakpoint bei 600px für dedizierten Mobile-View.

## 2. Benutzeroberfläche (UI) & User Experience (UX)

Die Designsprache folgt einem professionellen, funktionalen Paradigma mit telegraphischem Informationsfluss. **Zentrale Metriken und Status-Indikatoren** sind farbcodiert zur schnellen visuellen Erfassung.

### 2.1. Desktop-Ansicht
* **Haupt-Grid:** Matrix aus Mitarbeitenden (Y-Achse) und Monatstagen (X-Achse).
* **Farbcodierung Arbeitsplätze:** MRT (Blau), CT (Orange), US (Teal), AN (Lila), MA (Pink), KUS (Grün), W (Gelb), T (Indigo).
* **Farbcodierung Dienste:** Bereitschaftsdienst (**D**, Rot), Hintergrunddienst (**HG**, Hellblau).
* **Kontextmenüs:** Rechtsklick auf Mitarbeitenden öffnet Verwaltungsaktionen (Profil, Entfernen, Dauerhaft entfernen).
* **Statistik-Bar (Header):** Aggregierte Zählung aller Tageszuweisungen.
* **Footer-Aggregate (Tfoot):** Tagesscharfe Auslastung für MR, CT, D, HG. **Keine** fehlenden Warnungen bei Überbelegung (Färbung bei `val > 1`).

### 2.2. Mobile Ansicht (< 600px)
* **Kartenbasiertes Layout:** Liste aller Monatstage. Anzeige von D/HG-Besetzung und Top 5 Arbeitsplatz-Zuweisungen pro Tag.
* **Detail-Modal (`modal-mobile-day`):** Selektion eines Tages öffnet vertikale Liste der Fach- und Assistenzärzte mit Editier-Funktion.
* **Mobile Bottom-Navigation:** Schnellzugriff auf Mitarbeitende, Planungsmodus und Kontextmenü.

### 2.3. Modal-System & Editoren
* **Zuweisungs-Editor:** Einzel-Zell-Bearbeitung. Arbeitsplätze kumulierbar. Status (Urlaub, Krank etc.) überschreiben Arbeitsplätze exklusiv. D/HG-Auswahl warnt bei Doppelbelegung. **Kein** Speichern unlogischer Kombinationen (Status + Arbeitsplatz).
* **Profil-Dashboard (`modal-profile`):** Aggregierte Monats- und Jahresstatistik pro Mitarbeitendem. Visualisierung via Balkendiagrammen (Arbeitsplätze, Status) und KPI-Cards.
* **Abteilungs-Dashboard (`modal-dept`):** Cross-Schnitt der Abteilungsabdeckung pro Monat oder Jahr. Identifikation kritischer Unterdeckungen (Coverage-Rate).

## 3. Workflow-Management & Kernfunktionen

### 3.1. Planungsmodus (Sandboxing)
* Isolierte Arbeitsumgebung zur Erstellung von Dienstplan-Entwürfen. **Keine** Mutation des Haupt-Datensatzes (`DATA`) bis zur expliziten Übernahme.
* **Undo/Redo-Historie:** Lineare Zustandsspeicherung aller Zell-Änderungen (`planHistory`).
* **Persistenz:** Entwürfe werden lokal unter `radplan_v3_plan_YYYY-MM` gesichert.
* **Dienstwünsche:** Im Planungsmodus aktivierbar (D-Wunsch, HG-Wunsch, Kein Dienst).

### 3.2. Automatisierte Post-BD-Kompensation
* Zuweisung eines Bereitschaftsdienstes (D) triggert systematisch die Eintragung eines **Ruhetages (F)** am Folgetag (`ensurePostBDFreiDays`). **Keine** manuelle Nachtragung erforderlich. Reicht über Monatsgrenzen hinweg.

### 3.3. Daten-I/O
* **Export/Import:** Vollständiger JSON-Export aller Hauptdaten und Plan-Entwürfe. Import via Drag & Drop oder Copy-Paste mit Validierung.

## 4. Der RadPlan Neural Scheduler (Autoplan-Algorithmus)

Algorithmische Erzeugung fairer, regelkonformer Dienstpläne. Basiert auf Heuristiken, Scoring-Matrizen und mehrstufigen Optimierungszyklen (Deep Search).

### 4.1. Harte Constraints (Ausschlusskriterien)
Ein Dienst (D/HG) ist **strikt ausgeschlossen**, wenn eine der folgenden Bedingungen zutrifft:
* **Generelle Exemtion:** Mitarbeiter in `DUTY_EXEMPT` (Prof. Schäfer).
* **Ziel = 0:** Zielwert für BD explizit auf 0 gesetzt.
* **Abwesenheit:** Urlaub (U, ZU, SU), Krank (K, KK), FZA, WB, §15c.
* **Existierender Dienst:** Bereitschaft oder HG am selben Tag anderweitig belegt.
* **Wunsch-Blockade:** Expliziter Wunsch `NO_DUTY`.
* **Qualifikationsmangel:** Samstags-BD zwingend an Fachärzte gebunden.
* **Sonderregel Dr. Polednia:** **Keine** D/HG-Dienste an Sonntagen, Dienstagen und Donnerstagen.
* **Mammographie-Konflikt (Fr. Dalitz):** **Kein** HG für Fr. Dalitz an Sonntagen/Montagen, wenn Hr. Torki oder Hr. Sebastian den BD haben (und vice versa).
* **CT-Leitungs-Konflikt (Becker/Martin):** Dr. Becker darf keinen Dienst antreten, der zu einem F-Tag am Folgetag führt, wenn Dr. Martin an diesem Folgetag abwesend ist (Sicherung der CT-Funktion).
* **Vortag/Folgetag:** **Kein** BD am Tag vor oder nach einem anderen BD. **Kein** HG nach einem BD (außer Freitags).
* **Feiertags-Blockade:** **Kein** Pfingst-Dienst bei bereits geleistetem Oster-Dienst (und vice versa).

### 4.2. Algorithmus-Phasen

#### Phase 1: Initialisierung & Historien-Auswertung
Aggregierung historischer Dienstbelastungen (BD, HG, WE-Dienste, Feiertage) aller Vormonate zur Berechnung von Fairness-Deltas.

#### Phase 2 & 3: Greedy-Allokation (Wochenenden & Werktage)
Bewertung aller validen Kandidaten via `scoreBDCandidate`. Zuweisung an Kandidaten mit höchstem Score.
* **Lockerung:** Wenn kein valider Kandidat existiert, werden weiche Constraints ignoriert (`relaxed = true`), z.B. erlaubtes Limit für WE-Dienste überschritten.
* **Dr. Becker Samstags-Kompensation:** Samstags-BD bei Dr. Becker erzeugt automatisch einen **FZA** am darauffolgenden Werktag (falls nicht durch FAs blockiert).

#### Phase 4: BD-Optimierung
* Maximal 80 Passes. Suche nach Swaps ($Emp_A \leftrightarrow Emp_B$) für Werktags-BDs, die die globale Varianz (`computeBDObjective`) minimieren.

#### Phase 5: HG-Kopplung (Bundling)
Erzeugung struktureller Abhängigkeiten zur Entlastung von Assistenzärzten (AA):
* **Freitags-Kopplung:** Hat ein AA am Freitag BD, muss der FA, der den Samstags-BD hat, den Freitags-HG übernehmen.
* **Wochenend-Kopplung:** FA mit Samstags-BD übernimmt zwangsläufig den Sonntags-HG.
* **Feiertags-Kopplung:** Hat ein AA am Tag vor dem Feiertag BD, übernimmt der FA des Feiertags-BD den HG am Vortag.

#### Phase 6 & 7: HG-Allokation & Optimierung
Greedy-Zuweisung aller noch offenen HG-Schichten via `scoreHGCandidate`, gefolgt von bis zu 120 Optimierungs-Passes (Swaps zur Minimierung von `computeHGObjective`).

#### Phase 8: Deep Optimize
Kreuz-Evaluierung von BD und HG in einer globalen Heuristik. Maximal 150 Passes zur Minimierung von `computeGlobalObjective`.

#### Phase 9: Coverage Repair
Notfall-Zuweisung. Offene Schichten (Lücken) werden an den Mitarbeiter mit der aktuell geringsten Monatsbelastung zwangsvergeben, ungeachtet aller weichen Constraints. Führt zu Warnungen ("Coverage Repair").

### 4.3. Scoring-Gewichtungen (Weiche Constraints)

**Bereitschaftsdienst (D) - `scoreBDCandidate` (Basis: 100):**
* **Ziel-Abweichung:** +5.000 für fehlende Dienste bis zum Ziel. **-50.000** für Überschreitung des Ziels.
* **Wunsch:** +220 für `BD_WISH`.
* **Prä-Urlaub:** +150 für BD am Donnerstag vor Urlaubswoche.
* **Wochenend-Streuung:** -220 pro Abweichung vom Soll (1). **-1.000** pro Dienst über dem Relaxed-Limit (1.5).
* **Erschöpfungs-Prävention:** **-1.500** bei aufeinanderfolgenden Wochenenden.
* **Doppel-Samstag (FA):** **-25.000** für den zweiten Samstag im Monat.
* **Distanz:** Distanz < 4 Tage generiert -(4 - Distanz) * 250 Punkte.
* **Rhythmus (D-F-D-F):** **-500** Punkte Strafe für diese Sequenz.

**Hintergrunddienst (HG) - `scoreHGCandidate` (Basis: 100):**
* **Ziel-Abweichung:** **-10.000** pro Abweichung vom mathematischen Ideal (Ausgleich zur BD-Last).
* **Wunsch:** +500 für `HG_WISH`.
* **Prä-Urlaub:** -100 für HG am Tag vor Urlaub.
* **Wochenend-Streuung:** -1.500 pro Abweichung vom Soll. **-5.000** bei > Limit.
* **Erschöpfungs-Prävention:** **-2.500** bei aufeinanderfolgenden Wochenenden.
* **Distanz:** Distanz < 3 Tage generiert **-8.000** Punkte.
* **Direkte Abfolge:** **-25.000** für HG an direkt benachbarten Tagen.

### 4.4. Neural Fitness Index (NFI)
Der finale Score des Plans ist ein dimensionsloser Qualitätsindikator (Maximalwert 100.0). Berechnet sich aus:
* `Basis 100.0`
* `- 15.0` pro unbesetztem BD
* `- 10.0` pro unbesetztem HG
* `- 2.5 *` BD-Streuung (Max - Min Dienste)
* `- 1.5 *` HG-Streuung
* `- 2.0 *` WE-Streuung
* `+ 5.0 *` Wunscherfüllungsrate (0.0 - 1.0)
* `- 0.005 *` durchgeführte Deep-Moves (Reibungsverlust-Strafe)

### 4.5. Algorithmischer Abschlussbericht & UI-Integration
* Das Ergebnis der Berechnung präsentiert sich im `modal-autoplan` (Result-View).
* **Warnungen:** Kritische Hinweise (z.B. Lücken, gescheiterter FZA für Dr. Becker, Mammographie-Konflikte) werden explizit hervorgehoben.
* **Trace Console:** Visuelles Feedback der Neuralgraph-Entscheidungen während der Berechnung inkl. Telemetrie-Ausgabe pro Tag.

## 5. Datenmodell & State-Management

**Zentrale State-Architektur** (`state.js`, `model.js`).
Aufbau folgt striktem **Local-First-Paradigma** mit asynchroner Cloud-Spiegelung. 

### 5.1. JSON-Datenstruktur (`DATA`)
* **Strukturierungsebene:** Schlüssel-Wert-Paare nach Schema `YYYY-M` (z.B. `2026-3` für April 2026).
* **Knotenpunkte pro Monat:**
  * `employees`: Array aktiver Mitarbeitender (z.B. `["Prof. Schäfer", "Dr. Lurz", ...]`).
  * `assignments`: Zweidimensionales Mapping. Ebene 1: Mitarbeitername. Ebene 2: Tag (1-31). Objekt-Inhalt: `{ assignment: "MR/CT", duty: "D" }`.
  * `rbn`: Mapping für **RD Neurorad** Zuweisungen (z.B. `{ "1": "Prof. Schob (NRAD)" }`).
  * `wishes`: (Nur im Planungsmodus) Erfassung von Dienstwünschen `{ "Dr. Lurz": { "12": "BD_WISH" } }`.

### 5.2. Konstanten & Stammdaten (`constants.js`)
**Arbeitsplätze (Workplaces)**
Kombinierbare Zuweisungen (Mehrfachauswahl möglich, Separierung durch `/`):
* **MR** (MRT) – `#DBEAFE` / `#1D4ED8`
* **CT** (CT) – `#FFEDD5` / `#C2410C`
* **US** (Sonographie) – `#CCFBF1` / `#0F766E`
* **AN** (Angiographie) – `#F3E8FF` / `#7E22CE`
* **MA** (Mammographie) – `#FCE7F3` / `#BE185D`
* **KUS** (Kinder-US) – `#DCFCE7` / `#15803D`
* **W** (Wermsdorf) – `#FEF9C3` / `#854D0E`
* **T** (Teleradiologie) – `#E0E7FF` / `#3730A3`

**Status (Absences & Exceptions)**
Exklusive Zuweisungen (überschreiben Arbeitsplätze):
* **Regulär:** **F** (Frei).
* **Urlaube (Vacation Codes):** **U** (Urlaub), **ZU** (Zusatzurlaub), **SU** (Sonderurlaub), **§15c** (Sonderstatus).
* **Krankheit:** **K** (Krank), **KK** (Kind Krank).
* **Ausgleich & Weiterbildung:** **FZA** (Freizeitausgleich), **WB** (Weiterbildung).

**Mitarbeitenden-Klassifizierung (`EMP_META`)**
* **Leitung:** **CA** (Prof. Schäfer), **LOA** (Dr. Lurz), **OA/OÄ** (Dr. Polednia, Fr. Dalitz, Dr. Becker).
* **Fachärzte (FA/FÄ):** Dr. Martin, Fr. Thaler. *Relevanz: Autorisierung für Samstags-BD und HG.*
* **Assistenzärzte (AA/AÄ):** Hr. El Houba, Fr. Licenji, Hr. Torki, Hr. Sebastian. *Relevanz: Kopplungs-Auslöser für FA-HG.*

## 6. UI-Steuerung & Tastatur-Kürzel

**Fokus:** Maximale Effizienz für Power-User via Hotkeys und Kontextmenüs. **Keine** Maus-Zwangsläufigkeit im Editor.

### 6.1. Editor-Shortcuts (`modal-editor`)
Aktive Zelle im Grid selektiert.
* **Tasten 1-8:** Zuweisung der Arbeitsplätze (1=MR, 2=CT, 3=US, 4=AN, 5=MA, 6=KUS, 7=W, 8=T). **Kein** Löschen vorheriger Eingaben (Toggles).
* **Taste D:** Toggle Bereitschaftsdienst. Blockiert, falls bereits an anderen vergeben.
* **Taste H:** Toggle Hintergrunddienst. Blockiert, falls bereits an anderen vergeben.
* **Taste S / Enter:** Speichern und Schließen.

### 6.2. Globale Navigation & Aktionen
* **Alt + Pfeil Links/Rechts:** Monatswechsel.
* **Strg + S:** Export-Trigger (Normalmodus) / Speicher-Trigger (Planungsmodus).
* **Strg + Z / Strg + Y:** Undo / Redo (ausschließlich im Planungsmodus aktiv).

### 6.3. Interaktions-Design (`render.js`)
* **Kontextmenü (Rechtsklick auf Mitarbeiter):** Öffnet lokales Flyout. Optionen: Profil öffnen, Aus Monat entfernen, Dauerhaft entfernen (Kaskadierende Löschung für alle Folgemonate).
* **Mobile-Day-Modal:** Öffnet sich bei Tap auf Tag in der Mobile-Listenansicht. Gruppierung nach Fachärzten/Assistenzärzten. Inline-Bearbeitung durch Tap auf Zeile.
* **Drag & Drop Import:** Vollflächige Dropzone im `modal-import`. Validierung auf `.json`-MIME-Types. Automatische Fehlerkorrektur fehlender F-Tage nach BD nach Import (`ensurePostBDFreiDays`).

## 7. Dashboards & Analyseverfahren

### 7.1. Abteilungs-Dashboard (`modal-dept`)
* **Zweck:** Makroskopische Überwachung der Dienstplan-Integrität.
* **Monats-Tab:** Werktag-Fokus. Zählung der Tage mit MR-, CT-, D- und HG-Besetzung. Berechnung der **Coverage-Quote** in Prozent. **Kritische Kennzahl:** Anzahl unbesetzter Pflicht-Positionen.
* **Jahres-Tab:** Aggregation aller Mitarbeiter. Gesamt-Coverage. Farbliche Warn-Indikatoren (Grün >80%, Gelb >60%, Rot <60%).

### 7.2. Mitarbeiter-Dashboard (`modal-emps`)
* **Zweck:** Mikroskopische und vergleichende Analyse.
* **Team-Analytics:** Dynamischer Zeitraum-Picker (Monat, Quartal, Rolling 12M, Custom). Identifikation der Spitzenreiter in Aktivität und Diensten ("Top Aktivität", "Dienst-Fokus").
* **Filterung:** Segmentierung nach Rollen (CA, OA, FA, AA, OHNE). Live-Suchfeld (Name, Bereich).
* **Detail-Views:** * *Monatsverlauf:* Tabellarische Auflistung aller Kennzahlen pro Monat.
  * *Jahreskalender:* Heatmap-artige Darstellung der 12 Monate mit Top-4 Arbeitsplätzen und Ausfalltagen.
  * *Verwaltung:* Interface zum Hinzufügen/Entfernen der Person aus dem aktiven Monat.

## 8. Netzwerk- & Synchronisationsprotokolle

**Verwaltung konkurrierender Zugriffe** (`functions/api.js`, `app.js`).

* **Polling-Zyklus:** Alle 30 Sekunden im Hintergrund (`setInterval`) via `/api?t=...`. **Kein** Cache-Hit zugelassen (`cache: "no-store"`).
* **Visibility-Trigger:** Sofortiger Sync-Request bei Wechsel des Dokumentenstatus (`visibilitychange` auf `visible`).
* **Conflict Resolution (HTTP 409):** Tritt auf, wenn lokaler Speicher speichert, aber `lastModified` auf dem Server neuer ist. **Zwang:** Lokaler Zustand wird verworfen, Server-Zustand überschreibt lokal. UI-Toast: "Speicher-Konflikt: Aktuellster Server-Stand geladen".
* **Force-Sync (Roter Button):** Manueller Override. Verwirft zwingend alle lokalen, nicht synchronisierten Daten. Nutzt `forceSyncWithServer()`. Zwingende Re-Kalkulation der Post-BD F-Tage nach Fetch.

## 9. Performance & Rendering-Engine

* **NeuralGraph Visualisierung (`neuralgraph.js`):** HTML5 Canvas Integration im Auto-Plan Modal. Visuelle Repräsentation des Graphen während Deep-Search. Knoten = Mitarbeiter/Tage. Kanten = Zuweisungen.
* **Virtuelles Scrolling (Mobile):** Render-Optimierung durch Limitierung angezeigter DOM-Elemente via `requestAnimationFrame` für smooth Scrolling im Modal.
* **CSS-Variablen-Injektion:** Dynamische Berechnung von `--app-vw`, `--app-vh` und `--kb-inset` zum Ausgleich der virtuellen Tastatur unter iOS/Android (`syncViewportCssVars`). Verhindert Layout-Bouncing.
* **Explicit Wheel Handling:** Horizontales Scrolling im Grid via Shift+Scroll oder Diagonal-Scroll-Pads (`e.deltaY` Fallback auf `e.deltaX`) mit präzisem `e.preventDefault()` zur Verhinderung von Browser-Overscroll-Glitches.

## 10. Erweiterte algorithmische Mechanismen (Neural Scheduler Ergänzung)

**Tracking & Telemetrie (`buildRuleTelemetryBucket`)**
Jeder Regeleingriff wird protokolliert. Schweregrad-Klassifizierung:
* `info`: Standard-Zuweisung.
* `accent`: Positive Kompensation (z.B. Becker-FZA).
* `warn`: Gelockerte harte Regel (Coverage Repair).
* `critical`: Gescheiterte Konfliktlösung (z.B. FZA blockiert).
Ausgabe erfolgt in der Trace-Console und im Abschlussbericht.

**Deep-Moves Metrik**
Teil des Neural Fitness Index (NFI). Kostendefinition der Rechenzeit. Jeder Swap in Phase 8 (Deep Optimize) reduziert den finalen NFI um `-0.005` Punkte. **Zweck:** Präferenz für stabile, früh gefundene Lösungen gegenüber über-optimierten, komplexen Tauschnetzen. Limitierung auf 150 Passes garantiert deterministische Laufzeiten unter 25 Sekunden (`TARGET_WEEKEND_DUTY` Loop-Breaker).

## 11. Modularer Quellcode-Befund (Strukturelle Architektur)

Die Code-Basis ist streng modularisiert nach dem Prinzip der Separation of Concerns (SoC). **Keine** monolithischen JavaScript-Dateien.

### 11.1. Core-Logik & State (`/js/`)
* **`app.js`:** Initialisierungs-Routinen, Bootstrap-Prozess und globales Event-Binding (Sync-Intervalle, Visibility-Checks).
* **`state.js` & `model.js`:** Zentrale Singleton-Zustandsverwaltung. Trennung zwischen Applikationszustand (aktiver Monat, UI-Modi) und persistierbarem Datenmodell (`DATA`). Beinhaltet die Konfliktauflösungs-Logik (Server vs. Local).
* **`constants.js`:** Definition aller unveränderlichen Parameter. System-Grenzen (`MAX_MONTHS_AHEAD`), Farb-Matrizen, Arbeitsplatz-Kürzel und Abwesenheits-Codes.
* **`autoplan.js`:** Der Neural Scheduler. Beinhaltet alle heuristischen Matrizen, Scoring-Funktionen und den Multi-Pass Deep-Search Algorithmus zur vollautomatischen Dienstplanung.
* **`neuralgraph.js`:** Logik-Ebene für die HTML5 Canvas-Visualisierung der algorithmischen Entscheidungsprozesse in Echtzeit.

### 11.2. UI-Steuerung & Rendering (`/js/`)
* **`render.js`:** Hochfrequente DOM-Manipulation. Generierung des Haupt-Grids, der Mobile-Views und der Statistik-Dashboards. Beinhaltet die komplexen Tabellen-Kalkulationen für die Fußzeilen-Aggregate.
* **`scheduler-ui.js`:** Event-Delegation für die Benutzerinteraktion. Steuert Modal-Lifecycles, Tastatur-Eingaben (Hotkeys 1-8, D, H) und die Sandboxing-Historie (Undo/Redo) des Planungsmodus.
* **`contextmenu.js`:** Kapselung der Flyout-Menü-Logik (Rechtsklick) für mitarbeiterbezogene Schnellaktionen (Profil, Löschen) zur Vermeidung von nativem Browser-Verhalten.

### 11.3. Style-System (`/css/`)
Striker Component-Based CSS-Ansatz. Dynamische Steuerung über globale CSS-Variablen (`:root`).
* **`core.css`:** Reset, Typografie, globale CSS-Variablen, Basis-Animationen (Fade-Ins, Slide-Ups).
* **`layout.css`:** Makroskopische Grid-Strukturen, Header, Main-Container, Mobile-Bottom-Nav.
* **`scheduler.css`:** Spezifisches Styling des Desktop-Dienstplangitters, sticky Columns, Cell-Hover-Effekte.
* **`modals.css`:** Z-Index-Management und Layouting der Overlay-Dialoge (Editor, Auto-Plan, Dashboards).
* **`components.css`:** Mikroskopische UI-Elemente: Buttons, Badges, Toasts, Formular-Elemente.
* **`contextmenu.css`:** Styling und Positionierung des Custom-Rechtsklick-Menüs.
* **`views.css`:** Modulspezifische Ansichten (z.B. Profil- und Abteilungs-Statistiken).

### 11.4. Backend / Serverless (`/functions/`)
* **`api.js`:** Node.js/Serverless Handler für das Lesen (`GET`) und Schreiben (`POST`) der `radplan_STATE.json` auf dem Server. Implementiert die Versionskontrolle via `lastModified`-Timestamp zur Verhinderung von Race-Conditions.

## 12. Deployment & PWA-Spezifikationen

**RadPlan** ist als Progressive Web App konzipiert und vollständig isoliert ausführbar.

* **Manifest (`manifest.json`):** Definiert App-Namen ("RadPlan"), Start-URL, Display-Modus (`standalone`) und Theme-Farben (`#1e293b`). Erlaubt "Add to Homescreen" (A2HS) Installation auf iOS/Android.
* **Icons (`/img/`):** Vektorgrafiken (`icon.svg`, `icon_animated.svg`) für hochauflösende Skalierbarkeit auf allen Endgeräten.
* **Infrastruktur-Bedarf:** Minimal. Benötigt statisches Webhosting für HTML/CSS/JS und eine laufzeitumgebung (z.B. Vercel, Netlify oder lokaler Node-Server) für den trivialen Datei-I/O der `api.js`. **Keine** relationale oder NoSQL-Datenbank erforderlich.

## 13. Qualitätskontrolle & Obligatorische Negativ-Befunde (Edge Cases)

Eine systematische Evaluation der Systemgrenzen ergibt folgende explizite Negativ-Befunde:

* **Kein automatischer Sync im Planungsmodus:** Änderungen im Entwurfsmodus bleiben strikt im `localStorage`, bis sie explizit übernommen ("Plan anwenden") oder als Snapshot exportiert werden.
* **Keine Destruktion bei invaliden Importen:** Das System blockiert Dateiuploads, die nicht dem strikten JSON-Schema von `radplan_` entsprechen.
* **Kein Überschreiben von Status durch Arbeitsplätze:** Das Zuweisen eines Arbeitsplatzes (z.B. MR) in einer Zelle, die bereits einen Status (z.B. U, K) enthält, wird blockiert. Status müssen manuell entfernt werden.
* **Keine unendliche Rückwärtskompatibilität:** Der Algorithmus wertet historische Daten zur Fairness-Berechnung aus. Fehlen die Vormonate im Datensatz, startet die Berechnung isoliert (Delta-Scores = 0).
* **Keine Auflösung von Deadlocks ohne Warnung:** Wenn die harschen Constraints (Urlaub, Krankheit, Sperrzeiten) eine 100%ige Besetzung mathematisch unmöglich machen, erzwingt Phase 9 (Coverage Repair) eine Zuweisung und generiert zwingend eine gelbe/rote **Warnung** im Abschlussbericht.
* **Keine iOS-Zoom-Eskalation:** Explizite Deaktivierung von Pinch-to-Zoom im `meta viewport` (`user-scalable=no`), um das PWA-Erlebnis auf mobilen Endgeräten nicht zu kompromittieren.

## 14. Strategische Integration & Ausblick

Das System ist als skalierbarer MVP konzipiert, der die Grundlage für eine umfassende **digitale Klinik-Infrastruktur** bildet. 

**Erweiterungsvektoren:**
1. **SOP-Verknüpfung:** Zukünftige Integration kontextsensitiver SOPs je nach zugewiesenem Arbeitsplatz.
2. **HL7/FHIR-Kopplung:** Potenzieller Abgleich mit dem Krankenhausinformationssystem (KIS) zum automatischen Import von Krankmeldungen (K) und bewilligten Urlauben (U).
3. **Erweiterte Analytics:** Export der Dienstbelastungs-Metriken zur Optimierung der Ressourcenallokation im Rahmen der privaten und abteilungsbezogenen Finanzplanung.

---

**Abschließende Beurteilung:** RadPlan repräsentiert eine hochgradig spezialisierte, ausfallsichere und algorithmisch gestützte Planungsarchitektur. Die Kombination aus manuellem Override (Sandboxing), automatisierter Kompensation (Post-BD F-Tage) und der Deep-Search-Heuristik erfüllt alle Anforderungen an eine präzise, klinisch-administrative Datenverarbeitung mit optimaler UX auf allen Endgeräten.