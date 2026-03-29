# RadPlan v3 — Digitaler Dienstplan & Quantum Heuristic Scheduler

RadPlan v3 ist eine hochspezialisierte, performante Single-Page-Application (SPA) für die Klinik für Radiologie und Nuklearmedizin. Die Anwendung dient der Verwaltung und algorithmischen Optimierung von komplexen ärztlichen Dienstplänen. Sie operiert vollständig clientseitig, nutzt den lokalen Browser-Speicher (Offline-First) und integriert einen in JavaScript geschriebenen, hochkomplexen Optimierungsalgorithmus gekoppelt an eine cineastische WebGL-Visualisierungsengine.

---

## 1. Systemarchitektur & Technologischer Kern

### 1.1 Client-Side First & Persistenz
Das System verzichtet vollständig auf ein Backend. Alle Daten (Mitarbeiterlisten, Dienstplan-Zuweisungen, Status, Dienstwünsche und Planungsentwürfe) werden in Echtzeit im `localStorage` des Browsers persistiert.
* **Datensicherheit**: Es fließen keine Patientendaten oder Mitarbeiterdaten über externe Netzwerke.
* **Datenstruktur**: Der State wird pro Monat im Format `radplan_v3_plan_YYYY-MM` (für Entwürfe) und im `DATA`-Hauptobjekt vorgehalten.
* **Im-/Export**: Der gesamte Zustand kann jederzeit als strukturierte JSON-Datei exportiert und per Drag & Drop wiederhergestellt werden.

### 1.2 Benutzeroberfläche (UI/UX)
Das Design-Paradigma basiert auf einem "Glassmorphismus" im Navy-Darkmode. Es nutzt CSS Grid, Flexbox und CSS-Variablen für ein vollständig responsives Erlebnis über alle Viewports (Smartphone bis 4K-Desktop).
* **Hauptmatrix**: Eine scrollbare 2D-Tabelle mit eingefrorenen Kopfzeilen (Sticky Headers) für Namen und Tage. Wochenenden und sächsische Feiertage werden dynamisch farblich hervorgehoben.
* **Modale Architektur**: Jede Interaktion (Editor, Dashboards, Algorithmus) erfolgt über fokussierte Overlay-Modals mit weichen `GSAP`- und CSS-Transitionen.
* **Mobile-View**: Auf kleinen Bildschirmen wechselt die Matrix in eine kartenbasierte Tageslisten-Ansicht mit einer sticky Bottom-Navigation (`mnav-h`).

---

## 2. Planungsmodus (Sandbox & Historie)

Um den laufenden Dienstplan nicht zu gefährden, bietet das System einen gekapselten "Planungsmodus".
* **State-Cloning**: Bei Aktivierung wird der aktuelle Monat tiefenkopiert (`Deep Clone`) und in ein `planData`-Objekt überführt.
* **Undo/Redo-Stack**: Jede Zelländerung (manuell oder automatisch) pusht einen Snapshot in ein Array (`planHistory`). Der Nutzer kann lückenlos vor- und zurückspringen.
* **Wunsch-Management**: Nur im Planungsmodus wird im Editor die Option für Dienstwünsche (`BD_WISH`, `HG_WISH`, `NO_DUTY`) freigeschaltet.
* **Entwürfe**: Der Sandbox-Zustand kann separat gespeichert werden, ohne den Live-Plan zu überschreiben. Erst der Klick auf "Übernehmen" führt die Entwurfsdaten in den Hauptspeicher (`DATA`) zurück.

---

## 3. Der manuelle Editor & Zuweisungslogiken

Ein Klick auf eine Zelle in der Matrix öffnet den Editor.
* **Arbeitsplatz (WP)**: Mehrfachauswahl möglich (z.B. MR, CT, US). Tastatur-Kürzel (1-8) erlauben schnelle Zuweisungen.
* **Status**: Exklusive Stati (Urlaub, Krank, Frei, FZA, F). Ein Status überschreibt immer die Arbeitsplatz-Zuweisung.
* **Dienst**: Zuweisung von Bereitschaftsdienst (`D`) oder Hintergrunddienst (`HG`).
* **Auto-F Logik**: Wird ein `D` zugewiesen, prüft das System den Folgetag. Ist dieser leer, wird automatisch ein Ruhetag (`F`) gesetzt. Wird das `D` gelöscht, wird auch das automatisch generierte `F` (und nur dieses) wieder entfernt.
* **Warnsystem**: Der Editor warnt in Echtzeit, wenn ein Dienst an dem Tag bereits einem anderen Mitarbeiter zugewiesen ist, oder wenn der Folgetag des Mitarbeiters ein Urlaubstag ist (was einen BD ausschließt).

---

## 4. RadPlan Neural Scheduler (Die Algorithmus-Engine)

Der Kern der Applikation ist eine deterministische und stochastische Metaheuristik (`js/autoplan.js`), die den Dienstplan automatisch erstellt und optimiert. Der Algorithmus wertet historische Daten aus, evaluiert harte und weiche Constraints und sucht in mehreren Optimierungs-Zyklen das globale Optimum.

### 4.1 Initiale Datenerfassung (Historical Tracking)
Vor jedem Lauf liest der Algorithmus alle Vor-Monate des aktuellen Jahres aus. Berechnet werden:
* Gesamtzahl der BD und HG.
* Anzahl der Feiertagsdienste.
* Anzahl der Wochenend-Dienste (ein WE zählt als 1, wenn mind. ein D vorliegt, und als 0.5 für reine HG-Belegung).
* Geleistete Samstags-Dienste pro Facharzt.
* Verteilung, wie oft ein FA den HG für einen Assistenzarzt (AA) im BD gemacht hat.

### 4.2 Harte Constraints (K.-o.-Kriterien)
Führt eine Kombination zu einem dieser Konflikte, wird der Score auf `-Infinity` gesetzt:
* **Exemptions**: Prof. Schäfer (`DUTY_EXEMPT`) macht niemals Dienste. Mitarbeiter mit einem expliziten Zielwert von `0` werden ignoriert.
* **Abwesenheiten**: Kein Dienst bei Urlaub (`VACATION_CODES`), Krankheit, Freizeitausgleich oder Fortbildung.
* **Wünsche**: Kein Dienst, wenn `NO_DUTY` eingetragen ist.
* **Qualifikation**: Samstags-BDs dürfen ausschließlich von Fachärzten absolviert werden. Dr. Becker ist ein Backup, wird jedoch stark pönalisiert. Assistenzärzte dürfen samstags keinen BD machen. Alle HGs dürfen nur von Fachärzten gemacht werden.
* **Arbeitszeitgesetz**: Ein `D` darf nicht an zwei aufeinanderfolgenden Tagen stattfinden.
* **Urlaubs-Schutz**: Wenn am Folgetag Urlaub eingetragen ist, ist ein BD am Vortag verboten. (Ein HG am Vortag generiert einen Malus, ist aber nicht hart verboten).
* **Ruhetags-Schutz**: Ein manuell gesetztes `F` verbietet Dienste (außer HGs an Wochenenden).
* **Feiertags-Blockade**: Wer über den Oster-Block (Karfreitag bis Ostermontag) Dienste macht, ist für den Pfingst-Block gesperrt (und vice versa).
* **Mammographie-Konflikt**: Fr. Dalitz darf an Sonntagen und Montagen keinen HG machen, wenn Hr. Torki oder Hr. Sebastian an diesem Tag BD haben (Kollision mit der Mammographie-Befundung am Folgetag).
* **CT-Leitung Konflikt**: Dr. Becker und Dr. Martin dürfen an Werktagen keinen Dienst machen, wenn der jeweils andere am Folgetag Urlaub oder Abwesenheit hat.
* **Teilzeit-Regel (Dr. Polednia)**: Darf keinen Dienst an Sonntagen, Dienstagen und Donnerstagen machen. Wenn sie an diesen Tagen HG machen soll, darf der zugeordnete BD kein Assistenzarzt sein.

### 4.3 Soft Constraints & Die Objective Function (Scoring)
Das Scoring startet bei 100 Punkten pro Tag/Kandidat. Abweichungen werden mathematisch gewichtet:

**Bereitschaftsdienst (D):**
* **Soll-Abweichung**: Erreichtes Ziel = +5000 Pkt. pro fehlendem Dienst. Überschrittenes Ziel = -50000 Pkt. pro zu viel gemachtem Dienst.
* **Wunsch (`BD_WISH`)**: +220 Punkte.
* **Vor-Urlaub-Bonus**: BD an einem Donnerstag, wenn in der Folgewoche Urlaub ansteht = +150 Punkte.
* **Wochenend-Balancierung**: 
    * Ziel: 1 WE pro Monat pro Person. Abweichung = -220 Punkte.
    * Übersteigt der WE-Wert 1.5 (`RELAXED_WEEKEND_DUTY_LIMIT`), erfolgt ein Malus von -1000 Punkten.
    * Historischer WE-Ausgleich gegenüber dem Team-Durchschnitt: -5 Pkt. pro historischem Delta.
    * Konsekutive Wochenenden (zwei Wochenenden in Folge) = -1500 Punkte.
* **Facharzt-Samstage**: 
    * Hat der FA noch keinen Samstag = +5000 Punkte.
    * Zweiter Samstag im Monat = -25000 Punkte.
    * Abweichung vom mathematisch perfekten FA-Durchschnitt für Samstage = -1500 Punkte.
* **Dr. Becker Samstag**: Wenn Dr. Becker als Notlösung einen Samstag machen muss = -5000 Punkte.
* **Abstands-Regeln**: Distanz zwischen zwei Diensten < 4 Tage = (4 - Distanz) * -250 Punkte.
* **Muster-Vermeidung**: Die Folge D - F - D - F wird erkannt und mit -500 Punkten weich bestraft.
* **Feiertags-Ausgleich**: Wer historisch weniger Feiertage gemacht hat, erhält einen Bonus (+6 Pkt pro Delta).

**Hintergrunddienst (HG):**
* **Gerechte Last-Verteilung**: Der ideale HG-Anteil berechnet sich aus dem HG-Soll plus dem Delta der fehlenden BD-Dienste. Abweichung vom Ideal = -10000 Punkte.
* **Historischer HG-Ausgleich**: -5 Punkte pro historischer Abweichung.
* **Direkter HG**: HG an zwei direkt aufeinanderfolgenden Tagen = -25000 Punkte.
* **Abstand**: Weniger als 3 Tage zwischen zwei HGs = -8000 Punkte.
* **Wunsch (`HG_WISH`)**: +500 Punkte.

### 4.4 Automatischer FZA (Freizeitausgleich)
Wird Dr. Becker aufgrund von Mangel an anderen Fachärzten an einem Samstag für den Bereitschaftsdienst (`D`) eingeteilt, durchsucht der Algorithmus die nachfolgenden Kalendertage nach dem nächsten Werktag. 
Er prüft: Ist dieser Werktag durch einen anderen Facharzt urlaubsbedingt blockiert? Hat Dr. Becker selbst dort schon Termine?
Wenn nein, trägt der Algorithmus vollautomatisch ein `FZA` an diesem Werktag für Dr. Becker ein und loggt dies als speziellen Vorfall. Bei Konflikten wird eine rote Warnung im Abschlussbericht generiert, die manuelle Überprüfung anfordert.

### 4.5 Die Ausführungs-Phasen

1.  **Phase 4: Greedy Weekend BD**: Wochenend- und Feiertags-BDs werden zuerst an die punktbesten Kandidaten verteilt. Ist kein Kandidat verfügbar, werden die harten Abstands-Regeln temporär gelockert (Relaxed Mode), um die Basisabdeckung zu sichern.
2.  **Phase 5: Greedy Workday BD**: Die restlichen Werktags-BDs werden verteilt.
3.  **Phase 6: HG Bundling**: Zwingende HG-Kopplungen werden vorgenommen:
    * Macht ein AA am **Freitag** BD, wird der FA, der den **Samstags-BD** hat, gezwungen, den Freitags-HG zu übernehmen.
    * Macht ein FA am **Samstag** BD, muss er zwingend den **Sonntags-HG** übernehmen.
    * Macht ein AA am **Tag vor einem Feiertag** BD, übernimmt der FA, der am **Feiertag** BD hat, den HG des Vortages.
4.  **Phase 7: Greedy HG Assign**: Die restlichen, nicht gekoppelten HGs werden an die Fachärzte vergeben.
5.  **Phase 8: Multi-Zyklus Metaheuristik (Deep Optimize)**: 
    * Der Algorithmus führt 25 komplette Durchläufe durch.
    * In jedem Durchlauf testet er für jeden Kalendertag und jeden Dienst, ob ein Tausch (`Swap`) mit einem anderen Mitarbeiter den Wert der **Global Objective Function** verbessert.
    * Die Global Objective Function ist extrem strafend konfiguriert (z.B. Lücken = +25.000, Doppelbelegungen = +100.000). Jeder Tausch, der den globalen Score senkt, wird sofort übernommen (`Deep Move`).
    * Der Zyklus bricht frühzeitig ab, wenn mathematische Konvergenz erreicht ist (keine Verbesserung im letzten Zyklus).
6.  **Coverage Repair**: Falls das strenge Regelwerk immer noch Lücken im Plan gelassen hat, werden Kandidaten im "Brute-Force-Verfahren" unter Ignorierung aller Abstandsregeln in die Lücken gezwungen.

---

## 5. Quantum Heuristic Core (Die WebGL Visualisierung)

Die Anwendung nutzt die `NeuralGraph` Klasse, um den Rechenprozess des Schedulers cineastisch, im Hacker/Mainframe-Stil der 90er/00er-Jahre (Cyber-Matrix) visuell darzustellen, während der Algorithmus asynchron im Hintergrund arbeitet.

### 5.1 Visuelle Komponenten
* **Voxel Cloud**: Das 3D-Gitter (`THREE.Points` mit `vertexColors`). Jeder Punkt (Voxel) entspricht der Kombination aus einem Kalendertag und einem Mitarbeiter. Das Netz schwingt sanft über trigonometrische Zeit-Funktionen.
* **Hex-Decryption Sprites**: Sobald der Algorithmus jemanden prüft oder zuweist, erscheint ein Canvas-basiertes Sprite. Dieses durchläuft rasend schnell falsche Mitarbeiter-Namen und Hex-Codes in Rot/Orange (`SYS_ERR`), bevor es sich mit einem grünen Blitz auf dem korrekten Namen einloggt.
* **Heuristic Probes**: Pro Frame werden zufällige Such-Laser (`fireProbeBeam`) durch die Voxel-Cloud geschossen, die die verworfenen Evaluationen (Trial & Error) der Heuristik visualisieren.
* **Swap-Beams**: Ändert der Deep-Optimize-Pass eine Zuweisung, schießt ein violetter Laser (`0xB026FF`) vom alten Voxel zum neuen Voxel. Der alte Voxel glitched rot auf.
* **Glitch-Effekt**: Bei Regelverstößen oder Penalties (`triggerError`) zittert der betroffene Voxel hochfrequent um seine Achse und pulsiert in Warnfarben.
* **Data-Streams**: Im Hintergrund regnen Matrix-artige Datenströme kontinuierlich herab. Scanner-Ebenen wischen von unten nach oben durch den Raum.

### 5.2 Performance-Management
* **Null-Safety & Disposing**: Da Modals vom User jederzeit geschlossen werden können, verfügt die `NeuralGraph` Klasse über ein extrem striktes Garbage-Collection-System. Jede Textur, jede Geometrie und jedes Material (inkl. Arrays) wird geprüft und per `.dispose()` aus dem VRAM (Grafikkartenspeicher) gelöscht.
* **Debounced Resizing**: Das Canvas skaliert via CSS flüssig mit dem Container mit. Der speicherintensive WebGL-Render-Buffer wird über einen `ResizeObserver` erst nach einem 150ms Debounce-Timeout neu berechnet, was jegliches Ruckeln während der Modal-Animation eliminiert.

---

## 6. Berichte & Qualitätssicherung

Nach Abschluss der Optimierung generiert das System einen detaillierten Bericht:
* **Neural Fitness Index (NFI)**: Ein Score von 0 bis 100, der die Perfektion des Plans bewertet.
* **Spread-Metriken**: Zeigt die Spreizung (Varianz) von Bereitschafts-, Hintergrund- und Wochenenddiensten auf. Ein Wert von `1` oder `0` ist optimal.
* **Detailed Log**: Eine tagesgenaue Auflistung (`Abschlussbericht`), die für jede einzelne Dienstzuweisung die exakte algorithmische Begründung ausgibt (z. B. "Wunschdienst berücksichtigt", "Zwangsbelegung (Coverage Repair)" oder "Gekoppelt").

---
**Entwickelt für höchste Ausfallsicherheit, operative Präzision und unübertroffene Benutzererfahrung im klinischen Alltag.**
