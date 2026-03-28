# Algorithmische Spezifikation: RadPlan Neural Scheduler (v3)

Der RadPlan Neural Scheduler ist ein hochpräzises Optimierungssystem zur automatisierten Erstellung von ärztlichen Dienstplänen. Er basiert auf einem hybriden Modell aus konstruktiven Heuristiken (Greedy-Ansatz) und einer mehrstufigen iterativen Metaheuristik (Swap-Optimierung). Das System verfolgt das Ziel, eine mathematisch perfekte Balance zwischen Dienstabdeckung, gesetzlichen Ruhezeiten, spezifischen personellen Einschränkungen und individueller Fairness zu finden.

## 1. Fundamentale Architektur
Der Algorithmus arbeitet nicht linear, sondern in einem 15-fachen Zyklus-Verfahren. Er simuliert tausende von möglichen Dienstkombinationen und bewertet diese anhand einer komplexen Kostenfunktion (Global Objective Function). Ein niedrigerer Kosten-Score korreliert dabei mit einer höheren Planungsqualität.

### Die drei Säulen der Entscheidung:
1. **Harte Constraints (Hard Constraints):** Unverhandelbare Regeln (z. B. Ruhezeiten, Urlaub). Verletzungen führen zum sofortigen Ausschluss eines Kandidaten (-Infinity).
2. **Weiche Constraints (Soft Constraints):** Präferenzen und Fairness-Ziele. Sie modulieren den Score eines Kandidaten (Scoring).
3. **Globale Metaheuristik:** Nach der initialen Verteilung werden Dienste zwischen Personen getauscht (Swaps), um lokale Minima zu verlassen und die Gesamtverteilung zu glätten.

## 2. Der Optimierungsprozess (The Pipeline)

### Phase 1: Initialisierung & Daten-Integrität
* **Historische Analyse:** Aggregation aller geleisteten Dienste (BD, HG, WE, Samstage, Feiertage) seit dem 01.01. des aktuellen Kalenderjahres. Diese Daten dienen in Grenzfällen als "Tie-Breaker".
* **Fix-Dienst-Anker:** Identifikation aller manuell durch den Planer gesetzten Dienste. Diese werden als unveränderlich markiert.
* **Auto-F-Repair:** Automatische Reservierung eines "F" (Freizeitausgleich) am Folgetag für jeden manuell gesetzten BD, sofern dieser auf einen Werktag fällt.

### Phase 2: Priorisierte BD-Verteilung (Wochenende & Feiertage)
Wochenenden und Feiertage sind am schwersten zu besetzen und bilden das Gerüst des Plans.
* Der Algorithmus sortiert diese Tage und weist sie den Kandidaten mit dem höchsten `scoreBDCandidate` zu.
* Falls kein Kandidat die harten Regeln erfüllt, schaltet das System in den "Relaxed Mode" (Lockern von Abstandsregeln), um eine Lücke zu vermeiden.

### Phase 3: Sekundäre BD-Verteilung (Werktage)
* Verteilung der verbleibenden BD-Dienste (Montag bis Donnerstag).
* Hier greift die "Vor-Urlaub-Priorisierung": Personen, die in der Folgewoche Urlaub haben, werden bevorzugt am Donnerstag eingeteilt, um den Ruhetag am Freitag als Urlaubsverlängerung zu nutzen.

### Phase 4: Lokale BD-Optimierung (80 Durchläufe pro Zyklus)
* Das System prüft für jeden Tag des Monats, ob ein Tausch des BD-Inhabers mit einer anderen qualifizierten Person die `computeBDObjective` (Kostenfunktion für Bereitschaftsdienste) senkt.

### Phase 5: Deterministische HG-Bündelung (Kopplungs-Logik)
Bevor HG-Dienste frei verteilt werden, greifen zwingende medizinisch-operative Kopplungsregeln:
1. **AA-Freitags-Kopplung:** Hat ein Assistenzarzt (AA) am Freitag BD, muss der Facharzt (FA), der am Samstag BD hat, zwingend den HG am Freitag übernehmen.
2. **FA-Samstags-Kette:** Ein Facharzt, der am Samstag BD hat, übernimmt zwingend den HG am Sonntag (Modell: HG-D-HG).
3. **Feiertags-Vortags-Kopplung:** Hat ein AA am Vortag eines Feiertags BD, übernimmt der FA des Feiertags-BDs zwingend den HG am Vortag.

### Phase 6: HG-Initialzuweisung & Fairness-Ausgleich
* Verteilung der restlichen HG-Lücken.
* **Zentrale Fairness-Regel:** FA mit weniger BD im aktuellen Monat erhalten anteilig mehr HG-Dienste, um die Gesamt-Arbeitslast (Workload) innerhalb des Monats auszugleichen.

### Phase 7: Lokale HG-Optimierung (100 Durchläufe pro Zyklus)
* Iterative Swaps von HG-Diensten zur Minimierung der `computeHGObjective`. Ziel ist die Glättung der Verteilung von "HG für AA" (hohe Belastung) und "HG für FA" (niedrige Belastung).

### Phase 8: Globale Metaheuristik (Deep Optimize - 120 Durchläufe pro Zyklus)
* Dies ist die rechenintensivste Phase. Das System führt Cross-Role-Swaps durch und evaluiert die `computeGlobalObjective`. Hier werden komplexe Interdependenzen (wie die CT-Leitung Becker/Martin) über den gesamten Monat hinweg harmonisiert.

### Phase 9: Final Validation & Exclusivity Check
* Abschlussprüfung auf Dienst-Exklusivität (maximal ein Dienst pro Person pro Tag) und Bereinigung etwaiger Artefakte aus der Swap-Phase.

## 3. Das Regelwerk (Constraint Catalog)

### 3.1 Harte Constraints (K.-o.-Kriterien)
* **Abwesenheits-Sperre:** Dienste sind bei Status U, ZU, SU, §15c, K, KK, FZA, WB oder dem Wunsch "Kein Dienst" absolut ausgeschlossen.
* **Ruhezeit-Gesetz:** BD am Tag X erzwingt F am Tag X+1 (wenn Werktag).
* **Doppel-D-Verbot:** Niemals zwei Bereitschaftsdienste an aufeinanderfolgenden Tagen.
* **Qualifikations-Check:** Samstage und HG-Dienste sind Fachärzten vorbehalten.
* **Spezial-Ausschluss Dr. Polednia:**
    * Kein BD an Sonntag, Dienstag, Donnerstag (wegen KUS am Folgetag).
    * Kein HG für AA an Sonntag, Dienstag, Donnerstag (Befundfreigabe-Konflikt mit KUS).
* **CT-Leitungs-Erhalt:** Dr. Becker und Dr. Martin dürfen an Werktagen nicht gleichzeitig "Frei" oder "Urlaub" haben.
* **Dienst-Kontinuität:** Kein HG für einen AA, wenn der FA am Folgetag selbst BD hat (wegen späterem Dienstbeginn des FAs und verzögerter Befundfreigabe).
* **Feiertags-Block:** Wer an Ostern Dienst hat, darf an Pfingsten keinen Dienst haben (und umgekehrt).
* **Urlaubs-Puffer:** Kein BD am Tag unmittelbar vor einem Urlaubsantritt.

### 3.2 Weiche Constraints (Scoring-Faktoren)
* **Monats-Ziel (Target):** Erfüllung des personenspezifischen Ziels (+5000 Pkt). Übererfüllung wird massiv bestraft (-50000 Pkt).
* **Wochenend-Limit:** Ziel ist exakt 1.0 WE-Äquivalente. Abweichungen werden quadratisch bestraft.
* **Samstags-Gerechtigkeit:** Ein zweiter Samstags-BD im Monat führt zu einem extremen Malus (-25000 Pkt).
* **Becker-Samstags-Regel:** Dr. Becker wird für Samstage nachrangig behandelt (Malus -5000 Pkt). Wird sie dennoch eingeteilt, erzwingt der Algorithmus einen FZA-Tag am nächsten Werktag.
* **Erholungs-Abstand:** Ein Abstand von weniger als 3 Tagen zwischen BDs wird mit -15000 Pkt bestraft.
* **D-F-D-F-Vermeidung:** Dieses fragmentierte Muster wird mit einem Malus belegt, um zusammenhängende Arbeitsblöcke zu fördern.

## 4. Mathematische Bewertungsmetriken (Objective Functions)

Die Kostenfunktionen nutzen quadratische Strafen ($Penalty = Diff^2 \times Faktor$), um Ungerechtigkeiten exponentiell abzuwerten.

| Verstoß / Abweichung | Straffaktor (Gewichtung) |
| :--- | :--- |
| **Ungedeckter BD-Tag** | 25.000 |
| **Ungedeckter HG-Tag** | 18.000 |
| **Abweichung vom BD-Monatsziel** | (Diff² * 25.000) + (|Diff| * 10.000) |
| **Verletzung WE-Toleranz (>1.5)** | 30.000 |
| **Aufeinanderfolgende Wochenenden** | 15.000 |
| **Zweiter Samstags-BD (FA)** | 80.000 |
| **Illegale BD-Folge (D-D)** | 100.000 |
| **HG-Dienst direkt vor eigenem BD** | 60.000 |

## 5. Qualitäts-Score (0–100%)
Der im UI angezeigte Score berechnet sich aus der gewichteten Erfüllung aller Ziele:
* **36% Abdeckung BD:** Sind alle Tage besetzt?
* **24% Abdeckung HG:** Sind alle Hintergründe besetzt?
* **16% BD-Fairness:** Wie hoch ist die Streuung der BDs zwischen den Personen im Monat?
* **10% HG-Fairness:** Wie gerecht sind die HG-Lasten (für AA vs. für FA) verteilt?
* **8% WE-Fairness:** Gleichmäßige Verteilung der Wochenend-Belastung.
* **6% Wünsche:** Prozentsatz der erfüllten `BD_WISH` und `HG_WISH`.

---
