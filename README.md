# RadPlan – Neural Scheduler & Duty Management System

**RadPlan** ist eine hochspezialisierte, reaktive und vollständig clientseitig operierende Web-Applikation zur Dienst- und Arbeitsplatzplanung in radiologischen Kliniken. Die Anwendung kombiniert eine hochperformante, datengesteuerte Benutzeroberfläche mit einem iterativen, heuristischen Optimierungsalgorithmus (**Neural Scheduler**), um komplexe Dienstpläne (Bereitschafts- und Hintergrunddienste) unter Berücksichtigung strenger arbeitsrechtlicher, ergonomischer und individueller Constraints automatisiert zu generieren, visuell in Echtzeit auszuwerten und mathematisch zu evaluieren.

---

## 1. Systemarchitektur & Technologie-Stack

Die Applikation ist nach dem Prinzip einer **Progressive Web App (PWA)** konzipiert und verzichtet vollständig auf externe Frameworks (wie React, Angular oder Vue) sowie Backend-Abhängigkeiten (keine Datenbank, kein Node.js). 

* **Kern-Technologien:** Vanilla JavaScript (ES6+ Module), HTML5, CSS3 (CSS Variables, Flexbox, CSS Grid, 3D Transforms, Viewport-Units).
* **Persistenz-Schicht:** Vollständige Datenspeicherung im lokalen `localStorage` des Browsers. Das gesamte relationale Datenmodell wird in Echtzeit serialisiert und deserialisiert.
* **Offline-Fähigkeit & Mock-Backend:** Ein integrierter Fetch-Interceptor (`window.fetch` Override in `js/render.js`) fängt ausgehende Netzwerk-Requests (z. B. `/api?action=save`) ab und simuliert synthetische HTTP-Responses. Dies verhindert 404-Fehler und garantiert eine lückenlose Offline-Nutzung inklusive persistenter lokaler Speicherung.
* **Rendering-Engine:** Ein feingranulares, zustandsbasiertes Rendering-Modul. DOM-Updates erfolgen selektiv, responsiv und Event-getrieben.
* **Visualisierung:** Native HTML5-Canvas-API und hardwarebeschleunigte isometrische CSS-3D-Matrizen (`js/neuralgraph.js`) für die asynchrone, DOM-entkoppelte Darstellung des algorithmischen Fortschritts.

---

## 2. Das Datenmodell (State & Storage)

Der Zustand der Applikation (`js/state.js`) trennt strikt zwischen **Persistent Data** (Dienstpläne, Mitarbeiterstamm, Wünsche) und **Volatile Data** (UI-Status, geöffnete Modals, Planungs-Drafts, Viewport-Metriken).

### 2.1 Persistente Struktur (`DATA`)
Die Kern-Datenstruktur ist chronologisch in Monats-Schlüsseln (Format: `YYYY-MM`, z. B. `2026-03`) im Root-Objekt organisiert. Jeder Monats-Knoten enthält:
* `employees`: Array von Strings. Definiert die exakten Namen der aktiven Mitarbeiter in diesem spezifischen Monat (ermöglicht historische Konsistenz bei Personalwechseln, Ein-/Austritten).
* `assignments`: Verschachteltes Dictionary-Objekt (Hash-Map), das jedem Mitarbeiter ein Tages-Mapping zuordnet.
  * *Struktur:* `assignments["Dr. Muster"]["15"] = { assignment: "MR/CT", duty: "D" }`
  * `assignment`: Arbeitsplatz (z.B. "MR", "CT") oder Status (z.B. "U", "K", "F"). Mehrfachauswahl wird via Slash getrennt als String gespeichert ("MR/US").
  * `duty`: Spezifischer Dienst ("D" für Bereitschaft, "HG" für Hintergrund) oder `null`.
* `rbn`: Separates Key-Value-Mapping (`Tageszahl -> String`) für die stationsübergreifende Rolle der Neuroradiologie (abstrahiert vom regulären Personalstamm).
* `wishes`: Dictionary zur Speicherung von Dienstwünschen (`BD_WISH`, `HG_WISH`, `NO_DUTY`).

### 2.2 Planungsmodus (Draft & Branching System)
Beim Betreten des Planungsmodus (`enterPlanMode`) wird die Live-Datenbank vor unautorisierten Mutationen geschützt. Ein **Isolierter Speicher-Branch** (Snapshot `planBaseline` und `planData`) wird im RAM erstellt.
* **History-Stack:** Jede destruktive oder konstruktive Aktion (Zuweisung, Löschung, Auto-Plan) klont den aktuellen Monatsstatus (Deep Clone) und pusht ihn in das `planHistory`-Array.
* **Undo/Redo:** Die Manipulation des Pointers (`planHistoryIdx`) ermöglicht verlustfreies, bidirektionales Navigieren in der Historie (Strg+Z / Strg+Y).
* **Commit/Abort:** Erst bei Auslösen von "Planung übernehmen" (`applyPlanToMain`) wird der Draft-Branch destruktiv in das Haupt-`DATA`-Objekt gemerged und persistent im `localStorage` verankert.
* **Auto-F-Regel:** Das manuelle oder automatische Setzen eines "D"-Dienstes injiziert zwingend ein "F" (Frei) am chronologischen Folgetag, sofern dieser nicht bereits mit einem Urlaubs/Krank-Status belegt ist (Einhaltung der gesetzlichen Ruhezeit).

---

## 3. Benutzeroberfläche (UI) & Module

Die Designsprache folgt einem extrem verdichteten, datengetriebenen Ansatz ("High-Density UI") mit klarem Fokus auf **visuelle Informationshierarchie**, **telegrafischem Nominalstil** und strikter **Farb-Konditionierung** (D = Rot, HG = Blau).

### 3.1 Hauptkalender (Main Grid)
* **Desktop-Ansicht:** Zweidimensionale Matrix (Mitarbeiter auf Y-Achse, Tage auf X-Achse). 
* **Dynamische Zeit-Referenzen:** Wochenenden und Feiertage werden algorithmisch on-the-fly berechnet (inklusive sächsischer Spezifika wie Buß- und Bettag via Gauss-Osterformel) und visuell abgedunkelt. Das aktuelle Tagesdatum wird hervorgehoben (`.today-col`).
* **Zell-Interaktion:** Klick (oder Space/Enter via Keyboard-Navigation) auf eine Zelle öffnet den Modal-Editor. 
* **Statistik-Fußzeile (Tfoot):** Aggregiert vertikal die tägliche Belegung aller Kern-Arbeitsplätze (MR, CT) sowie Dienste. Identifiziert Über- und Unterbesetzungen farblich (Kritische Warnung in Rot bei >1 Dienst pro Typ/Tag).

### 3.2 Tastatur-Steuerung & Editor (`modal-editor`)
Der Editor ist für maximale Input-Geschwindigkeit ohne Mausbenutzung (Power-User-Fokus) konzipiert.
* **Ziffern 1–8:** Mappen direkt auf die Arbeitsplätze (1=MR, 2=CT, etc.). Toggle-Verhalten für Mehrfachauswahl.
* **D / H:** Toggelt Bereitschaftsdienst (D) bzw. Hintergrunddienst (HG) für den gewählten Tag.
* **S / Enter:** Speichert die Zuweisung und schließt das Modal.
* **Kollisionsprüfung:** Das Modal warnt in Echtzeit im UI, wenn der gewählte Dienst bereits an einen anderen Arzt vergeben ist, oder der Folgetag ein Urlaubstag ist (was den Dienst am Vortag illegal machen würde).

### 3.3 Dashboard & Profil-Analytics (`modal-emps` & `modal-profile`)
* **KPI-Metriken:** Extrahierung von aktiven Monaten im System, relativer Abdeckungsquote (Coverage), kumulierten Diensten (D/HG) und Fehlzeiten pro Kalenderjahr.
* **Rollen-Filter:** Facettierung des Dashboards nach Qualifikationsebene (CA, OA, FA, AA) via Meta-Daten-Mapping (`constants.js`).
* **Profil-Radar & Verteilung:** Berechnet die tatsächliche Auslastung (FTE-Äquivalent), Urlaubstage, Krankheitstage und Freizeitausgleich (FZA). Die Coverage berechnet sich exakt aus: `Aktiv-Tage / (Gesamt-Werktage - Abwesenheiten)`.
* **Mini-Jahreskalender:** 12-Monats-Übersicht mit Heatmap-Charakter zur schnellen Identifikation von Urlaubs-Clustern oder Dienst-Häufungen.

### 3.4 Abteilungs-Ansicht (`modal-dept`)
Aggregiert die Daten *aller* Mitarbeiter gegen die zur Verfügung stehenden *Werktage* des Monats oder Jahres.
* **Coverage-Bars:** Zeigt in einer Fortschrittsleiste prozentual an, an wie vielen Werktagen die Kernarbeitsplätze (MR, CT) und Leitungsdienste (D, HG) effektiv besetzt waren.
* **Team-Bilanz:** Tabellarische Aufschlüsselung der aggregierten Fehlzeiten (U, K, FZA) und offenen, unbesetzten Tage (Lücken) pro Mitarbeiter.

### 3.5 Responsive Mobile View
Wechselt bei einer Viewport-Breite `< 1200px` (oder dedizierten Touch-Devices) in eine vertikale, hierarchische Kartenansicht (`renderMobileDayList`). Das horizontale Scrollen der Matrix entfällt. Tage werden als aufklappbare Cards gerendert, in denen die Mitarbeiter nach Funktion (Facharzt / Assistenzarzt) gruppiert sind, wobei Diensthabende (D/HG) als Badges im Header der Tageskarte priorisiert sichtbar sind.

---

## 4. Der "Neural Scheduler" (Auto-Plan Algorithmus)

Das mathematische Herzstück von RadPlan (`js/autoplan.js`). Der Algorithmus löst das NP-schwere Problem der fairen Dienstplanung durch eine kombinierte Architektur aus deterministischer Meta-Heuristik und einer mutationsbasierten Tiefensuche (Simulated Annealing / Hill Climbing Derivat).

### 4.1 Die 8 Berechnungsphasen

#### Phase 1: Initialisierung & Constraint-Analyse (`init`)
* Extrahieren der Monatsmatrix, Instanziierung von Feiertags- und Wochenend-Arrays.
* Filtern der befreiten Mitarbeiter (`DUTY_EXEMPT`: Prof. Schäfer).
* Analyse der historischen Dienstlast aus Vormonaten.
* **Ziel-Definition (BD Target):** Zuweisung der individuellen D-Soll-Ziele. Dr. Polednia, Dr. Becker, Hr. Sebastian erhalten standardmäßig das Ziel `3`. Alle anderen aktiven Ärzte das Ziel `4`. Dies kann im Konfigurations-Modal vom User vorab überschrieben werden.

#### Phase 2 & 3: Greedy-Heuristik (`bd_weekend` & `bd_workday`)
Ein deterministischer Pass für die Erstbefüllung der Bereitschaftsdienste.
* **Wochenend-Pass:** Priorisierte Zuweisung von D-Diensten an Sams-, Sonn- und Feiertagen. Der Algorithmus sortiert die Ärzte nach verbleibendem Soll-Kontingent und historischer Wochenend-Belastung (Ziel: `TARGET_WEEKEND_DUTY = 1`). Er sucht den "günstigsten" Slot unter strikter Beachtung harter Constraints. Findet er keinen, lockert er die Kriterien (z. B. Erlaubnis von 2 WE-Diensten) und loggt eine Warnung.
* **Becker-Sonderregel:** Bekommt Dr. Becker mangels Alternativen einen Samstags-Dienst (der laut Regelwerk nur im Notfall an ihn geht), injiziert der Algorithmus automatisch ein "FZA" (Freizeitausgleich) am nächstmöglichen, unbesetzten Werktag in die Matrix und loggt diesen Vorgang.
* **Werktag-Pass:** Auffüllen der verbleibenden D-Dienste (Mo-Fr). Strenger Fokus auf equidistante Verteilung zur Vermeidung von Dienst-Clustern.

#### Phase 4 & 5: Hintergrund-Allokation (`hg_bundle` & `hg_assign`)
* **Qualifikations-Filter:** Nur Fachärzte/Oberärzte sind HG-qualifiziert (`isFacharzt()`).
* **Bundling:** Der HG wird an kritischen Tagen (Freitag, Samstag, Tag vor Feiertag) hart an den Wochenend-Diensthabenden FA gekoppelt, sofern am Freitag/Feiertag ein Assistenzarzt den D-Dienst hat.
* **Greedy Assign:** Verbleibende HG-Tage werden nach einem "Ideal-Verteilungs-Schlüssel" aufgefüllt. Dieser Schlüssel berechnet sich aus dem durchschnittlichen Monats-HG plus einer Kompensation für Ärzte, die weniger D-Dienste leisten als der Durchschnitt.

#### Phase 6, 7 & 8: Deep-Search / Optimierung & Repair (`optimize`, `repair`, `validate`)
Ein stochastischer Optimierer (Simulated Annealing) iteriert über den generierten Plan, um die Fairness (Spread) zu maximieren und weiche Constraints aufzulösen.
* **Generierung:** Pro Zyklus (Standard: 25 Zyklen) werden tausende Tauschoperationen simuliert (Vertausche Diensthabenden an Tag X mit Kandidat Y). 
* **Scoring-Evaluation:** Jeder mutierte Zustand wird durch eine massive globale Penalty-Funktion gejagt (siehe 4.3).
* **Hill-Climbing:** Reduziert der Swap den globalen Penalty-Score, wird der neue State sofort akzeptiert. Verschlechtert er ihn, wird er verworfen.
* **Coverage Repair:** Nach der Optimierung werden verbleibende Lücken (z.B. durch zu viele Urlaube entstanden) zwanghaft aufgefüllt, notfalls unter Bruch weicher Ergonomie-Regeln, da die klinische Besetzung absolute Priorität vor Fairness hat.

### 4.2 Harte Constraints (K.O.-Kriterien / Illegale Zustände)
Eine Zuweisung wird systemseitig blockiert (Funktionen returnieren `false` oder Penalty = `Infinity`), wenn:
1. **Status-Sperre:** Der Mitarbeiter hat "U" (Urlaub), "K" (Krank), "FZA", "WB" oder einen anderen protektiven Status am Zieltag.
2. **Double-Duty:** Der Tag ist für diesen Mitarbeiter bereits mit einem anderen Dienst (D oder HG) belegt.
3. **Rest-Violation (Post-Duty):** Der Tag *nach* dem Dienst ist zwingend ein Ruhetag (F). Ist der Folgetag bereits mit einem festen Arbeitsplatz (MR/CT) belegt, der laut Planung nicht überschrieben werden darf, ist der Dienstvortag illegal.
4. **Pre-Duty Collision:** Der Mitarbeiter hat am *Vortag* bereits einen D-Dienst (keine Doppeldienste).
5. **Urlaubs-Blocker:** Ist der *Folgetag* ein Urlaubstag (U), darf am Vortag kein Dienst geplant werden, um den Urlaubsbeginn nicht zu kompromittieren.
6. **Veto-Constraint:** Der Mitarbeiter hat explizit `NO_DUTY` im Wunschplan deklariert.
7. **Dalitz-Mammographie-Konflikt:** Fr. Dalitz darf keinen HG am Sonntag oder Feiertag (Mo) übernehmen, wenn am selben Tag Hr. Torki oder Hr. Sebastian den BD (D) haben, da dies zu Personalengpässen in der Mammographie am Folgetag führt.
8. **Becker-CT-Konflikt:** Dr. Becker und Dr. Martin dürfen keine Dienstkombination erhalten, die dazu führt, dass beide am Folgetag fehlen (Post-BD-Frei), sofern nicht mindestens ein anderer Arzt das CT besetzen kann.

### 4.3 Weiche Constraints & das Penalty-Scoring-System
Der Algorithmus berechnet einen globalen numerischen Strafwert (Penalty Score). Ziel ist das absolute mathematische Minimum. Die exakten Gewichtungen determinieren das "Verhalten" und die "Entscheidungen" der KI:

* **Gap Penalty (Kritischste Strafe für Lücken):** * Jeder Tag ohne besetzten D-Dienst: `+25000` Punkte. `> 1` Dienst: `+50000`.
  * Jeder Tag ohne besetzten HG-Dienst: `+15000` Punkte. `> 1` Dienst: `+40000`.
* **Target Deviation Penalty (Soll-Abweichung BD):**
  * Strafe: `(Ist - Soll)^2 * 25000 + abs(Ist - Soll) * 10000`. Die quadratische Funktion erzwingt eine extreme Bestrafung großer Abweichungen, toleriert aber minimale Varianzen (±1) marginal.
* **HG Balance Penalty (Gerechtigkeit HG):**
  * Strafe für Abweichung vom Ideal-HG (inkl. Ausgleich für wenige BD): `(Ist - Ideal)^2 * 25000`.
* **Weekend Overload Penalty:**
  * Strafe für Abweichung vom Ziel (1 WE): `(Ist - 1)^2 * 10000`.
  * Überschreitet ein Arzt das absolute Limit (`RELAXED_WEEKEND_DUTY_LIMIT = 1.5`): `+30000` Punkte pro überzähligem Dienst.
* **Weekend Clustering (Sa+So Puffer):**
  * Hat ein Arzt am Samstag *und* am angrenzenden Wochenende/Feiertag Dienst (ohne Pause): `+15000` Punkte (Verhindert komplett zerstörte Wochenenden).
* **Spacing Penalty (Ergonomie/Ruhephasen):**
  * Abstand zwischen zwei BD < 3 Tage: `+15000` pro fehlendem Tag. < 5 Tage: `+800`.
  * Abstand zwischen zwei HG < 3 Tage (falls nicht gekoppelt): `+18000`.
  * Zwei HG direkt hintereinander: `+45000`.
* **Pattern-Vermeidung:**
  * D-F-D-F Rhythmus (Dienst, Frei, Dienst, Frei): `+1200` Punkte.
* **Wish Fulfillment Bonus:**
  * Ein erfüllter `BD_WISH` generiert eine massive Attraktivität (`+220` interner Base-Score). Ein `HG_WISH` bringt `+500` Base-Score.

### 4.4 Neural Fitness Index (NFI) & Explainability
Das rohe Penalty-Ergebnis wird für den Endnutzer im Result-Modal in einen verständlichen, normierten NFI überführt (Skala: 0.0 bis 100.0). 
* **Formel:** `Fitness = 100 - (Lücken * 15/10) - (Spread_D * 2.5) - (Spread_HG * 1.5) - (Spread_WE * 2.0) + (Wunsch_Erfüllung_Pct * 5.0) - (DeepMoves * 0.005)`.
* Das `score-info-modal` schlüsselt exakt und via Tooltips (`data-tooltip`) transparent auf, wie sich dieser Score zusammensetzt und listet die Strafen (z.B. für Spreads > 1) detailliert auf. Ein NFI von `>= 80` gilt als "Sehr Gut".

---

## 5. Visualisierungs-Engine (`neuralgraph.js`)

Das Rendering des Auto-Plan-Prozesses wurde vom DOM-Mainthread entkoppelt und als hybride CSS3D/Canvas-Applikation realisiert.

### 5.1 Isometrisches 3D-Kalender-Grid (Bottom Left)
* **Architektur:** Ein dynamisches Kalender-Raster (7 Spalten, Repräsentation von Mo-So). Die Matrix ist via `transform-style: preserve-3d`, `rotateX(60deg)` und `rotateZ(-45deg)` isometrisch in den Raum gekippt.
* **Dynamische Skalierung (Trigonometrie):** Ein `ResizeObserver` berechnet anhand der Viewport-Bounds die exakte CSS Bounding Box (`cos(45) * cos(60)`), um das Grid in *jeder* Fenstergröße auf exakt 90% Breite/Höhe maximal groß und verzerrungsfrei darzustellen.
* **Kinetik:** Eine Endlos-CSS-Keyframe-Animation (`ngFloating`) verändert kontinuierlich die Z-Translation und Z-Rotation des Grids, was eine organische Schwerelosigkeit erzeugt.
* **Dual-Labeling (D & HG):** Jede Zelle besitzt einen Flex-Wrapper, der zwei getrennte Text-Knoten für Bereitschaftsdienst (D, Rot) und Hintergrunddienst (HG, Blau) vorhält, sodass beide Dienste parallel an einem Tag angezeigt werden können, ohne sich zu überschreiben.
* **Puls-Animation:** Bei Zuweisung oder Swap (getriggert via Telemetrie-Events der `app.js`) schnellt die Zelle auf der Z-Achse nach oben (`translateZ(25px)`). Nach Abschluss der Iterationen rastet das Raster mit dem finalen Plan ein (`triggerSuccess`).

### 5.2 Topologie-HUD (Top Right / MiniMap)
* **Canvas-Rendering:** Eine hochperformante, hardwarebeschleunigte 2D-Canvas-Ebene.
* **Minimalistischer Datenbus:** Ein eindimensionaler Vektor-Bus (Linie von links nach rechts), auf dem Lichtimpulse (Partikel) mit zufälliger Geschwindigkeit und Richtung wandern, getriggert durch Swap- und Zuweisungs-Operationen des Schedulers.
* **Phasen-Synchronisation:** Das HUD synchronisiert seine Farbgebung strikt mit der Berechnungsphase des Schedulers (`getPhaseColor()`): Cyan (Init), Gelb (Greedy), Blau (HG Bundling), Violett (Deep Optimize), Grün (Converged/Success), Rot (Kritische Constraint Verletzung).
* **Interaktions-Bremse:** Nach Abschluss der Berechnung pausiert die UI und präsentiert einen "Ergebnis anzeigen" Button, um dem Nutzer die visuelle Erfassung der finalen Matrix zu ermöglichen, bevor das detaillierte Report-Modal eingeblendet wird.

---

## 6. Datenstruktur Referenz & Nomenklatur (Legende)

| System-Code | Semantik (UI Label) | Kategorisierung | Hex-Code | Priorität / Verhalten im Algorithmus |
| :--- | :--- | :--- | :--- | :--- |
| **D** | Bereitschaftsdienst | Dienst (Duty) | `#EF4444` | Höchste Prio. Erzwingt Folge-F. |
| **HG** | Hintergrunddienst | Dienst (Duty) | `#0EA5E9` | Nur für Fachärzte. Gekoppelt an D. |
| **MR** | MRT | Arbeitsplatz | `#6366F1` | Überschreibbar durch Dienste. |
| **CT** | Computertomographie | Arbeitsplatz | `#F97316` | Überschreibbar durch Dienste. |
| **US** | Ultraschall | Arbeitsplatz | `#14B8A6` | Überschreibbar. |
| **U** | Urlaub | Absenz / Status | `#8B5CF6` | Hartes Constraint. Blockiert D/HG. |
| **K** / **KK** | Krank / Kind Krank | Absenz / Status | `#B91C1C` | Hartes Constraint. Blockiert D/HG. |
| **F** | Frei (Post-BD / Regulär) | Absenz / Status | `#64748B` | Hartes Constraint. Blockiert D/HG. |
| **FZA** | Freizeitausgleich | Absenz / Status | `#4338CA` | Hartes Constraint. Blockiert D/HG. |
| **WB** | Weiterbildung | Absenz / Status | `#059669` | Hartes Constraint. Blockiert D/HG. |
| **§15c** | Mutterschutz / BV | Absenz / Status | `#EC4899` | Hartes Constraint. Dauerhaft befreit. |

## 7. Import / Export Architektur & Data-Sanitization

RadPlan benötigt keine Cloud-Synchronisation, um Daten über Gerätegrenzen hinweg zu transportieren. Die integrierte I/O-Schnittstelle verpackt die vollständigen App-Zustände.
* **Export-Prozess (`doExport`):** Iteriert über alle Keys im `localStorage`. Kompiliert das Root-`DATA`-Objekt sowie alle existierenden Planungs-Drafts (`radplan_v3_plan_YYYY_MM`) in einen einzigen monolithischen JSON-Blob. Der Blob wird on-the-fly als `.json`-Datei im Client erzeugt und via generiertem Objekt-URL als Download angestoßen.
* **Import-Prozess (`doImport`):** Akzeptiert Text-Paste oder Drag&Drop von JSON-Dateien. Ein rigoroses Type-Checking validiert die JSON-Struktur. Die importierten Daten mergen tief in den `localStorage`.
* **Integritätsprüfung (Sanitization):** Post-Import feuert zwingend die Funktion `ensurePostBDFreiDays()`. Diese Funktion durchkämmt die gesamte importierte Historie und Zukunft. Findet sie einen D-Dienst, dem kein F-Dienst am Folgetag folgt (und auch kein U/K/etc.), injiziert sie dieses zwingende "F" nachträglich (Mutation), um den illegalen State zu reparieren und arbeitsrechtliche Vorgaben zu sichern, bevor die UI den neuen Plan rendert.