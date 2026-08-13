# Algorithmische Spezifikation: RadPlan Neural Scheduler (v3.2)

Der RadPlan Neural Scheduler ist ein hochkomplexes Optimierungssystem, das darauf ausgelegt ist, eine mathematisch perfekte Verteilung von Bereitschaftsdiensten (BD) und Hintergrunddiensten (HG) zu generieren. Er operiert in einem hoch-iterativen Umfeld und nutzt eine Kombination aus deterministischen Regeln, probabilistischem Scoring und einer globalen Metaheuristik (Swap-Optimierung). Der gesamte Prozess wird transparent durch den **Neural Fitness Index (NFI)** gemessen und bewertet.

## 1. Systemarchitektur & Prozesssteuerung
Das System arbeitet nicht linear, sondern in einer 8-fachen Zyklus-Schleife (`MAX_OPTIMIZATION_CYCLES`, `js/autoplan.js`). In jedem Zyklus werden potenzielle Dienst-Konfigurationen simuliert und gegeneinander abgewogen. Das Ziel ist die Minimierung der "Global Objective Function" – einer Kostenfunktion, die Regelverstöße und Unfairness mit massiven Strafpunkten (Penalties) belegt.

> Hinweis: Diese Passzahlen sind die einzige kanonische Quelle für die Iterationstiefe des Schedulers. `Algorithmusregeln.txt` beschreibt bewusst nur die fachlichen Kriterien ohne konkrete Zyklen-/Pass-Zahlen, um Drift zwischen den beiden Dokumenten zu vermeiden — bei Änderungen an den Konstanten in `js/autoplan.js` ist ausschließlich dieser Abschnitt zu aktualisieren.

### Die Optimierungs-Pipeline:
1. **Initialisierungs-Phase:** Aggregation historischer Statistiken (seit dem 01.01. des laufenden Jahres) und Sicherung manuell gesetzter Dienste. Automatische Korrektur fehlender Ruhetage (F) nach fixen Bereitschaftsdiensten.
2. **Konstruktive Phase (Greedy):** Erstverteilung der BDs an Wochenenden und Feiertagen, gefolgt von Werktagen. Hierbei werden harte Ausschlusskriterien (Urlaub, gesetzliche Abstände, spezifische Sperren) strikt beachtet.
3. **Deterministische Kopplung (HG-Bundling):** Automatische Bindung von HG-Diensten an spezifische BD-Szenarien (z. B. AA-Freitags-Kopplung, FA-Wochenend-Kette, Feiertags-Vortags-Kopplung).
4. **HG-Rhythmisierung:** Erstverteilung der verbleibenden HG-Lücken unter strengster Berücksichtigung der neuen Anti-Clustering-Logik.
5. **Multi-Zyklus-Optimierung (8 Zyklen, `MAX_OPTIMIZATION_CYCLES`):**
   - **BD-Swap-Pass (max. 20 Durchläufe, `BD_MAX_PASSES`):** Verfeinerung der BD-Gerechtigkeit und Auflösung lokaler Unausgewogenheiten. Bricht früher ab, sobald keine verbessernde Vertauschung mehr gefunden wird (Konvergenz).
   - **HG-Swap-Pass (max. 30 Durchläufe, `HG_MAX_PASSES`):** Aktives Aufbrechen von HG-Clustern und Glättung des monatlichen Arbeitsrhythmus.
   - **Globaler Deep-Optimize-Pass (max. 40 Durchläufe, `DEEP_MAX_PASSES`):** Systemweite Cross-Role-Swaps zur Behebung hochkomplexer Interdependenz-Konflikte (z. B. CT-Leitung).
   - **Coverage-Repair:** Dynamische Schließung etwaiger verbleibender Lücken durch Zwangs-Zuweisungen an die am wenigsten belasteten Mitarbeiter.
6. **Validierungs-Phase:** Letzte Integritätsprüfung der Dienst-Exklusivität (max. ein Dienst pro Tag) und Datenkonsistenz.

## 2. Detailliertes Regelwerk (Constraint Catalog)

### 2.1 Harte Constraints (K.-o.-Kriterien)
Verletzungen dieser Regeln führen zur sofortigen Ablehnung eines Kandidaten in der Initialphase (-Infinity) oder massiven Strafen in der Objective Function.
- **Abwesenheits-Integrität:** Kein Dienst bei Status U, ZU, SU, §15c, K, KK, FZA, WB.
- **Wunscherfüllung:** Der Wunsch "Kein Dienst" (NO_DUTY) wird als hartes Ausschlusskriterium behandelt.
- **Gesetzliche Ruhezeit:** Nach jedem BD am Tag X ist der Tag X+1 zwingend als "F" zu markieren (gilt für Werktage).
- **Dienst-Exklusivität:** Maximal ein D oder HG pro Kalendertag pro Person.
- **Qualifikations-Sperre:** Samstags-Dienste und HG-Dienste sind ausschließlich Fachärzten (FA) vorbehalten.
- **BD-Folge-Sperre:** Keine BD-Dienste an zwei aufeinanderfolgenden Tagen (D-D Verbot).
- **HG-Vortag-Sperre (AA-Regel):** Ein FA darf keinen HG für einen AA leisten, wenn der FA am Folgetag selbst BD hat (späterer Dienstbeginn verhindert rechtzeitige Befundfreigabe).
- **Spezial-Sperre Dr. Polednia:** Absolutes BD-Verbot an Sonntagen, Dienstagen und Donnerstagen. Ebenso absolutes HG-Verbot für AAs an diesen Tagen (Vermeidung von Kollisionen mit dem Kinder-Ultraschall am Folgetag).
- **CT-Vertretungs-Pool:** Bis einschließlich September 2026 gilt die bisherige Becker/Martin-Interdependenz. **Ab Oktober 2026** muss an jedem Werktag mindestens eine Person aus **Dr. Becker / Dr. Martin / Dr. Hellmann** CT-verfügbar sein. Dr. Hellmann zählt an einem Tag mit Arbeitsplatz **NRAD** ausdrücklich nicht als CT-verfügbar. Der Algorithmus blockiert BD-Kandidaten, deren nachgelagerter Ruhetag diese Präsenzinvariante verletzen würde.
- **Urlaubs-Puffer:** Kein BD am Tag direkt vor einem Urlaubsantritt.
- **Feiertags-Alternanz:** Wer an Ostern Dienst hat, wird für Pfingsten gesperrt (und umgekehrt).

### 2.2 Anti-Clustering & Rhythmus-Logik (HG-Fokus)
Um zusammenhängende "Dienst-Blöcke" und Überlastung zu verhindern, nutzt der Scheduler ein starkes Bestrafungssystem:
- **Abstands-Malus (3-Tage):** Ein HG-Dienst innerhalb von 3 Tagen nach einem anderen HG wird mit -8.000 Pkt. (Scoring) bzw. +18.000 Pkt. (Objective) bestraft.
- **Direkt-Folge-Malus:** Back-to-back HG-Dienste (außer bei zwingenden Kopplungen) werden mit -25.000 Pkt. (Scoring) bzw. +45.000 Pkt. (Objective) massiv abgewertet.
- **Dichte-Prüfung (Rolling Window):** In jedem 7-Tage-Fenster wird die Anzahl der HGs pro Person überwacht. Jede Überschreitung der Dichte von 1 Dienst pro Fenster (ausgenommen Kopplungen) kostet in der Objective Function zusätzlich +12.000 Pkt.

### 2.3 Kopplungs-Modelle (Bundling)
Deterministische Verknüpfungen, die noch vor der freien Optimierung gesetzt werden:
- **Modell "Freitags-Support":** Hat ein AA am Freitag BD, übernimmt der FA des Samstags-BDs zwingend den Freitag-HG.
- **Modell "Wochenend-Kette":** Ein FA mit Samstags-BD übernimmt zwingend den Sonntag-HG (HG-D-HG Kette).
- **Modell "Feiertags-Vortag":** Hat ein AA am Vortag eines Feiertags BD, übernimmt der FA des Feiertags-BDs den HG am Vortag.

### 2.4 Personelle Sonderregeln (`SPECIAL_RULES`, konstants.js)
Zusätzlich zu den allgemeinen Regeln gelten datengetrieben konfigurierte, namentliche Sonderfälle:
- **Prof. Schäfer:** Komplett dienstbefreit (BD-Ziel 0).
- **Reduzierte BD-Monatsziele:** Dr. Polednia, Dr. Becker und Hr. Sebastian haben ein Standardziel von 3 statt 4 BD/Monat. **Dr. Hellmann hat ab Eintritt ein Standardziel von 2 und zugleich eine harte Obergrenze von maximal 2 BD/Monat**, die auch in Coverage-Eskalationen nicht überschritten werden darf.
- **Dr. Becker (Samstags-BD als Ultima Ratio):** Erhält einen Samstags-BD nur, wenn keine andere Fachärztin/kein anderer Facharzt verfügbar ist. Nach einem solchen Samstags-BD wird ihr am nächsten regulären Werktag zwingend ein FZA-Tag eingetragen.
- **Fr. Dalitz vs. Hr. Torki/Hr. Sebastian:** Fr. Dalitz darf sonntags oder montags keinen HG übernehmen, wenn Hr. Torki oder Hr. Sebastian am selben Tag den BD leisten (Mammographie-Schicht am Folgetag kollidiert mit zeitintensiver AA-Befundfreigabe).
- **Donnerstags-Urlaubsverlängerer:** Donnerstags-BD wird bevorzugt an Personen vergeben, die in der Folgewoche Urlaub haben (das automatische F am Freitag verlängert so das Wochenende bzw. den Urlaubsantritt).

## 3. Mathematische Kostenfaktoren (Objective Penalties)

Der Scheduler sucht iterativ nach der Lösung mit dem niedrigsten Gesamt-Score.

| Metrik / Verstoß | Straffaktor (Gewichtung in der Objective Function) |
| :--- | :--- |
| **Ungedeckter BD-Tag** | + 20.000 (lokal, `computeBDObjective`) **zusätzlich** + 25.000 (global, `computeGlobalObjective`) = effektiv + 45.000 |
| **Ungedeckter HG-Tag** | + 15.000 (lokal, `computeHGObjective`) **zusätzlich** + 18.000 (global, `computeGlobalObjective`) = effektiv + 33.000 |
| **Abweichung vom BD-Monatsziel** | (Diff² * 25.000) + (\|Diff\| * 10.000) |
| **HG-Fairness (Abweichung v. Ideal)** | (Diff_zu_Ideal)² * 25.000 |
| **HG-Typ-Balance AA-Anteil (Abweichung v. AA-HG-Durchschnitt)** | (Diff_zu_Avg)² * 15.000 |
| **HG-Typ-Balance FA-Anteil (Abweichung v. FA-HG-Durchschnitt)** | (Diff_zu_Avg)² * 8.000 |
| **Fr. Dalitz vs. Torki/Sebastian (So/Mo)** | + 100.000 (K.O.-Kriterium im Swap) |
| **Illegale BD-Folge (D-D)** | + 100.000 |
| **HG vor eigenem BD (außer Fr)** | + 60.000 |
| **Nicht-gekoppelter Adjacent HG** | + 45.000 |
| **Dichte-Verstoß (HG-Block im 7-Tage-Fenster)** | + 12.000 |
| **BD-Mindestabstand < 3 Tage** | (3-Dist) * 15.000 |
| **Zweiter Samstags-BD im Monat** | + 80.000 |
| **Becker-Samstag (Notlösung)** | + 40.000 |
| **D-F-D-F Muster** | + 8.000 (Scoring, `DFDF_PATTERN_SCORE_PENALTY`) / + 20.000 (Objective, `DFDF_PATTERN_OBJECTIVE_PENALTY`) |

> Hinweis zur Doppelzählung bei Coverage-Lücken: `computeGlobalObjective` summiert `computeBDObjective`/`computeHGObjective` (die selbst schon einen Coverage-Malus enthalten) und addiert *zusätzlich* ihre eigene, unabhängig gewichtete Coverage-Prüfung. Das ist keine Inkonsistenz, sondern bewusst so gebaut: In den rollenspezifischen Swap-Pässen (BD-Swap, HG-Swap) zählt nur der jeweils lokale Malus, während der globale Cross-Role-Pass (Deep-Optimize, Zyklus-Vergleich) Deckungslücken zusätzlich verstärkt gewichtet, damit Cross-Role-Swaps niemals eine Deckungslücke zugunsten reiner Fairness in Kauf nehmen. Bei Änderungen an einem der beiden Werte ist zu prüfen, ob die Verstärkung im globalen Pass weiterhin gewünscht ist.

## 4. Workload-Fairness-Kalkül (HG-Berechnung)
Die Lastverteilung der HG-Dienste erfolgt streng mathematisch auf Basis der aktuellen BD-Belastung:
`Ideal_HG_Anzahl = Monats_Durchschnitt_HG + (Durchschnitt_BD_der_FAs - Individuelle_BD_Anzahl) * 1.0`
Dieses Modell garantiert absolute Ausgewogenheit: Ein Facharzt, der einen BD weniger als der Durchschnitt leistet, muss exakt einen HG mehr als der Durchschnitt übernehmen. Historische Daten des Vorjahres dienen nur als minimaler "Tie-Breaker", falls zwei Kandidaten für denselben Tag einen identischen in-month Score aufweisen.

### 4.1 Überhang-Präferenz (fünfter Dienst)
Sind alle BD bereits gleichmäßig und fair an den Monatszielen verteilt und muss dennoch ein Dienst über dem Ziel hinaus vergeben werden, absorbiert **Dr. Lurz** diesen ersten Überhang-Dienst bevorzugt. Die Regel ist datengetrieben über `SPECIAL_RULES.surplusBdPreference` konfiguriert und wirkt sowohl im Greedy-Scoring (`scoreBDCandidate`) als auch in der Kostenfunktion (`computeBDObjective`). Der Bonus (ca. 8.000 Pkt.) greift ausschließlich beim Schritt Ziel → Ziel+1 und wird unterdrückt, sobald ein anderer Kandidat einen BD-Wunsch für denselben Tag besitzt. Er ist klein gegenüber der quadratischen Zielabweichungs-Strafe und erzwingt daher niemals einen unnötigen Überhang oder verdrängt unter-Ziel-Kandidaten.

### 4.2 Wochenend-Fairness (doppelte Absicherung)
Die Wochenend-Last wird nicht nur gegen das feste Ziel von 1.0 Äquivalenten gemessen, sondern zusätzlich gegen die Streuung um den tatsächlichen Gruppendurchschnitt (`(weCount − weAvg)² × ~9.000` im BD-Objective bzw. `× ~4.500` im HG-Objective). So trägt auch in einem engen Monat, in dem 1.0 nicht für jede Person exakt erreichbar ist, niemand deutlich mehr Wochenend-Last als der Rest.

## 5. Neural Fitness Index (NFI)
Die Qualität des errechneten Plans wird transparent und hochpräzise über den **Neural Fitness Index (NFI)** auf einer Skala von 0.0 bis 100.0 gemessen. Er setzt sich wie folgt zusammen:
- **36% BD-Abdeckung:** Malus bei Lücken im Bereitschaftsdienst-Netz.
- **24% HG-Abdeckung:** Malus bei fehlender Hintergrund-Absicherung.
- **16% BD-Gerechtigkeit:** Skalierung des maximalen Unterschieds (Spread) der BD-Anzahl zwischen den Fachärzten.
- **10% HG-Gerechtigkeit:** Skalierung der HG-Verteilungsunterschiede.
- **8% WE-Fairness:** Ausgewogenheit der Wochenend-Äquivalente (Ziel 1.0).
- **6% Wunscherfüllung:** Erfüllte Wünsche (BD_WISH, HG_WISH) im Verhältnis zu allen geäußerten positiven Wünschen.
- **Deep-Move-Korrelation:** Winziger Feinabzug für erzwungene Extrem-Swaps zur Vermeidung von Score-Inflation.

Der Algorithmus läuft künstlich für exakt ~22 Sekunden in der **"Neural Constellation"**-Visualisierung. Diese vollflächige Canvas-Inszenierung stellt jeden Kalendertag als Knoten in einem neuronalen Netz dar, das um einen zentralen Reaktor-Kern kreist: Jede Vergabe und jeder Optimierungs-Swap entlädt sich als farbcodiertes Energiepaket (D rot, HG blau), das entlang der Synapsen zum Kern wandert, während die Hintergrund-Aurora die aktive Phase (Init/Greedy/HG/Deep/Erfolg) einfärbt. Ein radarartiges HUD-Oszilloskop spiegelt die Aktivität in Echtzeit. So wird sichergestellt, dass die Rechentiefe ausgeschöpft wurde und dem Anwender das Volumen der simulierten Kombinationen eindrucksvoll veranschaulicht wird.
