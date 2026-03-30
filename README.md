# RadPlan – Neural Scheduler & Duty Management System

**RadPlan** ist eine hochspezialisierte, reaktive und vollständig clientseitig operierende Web-Applikation zur Dienst- und Arbeitsplatzplanung in radiologischen Kliniken. Die Anwendung kombiniert eine hochperformante, datengesteuerte Benutzeroberfläche mit einem iterativen, heuristischen Optimierungsalgorithmus (**Neural Scheduler**), um komplexe Dienstpläne (Bereitschafts- und Hintergrunddienste) unter Berücksichtigung strenger arbeitsrechtlicher, ergonomischer und individueller Constraints automatisiert zu generieren und visuell auszuwerten.

---

## 1. Systemarchitektur & Technologie-Stack

Die Applikation ist nach dem Prinzip einer **Progressive Web App (PWA)** konzipiert und verzichtet vollständig auf externe Frameworks (kein React, Angular oder Vue) oder Backend-Abhängigkeiten (keine Datenbank, kein Node.js). 

* **Kern-Technologien:** Vanilla JavaScript (ES6+ Module), HTML5, CSS3 (CSS Variables, Flexbox, CSS Grid, 3D Transforms).
* **Persistenz-Schicht:** Vollständige Datenspeicherung im lokalen `localStorage` des Browsers. Das Datenmodell wird echtzeitfähig serialisiert und deserialisiert.
* **Offline-Fähigkeit:** Ein integrierter Fetch-Interceptor (`js/render.js`) fängt ausgehende Netzwerk-Requests (`/api?action=save`, `/api?action=load`) ab und simuliert synthetische HTTP-Responses. Dies verhindert 404-Fehler und garantiert eine lückenlose Offline-Nutzung inklusive persistenter Speicherung.
* **Rendering-Engine:** Ein feingranulares, zustandsbasiertes Rendering-Modul. DOM-Updates erfolgen selektiv, responsiv und Event-getrieben.
* **Visualisierung:** Native HTML5-Canvas-API und hardwarebeschleunigte CSS-3D-Matrizen (`js/neuralgraph.js`) für die asynchrone Darstellung des algorithmischen Fortschritts.

---

## 2. Das Datenmodell (State & Storage)

Der Zustand der Applikation (`js/state.js`) trennt strikt zwischen **Persistent Data** (Dienstpläne, Mitarbeiterstamm) und **Volatile Data** (UI-Status, geöffnete Modals, Planungs-Drafts, Viewport-Metriken).

### 2.1 Persistente Struktur (`DATA`)
Die Kern-Datenstruktur ist chronologisch in Monats-Schlüsseln (Format: `YYYY-MM`, z. B. `2026-03`) organisiert. Jeder Monat enthält:
* `employees`: Array von Strings. Definiert die exakten Namen der aktiven Mitarbeiter in diesem spezifischen Monat (ermöglicht historische Konsistenz bei Personalwechseln).
* `assignments`: Verschachteltes Dictionary-Objekt, das jedem Mitarbeiter ein Tages-Mapping zuordnet.
  * *Struktur:* `assignments["Dr. Muster"]["15"] = { assignment: "MR/CT", duty: "D" }`
  * `assignment`: Arbeitsplatz (z.B. "MR", "CT") oder Status (z.B. "U", "K", "F"). Mehrfachauswahl via Slash getrennt ("MR/US").
  * `duty`: Spezifischer Dienst ("D" für Bereitschaft, "HG" für Hintergrund) oder `null`.
* `rbn`: Separates Key-Value-Mapping (`Tageszahl -> Mitarbeitername`) für die stationsübergreifende Rolle der Neuroradiologie.
* `wishes`: Dictionary zur Speicherung von Dienstwünschen (`BD_WISH`, `HG_WISH`, `NO_DUTY`).

### 2.2 Planungsmodus (Draft & History System)
Beim Betreten des Planungsmodus (`enterPlanMode`) wird die Live-Datenbank vor Mutationen geschützt. Ein **Isolierter Speicher-Branch** (Snapshot) wird im RAM erstellt.
* **History-Stack:** Jede destruktive oder konstruktive Aktion (Zuweisung, Löschung, Auto-Plan) pusht einen isolierten Deep-Clone des aktuellen Monatsstatus in das `planHistory`-Array.
* **Undo/Redo:** Manipulation des Pointers (`planHistoryIdx`) ermöglicht verlustfreies Navigieren in der Historie (Strg+Z / Strg+Y).
* **Commit/Abort:** Erst bei Auslösen von "Planung übernehmen" (`applyPlanToMain`) wird der Draft-Branch destruktiv in das Haupt-`DATA`-Objekt gemerged und im `localStorage` persistiert.
* **Auto-F-Regel:** Das manuelle oder automatische Setzen eines "D"-Dienstes injiziert zwingend ein "F" (Frei) am chronologischen Folgetag, sofern dieser nicht bereits mit einem Urlaubs/Krank-Status belegt ist.

---

## 3. Benutzeroberfläche (UI) & Module

Die Designsprache folgt einem extrem verdichteten, datengetriebenen Ansatz ("High-Density UI") mit klarem Fokus auf **visuelle Informationshierarchie**, **telegrafischem Nominalstil** und **Farb-Konditionierung** (D = Rot, HG = Blau).

### 3.1 Hauptkalender (Main Grid)
* **Desktop-Ansicht:** Zweidimensionale Matrix (Mitarbeiter auf Y-Achse, Tage auf X-Achse). 
* **Dynamische Zeit-Referenzen:** Wochenenden und Feiertage werden algorithmisch on-the-fly berechnet (inklusive sächsischer Spezifika wie Buß- und Bettag) und visuell abgedunkelt. Das aktuelle Tagesdatum wird hervorgehoben (`.today-col`).
* **Zell-Interaktion:** Klick (oder Space/Enter via Keyboard-Navigation) auf eine Zelle öffnet den Modal-Editor. 
* **Statistik-Fußzeile (Tfoot):** Aggregiert vertikal die tägliche Belegung aller Kern-Arbeitsplätze (MR, CT) sowie Dienste. Identifiziert Über- und Unterbesetzungen farblich (Warnung bei >1 Dienst pro Typ/Tag).

### 3.2 Tastatur-Steuerung & Editor (`modal-editor`)
Der Editor ist für maximale Input-Geschwindigkeit ohne Mausbenutzung konzipiert.
* **Ziffern 1–8:** Mappen direkt auf die Arbeitsplätze (1=MR, 2=CT, etc.). Toggle-Verhalten für Mehrfachauswahl.
* **D / H:** Toggelt Bereitschaftsdienst (D) bzw. Hintergrunddienst (HG) für den gewählten Tag.
* **S / Enter:** Speichert die Zuweisung und schließt das Modal.
* Kollisionsprüfung: Das Modal warnt in Echtzeit, wenn der gewählte Dienst bereits an einen anderen Arzt vergeben ist oder der Folgetag ein Urlaubstag ist.

### 3.3 Dashboard & Profil-Analytics (`modal-emps` & `modal-profile`)
* **KPI-Metriken:** Extrahierung von aktiven Monaten, Abdeckungsquote (Coverage), kumulierten Diensten (D/HG) und Fehlzeiten pro Jahr.
* **Rollen-Filter:** Facettierung des Dashboards nach Qualifikationsebene (CA, OA, FA, AA) via Meta-Daten-Mapping.
* **Profil-Radar & Verteilung:** Berechnet die Auslastung (FTE-Äquivalent), Urlaubstage, Krankheitstage und Freizeitausgleich (FZA). Die Coverage berechnet sich aus `Aktiv-Tage / (Gesamt-Werktage - Abwesenheiten)`.
* **Mini-Jahreskalender:** 12-Monats-Übersicht mit monatlichen Aggregationen zur schnellen Identifikation von Urlaubs-Clustern oder Dienst-Häufungen.

### 3.4 Abteilungs-Ansicht (`modal-dept`)
Aggregiert die Daten *aller* Mitarbeiter gegen die zur Verfügung stehenden *Werktage* des Monats oder Jahres.
* **Coverage-Bars:** Zeigt prozentual an, an wie vielen Werktagen die Kernarbeitsplätze (MR, CT) und Leitungsdienste (D, HG) besetzt waren.
* **Team-Bilanz:** Tabellarische Aufschlüsselung der aggregierten Fehlzeiten (U, K, FZA) und offenen Dienst-Lücken pro Mitarbeiter.

### 3.5 Responsive Mobile View
Wechselt bei einer Viewport-Breite `< 1200px` (oder dedizierten Touch-Devices) in eine vertikale, hierarchische Kartenansicht (`renderMobileDayList`). Das horizontale Scrollen entfällt, stattdessen werden Tage als aufklappbare Cards gerendert, in denen die Mitarbeiter nach Funktion (Facharzt / Assistenzarzt) gruppiert sind.

---

## 4. Der "Neural Scheduler" (Auto-Plan Algorithmus)

Das mathematische Herzstück von RadPlan (`js/autoplan.js`). Der Algorithmus löst das NP-schwere Problem der Dienstplanung durch eine kombinierte Architektur aus deterministischer Heuristik und einer mutationsbasierten Tiefensuche (Simulated Annealing Derivat).

### 4.1 Die vier Berechnungsphasen

#### Phase 1: Initialisierung & Constraint-Analyse (`init`)
* Extrahieren der Monatsmatrix, Instanziierung von Feiertags- und Wochenend-Arrays.
* Filtern der befreiten Mitarbeiter (`DUTY_EXEMPT`: Chefärzte, spezifische Oberärzte).
* Berechnung des "Duty-Pools": Ableitung der zu besetzenden D- und HG-Schichten.
* Zuweisung der individuellen **D-Soll-Ziele**. Diese werden im Vorfeld aus der Historie (Vormonate) geladen und können vom User im Config-Modal manuell überschrieben werden (Standard: 3 oder 4).

#### Phase 2: Greedy-Heuristik (`greedy`)
Ein deterministischer Pass für die Erstbefüllung.
* **Wochenend-Pass (`bd_weekend`):** Priorisierte Zuweisung von Diensten an Sams-, Sonn- und Feiertagen. Der Algorithmus sortiert die Ärzte nach verbleibendem Soll-Kontingent und historischer Wochenend-Belastung. Er sucht den "günstigsten" Slot unter strikter Beachtung harter Constraints.
* **Werktag-Pass (`bd_workday`):** Auffüllen der verbleibenden D-Dienste (Mo-Fr). Strenger Fokus auf equidistante Verteilung zur Vermeidung von Dienst-Clustern.

#### Phase 3: Hintergrund-Allokation (`hg`)
* Ein separates Regelwerk greift: Nur Fachärzte/Oberärzte sind HG-qualifiziert (`isFacharzt()`).
* Der HG wird idealerweise komplementär zu einem AA-Bereitschaftsdienst geplant.
* Priorisierung von manuellen Wunsch-Einträgen (`HG_WISH`).

#### Phase 4: Deep-Search / Optimierung (`deep`)
Ein stochastischer Optimierer iteriert über den generierten Plan, um die Fairness (Spread) zu maximieren und weiche Constraints aufzulösen.
* **Generierung:** Pro Iteration werden Tausende von zufälligen Tauschoperationen generiert (Typ A: Verschiebe Dienst von Tag X auf Tag Y. Typ B: Tausche den Diensthabenden an Tag X mit Mitarbeiter Y).
* **Scoring-Evaluation:** Jeder mutierte Zustand wird vollständig durch die Penalty-Funktion (siehe 4.3) gejagt. 
* **Hill-Climbing:** Reduziert der Swap den globalen Penalty-Score, wird der neue State akzeptiert. Verschlechtert er ihn, wird er verworfen.
* Die Phase endet bei Erreichen eines Konvergenz-Plateaus (keine Verbesserung nach X Iterationen) oder dem Erreichen des globalen Move-Limits.

### 4.2 Harte Constraints (K.O.-Kriterien / Illegale Zustände)
Eine Zuweisung wird systemseitig blockiert (Penalty = `Infinity`), wenn:
1. **Status-Sperre:** Der Mitarbeiter hat "U" (Urlaub), "K" (Krank), "FZA", "WB" oder einen anderen protektiven Status.
2. **Double-Duty:** Der Tag ist für diesen Mitarbeiter bereits mit einem anderen Dienst (D oder HG) belegt.
3. **Rest-Violation (Post-Duty):** Der Tag *nach* dem Dienst ist zwingend ein Ruhetag. Ist der Folgetag bereits mit einem Arbeitsplatz (MR/CT) belegt, der nicht überschrieben werden darf, ist der Dienstvortag illegal.
4. **Pre-Duty Collision:** Der Mitarbeiter hat am *Vortag* bereits einen D-Dienst.
5. **Veto-Constraint:** Der Mitarbeiter hat explizit `NO_DUTY` für diesen Tag deklariert.

### 4.3 Weiche Constraints & das Penalty-Scoring-System
Der Algorithmus berechnet einen numerischen Strafwert (Penalty Score). Ziel ist das absolute Minimum. Die exakten Gewichtungen determinieren das Verhalten der KI:

* **Gap Penalty (Kritischste Strafe):** * Jeder Tag ohne besetzten D-Dienst: `+1000` Punkte.
  * Jeder Tag ohne besetzten HG-Dienst: `+1000` Punkte.
* **Target Deviation Penalty (Soll-Abweichung):**
  * Verfehlt ein Mitarbeiter sein D-Dienst-Soll: `(Ist - Soll)^2 * 50`. Die quadratische Funktion (`Math.pow`) erzwingt eine extreme Bestrafung großer Abweichungen, toleriert aber minimale Varianzen (±1).
* **Weekend Overload Penalty:**
  * Überschreitet ein Arzt das Limit von Wochenend-Diensten (`RELAXED_WEEKEND_DUTY_LIMIT = 2`): `+500` Punkte pro überzähligem Dienst.
* **Weekend Clustering (Sa+So):**
  * Hat ein Arzt am Samstag *und* am Sonntag desselben Wochenendes Dienst: `+400` Punkte (Verhindert komplett zerstörte Wochenenden).
* **Spacing Penalty (Ergonomie/Ruhephasen):**
  * Abstand zwischen zwei Diensten < 3 Tage: `+40` Punkte.
  * Abstand < 4 Tage: `+20` Punkte.
* **Wish Fulfillment Bonus:**
  * Ein erfüllter `BD_WISH` oder `HG_WISH` reduziert den Penalty-Score um `-30` Punkte (Invertierte Strafe).

### 4.4 Neural Fitness Index (NFI)
Das rohe Penalty-Ergebnis wird für den Endnutzer in einen verständlichen, normierten NFI überführt (Skala: 0.0 bis 100.0). 
* Ein NFI von `>= 80` gilt als "Sehr Gut". Der Index sinkt rapide, sobald Lücken (Gaps) verbleiben oder die Streuung (Spread) der Dienste zwischen den Mitarbeitern eine Varianz von >1 aufweist. Das Ergebnis Modal zeigt Spread-Metriken (Δ) detailliert an.

---

## 5. Visualisierungs-Engine (`neuralgraph.js`)

Das Rendering des Auto-Plan-Prozesses wurde vom DOM-Mainthread entkoppelt und als hybride CSS3D/Canvas-Applikation realisiert, um Ruckler während der intensiven CPU-Berechnungen zu vermeiden.

### 5.1 Isometrisches 3D-Grid (Bottom Left)
* **Architektur:** Ein echtes Kalender-Raster (7 Spalten, Repräsentation von Mo-So). Die Matrix ist via `transform-style: preserve-3d`, `rotateX(60deg)` und `rotateZ(-45deg)` isometrisch in den Raum gekippt.
* **Dynamische Skalierung:** Ein `ResizeObserver` berechnet anhand der Viewport-Bounds und Trigonometrie den exakten `scale()`-Faktor, um das Grid in *jeder* Fenstergröße maximal groß und verzerrungsfrei (Bounding Box Calculation) darzustellen.
* **Kinetik:** Eine Endlos-CSS-Keyframe-Animation (`ngFloating`) verändert kontinuierlich die Z-Translation und Z-Rotation des gesamten Grids, was eine organische Tiefenwirkung (Floating) erzeugt.
* **Zell-Allokation (Dual-Labeling):** Jede Zelle besitzt eine DOM-Struktur mit einem Flex-Wrapper (`.ng-duty-wrap`), der zwei getrennte Text-Knoten für Bereitschaftsdienst (`.ng-emp-d`) und Hintergrunddienst (`.ng-emp-hg`) vorhält.
* **Puls-Animation:** Bei Zuweisung oder Swap (getriggert via Telemetrie-Events) schnellt die Zelle auf der Z-Achse nach oben (`translateZ(25px)`). D-Dienste illuminieren die Zelle in Rot (`#EF4444`) und injizieren das Namenskürzel in den oberen Slot. HG-Dienste nutzen Blau (`#0EA5E9`) im unteren Slot. Fehlerhafte Zuweisungen (Hard Constraint Violations) schlagen mit `scale(1.08)` und `translateZ(40px)` extrem nach oben aus und leuchten rot auf.

### 5.2 Topologie-HUD (Top Right / MiniMap)
* **Canvas-Rendering:** Eine hochperformante, hardwarebeschleunigte 2D-Canvas-Ebene.
* **Minimalistischer Datenbus:** Ein eindimensionaler Vektor-Bus (Linie von links nach rechts), auf dem Lichtimpulse (Partikel) mit zufälliger Geschwindigkeit und Richtung wandern.
* **Synchronisation:** Das HUD synchronisiert seine Farbgebung strikt mit der Berechnungsphase des Schedulers (`getPhaseColor()`): Cyan (Init), Gelb (Greedy), Blau (HG), Violett (Deep Optimize), Grün (Converged/Success).

---

## 6. Datenstruktur Referenz & Nomenklatur (Legende)

| System-Code | Semantik (UI Label) | Kategorisierung | Hex-Code | Priorität / Verhalten im Algorithmus |
| :--- | :--- | :--- | :--- | :--- |
| **D** | Bereitschaftsdienst | Dienst (Duty) | `#EF4444` | Höchste Prio. Erzwingt Folge-F. |
| **HG** | Hintergrunddienst | Dienst (Duty) | `#0EA5E9` | Nur für Fachärzte. |
| **MR** | MRT | Arbeitsplatz | `#6366F1` | Überschreibbar durch Dienste. |
| **CT** | Computertomographie | Arbeitsplatz | `#F97316` | Überschreibbar durch Dienste. |
| **US** | Ultraschall | Arbeitsplatz | `#14B8A6` | Überschreibbar. |
| **U** | Urlaub | Absenz / Status | `#8B5CF6` | Hartes Constraint. Blockiert D/HG. |
| **K** / **KK** | Krank / Kind Krank | Absenz / Status | `#B91C1C` | Hartes Constraint. Blockiert D/HG. |
| **F** | Frei (Post-BD / Regulär) | Absenz / Status | `#64748B` | Hartes Constraint. Blockiert D/HG. |
| **FZA** | Freizeitausgleich | Absenz / Status | `#4338CA` | Hartes Constraint. Blockiert D/HG. |
| **WB** | Weiterbildung | Absenz / Status | `#059669` | Hartes Constraint. Blockiert D/HG. |
| **§15c** | Mutterschutz / BV | Absenz / Status | `#EC4899` | Hartes Constraint. Dauerhaft befreit. |

## 7. Import / Export Architektur

RadPlan benötigt keine Cloud-Synchronisation, um Daten über Gerätegrenzen hinweg zu transportieren. Die integrierte I/O-Schnittstelle verpackt die vollständigen Zustände.
* **Export-Prozess (`doExport`):** Iteriert über alle Keys im `localStorage`. Kompiliert das Root-`DATA`-Objekt sowie alle existierenden Planungs-Drafts (`radplan_v3_plan_YYYY_MM`) in einen einzigen monolithischen JSON-Blob. Der Blob wird on-the-fly als `.json`-Datei im Client erzeugt und via generiertem Objekt-URL als Download angestoßen.
* **Import-Prozess (`doImport`):** Akzeptiert Text-Paste oder Drag&Drop von JSON-Dateien. Ein rigoroses Type-Checking validiert die JSON-Struktur. Die importierten Daten mergen tief in den `localStorage`.
* **Integritätsprüfung:** Post-Import feuert zwingend die Funktion `ensurePostBDFreiDays()`. Diese Funktion durchkämmt die gesamte importierte Historie und Zukunft. Findet sie einen D-Dienst, dem kein F-Dienst am Folgetag folgt (und auch kein U/K/etc.), injiziert sie diesen nachträglich, um den illegalen State zu reparieren, bevor die UI neu gerendert wird.
