# Systemarchitektur & Technische Dokumentation: RadPlan
**Zustand:** Vollständig integrierte Single-Page-Application (PWA).
**Fokus:** Datengetriebenes Dienstplanmanagement, algorithmische Allokation (Neural Scheduler), responsive Visualisierung.

---

## 1. Architektonischer Befund (Core & State Management)

**Technologischer Stack:** Vanilla JavaScript (ES6 Module), HTML5, CSS3. Keine externen UI-Frameworks (Ausnahme: GSAP für Animationen).
**State Management:** Zentralisiertes, reaktives State-Objekt (`state.js`). Datenpersistenz via `localStorage` (Key: `radplan_v3`).
**Synchronisation:** Local-First-Ansatz mit asynchroner Server-Synchronisation (`/api`). Konfliktresolution via `lastModified`-Zeitstempel. Expliziter Force-Sync überschreibt lokale Entwürfe. Auto-Save-Debouncing (120ms).
**Datenmodellierung (`model.js`, `constants.js`):**
* Monatsbasierte Schlüssel (`YYYY-M`).
* **Struktur:** `DATA[monthKey] = { employees: [], assignments: {}, rbn: {} }`.
* **Stammdaten (`EMP_META`):** Hierarchische Klassifizierung (CA, LOA, OA, FA, AA) mit Definition von Vertretungen und spezifischen Einsatzbereichen.
* **Kodierung:**
    * **Arbeitsplätze:** MR, CT, US, AN, MA, KUS, W, T.
    * **Status:** F (Frei), U (Urlaub), ZU, SU, FZA, K (Krank), KK, §15c, WB.
    * **Dienste:** D (Bereitschaftsdienst), HG (Hintergrunddienst).
* **Feiertagslogik:** Dynamische Berechnung der sächsischen Feiertage inkl. variabler Feiertage (Ostern, Pfingsten, Buß- und Bettag) via Gaußscher Osterformel.

## 2. Benutzeroberfläche & Interaktionsdesign (Views & UI)

**Designsprache:** Glassmorphism-Elemente, klinisch-präzise Typographie (IBM Plex Mono/Sans), farbkodierte Entitäten (D = Rot, HG = Blau, Positionen differenziert).
**Responsive Layout (`render.js`):**
* **Desktop:** Matrix-Tabelle. Dynamische Sticky-Headers.
* **Mobile (< 600px):** Transformation in Listenansicht (`mobile-day-card`). Touch-optimierte Bottom-Navigation. Berücksichtigung von `visualViewport` für korrekte Tastatur-Insets.
**Komponenten:**
* **Context-Menu (`contextmenu.js`):** Rechtsklick-Aktionsmenü für MA-Zeilen (Profil, Löschen, Kaskadierendes Löschen).
* **Editor-Modal:** Mehrfachauswahl für Arbeitsplätze, exklusive Statusauswahl. Warnsystem bei Dienstkonflikten (z.B. Folgetag ist Urlaub).
* **Employee Dashboard:** Analytische Auswertung (KPIs, Jahreskalender, Monatsverlauf). Dynamische Team-Analytics (Rolling 12M, Quartal) mit Filterung nach Rollen. Abdeckungsraten-Berechnung.
* **Abteilungsübersicht:** Aggregierte Matrix für Monat und Jahr. Visualisierung der Modalitätenabdeckung (MR/CT) prozentual.
* **Neural Graph (`neuralgraph.js`):** 3D-Matrix-Visualisierung (Canvas/CSS3D) der Algorithmus-Zyklen. Darstellung von Swaps (🔀) und Zuweisungen in Echtzeit inkl. Minimap.

## 3. Workflow-Logik & Planungsmodus (Controller)

**Zwei-Phasen-Konzept:**
* **Hauptplan:** Live-Daten, sofortige Persistierung.
* **Planungsmodus:** Isolierte Sandbox (Deep Copy der `DATA`).
* **History-Management:** Stack-basiertes Undo/Redo (Strg+Z / Strg+Y). Status-Tracking via `planSessions`.
* **Wunsch-System:** Integration von `BD_WISH`, `HG_WISH` und `NO_DUTY`. Berücksichtigung primär im Planungsmodus.
* **Automatisierte Nachbereitung:** Obligate Generierung von "F" (Frei) am Folgetag eines Bereitschaftsdienstes (`ensurePostBDFreiDays`).

---

## 4. Algorithmische Evaluierung: RadPlan Neural Scheduler (`autoplan.js`)

**Zweck:** Vollautomatisierte, heuristikbasierte und fair-balancierte Dienstallokation.
**Architektur:** Multi-Zyklus-Optimierung bestehend aus Constraint-Analyse, Greedy-Zuweisung, Hintergrund-Kopplung und Deep-Search-Metaheuristiken.

### 4.1 Harte Restriktionen (Hard Constraints - Penalty: ∞)
* **Befreiungen:** Definition exkludierter MA (z.B. Prof. Schäfer).
* **Abwesenheiten:** Ausschluss bei Urlaub (U, ZU, SU), Krankheit (K, KK), Weiterbildung (WB) oder FZA.
* **Dienst-Kontinuität:** Verbot von D-D (Folgetag-Sperre). Verbot von Direktdiensten (HG-HG an Folgetagen), es sei denn explizit als Wochenend-Kopplung erlaubt.
* **Urlaubs-Sperre:** Kein D-Dienst, wenn der Folgetag Urlaub ist.
* **Wunsch-Sperre:** Berücksichtigung von `NO_DUTY`.
* **Rollen-Sperre:** Samstags-D ausschließlich durch Fachärzte (FÄ). HG ausschließlich durch FÄ. Dr. Polednia-Sperre für So, Di, Do.
* **Klinische Sonderkonflikte:**
    * **CT-Leitung:** Dr. Becker und Dr. Martin dürfen nicht zeitgleich ausfallen. (Wenn einer Urlaub hat, darf der andere keinen BD machen, der einen F-Tag erzwingt).
    * **Mammographie:** Fr. Dalitz übernimmt keinen HG an So/Mo, wenn Hr. Torki/Sebastian den BD haben (vermeidet Ausfall der Mamma-Sprechstunde).
* **Block-Restriktionen:** Ostern/Pfingsten-Regel (Wer Ostern arbeitet, ist Pfingsten gesperrt und vice versa, inklusive monatsübergreifender Prüfung).

### 4.2 Scoring-Modell: Bereitschaftsdienst (D)
Initialer Base-Score: **100**. Subtraktion bei Verstößen, Addition bei positiven Parametern.
* **Target-Fulfillment:** Abweichung vom Soll (Standard: 4, spez. MA: 3). Defizit bringt Bonus (+5000/Dienst), Überschuss massiven Malus (-50000).
* **Wunscherfüllung:** `BD_WISH` generiert **+220** Punkte.
* **Urlaubsvorbereitung:** BD am Donnerstag vor Urlaubswoche generiert **+150** Punkte.
* **Wochenend-Balancierung:**
    * Ziel: `TARGET_WEEKEND_DUTY` (1.0).
    * Abweichung wird bestraft (Delta × 220).
    * Überschreiten des `RELAXED_WEEKEND_DUTY_LIMIT` (1.5) ergibt harten Penalty (**-1000** pro Dienst).
    * Aufeinanderfolgende Wochenenden (Consecutive WE) bestraft mit **-1500**.
    * Historischer Ausgleich: Abweichung vom Durchschnitt der historischen WE-Dienste (-5 pro Dienst).
* **Samstags-Priorität (FÄ):**
    * Doppel-Samstage bestraft (**-25000**).
    * Erster Samstag generiert Bonus (**+5000**).
    * Abweichung vom FÄ-Durchschnitt ergibt Malus (-1500).
* **Distanz-Wahrung:** Distanz < 4 Tage ergibt Malus (Delta × 250).
* **D-F-D-F Vermeidung:** Weicher Penalty (**-500**) für zersplitterte Einsatzmuster.
* **Feiertags-Ausgleich:** Historisches Defizit an Feiertagsdiensten gibt Bonus (+6 pro historischem Defizit).
* **Deterministischer Jitter:** Pseudo-Zufall via CharCode zur Vermeidung von Endlosschleifen (+0.0 bis +0.9 Punkte).

### 4.3 Scoring-Modell: Hintergrunddienst (HG)
Initialer Base-Score: **100**.
* **Proportionale Balance:** Idealer HG-Wert wird gekoppelt an BD-Aktivität berechnet `IdealHG = DurchschnittHG + (DurchschnittBD - AktuellerBD) * 1.0`. Abweichungen bestraft (**-10000** pro Abweichung).
* **Wunscherfüllung:** `HG_WISH` ergibt **+500**.
* **Urlaubs-Folgetag:** HG direkt vor Urlaub bestraft (**-100**).
* **Wochenend-Regeln:** Analog zu BD (Zielerreichung, Maxima-Sperre, Consecutive-WE).
* **Distanz:** Distanz < 3 Tage wird stark bestraft (**-8000**).
* **Adjazenz:** Vermeidung von HG-HG an aufeinanderfolgenden Tagen (**-25000**), außer bei systemischen Kopplungen.

### 4.4 Ausführungs-Phasen des Algorithmus
1.  **Phase 1 (Init):** Laden historischer Daten. Auto-F Reparatur bestehender Dienste. Evaluierung Ostern/Pfingsten.
2.  **Phase 2 (WE/Hol BD):** Greedy-Allokation der Wochenend/Feiertags-BDs nach höchstem Score. Fallback auf gelockerte Regeln bei `null` Kandidaten. Spezialregel Dr. Becker: Samstags-Dienst erzwingt automatisierten FZA am Folgewerktag (inkl. Kollisionsprüfung mit anderen FÄ).
3.  **Phase 3 (Workday BD):** Greedy-Allokation der verbleibenden Werktags-BDs.
4.  **Phase 4 (HG-Bundling):** Harte Kopplung von Diensten zur Effizienzsteigerung.
    * *Freitags-Regel:* Hat ein AA am Fr. BD, erhält der FA des Sa.-BD den HG für Fr.
    * *Samstags-Regel:* FA mit Sa.-BD erhält zwingend den So.-HG.
    * *Feiertags-Regel:* AA hat Vor-Feiertags-BD -> FA des Feiertags-BD erhält Vor-Feiertags-HG.
5.  **Phase 5 (HG-Assign):** Greedy-Verteilung der restlichen HG-Dienste.
6.  **Phase 6 (Optimization Cycles):** Bis zu 25 Zyklen Metaheuristik.
    * `BD_MAX_PASSES` (80): Swap-Versuche für BD. Evaluierung gegen `computeBDObjective()`.
    * `HG_MAX_PASSES` (120): Swap-Versuche für HG. Evaluierung gegen `computeHGObjective()`.
    * `DEEP_MAX_PASSES` (150): Kreuz-Optimierung und Move-Evaluierung gegen `computeGlobalObjective()`.
7.  **Phase 7 (Coverage Repair):** Zwangsbesetzung von Lücken (ignoriert weiche Constraints), falls Optimierung fehlschlägt.

### 4.5 Objektiv-Funktionen (Global Fitness)
* **Coverage Penalty:** Fehlender Dienst (+25000 D, +18000 HG). Doppelbesetzung (+100000).
* **BD-Objective:** Bestraft Target-Defizite exponentiell (Diff² × 25000). Bestraft Spread. Bestraft Distanz < 3 (+15000). Becker-Samstag Penalty (+40000).
* **HG-Objective:** Bestraft Abweichung vom Ideal exponentiell (Diff² × 25000). Bestraft HG-Ballung (Dichte > 1 in 3 Tagen: +12000). Bestraft HG für AA vs FA Disbalancen.

### 4.6 Ergebnis-Evaluation & Neural Fitness Index (NFI)
* Basis 100.0.
* **Abzüge:** Lücken BD (-15.0), Lücken HG (-10.0), BD-Spread > 1 (-2.5 pro Punkt), HG-Spread > 1 (-1.5), WE-Spread > 1 (-2.0), Rechenkosten/Deep-Moves (-0.005 pro Move).
* **Bonus:** Wunscherfüllung (+5.0 * Quote).
* Rückgabe eines strukturierten Report-Objekts inkl. Telemetrie, Logs und Warnings (Kritische Warnung z.B. bei FZA-Kollision Dr. Becker).

---

## 5. Beurteilung

Die Applikation implementiert eine hochkomplexe, heuristische Dienstplanungs-Engine innerhalb einer autarken, Browser-basierten PWA. Der Algorithmus (`autoplan.js`) demonstriert eine exzellente Abstraktion klinischer Restriktionen (z.B. Mammographie-Sperren, CT-Leitungskonflikte, §15c-Berücksichtigung) in ein mathematisches Scoring-Modell. Die strikte Trennung von Model (`DATA`), State (`planSessions`) und View (`render.js`), gepaart mit einer reaktiven 3D-Visualisierung (`neuralgraph.js`), sichert eine professionelle, echtzeitfähige und ausfallsichere Betriebsplanung ohne externe Server-Abhängigkeiten im Kernprozess. Explizite Negativbefunde (z.B. fehlende Dienste, Regelbrüche) werden transparent im NFI abgebildet und erzwingen eine menschliche Re-Evaluation.