# RadPlan – Leitstellen-taugliche Dienst- und Arbeitsplatzplanung für die Radiologie

## 1. Produktvision und Philosophie

**RadPlan** ist eine hochspezialisierte, klinisch ausgerichtete Progressive Web App (PWA), die exklusiv für die komplexen Anforderungen der Dienst- und Arbeitsplatzplanung in der Klinik für Radiologie und Nuklearmedizin (Klinikum St. Georg) entwickelt wurde.

Ähnlich der fundamentalen radiologischen Regel, bei der **rechts und links aus Patientensicht stets vertauscht sind**, invertiert RadPlan traditionelle Softwareparadigmen: Statt den Anwender an eine starre Systemlogik anzupassen, ordnet sich das System vollständig dem flüssigen Denk- und Arbeitsprozess des Planenden unter. Die Anwendung kombiniert **kompromisslose Performance**, **tiefgreifende Automatisierung** und eine **nahtlose User Experience**, um die Diskrepanz zwischen starrer Kalenderführung und hochdynamischem Klinikalltag aufzulösen.

Die Applikation ermöglicht die minutenschnelle, konfliktfreie und gerechte Zuweisung von **Arbeitsplätzen** (z. B. MRT, CT, Sonographie), **Diensten** (Bereitschaft, Hintergrund) und **Abwesenheiten**.

---

## 2. Design-Philosophie: Warm Minimalism & Quiet Luxury

Das Interface von RadPlan bricht bewusst mit dem oft sterilen, tabellarischen Look klassischer Krankenhaussoftware. Die UI- und UX-Architektur basiert auf den Prinzipien des **Warm Minimalism** und **Quiet Luxury**:

* **Visuelle Tiefe durch Glassmorphismus:** Statt massiver Farbblöcke nutzt das Layout transluzente Ebenen (`backdrop-filter: blur(16px)`), softe Verlaufsschatten (`--shadow-glow`) und akzentuierte Rahmen (`rgba(255,255,255,.08)`). Dies schafft räumliche Tiefe, ohne zu überladen.
* **Fokus durch Reduktion:** Die Farbpalette basiert auf eleganten, dunklen Navy-Tönen (`#060D16` bis `#1E3A5F`), die bei langen Planungs-Sessions die Augen schonen. Statuscodes, Arbeitsplätze und Dienste werden durch harmonisch abgestimmte, subtil leuchtende Badges kodiert.
* **Flüssige Kinetik:** Alle Zustandsübergänge, Hover-Effekte und Modals nutzen physikalisch basierte Animationskurven (`cubic-bezier(0.34, 1.2, 0.64, 1)`), wodurch Interaktionen organisch, schwerelos und extrem reaktionsschnell wirken.

---

## 3. Systemarchitektur & Technologiestack

Die Architektur ist konsequent auf Ausfallsicherheit, Offline-Fähigkeit und Latenzfreiheit getrimmt.

### 3.1 Local-First & Progressive Web App (PWA)

Die Applikation speichert den gesamten Datenbestand (`DATA`) primär im lokalen `localStorage` (`radplan_v3`). Dies garantiert Ladezeiten von null Millisekunden. Ein in `manifest.json` und Meta-Tags definiertes Standalone-Verhalten ermöglicht die nahtlose Installation als App auf iOS- und Android-Geräten.

### 3.2 Asynchrone Cloudflare KV-Synchronisation

Im Hintergrund synchronisiert die Applikation (`functions/api.js`) den Zustand über eine Cloudflare Worker-Instanz mit einem **Cloudflare KV-Store** (`RADPLAN_KV`).

* **Optimistic UI:** Lokale Änderungen werden sofort gerendert, während der Sync-Prozess asynchron abläuft.
* **Conflict Resolution (HTTP 409):** Ein ausgeklügeltes Token- und Zeitstempel-System (`lastModified`) erkennt parallele Schreibzugriffe. Bei einem Konflikt wird der Client gewarnt und optional mit dem jüngsten Server-Snapshot überschrieben.

---

## 4. Datenmodell & Zustandsverwaltung (State Management)

Das Datenmodell in `js/model.js` und `js/state.js` ist streng normalisiert und auf Zeitreihen-Effizienz optimiert.

* **`DATA` Container:** Organisiert in Monats-Schlüsseln (Format `YYYY-M`).
* `employees`: Ein Array der aktiven Mitarbeiter im spezifischen Monat.
* `assignments`: Ein tiefes Objekt-Mapping (`assignments[emp][day]`), das Zuweisungen (`assignment`) und Dienste (`duty`) speichert.
* `rbn`: Ein separates Objekt für die Zuweisungen der Regionale Bereitschaftspraxis Neuroradiologie.
* `wishes`: Individuelle Mitarbeiterwünsche (`NO_DUTY`, `BD_WISH`, `HG_WISH`).


* **Reactive State:** Das `state`-Objekt verwaltet flüchtige UI-Zustände wie das geöffnete Editor-Modal (`state.edit`), Dashboad-Filter, Zeitraum-Entwürfe (`periodDraft`) und die aktuelle **Mehrtagesselektion** (`multiEdit`).

---

## 5. Kernfunktionen & Module im Detail

### 5.1 Die interaktive Monatsmatrix (Grid)

Das Herzstück der Anwendung. Eine horizontal scrollbare, hochverdichtete Matrix (`#plan-table`), die den gesamten Monat abbildet.

* **Informationshierarchie:** Zellen zeigen Arbeitsplätze in Kurzform. Dienste werden als kompakte Overlay-Badges (z. B. rotes D, blaues HG) in den Ecken der Zelle dargestellt.
* **Tageskontext:** Spaltenköpfe markieren Wochenenden (gedimmt), Feiertage (amber), Freitage (abgesetzter Rahmen) und heben den **heutigen Tag** durch einen leuchtenden, blauen Glow-Effekt prominent hervor.
* **Dynamische Coverage-Indikation:** Ein subtiler Streifen am unteren Rand der Datums-Header visualisiert die Dienstabdeckung (`#22C55E` für komplett, `#F59E0B` für partiell, `#EF4444` für kritisch unbesetzt).
* **RBN-Zeile:** Eine spezielle, visuell abgesetzte Zeile für die externe Neuroradiologie-Dienstbesetzung.

### 5.2 Der Zell-Editor & Mehrtagesbearbeitung

Ein Aufruf des Editors (Klick oder `Enter` auf eine Zelle) öffnet ein zentriertes Modal zur tiefen Bearbeitung.

* **Chip-UI:** Arbeitsplätze (MRT, CT, US etc.) lassen sich als Mehrfachauswahl kombinieren (z. B. `MR/CT`). Statuscodes (Urlaub, FZA, Krank) sind exklusiv und löschen automatisch die Arbeitsplätze.
* **Kollisionsprüfung:** Das Modal warnt live, wenn ein Dienst (`D`/`HG`) an diesem Tag bereits von einem Kollegen besetzt ist oder wenn der Folgetag ein Urlaubstag ist.
* **Multi-Select (Batch-Editing):** Durch Halten von **STRG/CMD** oder Klicken und Ziehen der Maus können mehrere Tage **einer Person** markiert werden. Der Editor wendet Änderungen dann gleichzeitig auf alle markierten Zellen an (inklusive automatischer F-Tag-Berechnung).

### 5.3 Tastatursteuerung & Power-User-Features

RadPlan ist für maximale Klick-Reduktion ausgelegt. Innerhalb des Grids (`grid-kbd-hint`) gilt:

* **Pfeiltasten:** Nahtlose Navigation durch die Zellen, auch über Zeilengrenzen hinweg.
* **Tasten 1–8:** Direktes Toggeln der Arbeitsplätze (1=MRT, 2=CT, etc.).
* **D / H:** Direktes Setzen von Bereitschafts- (D) oder Hintergrunddiensten (H).
* **Delete / Backspace:** Sofortiges Leeren der fokussierten Zelle.
* **Alt + Links/Rechts:** Schneller Monatswechsel.

### 5.4 Zeitraumsteuerung (Period Flyout)

Ein responsives Flyout-Menü (`period-flyout`) erlaubt das völlig freie Springen zwischen Monaten und Jahren. Diese Steuerung bleibt stateful: Sie kann auch genutzt werden, wenn gerade ein Dashboard-Modal geöffnet ist, wodurch historische Vergleiche massiv beschleunigt werden.

### 5.5 Planungsmodus (Sandbox-Umgebung)

Über einen Klick auf "Planung" betritt der Anwender eine **sichere Sandbox**.

* **Isolierter State:** Alle Änderungen werden in einem separaten Session-Storage (`radplan_v3_plan_...`) gespeichert. Der Live-Datenstand bleibt unberührt.
* **Visuelles Feedback:** Eine bernsteinfarbene (`amber`) Header-Leiste, leuchtende Badges und warme Zell-Highlights verdeutlichen den Entwurfsstatus.
* **Historie:** Eine unbegrenzte Undo/Redo-Kette (`STRG+Z` / `STRG+Y`) erlaubt das angstfreie Experimentieren mit Dienstfolgen.
* **Wunscherfassung:** Nur im Planungsmodus lassen sich explizite Mitarbeiterwünsche (z. B. `BD_WISH`, `NO_DUTY`) hinterlegen.

### 5.6 Dashboard- und Analyse-Ebenen

Die Anwendung berechnet Metriken in Echtzeit und visualisiert diese auf verschiedenen Granularitätsebenen:

* **Stats-Bar (Header):** Permanente Live-Übersicht über die Summen aller Codes (z. B. Anzahl `K`, `U`, `FZA`, `D`) des aktuell geladenen Monats.
* **Abteilungs-Dashboard:** Zeigt die Gesamt-Abdeckung (`Coverage`), Urlaubsquoten und Unterdeckungen. Die Ansicht kann auf das gesamte Jahr umgeschaltet werden, um saisonale Schwankungen und "Aktiv-Tage" des Teams zu analysieren.
* **Mitarbeiter-Liste:** Eine filterbare Übersicht (CA, OA, FA, AA) mit kompakten KPI-Karten für jeden Mitarbeiter. Zeigt Soll/Ist-Zustände und Fehltage.
* **Profil-Modal:** Das ultimative Detail-Werkzeug pro Mitarbeiter.
* **KPI-Karten:** Werktage, Urlaubsanspruch, D/HG-Summen mit Trend-Indikatoren (▲/▼) im Vergleich zum Vormonat.
* **Donut-Charts & Bar-Charts:** Grafische Verteilung der Arbeitsplätze (z. B. 60% MRT, 40% CT) via Chart.js.
* **Day-of-Week-Analyse (DOW):** Balkendiagramme, die aufschlüsseln, an welchen Wochentagen der Mitarbeiter historisch am häufigsten gearbeitet oder Dienst geleistet hat.
* **Jahrestrend:** Ein kombiniertes Linien- und Balkendiagramm, das die Belastung (Aktive Tage, D, HG, Urlaub) über alle 12 Monate visualisiert.



### 5.7 Mobile Optimierung

RadPlan liefert auf Smartphones eine radikal angepasste UX (`css/mobile-optimization.css`).

* **Listen-Ansicht:** Das komplexe Grid wird in eine scrollbare, kartenbasierte Tagesliste transformiert.
* **Bottom Navigation:** Für ergonomische Daumen-Erreichbarkeit.
* **Slide-Up Modals:** Dialoge öffnen sich als flüssige Bottom-Sheets, die den Safe-Area-Inset (`env(safe-area-inset-bottom)`) moderner Smartphones (z. B. iPhone 14 Pro) präzise respektieren.

---

## 6. AutoPlan: Der Neural Scheduler (v3.2)

Das Meisterstück der Automatisierung liegt in `js/autoplan.js`. Der **Neural Scheduler** ist ein hochkomplexes Optimierungssystem, das eine mathematisch perfekte Verteilung der Dienste generiert.

### 6.1 Die 15-Phasen-Optimierungspipeline

Das System operiert nicht linear, sondern in massiv iterativen Zyklen, um das globale Optimum zu finden:

1. **Initialisierung & Datenaggregation:** Laden historischer Daten. Auffüllen zwingend erforderlicher `F`-Tage nach manuell vorfixierten Bereitschaftsdiensten.
2. **Konstruktive Phase (Greedy):** Erstverteilung der BDs an Wochenenden/Feiertagen, danach Werktage. Es greifen harte K.O.-Kriterien.
3. **Deterministisches Bundling:** Feste Verknüpfungen werden geschmiedet (z. B. übernimmt der Wochenend-FA zwingend den HG des Assistenzarztes am Freitag).
4. **HG-Rhythmisierung:** Verteilung der Hintergrunddienste unter strikter Berücksichtigung des Anti-Clusterings (Vermeidung von HG-Blöcken in einem 7-Tage-Fenster).
5. **Multi-Swap-Optimierung:** * **80 BD-Swaps:** Verfeinerung der Gerechtigkeit zwischen den Kandidaten.
* **120 HG-Swaps:** Aufbrechen lokaler Ungerechtigkeiten.
* **150 Deep-Optimize-Swaps:** Systemweite, rollenübergreifende Tauschvorgänge zur Behebung komplexer Interdependenzen.


6. **Coverage-Repair & Validierung:** Notfall-Schließung verbleibender Lücken und finale Integritätsprüfung (strikte Exklusivität von max. 1 Dienst/Tag).

### 6.2 Detaillierter Constraint Catalog

Der Algorithmus navigiert durch ein Minenfeld aus Regeln. Verstöße werden durch gewaltige Strafen in der **Global Objective Function** abgewertet.

* **K.O.-Kriterien:** Urlaubs-Integrität, Wünsche (`NO_DUTY`), Dienst-Exklusivität, Qualifikationssperren (nur FA am Wochenende).
* **Ruhezeiten:** Verbot von D-D Ketten. Zwingender F-Tag nach jedem BD.
* **Klinische Interdependenzen (Die Speziallogiken):**
* *Dr. Polednia:* Sperre für BD und AA-HG an Sonntagen, Dienstagen und Donnerstagen wegen zwingender Kinder-Ultraschall-Untersuchungen am Folgetag.
* *Fr. Dalitz:* Darf sonntags und montags keinen HG übernehmen, wenn Hr. Torki/Sebastian BD haben (Vermeidung von Befundungsstaus vor der Mammographie).
* *CT-Leitung:* Dr. Becker und Dr. Martin dürfen niemals gleichzeitig abwesend (Urlaub/FZA) sein. Der Algorithmus plant BDs und die resultierenden F-Tage proaktiv um diese Regel herum.
* *Dr. Becker:* Darf samstags nur als absolute "Ultima Ratio" eingeplant werden. Falls es unvermeidbar ist, zwingt das System einen `FZA`-Tag auf den nächsten regulären Werktag.



### 6.3 Die Objective Function & Das Scoring-Modell

Der Algorithmus bewertet jeden Zustand. Lücken im Dienstplan strafen mit +25.000 Punkten, Abweichungen vom Monatsziel eskalieren quadratisch, und illegale Dienstfolgen schlagen mit bis zu +100.000 Punkten zu Buche. Gleichzeitig werden Wünsche (+220), faire Feiertags-Alternanz (+6) und Donnerstags-Dienste vor dem Urlaub (+150) incentiviert.

### 6.4 Neural Fitness Index (NFI) & 3D-Visualisierung

Das finale Ergebnis wird als **Neural Fitness Index (0.0 bis 100.0)** ausgegeben. Er setzt sich aus BD-Abdeckung (36%), HG-Abdeckung (24%), BD/HG-Gerechtigkeit, Wochenend-Fairness und Wunscherfüllung zusammen.

Während der Berechnung (`requestAnimationFrame`) erzeugt `neuralgraph.js` eine spektakuläre, rotierende 3D-CSS-Matrix (`transform: translateZ(40px) rotateX(...)`), die den komplexen Suchraum und die Tauschvorgänge ("Orbital Core Animation") live visualisiert.

---

## 7. Dateistruktur & Modul-Zusammenhänge im Detail

Die Codebase ist strikt modular in Vanilla JavaScript (ES6 Modules) aufgebaut, um Build-Steps zu vermeiden und maximale Browser-Performance zu garantieren.

* **`index.html`**: Das semantische Rückgrat. Beherbergt die App-Shell, alle Modals (Editor, Profil, AutoPlan, Dashboard), die Dropzones für den Import und die SVG-Ikonographie.
* **`js/constants.js`**: Das Herz des statischen Datenmodells. Enthält die Definitionen aller `WORKPLACES`, `STATUSES`, die Personal-Stammdaten (`EMP_META` inkl. Rollen, FTE, Tags) sowie fundamentale Hilfsfunktionen für Feiertagsberechnungen (`getSaxonyHolidaysCached`) und Kalender-Mathematik.
* **`js/state.js`**: Der zentrale Memory-Store. Verwaltet `DATA`, den `planMode`-Zustand, das Session-Handling, die Undo/Redo-Historie und die kritische `syncWithServer`-Funktion für den Cloudflare KV-Austausch.
* **`js/model.js`**: Die Business-Logik-Schicht. Kapselt alle Getter und Setter für die Zellen (`getCell`, `setCell`), berechnet Aggregationen (`dayCodeCount`), validiert Post-BD-Ruhetage (`ensurePostBDFreiDays`) und kompiliert die massiven Datenobjekte für die Dashboard-Metriken (`buildProfileStats`, `buildYearlyStats`).
* **`js/render.js`**: Die View-Engine. Reagiert auf State-Changes und zeichnet die Monatsmatrix (`renderTbody`), die mobilen Listen (`renderMobileDayList`), injiziert die Chart.js-Graphen im Profil-Modal und steuert die Responsive-Breakpoints (`syncViewportCssVars`). Übernimmt auch die Drag-Selektionslogik im Grid.
* **`js/app.js`**: Der Controller. Bindet Event-Listener, verknüpft Tastatur-Shortcuts mit Aktionen (`handleGridKeydown`), steuert das Öffnen und Speichern des Editors (`openEditor`, `saveEditor`) und wickelt den File-Upload/JSON-Import ab.
* **`js/autoplan.js`**: Beherbergt den kompletten **Neural Scheduler**. Beinhaltet alle in Abschnitt 6 beschriebenen Constraints, die `computeAutoPlan`-Schleife und die Score-Evaluations-Metriken.
* **`js/neuralgraph.js`**: Eine isolierte, hochperformante Animations-Klasse. Generiert das 3D-Grid für den AutoPlan-Ladebildschirm mithilfe von CSS3-Hardwarebeschleunigung.
* **`js/contextmenu.js`**: Implementiert ein unaufdringliches, abfangendes Rechtsklick-Menü mit Glassmorphism-Effekten für administrative Zeilenaktionen.
* **`functions/api.js`**: Ein schlanker, robuster Cloudflare Worker (Node.js/V8 Umgebung), der die REST-Schnittstelle (GET/POST) zum `RADPLAN_KV` Backend bereitstellt und Konfliktauflösungen via `lastModified`-Timestamps orchestriert.
* **`css/*`**: Eine modulare CSS-Architektur (`core.css`, `layout.css`, `components.css`, `views.css`, `modals.css`, `mobile-optimization.css`), die tiefen Gebrauch von CSS-Variablen macht, um das konsistente "Warm Minimalism"-Theming zu gewährleisten.

---

## 8. Export, Import & Sicherheit

Das System bietet vollständige Datensouveränität.

* Über den **Export-Button** (Strg+S) wird der komplette `DATA`-Baum inklusive aller gespeicherten Monats-Entwürfe des Planungsmodus sofort als lokales JSON-File generiert.
* Der **Import** unterstützt Drag & Drop auf eine interaktive Dropzone (`#import-dropzone`). Fehleingaben werden abgefangen, valides JSON direkt gemergt. Die Daten verlassen zu keinem Zeitpunkt den Browser, es sei denn, der Cloud-Sync ist aktiv geschaltet.

---

## 9. Fazit

RadPlan ist mehr als eine simple Tabelle – es ist ein reaktives Expertensystem. Durch die konsequente Auslagerung von Prüflogiken an den **Neural Scheduler**, das blitzschnelle **Multi-Day-Batch-Editing** und die tiefgehende **Visualisierung historischer Dienstlasten** wird die Dienstplanung in der Radiologie von einer fehleranfälligen Administrationsaufgabe zu einem strategischen, beinahe schwerelosen Prozess transformiert. Die strikte Anwendung klinischer Regeln kombiniert mit "Quiet Luxury" UI-Elementen sorgt für maximale Handlungsfreiheit bei absoluter Systemstabilität.
