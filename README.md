# RadPlan – Neural Scheduler & Duty Management System

**RadPlan** ist eine hochspezialisierte, reaktive und vollständig clientseitig operierende Web-Applikation zur Dienst- und Arbeitsplatzplanung in radiologischen Kliniken. Die Anwendung kombiniert eine hochperformante, datengesteuerte Benutzeroberfläche mit einem iterativen, heuristischen Optimierungsalgorithmus (**Neural Scheduler**), um komplexe Dienstpläne (Bereitschafts- und Hintergrunddienste) unter Berücksichtigung strenger arbeitsrechtlicher, ergonomischer und individueller Constraints automatisiert zu generieren.

---

## 1. Systemarchitektur & Technologie-Stack

Die Applikation ist nach dem Prinzip einer **Progressive Web App (PWA)** konzipiert und verzichtet vollständig auf externe Frameworks oder Backend-Abhängigkeiten. 

* **Kern-Technologien:** Vanilla JavaScript (ES6+), HTML5, CSS3 (CSS Variables, Flexbox, CSS Grid, 3D Transforms).
* **Persistenz-Schicht:** Vollständige Datenspeicherung im lokalen `localStorage` des Browsers. Das Datenmodell wird echtzeitfähig serialisiert und deserialisiert.
* **Offline-Fähigkeit:** Ein integrierter Service Worker (oder Fetch-Interceptor) fängt Netzwerk-Requests (`/api?action=save`, `/api?action=load`) ab und simuliert HTTP-Responses, um eine lückenlose Offline-Nutzung inklusive persistenter Speicherung zu garantieren.
* **Rendering-Engine:** Ein feingranulares, zustandsbasiertes Rendering (`js/render.js`). DOM-Updates erfolgen selektiv und responsiv. 
* **Visualisierung:** Native HTML5-Canvas-API und hardwarebeschleunigte CSS-3D-Matrizen für die Darstellung des algorithmischen Fortschritts.

---

## 2. Das Datenmodell (State & Storage)

Der Zustand der Applikation (`state.js`) trennt strikt zwischen **Persistent Data** (Dienstpläne, Mitarbeiterstamm) und **Volatile Data** (UI-Status, geöffnete Modals, Planungs-Drafts).

### 2.1 Persistente Struktur (`DATA`)
Die Datenstruktur ist chronologisch in Monats-Schlüsseln (z. B. `2026-03`) organisiert:
* `employees`: Array von Strings (Namen der aktiven Mitarbeiter im Monat).
* `assignments`: Objekt, das jedem Mitarbeiter ein weiteres Objekt (Tag -> Zuweisung) mappt.
  * *Struktur:* `assignments["Dr. Muster"]["15"] = { assignment: "MR/CT", duty: "D" }`
* `rbn`: Separates Mapping für stationsübergreifende Rollen (z. B. Neuroradiologie).
* `wishes`: Objekt zur Speicherung von Dienstwünschen (`BD_WISH`, `HG_WISH`, `NO_DUTY`).

### 2.2 Planungsmodus (Draft & History)
Beim Betreten des Planungsmodus (`enterPlanMode`) wird ein **Isolierter Speicher-Branch** (Snapshot) erstellt. 
* **History-Stack:** Jede Aktion (Zuweisung, Löschung) pusht einen Deep-Clone des Monats in das `planHistory`-Array.
* **Undo/Redo:** Manipulation des Pointers (`planHistoryIdx`) ermöglicht verlustfreies Navigieren in der Historie.
* **Commit/Abort:** Erst bei "Übernehmen" wird der Draft-Branch in das Haupt-`DATA`-Objekt gemerged.

---

## 3. Benutzeroberfläche (UI) & Module

Die Designsprache folgt einem extrem verdichteten, datengetriebenen Ansatz ("High-Density UI") mit klarem Fokus auf **visuelle Informationshierarchie** und **telegrafischen Nominalstil**.

### 3.1 Hauptkalender (Main Grid)
* **Desktop-Ansicht:** Matrix (Mitarbeiter auf Y-Achse, Tage auf X-Achse). Wochenenden und Feiertage (berechnet via dynamischem Feiertags-Array für Sachsen) sind visuell abgedunkelt.
* **Responsive Breakpoint:** Wechselt bei `< 1200px` (oder Touch-Devices) in eine vertikale Kartenansicht (`renderMobileDayList`).
* **Zell-Interaktion:** Klick auf eine Zelle öffnet den Editor. Zuweisungen sind mehrfach wählbar (z.B. "MR/CT"), Status (z.B. "U", "K") sind exklusiv.
* **Statistik-Fußzeile:** Aggregiert die tägliche Belegung aller Arbeitsplätze. Warnungen (Rot) bei doppelter Dienstvergabe.

### 3.2 Mitarbeiter-Dashboard (`modal-emps`)
* **KPI-Metriken:** Anzeige von aktiven Monaten, Abdeckungsquote, kumulierten Diensten (D/HG) und Fehlzeiten pro Jahr.
* **Filterung:** Facettierung nach Qualifikationsebene (CA, OA, FA, AA).
* **Profil-Integration:** Klick auf einen Mitarbeiter öffnet die detaillierte Profil-Ansicht (`modal-profile`).

### 3.3 Profil & Analytics (`modal-profile`)
* **Radar & Verteilung:** Berechnet die Auslastung (FTE-Äquivalent), Urlaubstage, Krankheitstage und Freizeitausgleich (FZA) für den spezifischen Monat und das Gesamtjahr.
* **Dienst-Kaskade:** Listet explizit alle D- und HG-Tage.
* **Mini-Jahreskalender:** 12-Monats-Übersicht mit Heatmap-Charakter für schnelle Fehlzeiten-Identifikation.

### 3.4 Abteilungs-Ansicht (`modal-dept`)
* Aggregiert die Daten *aller* Mitarbeiter gegen die zur Verfügung stehenden *Werktage*.
* Zeigt Lücken in der Arbeitsplatzbesetzung (Coverage-Prozent) und identifiziert Engpässe.

---

## 4. Der "Neural Scheduler" (Auto-Plan Algorithmus)

Das Herzstück von RadPlan ist der in `js/autoplan.js` implementierte Optimierungsalgorithmus. Er löst das NP-schwere Problem der Dienstplanung durch eine mehrstufige Heuristik, kombiniert mit einer mutationsbasierten Tiefensuche (Simulated Annealing Derivat).

### 4.1 Die vier Berechnungsphasen

1. **Initialisierung & Constraint-Analyse (`init`)**
   * Extrahieren der Monatsmatrix, Identifikation von Feiertagen und Wochenenden.
   * Filtern der befreiten Mitarbeiter (`DUTY_EXEMPT`).
   * Vorberechnung der individuellen D- und HG-Soll-Ziele (Basis: Historiendaten + manuelles Tuning).

2. **Greedy-Heuristik (`greedy`)**
   * **Wochenend-Pass:** Priorisierte Zuweisung von Diensten an Wochenenden und Feiertagen. Der Algorithmus sucht Mitarbeiter mit dem höchsten Rest-Kontingent, minimaler Wochenend-Belastung und prüft zwingend harte Constraints.
   * **Werktag-Pass:** Auffüllen der verbleibenden D-Dienste unter Werktagen. Strenger Fokus auf equidistante Verteilung (Vermeidung von Cluster-Bildung).

3. **Hintergrund-Allokation (`hg`)**
   * Nur Fachärzte/Oberärzte sind HG-qualifiziert.
   * Der HG wird idealerweise komplementär zu einem AA-Bereitschaftsdienst geplant.
   * Priorisierung von Wunsch-Einträgen (`HG_WISH`).

4. **Deep-Search / Optimierung (`deep`)**
   * Ein stochastischer Optimierer (ähnlich Simulated Annealing).
   * Generiert Tausende von zufälligen Swap-Paaren (Tausche Dienst von Tag A zu Tag B oder Mitarbeiter X zu Y).
   * **Scoring-Evaluation:** Jeder Swap wird simuliert und durch die Penalty-Funktion bewertet. Reduziert der Swap den Penalty-Score, wird er akzeptiert (Hill-Climbing).
   * Führt so lange Mutationen durch, bis ein lokales Minimum erreicht ist (Konvergenz) oder das Limit der Iterationen überschritten ist.

### 4.2 Harte Constraints (K.O.-Kriterien / Illegale Zustände)
Ein Dienst wird **niemals** zugewiesen, wenn eine dieser Bedingungen zutrifft (gibt `-Infinity` oder massive Penalty):
1. **Abwesenheit:** Der Mitarbeiter hat "U" (Urlaub), "K" (Krank), "FZA", "WB" oder einen anderen Sperrstatus.
2. **Mehrfachdienst:** Der Tag ist bereits mit einem D oder HG für diesen Mitarbeiter belegt.
3. **Folgetag-Kollision:** Der Tag *nach* dem anvisierten Dienst ist bereits mit einem Dienst (D/HG) oder einem festen Arbeitsplatz (MR/CT) belegt, der nicht in "F" (Frei) umgewandelt werden kann. (Gesetzliche Ruhezeit).
4. **Vortag-Kollision:** Der Mitarbeiter hat am *Vortag* bereits einen D-Dienst.
5. **Wunsch-Veto:** Der Mitarbeiter hat explizit `NO_DUTY` (Sperrwunsch) für diesen Tag eingetragen.

### 4.3 Weiche Constraints & das Penalty-Scoring-System
Der Algorithmus minimiert einen globalen Penalty-Score. Höhere Penalties bedeuten eine schlechtere Bewertung.

* **Gap Penalty (Die schwerwiegendste Strafe):** * Jeder Tag ohne besetzten D-Dienst: `+1000` Punkte.
  * Jeder Tag ohne besetzten HG-Dienst: `+1000` Punkte.
* **Target Deviation Penalty (Zielerreichung):**
  * Verfehlt ein Mitarbeiter sein D-Dienst-Soll: `(Ist - Soll)^2 * 50`. Die quadratische Funktion bestraft große Abweichungen exponentiell.
* **Weekend Overload Penalty:**
  * Mehr als `RELAXED_WEEKEND_DUTY_LIMIT` (Standard: 2) Wochenend-/Feiertagsdienste pro Person generieren massive Strafen.
  * Verhinderung von Wochenend-Clustern (Dienst am Samstag *und* Sonntag für dieselbe Person).
* **Spacing Penalty (Erholungsphasen):**
  * Dienste, die weniger als 3 Tage auseinander liegen, generieren gestaffelte Strafen (z. B. 2 Tage Abstand = `+40` Punkte).
* **Wish Fulfillment Bonus:**
  * Erfüllter `BD_WISH` oder `HG_WISH` reduziert den Penalty-Score (Bonus von `-30` Punkten).

### 4.4 Neural Fitness Index (NFI)
Das rohe Penalty-Ergebnis wird in einen normierten NFI überführt (0.0 bis 100.0). 
* **Formel:** `Fitness = 100 - (TotalPenalty / NormalizationFactor)`
* Ein NFI von `>= 80` gilt als "Sehr Gut". Der NFI sinkt massiv, sobald Lücken (Gaps) im Plan existieren oder die Streuung (Spread) der Dienste zwischen den Ärzten ungleichmäßig ist.

### 4.5 Visualisierung des Algorithmus (`neuralgraph.js`)
Während der Berechnung (`computeAutoPlan`) wird das Modal blockiert und der Berechnungsprozess asynchron via `streamProgressLogs` gerendert.
* **Isometrisches 3D-Grid (Main):** Ein rotierendes, schwebendes (`ngFloating`) 7-Spalten-Raster. Bei jeder Zuweisung oder Swap-Operation "feuert" die spezifische Tages-Zelle, pulsiert und injiziert das Namenskürzel des Mitarbeiters.
* **Topologie-HUD (MiniMap):** Eine minimalistische Canvas-Darstellung eines bidirektionalen Datenbusses. Synapsen (Puls-Partikel) wandern von links nach rechts synchron zu den Log-Einträgen. Die Farbcodierung spiegelt die aktuelle Berechnungsphase wider (Cyan = Init, Gelb = Greedy, Blau = HG, Violett = Deep, Grün = Success, Rot = Constraint Violation).

---

## 5. Datenstruktur Referenz (Code-Mapping)

| Kürzel | Bedeutung | Typ | Farbe (UI) |
| :--- | :--- | :--- | :--- |
| **D** | Bereitschaftsdienst | Duty | Rot (`#EF4444`) |
| **HG** | Hintergrunddienst | Duty | Blau (`#0EA5E9`) |
| **MR** | MRT | Workplace | Indigo (`#6366F1`) |
| **CT** | Computertomographie | Workplace | Orange (`#F97316`) |
| **U** | Urlaub | Status | Violett (`#8B5CF6`) |
| **K** | Krank | Status | Dunkelrot (`#B91C1C`) |
| **F** | Frei (Post-BD) | Status | Grau (`#64748B`) |

## 6. Import / Export & Datensicherheit

Die Funktion `doExport` iteriert über den gesamten `localStorage`, extrahiert das Basis-`DATA`-Objekt sowie alle gespeicherten `radplan_v3_plan_YYYY_MM`-Drafts und kompiliert diese in ein einziges JSON-Dokument. Der Import parst dieses Dokument, führt eine Integritätsprüfung durch und erzwingt zwingend die Ausführung von `ensurePostBDFreiDays()`, um sicherzustellen, dass keine illegalen Zustände (fehlender Ruhetag nach Import) in den Plan geraten.

---

*(Dokumentation generiert passend zu Build v3.0 / Neural Scheduler Edition)*
