# RadPlan v3 — Digitaler Dienstplan für die Klinik für Radiologie & Nuklearmedizin

RadPlan v3 ist eine vollständig clientseitige, hochperformante Single-Page-Application (SPA) zur Verwaltung und algorithmischen Optimierung von ärztlichen Dienstplänen. Die Anwendung verzichtet auf ein Backend und speichert alle Daten lokal (Local Storage) bzw. ermöglicht den dateibasierten Im- und Export via JSON.

## 1. Systemarchitektur & Technologie-Stack

* **Kern-Technologie**: Natives HTML5, Vanilla JavaScript (ES6 Modules) und reines CSS (CSS Grid, Flexbox, Custom Properties).
* **3D-Engine & Animation**: Integration von **Three.js** für hardwarebeschleunigtes WebGL-Rendering und **GSAP** (GreenSock Animation Platform) für flüssige, interpolierte High-Frame-Rate-Animationen (60/120fps).
* **Design-Sprache**: Glassmorphismus (Navy-Darkmode), starker Einsatz von `backdrop-filter` (Blur), CSS-Transitions, responsives Design (Mobile-First-Adaption für Smartphones).
* **Zustandsverwaltung (State Management)**: Globaler State (`state.js`), streng getrennt von DOM-Updates (`render.js`) und Geschäftslogik/Modellen (`model.js`).
* **Dienstplan-Struktur**: Matrix-Darstellung mit sticky Headern/Columns. Jeder Knotenpunkt (Zelle) speichert Arbeitsplatz (`assignment`) und Dienst (`duty`).

---

## 2. Benutzeroberfläche (UI) & Interaktion

### 2.1 Hauptansicht (Matrix)
* **Dienstplan-Tabelle**: Zeigt alle Mitarbeitenden (Y-Achse) und die Tage des Monats (X-Achse). Wochenenden und Feiertage (Sachsen) sind farblich hervorgehoben.
* **Kopfzeile (Header)**: Enthält Zeitraumsteuerung, Schnellzugriffe (Heute, Abteilung, Planung, Export/Import).
* **Zell-Interaktion**: Klick auf eine Zelle öffnet den **Editor-Modal**.
* **Statistik-Leiste**: Berechnet in Echtzeit die Verteilung von Bereitschaftsdiensten (D) und Hintergrunddiensten (HG) für den aktuellen Monat.

### 2.2 Zeitraumsteuerung (Period Flyout)
* Ein modales Dropdown-Menü (Glassmorphism-Panel) zur unabhängigen Navigation von Monat und Jahr, ohne die aktuelle Ansicht (z.B. geöffnetes Modal) zwangsweise zu zerstören.

### 2.3 Jahres-Dashboard Mitarbeitende (Employee Dashboard)
* Detailansicht für jeden Mitarbeiter über das gesamte Kalenderjahr.
* Zeigt summierte KPIs (D, HG, Urlaub, Krank), eine aggregierte Monats-Tabelle und Detailkacheln für einzelne Monate.

### 2.4 Abteilungsübersicht (Dept View)
* Zeigt den Deckungsgrad aller Arbeitsplätze (MR, CT, Angio etc.) pro Tag an. Warnt bei Unterbesetzung (rot) oder fehlendem Dienst.

---

## 3. Der Editor (Manuelle Planung)

Das Modal zur Zellbearbeitung bietet kontextsensitive Optionen:
* **Arbeitsplatz**: Zuweisung von Modalitäten (MR, CT, US, etc.) – Mehrfachauswahl möglich.
* **Status**: Exklusive Stati (Urlaub, Krank, FZA, F, Frei). Überschreibt den Arbeitsplatz.
* **Dienst**: Zuweisung von `D` (Bereitschaftsdienst) oder `HG` (Hintergrund).
* **Dienstwünsche (Nur im Planungsmodus)**: Zuweisung von `BD_WISH` (D-Wunsch), `HG_WISH` (HG-Wunsch) oder `NO_DUTY` (Kein Dienst).
* **Automatischer Ruhetag**: Wird ein `D` manuell gesetzt, trägt das System am Folgetag automatisch ein `F` ein (sofern dort nicht bereits ein Urlaub oder anderer Status existiert).
* **RD Neurorad (Sonderzeile)**: Wird rein manuell über Text-Input gepflegt und von der Auto-Planung ignoriert.

---

## 4. Planungsmodus & Historie (Sandbox)

Der Planungsmodus entkoppelt die aktuelle Bearbeitung vom Hauptdatenstamm (`DATA`).
* **Isolation**: Alle Änderungen finden in `planData` statt.
* **Undo/Redo**: Jeder Schreibvorgang pusht einen Klon des States in `planHistory` (Strg+Z / Strg+Y).
* **Persistenz**: Entwürfe können lokal als Draft gespeichert (`savePlanDraft`) und später in den Hauptplan übernommen (`applyPlanToMain`) werden.

---

## 5. RadPlan Neural Scheduler (AutoPlan Algorithmus)

Das Herzstück der Anwendung ist der in `autoplan.js` implementierte Algorithmus zur automatischen Dienstverteilung. Er kombiniert Greedy-Heuristiken mit einer Multi-Zyklus-Optimierung (Deep Optimize) und garantiert strikte Dienst-Exklusivität (genau ein D und ein HG pro Tag).

### 5.1 Vorbereitung & Historische Daten
Der Algorithmus sammelt vor der Ausführung historische Dienstdaten (`collectHistoricalDutyStats`) aller Vormonate des aktuellen Jahres. Dies dient dem **Ausgleich von Diskrepanzen** (z.B. wer hatte bisher die meisten Feiertagsdienste oder Samstags-BDs?).

### 5.2 Constraint-Regeln & Gewichtung (Objective Function)
Der Algorithmus bewertet jeden potenziellen Dienst-Kandidaten über ein Scoring-System (Startwert: 100). Harte Verstöße werfen den Kandidaten aus dem Pool (Score: `-Infinity`), weiche Verstöße verringern den Score drastisch.

#### Harte Constraints (K.-o.-Kriterien)
* Person ist von Diensten befreit (`DUTY_EXEMPT`: Prof. Schäfer).
* Person hat Urlaub (`VACATION_CODES`) oder ist abwesend (`ABSENCE_CODES`).
* Person hat ausdrücklich "Kein Dienst" (`NO_DUTY`) gewünscht.
* Für `D` am Samstag: Person MUSS Facharzt sein (Dr. Becker ist als Backup-Facharzt zugelassen, aber stark pönalisiert).
* Dienst-Kollision: Am Vortag oder Folgetag existiert bereits ein `D`.
* Gesetzter Ruhetag (`F`) verbietet Dienste (außer HG am Wochenende).
* Urlaub am Folgetag verbietet `D`.
* Mammographie-Konflikt: Fr. Dalitz darf sonntags/montags keinen HG machen, wenn Hr. Torki/Hr. Sebastian am selben Tag den `D` haben.
* Feiertags-Block: Wer Ostern/Pfingsten gearbeitet hat, ist für den jeweils anderen Block gesperrt.

#### Scoring-Gewichte (Soft Constraints & Penalties)
**Bereitschaftsdienst (D):**
* *Zielerfüllung*: +5000 Punkte pro fehlendem Dienst bis zum Monatsziel.
* *Soll-Überschreitung*: -50000 Punkte pro Dienst *über* dem Monatsziel.
* *Wunschdienst*: +220 Punkte.
* *Vor Urlaub (Do)*: +150 Punkte.
* *Wochenenden (Fr-So)*: Ziel = 1 WE-Dienst. Abweichung kostet 220 Punkte. Über 1.5 (Relaxed Limit) kostet 1000 Punkte.
* *Zwei WE in Folge*: -1500 Punkte.
* *Samstags-Facharzt*: Noch kein Samstag im Monat = +5000. Zweiter Samstag = -25000 (Pönalisierung). Abweichung vom FA-Durchschnitt = -1500.
* *Dr. Becker Samstag (Notlösung)*: -5000 Punkte.
* *Abstand*: Weniger als 4 Tage Abstand zum letzten `D` = -250 Punkte pro fehlendem Tag.
* *D-F-D-F Muster*: -500 Punkte.
* *Feiertagsausgleich*: Bevorzugt Personen, die historisch unter dem Durchschnitt der Feiertagsdienste liegen (+6 Punkte pro Delta).

**Hintergrunddienst (HG):**
* *Darf nur von Fachärzten gemacht werden.*
* *Wunschdienst*: +500 Punkte.
* *Monatsausgleich*: Starke Pönalisierung (-10000), wenn die summierte Belastung (HG + Delta der D-Dienste) vom FA-Durchschnitt abweicht.
* *Historischer Ausgleich*: -5 Punkte pro historischem Überhang.
* *Urlaub am Folgetag*: -100 Punkte.
* *Wochenenden*: Starke Pönalisierung bei > 1 WE-Dienst (-1500), massiv bei > 1.5 (-5000). Aufeinanderfolgende WE = -2500.
* *Abstand*: Weniger als 3 Tage = -8000 Punkte.
* *Direkt-HG (Vortag/Folgetag)*: -25000 Punkte.

### 5.3 Die Phasen des Algorithmus

1.  **Initialisierung**: Laden der Ziele (Targets). Default: 3 für bestimme FAs, 4 für alle anderen (außer Befreite). Auto-Auffüllen fehlender `F` nach manuell gesetzten `D`.
2.  **Phase 4: Greedy Weekend BD**: Verteilt zuerst die Wochenend- und Feiertags-BDs an die Kandidaten mit dem höchsten Score.
3.  **Phase 5: Greedy Workday BD**: Verteilt die restlichen Werktags-BDs.
4.  **Phase 6: HG Bundling**:
    * *Freitags-Kopplung*: Macht ein Assistenzarzt am Freitag `D`, wird der FA, der den Samstags-`D` macht, gezwungen, den Freitags-`HG` zu übernehmen.
    * *Samstags-Kopplung*: Der FA, der am Samstag `D` macht, muss am Sonntag den `HG` übernehmen.
    * *Feiertags-Vortag*: Macht ein AA vor einem Feiertag `D`, übernimmt der FA des Feiertags den `HG` am Vortag.
5.  **Phase 7: Greedy HG Assign**: Füllt die verbleibenden HG-Lücken auf Basis der HG-Scoring-Funktion.
6.  **Phase 8: Multi-Zyklus-Optimierung (Deep Optimize)**:
    * Führt bis zu 25 Meta-Zyklen durch. Jeder Zyklus beinhaltet `BD_MAX_PASSES` (80) und `HG_MAX_PASSES` (120).
    * Der Algorithmus testet für jeden Tag (Swap/Move), ob ein Tausch der Person zu einem besseren Wert der **Global Objective Function** führt.
    * Die Global Objective Function berechnet quadratische Abweichungen vom Mittelwert (Fairness-Verteilung) für BD, HG, AA-Begleitung, Wochenenden und bestraft harte Verstöße (Doppelbelegung = +100000).
    * Bricht ab, wenn der Global Score konvergiert (keine Verbesserung mehr).
7.  **Coverage Repair**: Falls das strenge Scoring Lücken hinterlassen hat, werden Regeln "aufgeweicht", um zwingend jeden Tag mit D und HG zu besetzen (Fallback).
8.  **FZA-Kompensation**: Falls Dr. Becker gezwungen wurde, einen Samstag zu arbeiten, sucht das System den nächsten verfügbaren Werktag und trägt dort automatisch ein "FZA" ein. Bei Blockaden wird eine kritische Warnung generiert.

---

## 6. Cineastische WebGL-Visualisierung (Neural Constellation)

Während der Algorithmus in `autoplan.js` läuft (gedrosselt via künstlichem `sleep`), sendet er Telemetrie- und Vektordaten (Tage, IDs, Swaps, Errors) an die `NeuralGraph`-Instanz (`js/neuralgraph.js`).

* **Szenengraph**: Ein 3D-Knoten-Netzwerk. Tage sind als Ring angeordnet, Mitarbeitende als schwebende Konstellation darüber.
* **Partikel & Shader**: Knoten glühen (Additive Blending) und sind über ein Wireframe-Mesh verbunden.
* **Animationen**:
    * *Kamera*: Smoothe GSAP-Kamerafahrten durch die Phasen (Init -> Deep Optimize -> Success).
    * *Swaps (`triggerSwap`)*: Erzeugt einen leuchtenden, interpolierten Tracer-Strahl zwischen Mitarbeiter und Tag, gefolgt von einer blauen Partikelexplosion.
    * *Errors/Penalties (`triggerError`)*: Erzeugt einen roten Lichtblitz (PointLight) und rote Partikel bei Konflikten.
    * *Convergence*: Bei Abschluss färbt sich das Netz grün (`#22C55E`) und beruhigt sich.
* **Daten-Stream**: Parallel zur WebGL-Szene läuft in der DOM-Ansicht die `Trace Console`, die die Logs des Algorithmus zeilengenau (inkl. Millisekunden) ausgibt.

---

## 7. Metriken & Abschlussbericht (NFI)

Nach Abschluss präsentiert das System das Ergebnis-Modal. Die wichtigste Kennzahl ist der **Neural Fitness Index (NFI)** (Maximal 100.0). Er berechnet sich aus:
* Basis: 100.0
* Minus 15.0 pro unbesetztem D, Minus 10.0 pro unbesetztem HG.
* Minus 2.5 * BD-Spread (Max-BD minus Min-BD).
* Minus 1.5 * HG-Spread (Max-HG minus Min-HG).
* Minus 2.0 * Weekend-Spread.
* Plus 5.0 * Wunscherfüllungsrate (0.0 bis 1.0).
* Minus 0.005 pro Deep-Move (um übermäßige Instabilität leicht abzustrafen).

Zusätzlich generiert das System Warnungen (z.B. Verletzung der Wochenend-Grenzen oder Konflikte) und bietet einen detaillierten Log ("Abschlussbericht"), der jede getroffene algorithmische Entscheidung pro Tag auflistet und fachlich begründet.