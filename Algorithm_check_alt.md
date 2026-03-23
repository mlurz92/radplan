## 1) Technischer Rahmen der Auto-Planung

### Aktivierung und Datenbasis

Die Auto-Planung startet aus dem Planungsmodus über das Auto-Plan-Modal. Vor dem Rechnen werden pro Mitarbeiter **BD-Ziele** angezeigt und anpassbar gemacht. Standardziele: `Dr. Polednia = 3`, `Dr. Becker = 3`, `Hr. Sebastian = 3`, alle übrigen dienstpflichtigen Mitarbeitenden `4`, dienstbefreite `0`. Historische BD- und Samstag-BD-Werte werden im Modal angezeigt und in die Bewertung einbezogen.  

### Dienstbefreiung

Es gibt eine explizite Dienstbefreiungsliste. In der aktuellen Implementierung ist **Prof. Schäfer** davon erfasst; diese Person wird weder für BD noch für HG eingeplant. 

### Bereits gesetzte Dienste

Die Auto-Planung überschreibt nicht blind den Monat, sondern klont den bestehenden Planungsentwurf und ergänzt nur fehlende Besetzungen. Bereits vorhandene D- oder HG-Einträge im aktuellen Entwurf bleiben Ausgangspunkt der Berechnung. Zusätzlich werden fehlende `F`-Tage nach bereits vorhandenen D-Einträgen repariert. 

---

## 2) Begriffe und Zähllogik

### Was als „Dienst“ zählt

Im Regeltext zählen **D** und **HG** als Dienste. Genau damit arbeitet auch die Engine. 

### Wochenendzählung

Die Wochenendbelastung wird **nicht** pro Einzeltag, sondern pro ISO-Kalenderwoche über **Freitag/Samstag/Sonntag** aggregiert:

* enthält das Wochenende mindestens einen **D** → Wert **1**
* enthält es **keinen D**, aber mindestens einen **HG** → Wert **0,5**

Diese Logik wird sowohl für die historische Statistik als auch für die aktuelle Fairnessberechnung und Zusammenfassung verwendet.   

### Historische Kennzahlen

Für jeden Mitarbeiter werden aus **vergangenen Monaten** u. a. gesammelt:

* Anzahl **BD**
* Anzahl **HG**
* **Wochenend-Dienstäquivalente**
* **Feiertagsdienste**
* **Donnerstags-BD**
* **HG bei AA im D**
* **HG bei FA im D**
* **Samstags-BD**

Wichtig: Die Funktion berücksichtigt **nur Monate vor dem aktuellen Monat**, nicht allgemein bereits bekannte Zukunftsmonate. Das widerspricht der Textregel „ggf. auch bereits in Zukunft gesetzte Zuteilungen“ teilweise. 

---

## 3) Absolute Hard-Constraints für **BD**

Die folgenden Regeln verhindern eine BD-Zuteilung **zwingend**; sie gelten auch im „relaxed“-Fallback.

| Regel                                                   | Wirkung im Code |
| ------------------------------------------------------- | --------------- |
| Dienstbefreit oder Ziel `0`                             | kein BD         |
| Abwesenheit am Tag (`U/ZU/SU/FZA/K/KK/§15c/WB`)         | kein BD         |
| Bereits vorhandener Dienst am Tag                       | kein BD         |
| Wunsch `NO_DUTY`                                        | kein BD         |
| Samstag und **kein FA**                                 | kein BD         |
| **Dr. Polednia** an **So/Di/Do**                        | kein BD         |
| **Becker/Martin-Konflikt**                              | kein BD         |
| Eintrag `F` am selben Tag                               | kein BD         |
| **nächster Kalendertag Urlaub** (`U/ZU/SU/§15c`)        | kein BD         |
| Vortag bereits D                                        | kein BD         |
| Folgetag bereits D                                      | kein BD         |
| Vortag HG und dieser HG-Tag war **nicht Freitag**       | kein BD         |
| 1. Tag des Monats, wenn letzter Tag des Vormonats D war | kein BD         |
| Muster **D-F-D-F** würde entstehen                      | kein BD         |

Diese Regeln stammen unmittelbar aus `canDoBD()`. Besonders wichtig sind die Unterschiede zwischen **Abwesenheit** und **Urlaub**: Für den Diensttag selbst sperren alle `ABSENCE_CODES`, für „Tag vor Urlaub“ jedoch **nur** `VACATION_CODES`. Ein Tag vor `FZA`, `K`, `WB` usw. ist also **nicht** automatisch BD-gesperrt. 

---

## 4) Zusätzliche strenge, aber aufweichbare BD-Regeln

Diese Regeln gelten nur im normalen Suchlauf; wenn kein Kandidat gefunden wird, darf die Engine in den **relaxed mode** wechseln.

| Regel                                     | Normale Suche |               Relaxed |
| ----------------------------------------- | ------------: | --------------------: |
| `currentBD >= target`                     |      gesperrt |               erlaubt |
| Wochenendbelastung bereits `>= 2`         |      gesperrt |               erlaubt |
| **Dr. Becker** am Samstag                 |      gesperrt | erlaubt als Notlösung |
| Abstand zum nächsten anderen D `< 4 Tage` |      gesperrt |               erlaubt |

Damit ist klar: Diese Punkte sind **Soft-Hard-Constraints**. Sie haben im ersten Durchlauf harte Wirkung, können aber zugunsten der Besetzbarkeit fallen gelassen werden. 

---

## 5) BD-Scoring / Vergabekriterien

Wenn mehrere zulässige Kandidaten existieren, bewertet `scoreBDCandidate()` die Kandidaten. Die wichtigsten Kriterien:

### 5.1 Zielerfüllung / Sollverteilung

* Unter dem individuellen BD-Ziel: positiver Score
* Am oder über Ziel: massive Strafung
* Damit ist die BD-Verteilung primär zielgesteuert und **nicht** rein gleichmäßig pro Kopf. 

### 5.2 Mitarbeiterwünsche

* `BD_WISH` gibt einen starken Bonus
* `NO_DUTY` ist bereits vorher harte Sperre 

### 5.3 Historische BD-Fairness

Wer historisch weniger BD als der Gruppendurchschnitt hatte, bekommt einen Bonus. Damit fließt Vergangenheit in die aktuelle Zuteilung ein.  

### 5.4 Donnerstag-vor-Urlaub-Bonus

Donnerstags-BD wird bevorzugt an Personen vergeben, die in der **nächsten ISO-Woche** Urlaub haben. Das ist **nicht** exakt identisch mit „direkt anschließend Urlaub“, sondern prüft Urlaub in der Folgewoche.  

### 5.5 Wochenendminimierung

Für Freitag/Samstag/Sonntag bzw. Feiertage wird die bereits bestehende Wochenendbelastung penalisiert. Zusätzlich gibt es eine historische Wochenend-Ausgleichskomponente. 

### 5.6 Samstag-FA-Ausgleich

Samstags-BD bei FA werden anhand **historischer + aktueller Samstag-BD** gleichgezogen. Das ist eine der stärksten Gewichtungen im BD-Scoring. 

### 5.7 Dr.-Becker-Samstag als Notlösung

Im relaxed mode ist Samstag-BD für **Dr. Becker** möglich, aber mit starker Strafung und explizitem „Notlösung“-Charakter. Zusätzlich wird anschließend ein Montag-`FZA` gesetzt. 

### 5.8 Dichte / Abstand

Auch wenn Relaxation zulässt, werden zu nahe D-Einsätze weiter weich bestraft. 

### 5.9 Feiertags-, Oster- und Pfingstfairness

Feiertagsdienste werden historisch ausgeglichen. Zusätzlich gibt es Sonderlogik für **Ostern** und **Pfingsten**, auch monatsübergreifend: Wer bereits im einen Feiertagsblock gearbeitet hat, wird im anderen eher benachteiligt.  

---

## 6) Reihenfolge der BD-Vergabe

Die fehlenden BD-Tage werden **nicht** chronologisch stumpf abgearbeitet, sondern in zwei Gruppen:

1. **Wochenend-/Freitags-/Feiertags-BD**
2. danach **Werktags-BD**

Damit priorisiert die Engine zuerst die restriktiveren Tage. 

---

## 7) Automatisches `F` nach BD

### Umgesetzte Regel

Nach einem D wird automatisch `F` am Folgetag gesetzt, **wenn** der Folgetag im aktuellen Monat liegt und dort noch keine Assignment-Belegung existiert. Diese Reparatur geschieht sowohl global beim Laden bestehender Daten als auch innerhalb der Auto-Planung.  

### Wichtige Einschränkung

Bei einem **am Monatsletzten neu vergebenen D** schreibt `computeAutoPlan()` das Folgetags-`F` **nicht sicher in den nächsten Monat**. Monatübergreifendes Reparieren existiert nur separat für bereits vorhandene Datenbestände beim Initialisieren, nicht als konsequente Fortsetzung jeder neuen Auto-Plan-Entscheidung. Die Soll-Regel ist also nur **teilweise** umgesetzt.  

---

## 8) Absolute Hard-Constraints für **HG**

`canDoHG()` erzwingt folgende Regeln:

| Regel                                                         | Wirkung im Code |
| ------------------------------------------------------------- | --------------- |
| dienstbefreit                                                 | kein HG         |
| kein FA                                                       | kein HG         |
| Abwesenheit am Tag                                            | kein HG         |
| bereits Dienst am Tag                                         | kein HG         |
| Wunsch `NO_DUTY`                                              | kein HG         |
| `F` am Tag und Tag ist **kein** Samstag/Sonntag               | kein HG         |
| am Folgetag eigener D und aktueller Tag ist **nicht Freitag** | kein HG         |

Damit ist die Regel **„Kein HG vor D (außer Freitags)“** strikt implementiert.  

---

## 9) Zusätzliche strenge, aber aufweichbare HG-Regeln

Nur im normalen Suchlauf:

| Regel                                        | Normale Suche | Relaxed |
| -------------------------------------------- | ------------: | ------: |
| **Dr. Polednia** an So/Di/Do bei **AA im D** |      gesperrt | erlaubt |
| Wochenendbelastung `>= 2`                    |      gesperrt | erlaubt |
| Abstand zum nächsten HG `< 3 Tage`           |      gesperrt | erlaubt |

Das ist präziser als der Text: Bei Polednia wird **nicht jeder HG** an So/Di/Do gesperrt, sondern nur dann, wenn am selben Tag ein **AA** den D hat.  

---

## 10) HG-Scoring / Vergabekriterien

### 10.1 Gesamt-HG-Fairness

Bereits viele HG führen zu einer starken Strafung. 

### 10.2 HG-Ausgleich über BD-Unterlast

FA mit aktuell weniger BD als der HG-FA-Durchschnitt erhalten Bonus für HG. Das setzt exakt die Regel um, dass FA mit weniger D tendenziell mehr HG tragen dürfen. 

### 10.3 Getrennte Fairness für HG bei **AA im D** vs **FA im D**

Das ist explizit implementiert:

* HG bei **AA-BD** werden separat gezählt und fair verteilt
* HG bei **FA-BD** ebenfalls separat

Die Abweichung von der jeweiligen Durchschnittslast wird penalisiert. 

### 10.4 Mitarbeiterwünsche

* `HG_WISH` gibt starken Bonus
* `NO_DUTY` sperrt hart 

### 10.5 Vor-Urlaub

Anders als beim BD ist **nächster Tag Urlaub** für HG **nur eine leichte Strafung**, keine harte Sperre. Das weicht vom allgemeinen Regelgefühl ab. 

### 10.6 Wochenenden

Wochenend-HG werden über die Wochenenddienstäquivalente mitbestraft; frühere Wochenenden im aktuellen Monat führen zusätzlich zu kleinem Malus. 

### 10.7 HG-Abstand

Zu dichte HG-Folgen werden weich bestraft. 

### 10.8 Oster-/Pfingst-Logik

Analog zu BD.

---

## 11) HG-Kopplungslogik vor regulärer HG-Vergabe

Vor der normalen HG-Zuteilung versucht die Engine, bestimmte HG **automatisch an passende BD zu koppeln**.

### 11.1 Freitag mit **AA im D**

Wenn am Freitag ein **AA** den D hat und am Samstag ein **FA** D hat, wird der **Freitags-HG** bevorzugt an den **Samstags-FA** gekoppelt. Das entspricht exakt der formulierten Kliniklogik. 

### 11.2 Samstag mit **FA im D**

Wenn Samstag ein **FA** D hat und am Sonntag jemand anders D hat, wird der **Sonntags-HG** bevorzugt an den **Samstags-FA** gekoppelt. Das bildet die Sonderregel „Samstag D, Sonntag HG“ ab. 

### 11.3 Tag vor Feiertag mit **AA im D**

Wenn am Vortag eines Feiertags ein **AA** D hat und am Feiertag ein **FA** D hat, wird der HG des Vortags an diesen Feiertags-FA gekoppelt. 

### 11.4 Wichtige Schwäche

Die Kopplungsfunktion prüft **keinen `NO_DUTY`-Wunsch**. Ein gekoppelter HG kann also einen expliziten „Kein Dienst“-Wunsch **übergehen**. Das ist eine echte Inkonsistenz zwischen Soll-Regel und Codeverhalten. 

---

## 12) Relaxed Mode

Sowohl für BD als auch für HG gibt es einen zweiten Suchlauf mit gelockerten Regeln. Wenn im strengen Modus kein Kandidat gefunden wird, probiert die Engine denselben Tag erneut mit Relaxation. Im Abschlussbericht wird das später als gelockerte Regelanwendung dokumentiert.   

---

## 13) Abschlussvalidierung

Am Ende gibt es eine finale Regelprüfung. Diese validiert allerdings im Wesentlichen **nur eine Sache**:

* **gleiche Person mit D an zwei aufeinanderfolgenden Tagen**

Wird dies gefunden, wird der zweite D entfernt. Danach werden die BD-Zähler neu berechnet. Es erfolgt **keine** umfassende Endvalidierung aller Sollregeln in einem separaten Validator. 

---

## 14) Warnings und Infos im Ergebnis

Die Summary meldet u. a.:

* Mitarbeiter mit **BD unter Ziel**
* Mitarbeiter mit **Wochenenddienstäquivalent > 2**
* Tage ohne **BD**
* Tage ohne **HG**
* Anzahl erfüllter Wünsche
* Einsatz gelockerter Regeln
* HG-Ausgleich AA vs FA
* Anzahl gekoppelter HG
* Maximalwert der Wochenenddienstäquivalente

Diese Angaben erscheinen in der Ergebnisansicht und im Abschlussbericht des Auto-Plan-Modals.   

---

## 15) Tatsächlich umgesetzte Regeln aus `Algorithmusregeln.txt`

### **Voll oder weitgehend umgesetzt**

* **D** und **HG** zählen als Dienste. 
* Bereits gesetzte Dienste bleiben Ausgangsbasis. 
* Wünsche werden berücksichtigt: `BD_WISH`, `HG_WISH`, `NO_DUTY`. 
* Kein D an Urlaubstag bzw. nächstem Urlaubsvortag. 
* Nach D automatisch `F`; D-D ausgeschlossen.  
* Gleichmäßige D-Verteilung **im Sinne individueller Ziele**.  
* HG nur durch FA. 
* Wochenenden mit D/HG werden mit 1 bzw. 0,5 gezählt.
* Samstag-D nur durch FA. 
* Samstag-D bei FA fair verteilen; Becker vermeiden. 
* HG-Fairness getrennt nach **AA im D** und **FA im D**. 
* FA mit weniger D dürfen eher HG erhalten. 
* Donnerstag-D vor Urlaub wird bevorzugt. 
* D-F-D-F vermeiden. 
* Polednia: kein D an So/Di/Do. 
* Polednia: möglichst kein HG für AA an So/Di/Do. 
* Becker/Martin-Vertretungskonflikt. 

### **Nur teilweise / mit abweichender Semantik umgesetzt**

* „Kein Dienst an Urlaubstagen oder **Tagen vor Urlaub**“ gilt für D nur vor **echten Urlaubscodes**, nicht vor allen Abwesenheiten. 
* Zukunftszuweisungen werden **nicht allgemein** in die Fairness einbezogen; primär nur Vergangenheit, plus einzelne Spezialfälle.  
* Donnerstag-vor-Urlaub basiert auf **Urlaub in nächster ISO-Woche**, nicht auf engerer „direkt anschließend“-Logik. 
* HG vor D wird generell personengebunden verboten, nicht nur in der im Regeltext klinisch motivierten AA/FA-Konstellation. 
* Montag-`FZA` nach Becker-Samstag wird gesetzt, aber monatsübergreifend nur, wenn für den Folgemonat bereits Datenstruktur vorhanden ist. 

### **Nicht oder nicht zuverlässig umgesetzt**

* `NO_DUTY` kann bei **gekoppeltem HG** übergangen werden. 
* Die historische Kennzahl `thuBd` wird gesammelt, aber in der Vergabe nicht verwendet. 
* Die geplante **Swap-Optimierung zur Fairness-Glättung** ist nach meiner Codelektüre sehr wahrscheinlich faktisch blockiert: Beim Prüfen eines Tauschs wird der neue D bereits gesetzt, danach ruft der Code `canDoBD()` auf, das vorhandenen D am Zielfeld sofort wieder verbietet. Damit dürfte `valid` regelmäßig `false` sein. Die Swap-Phase existiert also sichtbar, wirkt aber vermutlich nicht praktisch.  
* Es gibt keine harte Garantie, dass am Ende **jeder Tag** BD und HG besetzt ist; unbesetzte Tage werden nur gewarnt. 

---

## 16) Exakte Prioritätenhierarchie des Algorithmus

In der praktischen Wirkung ist die Priorität ungefähr so:

1. **Unzulässige Kandidaten eliminieren**
   Abwesenheit, falsche Berufsgruppe, D/D-Nachbarschaft, F-Konflikte, Polednia-Regeln, Becker/Martin-Konflikt, Urlaubsvortag, NO_DUTY usw.

2. **Restriktive Tage zuerst besetzen**
   zuerst Wochenend-/Freitags-/Feiertags-BD, dann Werktage. 

3. **BD-Ziele und Unter-/Überdeckung steuern**
   Kernlogik der D-Verteilung. 

4. **Historische Fairness berücksichtigen**
   BD, Wochenenden, Samstage, Feiertage, HG-AA/FA. 

5. **Sonderlogiken anwenden**
   Donnerstag-vor-Urlaub, Becker-Samstag, Oster/Pfingsten, HG-Kopplungen.

6. **Relaxed Mode**, falls sonst keine Besetzung möglich.

7. **Minimal-Validierung**
   im Wesentlichen nur D-D-Nachbarschaften entfernen. 

---

## 17) Prägnante Gesamteinordnung

Der Auto-Planer ist **kein globaler mathematischer Optimierer**, sondern ein **regelbasierter Heuristik-Planer mit Scoring**:

* zuerst harte Sperren,
* dann tagesweise Kandidatenranking,
* danach begrenzter Relaxed-Fallback,
* zum Schluss knappe Nachvalidierung.

Er ist für die klinische Praxis gut auf **manuell vorstrukturierte Entwürfe** und **faire Monatsverteilung** zugeschnitten, aber nicht vollständig formal konsistent mit allen Textregeln. Die größten fachlichen Abweichungen sind:

* **gekoppelter HG kann `NO_DUTY` übergehen**
* **monatsübergreifendes `F` nach neuem Monatsletzten-D nicht konsequent**
* **Fairness-Swap vermutlich wirkungslos**
* **Zukunftsdaten werden nicht allgemein berücksichtigt**.

