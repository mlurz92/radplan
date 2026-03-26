# Algorithmische Spezifikation: RadPlan Neural Scheduler

Diese Dokumentation beschreibt die vollständige Logik, die mathematischen Priorisierungen und die Einschränkungen des RadPlan Neural Schedulers. Der Algorithmus nutzt einen hybriden Ansatz aus konstruktiver Heuristik (greedy) und einer iterativen Metaheuristik (Swap-Optimierung).

## 1. Grundprinzipien
* **Zielsetzung:** Maximale Dienstabdeckung bei gleichzeitiger Maximierung der Fairness (Verteilungsgerechtigkeit) für alle Mitarbeiter unter Einhaltung aller medizinisch-rechtlichen und operativen Regeln.
* **Strategie:** "Hard Constraints" werden primär durch die Auswahlfunktion (`canDoBD`, `canDoHG`) erzwungen. "Soft Constraints" werden über Scoring-Funktionen (`scoreBDCandidate`, `scoreHGCandidate`) in das Ranking der Kandidaten einbezogen. Die globale Optimierung erfolgt über eine Kostenfunktion (`Global Objective Function`).

## 2. Daten und Planungsgrundlagen
* **Historische Daten:** Der Algorithmus aggregiert Dienstdaten (BD, HG, WE-Dienste, Samstage, Feiertagsdienste) seit dem 01.01. des aktuellen Jahres.
* **Fairness-Maß:** Die "Fairness" wird über die Standardabweichung (Fairness Spread) der Dienstanzahl pro Mitarbeiter berechnet.
* **Targets:** Das monatliche Ziel für BDs pro Mitarbeiter (Default: 4, Dr. Polednia/Becker/Sebastian: 3) ist der Ankerpunkt für die Verteilungslogik.

## 3. Phasen der Berechnung

### Phase 1: Initialisierung
- Laden der historischen Statistiken.
- Identifikation fixer Dienste (manuell durch den Planer gesetzte Dienste).
- Korrektur von Lücken: Nach jedem manuell gesetzten "D" wird automatisch ein "F" (Frei) am Folgetag reserviert (automatischer Ruhetag).

### Phase 2: Wochenende & Feiertage (BD)
- **Priorität:** Höchste Priorität, da diese Tage am schwersten zu besetzen sind.
- Sortierung der Tage nach WE/FT-Status.
- Auswahl der Kandidaten erfolgt über den `scoreBDCandidate`.

### Phase 3: Werktage (BD)
- Verteilung der restlichen BDs von Montag bis Freitag.
- Berücksichtigung der "Vor-Urlaub-Priorisierung": Am Donnerstag vor einer Urlaubswoche eines Mitarbeiters wird dieser bevorzugt für den BD eingeteilt, um den Urlaubseffekt durch den Ruhetag am Freitag zu maximieren.

### Phase 4: Iterative BD-Optimierung
- Durchführung von Swaps: Der Algorithmus testet für jeden BD-Tag, ob ein Tausch zwischen dem aktuell eingeteilten Mitarbeiter und einem anderen Kandidaten den `Global Fairness Score` verbessert.

### Phase 5: HG-Bündelung (Kopplung)
- **Regel:** Wenn ein AA am Freitag BD hat, wird der HG zwingend an den FA vergeben, der am Samstag BD hat.
- **Regel:** Wenn ein FA am Samstag BD hat, übernimmt er zwingend den Sonntag-HG (HG-D-HG Kette).
- **Regel:** Wenn AA am Vortag eines Feiertags BD hat, wird der HG an den FA des Feiertags-BDs gebunden.

### Phase 6: HG-Verteilung (Rest)
- Auffüllen verbleibender HG-Dienste durch FAs unter Berücksichtigung der monatlichen Gleichverteilung.

### Phase 7: Metaheuristik (Deep Optimize)
- Laufzeit-intensive Phase. Tausche von Diensten zwischen Mitarbeitern, um die "Global Objective Function" zu minimieren.
- Hier werden auch komplexe Abhängigkeiten (z.B. Dr. Becker/Dr. Martin CT-Leitung) über den gesamten Monat hinweg berechnet.

### Phase 8: Validierung & Doppel-Dienst-Bereinigung
- Identifikation und Entfernung von `D-D` Kombinationen, die durch die Metaheuristik entstanden sein könnten.

## 4. Constraint-Katalog

### 4.1 Harte Constraints (Hard Constraints)
* **Status-Blocker:** An Tagen mit Urlaub (U, ZU, SU, §15c), Krank (K, KK), FZA oder WB ist kein Dienst möglich.
* **Ruhezeit:** D am Tag `d` -> F am Tag `d+1` (wenn Werktag).
* **Doppel-D:** D am Tag `d` -> Kein D am Tag `d+1`.
* **Samstag-Qualifikation:** Samstags-Dienst nur für FAs.
* **Spezialisierung:** Dr. Polednia: Kein D an So, Di, Do.
* **CT-Leitung:** Dr. Becker und Dr. Martin dürfen nicht am selben Tag "F" (Frei) haben, um die CT-Leitung zu gewährleisten.
* **Becker-Regel:** Samstags-Dienst für Dr. Becker führt zwingend zum FZA am nächsten Werktag.

### 4.2 Weiche Constraints & Scoring (Soft Constraints)
* **BD-Soll:** Erfüllung des Ziels `+220` Pkt/Dienst. Übererfüllung strafbar (`-7000` Pkt).
* **Samstags-Dienste:** 
  * FA mit 0 Samstags-Diensten: `+2000` Pkt.
  * Zweiter Samstags-Dienst im Monat: `-15000` Pkt (Metaheuristik-Bestrafung bei Spread > 1).
* **Wochenend-Soll:** Ziel: 1 WE-Äquivalent. Abweichung ` -220` Pkt. Überschreitung > 1.5: `-500` Pkt.
* **WE-Abstand:** Aufeinanderfolgende WEs: `-900` Pkt.
* **D-F-D-F Vermeidung:** Weiche Strafe von `-260` Pkt.
* **HG-Adjacent:** HG-Dienste an aufeinanderfolgenden Tagen: `-220` Pkt.

## 5. Mathematische Gewichtung (Global Objective Function)
Die Funktion `computeGlobalObjective` bewertet den Plan mit einem "Straf-Score". Je niedriger, desto besser.

| Metrik | Straffaktor |
| :--- | :--- |
| Ungedeckter BD | 20.000 |
| Ungedeckter HG | 15.000 |
| BD-Soll-Abweichung | (Diff^2 * 3.200) + (|Diff| * 1.400) |
| WE-Dienst-Abweichung | Diff^2 * 480 |
| Samstags-Dienst Spread (FA) | Diff^2 * 50.000 |
| Illegale BD-Folge | 40.000 |
| Distanz BD < 3 Tage | (3-Distanz) * 6.000 |
| HG an aufeinanderfolgenden Tagen | 1.800 |

## 6. Besonderheiten für Dr. Polednia & Dr. Becker
* **Dr. Polednia:** Er ist der einzige, der KUS (Kinder-US) am Tag darauf durchführen kann. Daher die strikte Sperre für D am Sonntag, Dienstag und Donnerstag. Zusätzlich darf er keinen HG für einen AA an diesen Tagen machen, da die Befundfreigabe mit dem KUS am Vormittag kollidieren würde.
* **Dr. Becker:** Die Samstags-Priorisierung ist für sie inaktiv. Sie wird nur als "Letzte-Instanz-FA" für Samstags-Dienste gewählt. Sobald ein Samstag zugewiesen wird, erzwingt die Logik den FZA am Folgetag.

---
