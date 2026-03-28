# RadPlan — Systemarchitektur & Algorithmische Spezifikation

**System:** RadPlan Neural Scheduler (v3)
**Umgebung:** Klinikum St. Georg, Klinik für Radiologie & Nuklearmedizin
**Architektur:** Autarke Single-Page-Application (SPA)
**Speicher:** Browser-nativer `localStorage` (Key: `radplan_v3`)
**Netzwerk:** **Kein Backend-Server vorhanden.** **Kein externer Datentransfer.** Maximale Datenintegrität und Latenzfreiheit durch lokale Ausführung.

---

## 1. Fundamentale Systemparameter

Das System basiert auf einer strikten Trennung von medizinisch-operativen Entitäten, um eine präzise Matrix-Planung zu ermöglichen.

### 1.1 Arbeitsplätze (Modalitäten)
| Code | Modalität | UI-Farbcode (BG/FG) |
| :--- | :--- | :--- |
| **MR** | MRT | `#DBEAFE` / `#1D4ED8` |
| **CT** | CT | `#FFEDD5` / `#C2410C` |
| **US** | Sonographie | `#CCFBF1` / `#0F766E` |
| **AN** | Angiographie | `#F3E8FF` / `#7E22CE` |
| **MA** | Mammographie | `#FCE7F3` / `#BE185D` |
| **KUS** | Kinder-US | `#DCFCE7` / `#15803D` |
| **W** | Wermsdorf | `#FEF9C3` / `#854D0E` |
| **T** | Teleradiologie | `#E0E7FF` / `#3730A3` |

### 1.2 Status- & Abwesenheitscodes
**Expliziter Negativbefund:** Keine Dienstzuweisung bei Vorliegen eines Abwesenheitscodes. Die Codes werden in `ABSENCE_CODES` (strikte Sperre) und `VACATION_CODES` (Vor-Urlaubs-Priorisierung relevant) unterteilt.

* **F** (Frei)
* **U** (Urlaub) — *VACATION*
* **ZU** (Zusatzurlaub) — *VACATION*
* **SU** (Sonderurlaub) — *VACATION*
* **FZA** (Freizeitausgleich)
* **K** (Krank)
* **KK** (Kind Krank)
* **§15c** (Sonderstatus §15c) — *VACATION*
* **WB** (Weiterbildung)

### 1.3 Personalmatrix & Qualifikationsprofile
Die ärztliche Besetzung diktiert die Algorithmus-Befugnisse. **Fachärzte (FA)** sind autorisiert für Wochenend-BD und HG. **Assistenzärzte (AA)** sind auf Werktags-BD und Freitags-BD limitiert.

| Mitarbeiter | Qualifikation | Spezialstatus / Targets |
| :--- | :--- | :--- |
| **Prof. Schäfer** | CA | **Dienstbefreit** (Target: 0). |
| **Dr. Lurz** | LOA (FA) | Deputy CA/Polednia. Target: 4. |
| **Dr. Polednia** | OA (FA) | Leiter Kinderradiologie. Target: 3. **Ausschluss So, Di, Do.** |
| **Fr. Dalitz** | OÄ (FA) | Leiterin Mammographie. Target: 4. |
| **Dr. Becker** | OÄ (FA) | CT-Leitung. Target: 3. **Samstags-Ausschluss (nur Notlösung).** |
| **Dr. Martin** | FA | Target: 4. CT-Leitung-Interdependenz. |
| **Hr. El Houba** | AA | Target: 4. |
| **Fr. Licenji** | AÄ | Target: 4. |
| **Hr. Torki** | AA | Target: 4. |
| **Hr. Sebastian**| AA | Target: 3. |

---

## 2. Der RadPlan Neural Scheduler (Algorithmus-Logik)

Der Kern der Anwendung ist ein deterministischer, heuristischer Optimierer. Er kombiniert **Greedy-Zuweisungen** mit einer **mehrstufigen Metaheuristik** (Swap-Optimierung). Die Berechnung simuliert historische Verteilungen ab dem 01.01. des laufenden Jahres für kumulative Gerechtigkeit.

### 2.1 Harte Constraints (K.-o.-Kriterien)
Jeder Kandidat muss zwingend diese Bedingungen erfüllen, andernfalls wird er mit `-Infinity` bewertet.

1.  **Status-Blocker:** Kein Dienst bei Abwesenheitscodes oder explizitem "Kein Dienst" (NO_DUTY) Wunsch.
2.  **Exklusivität:** Maximal ein D oder HG pro Kalendertag pro Person.
3.  **Gesetzliche Ruhezeit:** Nach jedem Bereitschaftsdienst (D) wird **zwingend** am Folgetag (sofern Werktag) ein "F" (Freizeitausgleich) systemseitig eingetragen.
4.  **D-D-Ausschluss:** Keine Bereitschaftsdienste an zwei aufeinanderfolgenden Tagen.
5.  **Qualifikations-Ausschluss:** Samstags-Dienste und alle HG-Dienste sind streng auf das FA-Kader limitiert.
6.  **Spezial-Ausschluss Polednia:** Kein BD an Sonntag, Dienstag, Donnerstag. Kein HG für einen AA an diesen Tagen (Vermeidung von Befundfreigabe-Kollision mit morgendlichem KUS).
7.  **CT-Leitungs-Interdependenz:** Dr. Becker und Dr. Martin dürfen an Werktagen niemals zeitgleich abwesend sein (Urlaub/Frei). Der Algorithmus plant Dienste so, dass der automatische Ruhetag diese Regel nicht bricht.
8.  **Feiertags-Blocker:** Wer an den Ostertagen (Karfreitag, Ostersonntag, Ostermontag) Dienst leistet, ist für die Pfingsttage (Pfingstsonntag, Pfingstmontag) strikt gesperrt (und vice versa).
9.  **Urlaubs-Puffer:** Kein BD am Tag direkt vor einem Urlaubsbeginn (`isNextDayVacation`).

### 2.2 Weiche Constraints & Base-Scoring
Kandidaten starten mit einem Basis-Score von `100`. Faktoren modulieren diesen Wert zur Findung des optimalen Kandidaten.

**Bereitschaftsdienst (BD) Modulatoren:**
* **Target-Delta:** `+220` Punkte pro fehlendem Dienst bis zum Ziel. `-7000` Punkte pro Dienst über dem Ziel.
* **Wunscherfüllung (`BD_WISH`):** `+220` Punkte.
* **Donnerstags-Urlaubs-Bonus:** `+150` Punkte, falls in der Folgewoche Urlaub besteht (maximiert Erholung durch F-Tag am Freitag).
* **Wochenend-Soll:** Zielwert ist `1.0` WE-Äquivalente (Sa/So = 1, Fr = 0.5). Abweichung kostet `220` Punkte. Überschreitung der Toleranzgrenze (>1.5) kostet `500` Punkte je Einheit.
* **WE-Erschöpfung:** Aufeinanderfolgende Wochenenden (`-900` Punkte). Dienst am direkten Vorwochenende (`-40` Punkte).
* **Samstags-Priorität (FA):** Erster Samstag im Monat wird extrem gefördert (`+2000` Punkte). Ein zweiter Samstag wird hart bestraft (`-15000` Punkte). Abweichung vom FA-Samstags-Durchschnitt kostet `700` Punkte.
* **Becker-Samstag (Notfall):** Nur im gelockerten Modus möglich (`-2000` Punkte).
* **Distanz-Puffer:** Abstand zum letzten BD < 4 Tage (`-120` Punkte pro fehlendem Tag).
* **D-F-D-F Vermeidung:** Weiche Strafe (`-260` Punkte) zur Verhinderung von Fragmentierung.
* **Feiertags-Ausgleich:** Historisches Defizit an Feiertagen im Vergleich zum Abteilungsdurchschnitt (`+6` Punkte pro fehlendem Feiertag).

**Hintergrunddienst (HG) Modulatoren:**
* **Historischer Ausgleich:** Abweichung vom aktuellen FA-Durchschnitt (`-240` Punkte).
* **Wunscherfüllung (`HG_WISH`):** `+220` Punkte.
* **Adjacent HG:** HG am direkten Vortag oder Folgetag (`-220` Punkte).
* **Urlaubspuffer:** Nächster Tag Urlaub (`-20` Punkte).

### 2.3 Spezifische Kopplungs-Logik (HG Bundling)
Vor der freien Verteilung greifen deterministische Bindungsregeln zur Sicherung der Kontinuität:
* **Freitags-Kopplung:** Leistet ein AA den Freitags-BD, wird der HG für diesen Freitag **zwingend** an den FA gekoppelt, der den Samstags-BD leistet (Erlaubt `Adjacent HG`).
* **Wochenend-Kopplung:** Leistet ein FA den Samstags-BD, wird der Sonntags-HG **zwingend** an denselben FA gekoppelt.

### 2.4 Die Becker-FZA-Regel (Kompensationslogik)
Sollte Dr. Becker durch den gelockerten Modus einen Samstags-BD zugewiesen bekommen, triggert das System eine automatische Nachbearbeitung:
1.  Suche des nächsten regulären Werktages.
2.  Prüfung, ob dieser Tag durch Freistellung eines anderen FAs blockiert ist (CT-Leitungs-Erhalt).
3.  Prüfung, ob Dr. Becker bereits eingeteilt ist.
4.  **Erfolg:** Automatischer Eintrag von `FZA` am entsprechenden Werktag.
5.  **Fehlschlag:** Generierung einer UI-Warnung (Sichtbar im Modal) zur manuellen Prüfung.

---

## 3. Phasen der Meta-Optimierung (The Pipeline)

Der Algorithmus durchläuft 9 sequentielle Epochen, orchestriert in `computeAutoPlan()`:

| Phase | Funktion | Logik / Methodik |
| :--- | :--- | :--- |
| **1. Init** | Daten-Präparation | Sammlung historischer Daten bis zum aktuellen Monat. Ergänzung von fehlenden `F`-Tagen hinter bereits manuell gesetzten `D`-Diensten. Initialisierung der Zähler. |
| **2. BD Weekend**| Heuristische Zuweisung | Greedy-Zuweisung der komplexesten Tage (Fr, Sa, So, Feiertage). Fallback auf "gelockerte Regeln" (z.B. Verletzung der Abstandsregeln), falls kein Kandidat regulär passt. |
| **3. BD Workday**| Heuristische Zuweisung | Greedy-Zuweisung der regulären Werktage (Mo-Do). |
| **4. BD Optimize**| Lokale Metaheuristik | 12 Iterationen (Passes). Simuliert für jeden Tag den Tausch des BD-Inhabers mit allen anderen Kandidaten. Tausch wird vollzogen, wenn `computeBDObjective()` sinkt. |
| **5. HG Bundle** | Deterministischer Link | Ausführung der Kopplungs-Logiken (siehe 2.3). Setzt feste Anker für das HG-Grid. |
| **6. HG Assign** | Heuristische Zuweisung | Greedy-Auffüllung der verbleibenden HG-Lücken durch berechtigte FAs. |
| **7. HG Optimize**| Lokale Metaheuristik | 14 Iterationen. Analoge Swap-Logik für HG zur Glättung der `computeHGObjective()`. |
| **8. Deep Optimize**| Globale Metaheuristik| 16 Iterationen **Cross-Duty-Swaps**. Prüft jeden Tag (D und HG). Evaluiert Zuweisungen gegen die `computeGlobalObjective()`. Dies löst lokale Minima auf. |
| **9. Validate** | Exklusivitäts-Sicherung | Post-Processing Loop: Bereinigt Artefakte, löscht überschüssige Dienste, falls >1 pro Tag pro Rolle. |

---

## 4. Die Mathematischen Zielfunktionen (Objective Functions)

Die Swap-Algorithmen nutzen quadratische Bestrafungen zur exponentiellen Abwertung von Unfairness. Ein niedrigerer Score ist besser.

### 4.1 BD Objective (`computeBDObjective`)
* **Abdeckung:** Tag ohne BD: `+20.000`. Tag mit >1 BD: `+50.000 * count`.
* **Target-Spread:** `(Diff^2 * 3.200) + (|Diff| * 1.400)`. Gesamtes Abteilungsdefizit: `+9.000 * Summe`. Gesamter Überschuss: `+7.000 * Summe`. Unbalance-Strafe: `|Defizit - Überschuss| * 6.000`.
* **Wochenend-Spread:** `(WE_Diff)^2 * 480`. Verletzung der 1.5 Toleranz: `+12.000` pro Einheit. Aufeinanderfolgende WE: `+6.000`.
* **Samstags-Spread (FA):** Zwei Samstage: `+50.000`. Abweichung vom Durchschnitt: `Diff^2 * 850`.
* **Struktur-Verstöße:** `D-D` Folge (Artefakt-Prävention): `+40.000`. Distanz < 3: `(3-dist) * 6.000`. Distanz < 5: `(5-dist) * 350`. D-F-D-F Muster: `+380`. Becker an Samstag: `+30.000`.

### 4.2 HG Objective (`computeHGObjective`)
* **Abdeckung:** Tag ohne HG: `+15.000`. Tag mit >1 HG: `+40.000 * count`.
* **Fairness-Kalkül:** Ideal-HG für einen FA = `Abteilungs_Avg_HG + (Avg_BD_FA - Eigener_BD) * 0.7`. (Weniger BD = mehr HG). Strafe: `(Diff_zum_Ideal)^2 * 520`.
* **Lastenverteilung:** Abweichung bei "HG für AA" (`Diff^2 * 700`). Abweichung bei "HG für FA" (`Diff^2 * 280`).
* **Wochenend-Spread:** `(WE_Diff)^2 * 260`. Toleranzbruch (>1.5): `+8.000`.
* **Struktur-Verstöße:** Adjacent HG: `+1.800`. HG vor eigenem BD (außer Freitag): `+24.000`.

### 4.3 Global Objective (`computeGlobalObjective`)
Summe aus BD und HG Objective, plus massiver Deckungsstrafen:
* Fehlender BD: `+25.000`
* Fehlender HG: `+18.000`
* Doppelbesetzung: `+100.000`

---

## 5. UI & Qualitätsmetriken

### 5.1 Planungsmodus (Sandbox)
Das UI operiert mit einem gekapselten State (`planData`), der den Live-Betrieb nicht affektiert. Änderungen (manuelle Dienste, Wünsche) werden auf einen Baseline-Snapshot (`planBaseline`) angewendet. Ein dedizierter History-Stack (`planHistory`, `planHistoryIdx`) ermöglicht granulare Undo/Redo Operationen (`Strg+Z` / `Strg+Y`).

### 5.2 Quality Score Berechnung
Der finale Prozent-Score (0-100%) aggregiert Parameter nach Vollendung von Phase 9:
* `36%`: BD-Abdeckungsquote
* `24%`: HG-Abdeckungsquote
* `16%`: BD-Fairness (Spread normiert auf 4)
* `10%`: HG-Fairness (Spread normiert auf 3)
* `8%`: WE-Fairness (Spread normiert auf 1.5)
* `10%`: Wunsch-Erfüllungsquote (Erfüllte Wünsche / Gesamtwünsche)

### 5.3 RBN-Neuroradiologie (Sonderlogik)
Ein dediziertes Grid (`RBN_ROW_KEY`) steuert neuroradiologische Zuordnungen ab Mai 2025.
**Regel:** Fr. Thaler wird dynamisch ab März 2026 (`RBN_THALER_LAST_MONTH`) aus den RBN-Optionen gefiltert.

### 5.4 Dynamische Feiertagsberechnung
Sämtliche sächsischen Feiertage werden algorithmisch pro Jahr generiert (`getSaxonyHolidays`), inklusive der Gaußschen Osterformel zur dynamischen Terminierung von Karfreitag bis Pfingstmontag und der Rückrechnung des Buß- und Bettags (Mittwoch vor dem 23. November). Ergebnisse werden zur Laufzeitoptimierung memoisiert (`HOLIDAY_CACHE`).