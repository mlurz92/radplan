# RadPlan — vollständige Anwendungsbeschreibung

RadPlan ist eine spezialisierte Web-Anwendung für die ärztliche Monats-, Jahres- und Dienstplanung einer Klinik für Radiologie und Nuklearmedizin. Die Anwendung verbindet eine sehr schnelle Vanilla-JavaScript-Oberfläche mit einem medizinisch-domänenspezifischen Datenmodell, einer lokalen Planungs-Sandbox, einem automatischen Dienstplan-Solver mit mehreren wählbaren Lösungsvarianten, Jahresanalysen, Mitarbeitendenprofilen, Import/Export inklusive Druckansicht, Server-Synchronisation mit feldweiser Konfliktauflösung und einer konsequent responsiven, animierten UX für Desktop und Mobile.

Diese README beschreibt den aktuellen Stand der Anwendung als Gesamtprodukt. Sie ist **kein Changelog**, sondern eine systematische Dokumentation der Zielsetzung, der Funktionen, der Datenstrukturen, der UI-Logik, der Bedienkonzepte, der Designentscheidungen, der Architektur und der fachlichen Regeln — gegliedert in drei große Teile: Zielsetzung & Kernkonzept, UI/UX & Design-Philosophie, sowie Struktur & Umfang.

---

## Inhaltsverzeichnis

**Teil 1 — Zielsetzung & Kernkonzept**

1. [Kernidee](#kernidee)
2. [Zielgruppe und Nutzungssituation](#zielgruppe-und-nutzungssituation)
3. [Funktionsüberblick](#funktionsüberblick)
4. [Datenmodell](#datenmodell)
5. [Personal-, Rollen- und Lifecycle-Logik](#personal--rollen--und-lifecycle-logik)
6. [Arbeitsplätze, Statuscodes, Dienste und Wünsche](#arbeitsplätze-statuscodes-dienste-und-wünsche)
7. [Kalenderlogik und Feiertage](#kalenderlogik-und-feiertage)
8. [Planungsmodus](#planungsmodus)
9. [Auto-Planung und Solver](#auto-planung-und-solver)
10. [Persistenz, Synchronisation und Konfliktbehandlung](#persistenz-synchronisation-und-konfliktbehandlung)
11. [Import, Export und Datenportabilität](#import-export-und-datenportabilität)

**Teil 2 — UI/UX & Design-Philosophie**

12. [Hauptoberfläche](#hauptoberfläche)
13. [Desktop-Grid](#desktop-grid)
14. [Drag & Drop von Dienstbadges](#drag--drop-von-dienstbadges)
15. [Mobile Oberfläche](#mobile-oberfläche)
16. [Swipe-Gesten in der mobilen Tagesansicht](#swipe-gesten-in-der-mobilen-tagesansicht)
17. [Editor und Zellbearbeitung](#editor-und-zellbearbeitung)
18. [RD-Neurorad-Sonderzeile](#rd-neurorad-sonderzeile)
19. [Mitarbeitendenbereich und Profile](#mitarbeitendenbereich-und-profile)
20. [Abteilungsübersicht](#abteilungsübersicht)
21. [Jahresplaner](#jahresplaner)
22. [Neural-Graph-Visualisierung](#neural-graph-visualisierung)
23. [Command Palette](#command-palette)
24. [Theme-Umschaltung und View Transitions](#theme-umschaltung-und-view-transitions)
25. [Inline-Konfliktwarnungen im Grid](#inline-konfliktwarnungen-im-grid)
26. [Druckansicht und PDF-Export](#druckansicht-und-pdf-export)
27. [UI-, UX- und Design-Philosophie im Detail](#ui--ux--und-design-philosophie-im-detail)
28. [Barrierefreiheit und Tastaturbedienung](#barrierefreiheit-und-tastaturbedienung)
29. [PWA, Icons und Installierbarkeit](#pwa-icons-und-installierbarkeit)

**Teil 3 — Struktur & Umfang**

30. [Technische Grundarchitektur](#technische-grundarchitektur)
31. [Datei- und Modulstruktur](#datei--und-modulstruktur)
32. [Automatisierte Tests](#automatisierte-tests)
33. [Fehlerfälle, Schutzmechanismen und Datenhygiene](#fehlerfälle-schutzmechanismen-und-datenhygiene)
34. [Betrieb und lokale Nutzung](#betrieb-und-lokale-nutzung)
35. [Qualitätssicherung](#qualitätssicherung)
36. [Weiterentwicklung](#weiterentwicklung)
37. [Kurzfazit](#kurzfazit)

---

# Teil 1 — Zielsetzung & Kernkonzept

## Kernidee

RadPlan ersetzt Tabellen, manuelle Listen und lose JSON- oder Excel-basierte Dienstpläne durch eine fokussierte Fachanwendung. Der wichtigste Gedanke ist: Die Planung soll nicht nur Daten speichern, sondern den Denkprozess der radiologischen Dienstplanung abbilden.

Die Anwendung behandelt daher nicht nur einfache Einträge wie „Dr. X arbeitet CT", sondern kombiniert:

- Monatsnavigation und Jahreskontext,
- Mitarbeitendenlisten je Monat,
- Arbeitsplatzzuordnung,
- Abwesenheiten,
- Bereitschaftsdienst `D`,
- Hintergrunddienst `HG`,
- Dienstwünsche,
- automatische `F`-Folgetage nach Bereitschaftsdienst,
- Jahresstatistiken,
- Fairness-Auswertung,
- domänenspezifische Ausschlussregeln,
- einen besonderen externen RD-Neurorad-Planungskanal,
- Offline-Speicherung,
- Cloud-/KV-Synchronisierung mit feldweiser Konfliktauflösung,
- Import/Export inklusive Druckansicht,
- Desktop- und Mobile-Bedienung mit nativen Interaktionsmustern (Drag & Drop, Swipe-Gesten, View Transitions).

Das Ergebnis ist ein Planungswerkzeug, das sich wie eine moderne, native App anfühlt, aber bewusst ohne schweres Frontend-Framework und ohne Build-Schritt auskommt — reines HTML, modulares CSS und ES6-JavaScript-Module, die der Browser direkt ausführt.

---

## Zielgruppe und Nutzungssituation

RadPlan ist für Personen gedacht, die medizinische Dienstpläne nicht nur lesen, sondern aktiv erstellen, prüfen, korrigieren und kommunizieren müssen.

Typische Rollen:

- Dienstplanverantwortliche,
- Oberärztinnen und Oberärzte,
- Fachärztinnen und Fachärzte,
- Assistenzärztinnen und Assistenzärzte,
- administrative Personen mit Planungsaufgaben,
- Leitungspersonen, die Fairness, Abdeckung und Jahresentwicklung überwachen.

Typische Situationen:

- Ein Monat wird initial angelegt.
- Mitarbeitende werden in Arbeitsplätze eingeteilt.
- Urlaub, Krankheit, Weiterbildung oder Sonderstatus werden eingetragen.
- Bereitschafts- und Hintergrunddienste werden manuell (auch per Drag & Drop) oder automatisch geplant.
- Ein Entwurf wird im Planungsmodus getestet, ohne Live-Daten zu verändern; einzelne Zellen können dabei für den Solver fixiert ("gepinnt") werden.
- Der Solver liefert mehrere alternative Lösungen mit unterschiedlicher Gewichtung (z. B. fairness- vs. wunschoptimiert) zur Auswahl, inklusive nachvollziehbarer Begründung jeder Entscheidung.
- Jahreslasten werden geprüft, um eine faire Verteilung zu erreichen.
- Ein JSON-Export wird erstellt, eine Druckansicht für einen Aushang erzeugt, oder ein alter Stand importiert.
- Mehrere Clients synchronisieren über den Server-Endpunkt; bei echten Kollisionen wird nur das betroffene Feld zur Entscheidung vorgelegt, statt den ganzen lokalen Stand zu verwerfen.

---

## Funktionsüberblick

### Kernfunktionen

- Monatsbasierter Dienstplan mit täglicher Spaltenstruktur, responsiv bis hinunter zu Tablet-Breakpoints.
- Mitarbeitendenzeilen mit Rollen-, Positions- und Profilinformationen.
- Arbeitsplatzzuteilung über farbcodierte Codes.
- Abwesenheits- und Statusverwaltung.
- Bereitschaftsdienst `D` und Hintergrunddienst `HG`, inklusive direktem Verschieben von Dienstbadges per Drag & Drop im Desktop-Grid.
- Inline-Konfliktwarnungen direkt an betroffenen Grid-Zellen, unabhängig davon, ob der Solver oder eine manuelle Bearbeitung die Konfliktsituation erzeugt hat.
- Kommentare pro Mitarbeitendem und Tag.
- Spezielle RD-Neurorad-Zeile mit eigenem Datenbereich.
- Mitarbeitendenverwaltung mit Hinzufügen und Entfernen.
- Profilmodal mit Monats- und Jahresstatistiken.
- Abteilungsdashboard mit Coverage- und Teammetriken.
- Jahresplaner mit Grid, Fairnesskurven und Projektion.
- Planungsmodus als Sandbox mit Undo/Redo, Zell-Pinning und Entwurfsspeicherung.
- Auto-Planung mit konfigurierbaren BD-Zielen, mehreren wählbaren Lösungsalternativen und einem erklärbaren Ergebnisbericht.
- Live-Visualisierung der Auto-Planung über einen Neural-Graph.
- Ergebnisbericht mit Score-Erklärung und klickbaren Begründungen je Regelverstoß.
- Import/Export als JSON sowie eine eigenständige Druckansicht/PDF-Export des Monatsplans.
- Lokale Speicherung im Browser.
- Server-Synchronisation mit feldweiser Konflikterkennung und -auflösung statt pauschalem Last-Write-Wins.
- Mobile Bottom-Navigation, mobile Kartenansicht und Swipe-Gesten zur Tagesnavigation.
- Eine globale Command Palette (Cmd/Ctrl+K) für tastaturgetriebene Navigation zu Mitarbeitenden, Monaten und Funktionen.
- Ein Dark/Light-Theme-Umschalter mit kreisförmiger View-Transition-Animation ausgehend vom Klickpunkt.
- PWA-Metadaten und installierbares App-Verhalten.

### Besonders wichtige fachliche Eigenschaften

- `Hr. Torki` ist ab Juli 2026 nicht mehr aktiver Mitarbeiter und wird aus zukünftigen Mitarbeitendenlisten sowie zugehörigen zukünftigen Datenstrukturen entfernt.
- Die Historie vor Juli 2026 bleibt erhalten.
- `Dr. Martin (RAD)` und `Hr. El Houba (RAD)` stehen in der RD-Neurorad-Auswahl zur Verfügung.
- `Fr. Thaler (RAD)` bleibt in der RD-Neurorad-Auswahl nur bis einschließlich März 2026 verfügbar.
- Die RD-Neurorad-Zeile ist vom normalen Mitarbeitenden- und Auto-Planungsmodell getrennt.
- Ein `D`-Dienst erzeugt bzw. erzwingt logisch einen Folgetag mit `F`, soweit der Folgetag in vorhandenen Daten reparierbar ist.

---

## Datenmodell

### Monats-Key

Monate werden über `monthKey(y, m)` adressiert. Der Monat ist nullbasiert:

- Januar = `0`
- Februar = `1`
- März = `2`
- …
- Juli = `6`
- Dezember = `11`

Ein Key sieht z. B. so aus:

```txt
2026-6
```

Das steht für Juli 2026.

### Monatsobjekt

Ein Monatsobjekt enthält standardisiert:

```js
{
  employees: [],
  assignments: {},
  rbn: {},
  comments: {}
}
```

#### `employees`

Array der aktiven Mitarbeitenden des Monats. Reihenfolge und Inhalt steuern die sichtbaren Zeilen im Hauptgrid.

#### `assignments`

Objekt für normale Mitarbeitendenzellen:

```js
assignments[employeeName][dayNumber] = {
  assignment: "MR/CT",
  duty: "D"
}
```

Mögliche Inhalte:

- `assignment`: Arbeitsplatz-/Statuskombination, z. B. `MR`, `CT`, `MR/CT`, `U`, `F`, `WB`.
- `duty`: Dienstcode, primär `D` oder `HG`.

#### `rbn`

Eigenes Objekt für RD Neurorad:

```js
rbn[dayNumber] = "Dr. Martin (RAD)"
```

Diese Struktur ist bewusst nicht an Mitarbeitendenzeilen gekoppelt.

#### `comments`

Kommentare pro Mitarbeitendem und Tag:

```js
comments[employeeName][dayNumber] = "Freitext"
```

Kommentare werden nicht für RD-Neurorad-Zellen verwendet.

### Pins

Im Planungsmodus können einzelne Zellen über `wishes`/`pins`-Strukturen der jeweiligen Plan-Session für den Solver fixiert werden. Eine gepinnte Zelle wird vom Auto-Planungsalgorithmus garantiert nicht verändert, unabhängig davon, wie der Solver ansonsten optimiert. Das erlaubt es, bereits bestätigte Wünsche oder besondere Absprachen vor einem Auto-Plan-Lauf "einzufrieren".

### Datenform-Normalisierung

`normalizeMonthDataShape(md)` stellt sicher, dass Monatsobjekte auch nach Importen, alten Datenständen oder Serverantworten die erwarteten Felder besitzen. Fehlende Arrays oder Objekte werden ergänzt. Dadurch bleibt die Anwendung robust gegenüber unvollständigen oder älteren Daten.

---

## Personal-, Rollen- und Lifecycle-Logik

### Mitarbeitendenmetadaten

`EMP_META` enthält Stammdaten für Mitarbeitende:

- Anzeigename,
- vollständiger Name,
- Position,
- Positionslabel,
- fachlicher Typ,
- Bereich,
- Stellvertretung,
- Eintrittsjahr,
- FTE,
- Telefon,
- Tags/Spezialisierungen.

Die Metadaten werden in Profilen, Dashboards, Badges, Farbcodierungen, Filterlogik und im Auto-Plan-Kontext genutzt.

### Rollenlogik

Die Anwendung unterscheidet u. a.:

- Chefarzt (`CA`),
- Leitender Oberarzt (`LOA`),
- Oberarzt/Oberärztin (`OA`, `OÄ`),
- Facharzt/Fachärztin (`FA`, `FÄ`),
- Assistenzarzt/Assistenzärztin (`AA`, `AÄ`).

`isFacharzt(empName)` erkennt Personen, die für fachärztliche bzw. oberärztliche Logiken relevant sind. `isAssistenzarzt(empName)` erkennt Weiterbildungs-/Assistenzrollen.

### Positionsfarben

`posColor(pos)` liefert für Rollen eigene Farben. Diese erscheinen z. B. in:

- Mitarbeitendenlisten,
- Profilen,
- Auto-Plan-Konfiguration,
- Jahresplaner,
- Abteilungsübersichten.

### Lifecycle: Austritt von Hr. Torki

Für Personaländerungen gibt es eine zentrale Lifecycle-Konfiguration. Aktuell ist hinterlegt:

```js
"Hr. Torki": { year: 2026, month: 6, reason: "gekündigt" }
```

Da Monate nullbasiert sind, bedeutet `month: 6` Juli 2026.

Konsequenzen:

- Bis einschließlich Juni 2026 bleibt `Hr. Torki` aktiv.
- Ab Juli 2026 wird `Hr. Torki` aus Mitarbeitendenlisten entfernt.
- Zukünftige Assignments und Kommentare zu `Hr. Torki` werden bei der Monatsreconciliation entfernt.
- Historische Monate vor Juli 2026 bleiben erhalten.
- Neue Monate, Server-Snapshots, localStorage-Ladevorgänge und Plan-Sessions berücksichtigen diese Regel.
- Manuelles Hinzufügen in einem inaktiven Monat wird abgefangen.

### Reconciliation

`reconcileEmployeesForMonth(md, y, m)` ist der zentrale Datenhygiene-Schritt. Er entfernt inaktive Mitarbeitende aus:

- `employees`,
- `assignments`,
- `comments`.

Die Funktion gibt zurück, ob Daten verändert wurden. Dadurch kann die Anwendung bei Bedarf den bereinigten Stand wieder speichern.

---

## Arbeitsplätze, Statuscodes, Dienste und Wünsche

### Arbeitsplätze

Arbeitsplätze sind farbcodierte operative Einheiten:

| Code | Label | Bedeutung |
|---|---|---|
| `MR` | MRT | Magnetresonanztomographie |
| `CT` | CT | Computertomographie |
| `US` | Sonographie | Ultraschall |
| `AN` | Angiographie | Intervention/Angio |
| `MA` | Mammographie | Mammographie |
| `KUS` | Kinder-US | Kinder-Sonographie |
| `W` | Wermsdorf | Außen-/Standortbezug |
| `T` | Teleradiologie | Teleradiologie |

Jeder Arbeitsplatz besitzt Hintergrund- und Vordergrundfarbe. Diese Farben werden in Chips, Tabellenzellen, Legenden und Profilstatistiken konsistent verwendet.

### Statuscodes

Statuscodes markieren Abwesenheiten oder besondere Zustände:

| Code | Label | Bedeutung |
|---|---|---|
| `F` | Frei | Frei/Folgetag nach Dienst |
| `U` | Urlaub | Urlaub |
| `ZU` | Zusatzurlaub | Zusatzurlaub |
| `SU` | Sonderurlaub | Sonderurlaub |
| `FZA` | FZA | Freizeitausgleich |
| `K` | Krank | Krankheit |
| `KK` | Kind Krank | Kind krank |
| `§15c` | §15c | Pflege-/Sonderregelung |
| `WB` | Weiterbildung | Weiterbildung |

`ABSENCE_CODES` und `VACATION_CODES` bestimmen, wie Auswertungen und Coverage-Berechnungen diese Codes behandeln.

### Dienste

Es gibt zwei Hauptdienste:

- `D`: Bereitschaftsdienst,
- `HG`: Hintergrunddienst.

Der Dienst ist getrennt vom Arbeitsplatzstatus. Eine Zelle kann also z. B. Arbeitsplatz `CT` und zusätzlich `D` enthalten. Im Desktop-Grid lässt sich ein bereits gesetzter Dienst per Drag & Drop auf eine andere Zelle (anderer Mitarbeitender und/oder anderer Tag) verschieben, siehe [Drag & Drop von Dienstbadges](#drag--drop-von-dienstbadges).

### Wünsche

Im Planungsmodus können Wünsche verwendet werden:

| Code | Label | Bedeutung |
|---|---|---|
| `NO_DUTY` | Kein Dienst | Person soll keinen Dienst erhalten. |
| `BD_WISH` | BD Wunsch | Bereitschaftsdienst gewünscht. |
| `HG_WISH` | HG Wunsch | Hintergrunddienst gewünscht. |

Wünsche fließen in die Auto-Planungsbewertung ein.

---

## Kalenderlogik und Feiertage

RadPlan berechnet Datumsinformationen clientseitig.

### Grundfunktionen

- `daysInMonth(y, m)`: Anzahl der Tage eines Monats.
- `weekday(y, m, d)`: Wochentag als Zahl.
- `isWeekend(y, m, d)`: Samstag/Sonntag.
- `isFriday(y, m, d)`: Freitagserkennung.
- `nextCalendarDay(y, m, d)`: Folgetag über Monatsgrenzen hinweg.
- `prevCalendarDay(y, m, d)`: Vortag über Monatsgrenzen hinweg.
- `isoWeekNumber(y, m, d)`: Kalenderwoche nach ISO.
- `isTodayCol(...)`: Markierung des heutigen Tages.

### Feiertage Sachsen

`getSaxonyHolidays(year)` berechnet:

- Neujahr,
- Karfreitag,
- Ostermontag,
- Tag der Arbeit,
- Christi Himmelfahrt,
- Pfingstmontag,
- Tag der Deutschen Einheit,
- Reformationstag,
- Buß- und Bettag,
- 1. Weihnachtsfeiertag,
- 2. Weihnachtsfeiertag.

Ostern wird algorithmisch über `easterDate(year)` berechnet. Buß- und Bettag wird ausgehend vom 23. November bzw. dem Mittwoch vor dem ersten Adventszeitraum bestimmt. Ein Cache (`HOLIDAY_CACHE`, über `getSaxonyHolidaysCached` zugänglich) verhindert wiederholte Neuberechnung.

---

## Planungsmodus

Der Planungsmodus ist eine Sandbox.

### Grundprinzip

Live-Daten bleiben unverändert, bis ein Entwurf bewusst übernommen wird. Dadurch kann man komplexe Änderungen, Auto-Planungen oder Alternativen ausprobieren.

### Plan-Sessions

Planentwürfe liegen in `planSessions`. Jeder Monat kann eine eigene Session besitzen. Eine Session enthält:

- `employees`,
- `assignments`,
- `rbn`,
- `wishes`,
- `pins`,
- `baseline`,
- `history`,
- `historyIdx`.

### Manuelles Pinning vor Auto-Plan-Läufen

Einzelne Zellen lassen sich über das Kontextmenü einer Zelle als „für Auto-Plan fixiert" markieren (`togglePinned`/`isPinned`). Gepinnte Zellen sind im Grid visuell markiert (gestrichelter Rahmen plus Pin-Symbol) und werden vom Solver bei jedem nachfolgenden Auto-Plan-Lauf garantiert unverändert belassen — unabhängig davon, wie stark der Solver an anderer Stelle optimiert. Das macht es möglich, bereits bestätigte Sonderabsprachen vor einem automatischen Durchlauf verbindlich festzuschreiben.

### Undo/Redo

Der Planungsmodus führt einen History-Stack. Dadurch können Bearbeitungsschritte rückgängig gemacht oder wiederhergestellt werden.

### Speichern

Entwürfe werden unter einem eigenen localStorage-Key gespeichert:

```txt
radplan_v3_plan_<monthKey>
```

### Übernahme

Beim Übernehmen werden Planungsdaten in den Hauptdatenbestand geschrieben. Danach verlässt die Anwendung den Planungsmodus.

### Abbrechen und Schließen

Abbrechen stellt die Baseline wieder her. Schließen prüft, ob ungespeicherte Planänderungen existieren, und warnt entsprechend.

---

## Auto-Planung und Solver

Die Auto-Planung befindet sich in `js/autoplan.js` und wird aus dem Planungsmodus heraus verwendet.

### Ziel

Der Solver soll Bereitschaftsdienste und Hintergrunddienste möglichst fair, regelkonform und nachvollziehbar verteilen. Er ist als mehrphasiger Constraint-Satisfaction-Ansatz mit anschließender Swap-Optimierung implementiert — ohne klassisches Backtracking und ohne formale Optimalitätsgarantie, dafür mit klar nachvollziehbaren Phasen und Telemetrie.

### Konfiguration

Vor dem Rechnen zeigt die Auto-Plan-Konfiguration:

- Mitarbeitende,
- Rolle/Positionslabel,
- historischer BD-Stand,
- Samstags-BD-Stand,
- Zielwert pro Person,
- Summe der Zielwerte,
- Anzahl der Tage im Monat,
- Reset auf Standardwerte,
- Stepper für individuelle Ziele.

Gepinnte Zellen (siehe [Planungsmodus](#planungsmodus)) fließen als harte Vorgabe in die Konfiguration ein und werden vom Solver übersprungen.

### Dienstfähigkeit

Nicht jede Person ist gleich dienstfähig. Der Algorithmus berücksichtigt u. a.:

- Facharztstatus,
- Dienstbefreiungen,
- Abwesenheiten,
- vorhandene Dienste,
- Wochenend-/Feiertagsstruktur,
- Wünsche,
- gepinnte Zellen,
- harte domänenspezifische Regeln.

### Mehrere Lösungsalternativen

Statt eines einzigen Ergebnisses kann der Solver mehrere alternative Pläne mit unterschiedlicher Gewichtung berechnen — etwa eine fairnessoptimierte und eine wunscherfüllungsoptimierte Variante. Die Alternativen werden mit ihren jeweiligen Kennzahlen nebeneinander dargestellt, sodass die planende Person zwischen ihnen abwägen und die passende Variante übernehmen kann, statt blind dem einzigen Vorschlag des Solvers zu folgen.

### Ergebnis

Das Ergebnis enthält je Alternative:

- geplante `D`-Dienste,
- geplante `HG`-Dienste,
- pro Person Ziel/Ist,
- Diensttage,
- Wochenend-/Feiertagsanteile,
- Warnungen,
- Score/NFI,
- Metriken zur Qualität,
- Reportdaten.

### Regeltypen

#### Harte Regeln

Beispiele:

- keine Dienste bei Abwesenheit,
- keine Doppelbelegung desselben Diensttyps,
- keine Dienste für befreite Personen,
- keine fachlich unzulässigen HG-/BD-Konstellationen,
- Schutz gegen unzulässige CT-Leitungsabwesenheit,
- Mammographie-Konflikt bei spezifischen Kombinationen (z. B. Torki/Sebastian an Sonn- und Montagen),
- keine Veränderung gepinnter Zellen.

#### Weiche Regeln

Beispiele:

- faire Verteilung,
- Zielwerte,
- Wunsch-Erfüllung,
- Wochenendverteilung,
- Reduktion ungünstiger Muster (insbesondere D-F-D-Konstellationen),
- Minimierung von Gaps,
- Verringerung von Spread und Penalties.

### Erklärbarkeit und Ergebnisbericht

Der Bericht erklärt, wie der Plan zustande kam, und macht damit den sonst eher "Black-Box"-artigen Charakter des Solvers nachvollziehbar:

- Phasen,
- Warnungen,
- Regeltelemetrie,
- Qualitätsmetriken,
- Mitarbeiterübersicht,
- Tagesübersicht,
- offene Probleme.

Zu jeder verletzten weichen Regel liefert der Bericht zusätzlich eine kurze, klickbare Begründung der Form „Warum wurde X so platziert?", die die konkrete Abwägung des Solvers an dieser Stelle erläutert (z. B. ein knapperer Zielwert versus eine Wunschkollision an genau diesem Tag).

### Visualisierungsdauer

Die Auto-Planung läuft mit einer bewusst gestalteten Live-Visualisierung (siehe [Neural-Graph-Visualisierung](#neural-graph-visualisierung)). Die Anzeigedauer der Visualisierung ist von der tatsächlichen Rechenzeit entkoppelt und kann übersprungen werden, sodass die Choreografie als Feedback dient, ohne die Bedienung bei wiederholten Läufen künstlich zu verlangsamen.

---

## Persistenz, Synchronisation und Konfliktbehandlung

### localStorage

Der Hauptdatenbestand wird unter `radplan_v3` gespeichert. Dadurch ist die Anwendung offlinefähig und bleibt auch nach Reload erhalten.

### Debounced Save

`saveToStorage()` schreibt sofort lokal und plant zusätzlich eine Server-Speicherung verzögert ein. Das verhindert unnötige POST-Fluten bei schnellen Bearbeitungen.

### Server-Sync

Der Server-Endpunkt speichert ein Objekt mit:

- `main`,
- `plans`,
- `lastModified`.

`lastModified` dient als einfache Versionsmarke.

### Feldweise Konfliktauflösung

Schreibt ein Client mit einer veralteten `lastModified`, antwortet der Server mit `409 Conflict` und liefert den neuesten Stand. Statt den gesamten lokalen Stand zu verwerfen (klassisches Last-Write-Wins), führt die Anwendung ein **feldweises Merge** durch: Nur die Zellen, Kommentare oder Felder, die sich zwischen lokalem und Serverstand tatsächlich unterscheiden und seit der letzten Synchronisation lokal verändert wurden, werden als echte Kollision behandelt und der Nutzerin/dem Nutzer zur Entscheidung vorgelegt. Alle übrigen, nicht kollidierenden Änderungen — sowohl lokale als auch serverseitige — werden automatisch übernommen. Dadurch geht bei gleichzeitiger Bearbeitung durch mehrere Personen nur das wirklich umstrittene Feld verloren, nicht der gesamte unsynchronisierte Arbeitsstand.

### Force Sync

Der Force-Sync-Button verwirft lokale Daten und lädt den Serverstand neu. Er ist optisch warnend gestaltet, weil er bewusst destruktiv sein kann.

### Heartbeat

Im Hintergrund kann regelmäßig geprüft werden, ob serverseitig ein neuerer Datenstand existiert.

---

## Import, Export und Datenportabilität

### Export

Export speichert den kompletten Datenbestand als JSON. Der Export dient:

- Backup,
- Archivierung,
- Weitergabe,
- Migration,
- Fehleranalyse,
- Offline-Sicherung.

### Druckansicht und PDF-Export

Zusätzlich zum JSON-Export steht eine eigene Druckansicht des aktuellen Monatsplans zur Verfügung (siehe [Druckansicht und PDF-Export](#druckansicht-und-pdf-export) in Teil 2). Sie ist für Aushänge in der Klinik gedacht, bei denen ein gedruckter oder als PDF gespeicherter Plan weiterhin praxisrelevant ist.

### Import

Import akzeptiert JSON-Dateien und überschreibt nach Prüfung den lokalen Datenbestand. Der Import ist über Button und Drag&Drop-UI erreichbar.

### Datenintegrität nach Import

Nach dem Laden werden Monatsdaten normalisiert und Lifecycle-Regeln angewendet. Dadurch können ältere oder externe Datenstände sicherer verarbeitet werden.

---

# Teil 2 — UI/UX & Design-Philosophie

## Hauptoberfläche

### Header

Der Header enthält:

- Brand-Bereich mit animiertem RadPlan-Icon,
- Monatsnavigation mit vorherigem/nächstem Monat (animiert per View Transition, siehe unten),
- klickbares Monatslabel mit Flyout,
- Heute-Button,
- Planungsmodus-Button,
- Mitarbeitendenbereich,
- Jahresplan,
- Export,
- Import,
- Theme-Umschalter,
- Server-Sync.

Der Header ist als Arbeitsleiste gestaltet, nicht als rein dekorativer Bereich. Alle zentralen Aktionen sind von dort erreichbar oder über die [Command Palette](#command-palette) per Tastatur ansteuerbar.

### Zeitraumsteuerung

Das Period-Flyout erlaubt:

- Monat per Select,
- Jahr per Zahleneingabe,
- Jahr schrittweise hoch/runter,
- Monat vor/zurück,
- Sprung auf Heute,
- Anwenden des gewählten Zeitraums.

Die Kontextzeile beschreibt, ob die Anwendung im Planungsmodus ist und welcher Zeitraum aktiv bzw. ausgewählt ist. Jeder Monats- oder Jahreswechsel löst eine gerichtete View-Transition-Animation aus (siehe [Theme-Umschaltung und View Transitions](#theme-umschaltung-und-view-transitions)).

### Planleiste

Im Planungsmodus erscheint eine eigene Plan-Bar mit:

- aktivem Planungsbadge,
- aktuellem Monat,
- Hinweis, dass Änderungen unabhängig vom Hauptplan sind,
- Undo,
- Redo,
- Auto-Plan,
- Abbrechen,
- Speichern,
- Schließen.

Die Planleiste ist bewusst prominent, damit Entwurfsarbeit nicht versehentlich mit Live-Daten verwechselt wird.

---

## Desktop-Grid

Das Desktop-Grid ist die primäre Arbeitsansicht.

### Struktur

- Spalten repräsentieren Tage des Monats.
- Zeilen repräsentieren Mitarbeitende.
- Zusätzliche Tabellenbereiche visualisieren Kopf, Körper und Fußinformationen.
- Sticky-Elemente halten Namen und Tageskontext sichtbar.
- Wochenenden, Feiertage und heutiger Tag erhalten eigene visuelle Markierungen.
- Ein eigener responsiver Breakpoint zwischen klassischem Desktop-Grid und mobiler Tagesansicht sorgt dafür, dass auch mittelgroße Bildschirme (Tablet im Querformat, kleinere Notebook-Fenster) eine kompakte, aber weiterhin tabellenartige Darstellung erhalten, statt auf reines horizontales Scrollen angewiesen zu sein.

### Zellen

Eine Zelle kann enthalten:

- Arbeitsplatzcode,
- Statuscode,
- Mehrfacharbeitsplatz wie `MR/CT`,
- Dienstbadge `D`,
- Dienstbadge `HG`,
- Kommentarindikator,
- Pin-Indikator im Planungsmodus,
- Konfliktindikator (siehe [Inline-Konfliktwarnungen im Grid](#inline-konfliktwarnungen-im-grid)),
- Farbfläche passend zum Code,
- besondere Hover-/Focus-Zustände.

### Interaktionen

- Klick auf Zelle öffnet Editor.
- Doppelklick öffnet den Editor ebenfalls direkt.
- Strg-Klick kann mehrere Tage eines Mitarbeitenden sammeln.
- Drag-Selection (Maus-Drag über die Zellfläche) erlaubt schnelles Markieren mehrerer Zellen.
- Ein bereits gesetztes Dienstbadge (`D`/`HG`) kann per natives HTML5-Drag & Drop direkt auf eine andere Zelle gezogen werden, um den Dienst zu verschieben (siehe [Drag & Drop von Dienstbadges](#drag--drop-von-dienstbadges)).
- Pfeiltasten bewegen den Fokus im Grid.
- Tastenkürzel im Grid erlauben schnelle Direktbearbeitung.
- Kontextmenüs auf Mitarbeitendennamen und auf Zellen (Pin/Unpin im Planungsmodus) bieten Profil- und Verwaltungsaktionen.

### Fuß-/Zusatzinformationen

Je nach View werden zusammenfassende Kennzahlen gerendert, z. B. Dienstabdeckung, Tageslasten oder Hinweise. Das Grid ist damit nicht nur Eingabemaske, sondern Kontrollinstrument.

---

## Drag & Drop von Dienstbadges

Im Desktop-Grid lässt sich ein gesetztes Dienstbadge (`D` oder `HG`) direkt mit der Maus von einer Zelle auf eine andere ziehen, um den Dienst neu zuzuordnen — an einen anderen Mitarbeitenden, an einen anderen Tag, oder beides gleichzeitig.

### Technische Umsetzung

Die Funktion nutzt die native HTML5-Drag-&-Drop-API (`draggable`, `dragstart`, `dragover`, `drop`) statt einer JavaScript-Bibliothek. Beim Start eines Drags wird die Quellzelle (Mitarbeitender, Tag) über `DataTransfer` an das Ziel übergeben; beim Ablegen wird die eigentliche Datenmutation über `moveDutyBadge(srcEmp, srcDay, dstEmp, dstDay)` in `js/app.js` ausgeführt, die demselben Mutationsmuster wie die übrigen Schnellaktionen folgt (Zelle lesen, im Planungsmodus History-Eintrag setzen, Zelle schreiben, Toast anzeigen, neu rendern).

### Schutzmechanismen

- Wird auf eine Zielzelle gezogen, die bereits einen anderen Diensttyp trägt, bricht der Vorgang ab und es erscheint ein Toast-Hinweis, statt die vorhandenen Daten stillschweigend zu überschreiben.
- Wird ein Dienst auf einen anderen Tag verschoben, an dem dieser Diensttyp schon an eine dritte Person vergeben ist, wird der Vorgang ebenfalls abgebrochen und die Kollision angezeigt — die Domänenregel „nur eine Person pro `D`/`HG` und Tag" bleibt damit auch beim Drag & Drop gewahrt.
- Wird auf eine Zielzelle mit identischem Diensttyp gezogen, tauschen Quelle und Ziel ihre Dienste, statt dass die Zielinformation verloren geht.

### Abgrenzung zur bestehenden Mehrfachauswahl

Das Grid besitzt bereits eine mausbasierte Mehrfachzellenauswahl (Klicken und Ziehen über die Zellfläche, um mehrere Tage zu markieren). Damit ein Drag, der auf dem Dienstbadge selbst beginnt, nicht versehentlich gleichzeitig diese Auswahl auslöst, ignoriert der Auswahl-Handler `mousedown`-Ereignisse, die auf einem Dienstbadge starten. Beide Interaktionen — Zellbereich markieren und Dienstbadge verschieben — funktionieren dadurch nebeneinander, ohne sich gegenseitig zu stören.

---

## Mobile Oberfläche

Unterhalb des Mobile-Breakpoints wird die Bedienung in eine App-artige Struktur transformiert.

### Mobile Hauptidee

Ein breites Tabellenraster ist auf kleinen Displays schlecht bedienbar. RadPlan ersetzt es daher durch:

- vertikale Tageskarten,
- kompaktere Tagesübersichten,
- Bottom-Navigation,
- Bottom-Sheet-artige Modals,
- Safe-Area-Unterstützung für Geräte mit Home-Indikator.

### Bottom Navigation

Die mobile Navigation bietet direkten Zugriff auf:

- Mitarbeitende,
- Planung,
- Menü bzw. weitere Aktionen.

Sie nutzt `env(safe-area-inset-bottom)`, um iOS-Überlappungen zu vermeiden.

### Mobile Modals

Modals verhalten sich mobil stärker wie native Sheets:

- von unten kommend,
- große Touch-Ziele,
- reduzierte horizontale Komplexität,
- klare Schließen-Aktionen,
- auf Touch-Eingabe optimierte Abstände.

---

## Swipe-Gesten in der mobilen Tagesansicht

Tippt man in der mobilen Tagesliste auf eine Tageskarte, öffnet sich das Tages-Sheet mit allen Mitarbeitenden dieses Tages. Innerhalb dieses Sheets kann nun horizontal nach links oder rechts gewischt werden, um direkt zum nächsten bzw. vorherigen Tag zu wechseln, ohne das Sheet erst schließen und die gewünschte Karte erneut antippen zu müssen — ein Bedienmuster, das aus Kalender- und Foto-Apps vertraut ist.

### Verhalten

- Während des Wischens folgt das Sheet der Fingerbewegung gedämpft (Rubber-Band-Effekt), damit die Geste sich unmittelbar und nicht "blockiert" anfühlt.
- Wird die Wischbewegung nicht weit genug geführt, springt das Sheet ohne Tageswechsel sanft zurück.
- Wird die Wischbewegung weit genug geführt, öffnet sich der Nachbartag; am Monatsanfang bzw. -ende wird die Geste ignoriert, statt in einen ungültigen Tag zu wechseln.
- Beginnt eine Wischbewegung auf einer Mitarbeitendenzeile, wird sie ignoriert, damit sie nicht mit der dort bereits vorhandenen Geste (Ziehen öffnet ein radiales Schnellmenü für genau diese Zelle) kollidiert.

---

## Editor und Zellbearbeitung

Der Editor ist das zentrale Werkzeug für manuelle Planung.

### Öffnung

Der Editor öffnet sich aus:

- normalem Grid-Klick,
- Multi-Edit-Auswahl,
- mobiler Tageskarte,
- RD-Neurorad-Zelle.

### Strukturierte Gliederung

Der Editor ist in klar voneinander abgegrenzte Bereiche gegliedert — Arbeitsplatz, Status, Dienst und Kommentar erscheinen nicht mehr gleichrangig nebeneinander, sondern in einer Reihenfolge, die der tatsächlichen Entscheidungsreihenfolge bei der Zellbearbeitung folgt. Das reduziert Fehlbedienung, weil zusammengehörige Optionen visuell und räumlich gruppiert sind, statt sich alle gegenseitig Aufmerksamkeit zu nehmen.

### Inhalt bei normalen Mitarbeitenden

Der Editor zeigt:

- Person,
- Datum,
- Wochentag,
- Feiertags-/Wochenendhinweis,
- Arbeitsplatzchips,
- Statuschips,
- Dienstauswahl,
- Warnungen bei Dienstkonflikten,
- Kommentarbereich,
- Tastaturhinweise auf Desktop.

### Arbeitsplatzchips

Arbeitsplätze sind mehrwählbar. Dadurch sind Kombinationen wie `MR/CT` möglich. Die Chips zeigen Kürzel, Label und Farbe. Aktive Chips invertieren die Farbe und sind sofort erkennbar.

### Statuschips

Statuscodes schließen Arbeitsplatzlogik praktisch aus, da eine Abwesenheit typischerweise kein Arbeitsplatz ist. Die UI dimmt bzw. trennt Optionen entsprechend, damit Fehlbedienung unwahrscheinlicher wird.

### Dienstauswahl

`D` und `HG` werden getrennt vom Arbeitsplatzstatus gespeichert. Die UI prüft, ob bereits jemand anderes am Tag denselben Dienst hält, und zeigt Warnungen bzw. verhindert unsaubere Doppelvergaben je nach Kontext.

### Kommentare

Kommentare sind auf normale Mitarbeitendenzellen begrenzt. Sie dienen für Freitextinformationen, individuelle Hinweise oder Planungsnotizen. Der Editor zählt die Zeichen und begrenzt die Eingabe.

### Speichern und Löschen

Beim Speichern werden leere Felder entfernt, damit keine unnötigen Objektfragmente entstehen. Beim Löschen wird die Zelle vollständig bereinigt. Änderungen speichern außerhalb des Planungsmodus direkt in localStorage und werden serverseitig synchronisiert.

---

## RD-Neurorad-Sonderzeile

Die RD-Neurorad-Zeile ist eine Spezialfunktion.

### Zweck

Sie bildet eine externe oder separate neuroradiologische Tageszuordnung ab. Diese Zuordnung soll sichtbar im Plan erscheinen, aber nicht wie eine normale Mitarbeiterzeile behandelt werden.

### Sichtbarkeit

Die Zeile wird ab einem definierten Startmonat sichtbar:

```js
RBN_ROW_START = { year: 2025, month: 5 }
```

Das entspricht Juni 2025.

### Datenhaltung

RD-Neurorad-Werte liegen in `md.rbn` und nicht in `assignments`.

### Auswahloptionen

Aktuelle Optionen:

- `Prof. Schob (NRAD)`,
- `Dr. Maybaum (NRAD)`,
- `Dr. Bailis (NRAD)`,
- `Dr. Schüngel (NRAD)`,
- `Fr. Dalitz (RAD)`,
- `Fr. Thaler (RAD)`,
- `Dr. Martin (RAD)`,
- `Hr. El Houba (RAD)`.

### Datumsabhängige RD-Optionen

`Fr. Thaler (RAD)` ist nur bis einschließlich März 2026 auswählbar. Danach wird sie aus der normalen Auswahl entfernt. Sollte ein historischer Wert dennoch bereits in einer Zelle stehen, wird der bestehende Zellwert im Editor weiter angezeigt, damit alte Daten nicht unbedienbar werden.

### Darstellung

`formatRbnDisplay(name)` extrahiert für kompakte Darstellung den Nachnamen aus dem vollständigen Optionslabel. So bleibt das Grid lesbar, obwohl die gespeicherten Werte vollständig und eindeutig sind.

### Abgrenzung zur Auto-Planung

RD Neurorad wird nie durch Auto-Planung verändert. Der Editor zeigt deshalb einen eigenen Hinweis: manuelle Namensauswahl, keine automatische Änderung.

---

## Mitarbeitendenbereich und Profile

Der Mitarbeitendenbereich ist Dashboard, Verwaltung und Analysezentrum.

### Verwaltungsfunktionen

- Mitarbeitende eines Monats anzeigen,
- neue Mitarbeitende hinzufügen,
- Mitarbeitende entfernen,
- Suche/Filterung,
- Profil öffnen,
- Monats- und Jahreskontext behalten.

### Profilmodal

Das Profilmodal kombiniert Stammdaten und Statistik:

- Name,
- Position,
- Rollenlabel,
- Typ,
- Bereich,
- Stellvertretung,
- Telefon,
- Tags,
- Monatskennzahlen,
- Jahreskennzahlen,
- Arbeitsplatzverteilung,
- Statusverteilung,
- Diensttage,
- Verlauf über Monate.

### Diagramme

Chart.js wird für visuelle Auswertungen genutzt:

- Donut/Verteilung für Arbeitsplätze,
- Balken für Statuscodes,
- Jahresverlauf als kombinierte Darstellung.

### Nutzen

Profile helfen bei Fragen wie:

- Wer war wie stark eingesetzt?
- Wie viele Urlaubstage oder Krankheitstage wurden eingetragen?
- Wie verteilen sich Arbeitsplätze?
- Wie viele Dienste hatte eine Person?
- Gibt es auffällige Ungleichgewichte?

---

## Abteilungsübersicht

Die Abteilungsübersicht betrachtet nicht einzelne Personen, sondern das Team.

### Inhalte

- Coverage-Kennzahlen,
- Abteilungsmetriken,
- Tabellen nach Mitarbeitenden,
- Arbeitsplatzabdeckung,
- Jahreskontext,
- Monatskontext,
- aktive Mitarbeitende,
- Aktivitäts- und Abwesenheitsanteile.

### Zweck

Die Ansicht beantwortet strategische Fragen:

- Ist der Monat insgesamt ausreichend abgedeckt?
- Welche Bereiche sind unterbesetzt?
- Wie wirkt sich Urlaub oder Krankheit auf die Abteilung aus?
- Welche Mitarbeitenden tragen wie viel zur Abdeckung bei?
- Wie sieht die Jahresentwicklung aus?

---

## Jahresplaner

Der Jahresplaner ist eine eigenständige Analyseansicht.

### Tabs

Der Jahresplaner bietet mehrere Perspektiven:

1. Grid/Jahresmatrix,
2. Fairness,
3. Projektion.

### Jahresmatrix

Die Matrix zeigt pro Mitarbeitendem und Monat:

- BD-Anzahl,
- HG-Anzahl für fachärztliche Rollen,
- Jahresgesamtsumme,
- Durchschnittszeilen,
- Heatmap-Färbung nach Abweichung vom Monatsdurchschnitt,
- Gruppierung nach Fach-/Oberärzten und Assistenzärzten.

Ein Klick auf eine Monatszelle kann in den entsprechenden Monat navigieren.

### Fairnessansicht

Die Fairnessansicht zeigt kumulierte Abweichungen vom Kollegiums-Mittelwert.

Umschaltbar ist:

- Bereitschaftsdienst `D`,
- Hintergrunddienst `HG`.

Dazu gehören:

- Linienchart,
- Legende,
- Tabelle mit Monatswerten,
- Summen,
- Abweichungen.

### Projektion

Die Projektion schätzt anhand bisheriger Monate eine Jahresentwicklung:

- Ist-BD,
- Monate mit Daten,
- projizierter Jahresendwert,
- Jahresziel,
- Abweichung,
- Fortschrittsbalken.

Diese Ansicht hilft frühzeitig zu erkennen, ob die Dienstlast am Jahresende fair sein wird.

---

## Neural-Graph-Visualisierung

`js/neuralgraph.js` erzeugt eine visuelle Schicht für die Auto-Planung.

### Bestandteile

- 3D-Grid für Monatstage,
- Slots für `D` und `HG`,
- Pulsanimationen,
- Fehlerzustände,
- Phasenfarben,
- Mini-Map-Canvas,
- Loop zur Darstellung laufender Impulse.

### Zweck

Die Visualisierung hat nicht nur Show-Charakter. Sie erfüllt UX-Funktionen:

- Der Nutzer sieht, dass gerechnet wird.
- Phasenwechsel werden begreifbar.
- Dienste erscheinen räumlich und zeitlich nachvollziehbar.
- Fehler und kritische Gaps fallen visuell auf.
- Die komplexe Solverlogik wirkt nicht wie eine Black Box — ergänzt durch die textuelle Erklärbarkeit im Ergebnisbericht (siehe [Auto-Planung und Solver](#auto-planung-und-solver)).

### Initialenlogik

Namen werden zu kompakten Kürzeln verdichtet. Dabei werden Titel und Namensbestandteile berücksichtigt, damit auch Namen mit Präfixen lesbar bleiben.

---

## Command Palette

Über `Cmd+K` (macOS) bzw. `Ctrl+K` (Windows/Linux) öffnet sich eine globale Command Palette, die tastaturgetriebenes Arbeiten deutlich beschleunigt — passend zum bereits stark tastaturorientierten Bedienkonzept des restlichen Grids.

### Funktionsumfang

- Direkte Suche nach Mitarbeitenden, mit Sprung ins jeweilige Profil.
- Direkter Sprung zu einem beliebigen Monat/Jahr.
- Schnellzugriff auf zentrale Funktionen wie Jahresplaner, Export, Import, Auto-Plan oder Theme-Umschaltung, ohne den Header durchsuchen zu müssen.
- Tastaturnavigation der Trefferliste (Pfeiltasten, Enter, Escape).

### Implementierung

Implementiert in `js/commandpalette.js`. Die Palette greift auf dieselben Funktionen zu, die auch von den regulären Buttons im Header aufgerufen werden (`openProfileModal`, `switchPeriod`, `openYearPlan` usw.), sodass keine Logik doppelt vorgehalten werden muss.

---

## Theme-Umschaltung und View Transitions

### Dark/Light-Theme

Standardmäßig läuft RadPlan in einem dunklen Glass-UI. Über den Theme-Button im Header lässt sich ein helles Pendant aktivieren, das für Tageslicht-Nutzung (z. B. an einem Stationsrechner) besser geeignet ist. Beide Themes greifen auf dieselben CSS-Design-Tokens in `css/core.css` zurück (`--navy-*`, `--glass-*`, `--ink-rgb` usw.); im hellen Theme werden ausschließlich die Token-Werte über ein `[data-theme="light"]`-Attribut überschrieben, sodass kein einziger Verbraucher dieser Variablen angepasst werden musste.

### View Transitions

Sowohl der Theme-Wechsel als auch die Monats-/Jahresnavigation nutzen die native [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) des Browsers (`js/viewtransition.js`):

- **Monats-/Jahreswechsel**: Beim Wechsel in die Zukunft schiebt sich die neue Ansicht von rechts ins Bild, während die alte nach links verschwindet (und umgekehrt bei einem Rückwärtswechsel) — eine kurze, aber spürbare Choreografie, die die Navigationsrichtung intuitiv vermittelt.
- **Theme-Wechsel**: Ein kreisförmiger Reveal-Effekt expandiert exakt vom Klickpunkt auf den Theme-Button aus und legt das neue Theme darüber, statt eines generischen, mittig zentrierten Übergangs.

Beide Effekte degradieren transparent: Unterstützt der Browser `document.startViewTransition` nicht, oder ist `prefers-reduced-motion: reduce` aktiv, wird die zugrunde liegende Zustandsänderung synchron ohne jede Animation ausgeführt — die Funktion bleibt also in jedem Fall vollständig erhalten, nur die Choreografie entfällt.

---

## Inline-Konfliktwarnungen im Grid

Verletzt eine Zelle eine harte Domänenregel (z. B. doppelte `D`-Vergabe an einem Tag, Dienst während einer Abwesenheit, ein D-F-D-Muster), wird das nicht erst im Auto-Plan-Bericht sichtbar, sondern direkt an der betroffenen Zelle im Grid markiert — unabhängig davon, ob der Solver oder eine rein manuelle Bearbeitung die Konfliktsituation erzeugt hat.

### Darstellung

Eine konfliktbehaftete Zelle erhält einen roten inneren Rahmen (`box-shadow: inset`) sowie ein kleines Warnsymbol; beim Hover verstärkt sich der Effekt zusätzlich. Der Tooltip der Zelle (`title`-Attribut) listet alle aktuell zutreffenden Konfliktgründe als Klartext auf.

### Berechnung

Die Konflikte werden bei jedem Rendering des Grids aus den vorhandenen Zelldaten neu ermittelt (`gridConflicts`, indiziert über `dutyKey(emp, day)`), sodass auch eine manuelle Bearbeitung außerhalb des Solvers sofort sichtbares Feedback erzeugt, statt einen latenten, unbemerkten Regelverstoß im Datenbestand zu hinterlassen.

---

## Druckansicht und PDF-Export

Neben dem JSON-Export steht eine eigene Druckansicht des aktuellen Monatsplans zur Verfügung, gedacht für Aushänge, bei denen ein gedrucktes Exemplar oder ein als PDF gespeicherter Plan weiterhin gebraucht wird.

### Aufbau

Ein dediziertes Stylesheet (`css/print.css`) blendet beim Drucken alle nicht druckrelevanten UI-Elemente (Header, Navigation, Modals, Toasts) aus und stellt stattdessen einen eigenen Druckkopf mit Monat/Jahr und Erstellungsdatum sowie eine auf Papierformat optimierte Tabellendarstellung des Monatsplans bereit.

### Nutzung

Ein PDF entsteht ohne zusätzliche Bibliothek direkt über den Drucken-Dialog des Browsers ("Als PDF speichern"), da moderne Browser dies nativ unterstützen — RadPlan muss dafür lediglich ein korrektes Print-Stylesheet bereitstellen, was die Komplexität gegenüber einer eigenen PDF-Erzeugung deutlich reduziert.

---

## UI-, UX- und Design-Philosophie im Detail

### Grundhaltung

RadPlan ist bewusst kein nüchternes Tabellenformular. Die Oberfläche soll klinische Komplexität reduzieren und gleichzeitig Vertrauen in die Daten geben.

### Visuelle Sprache

- dunkler, ruhiger Hintergrund (mit hellem Gegenstück, siehe [Theme-Umschaltung](#theme-umschaltung-und-view-transitions)),
- Glassmorphism-Flächen mit feinem Specular-Sheen-Highlight auf Modal-Oberflächen, das Licht auf einer Glasfläche andeutet, ohne den eigentlichen Inhalt zu überdecken,
- klare Kontraste,
- farbcodierte medizinische Planungscodes,
- Monospace-Zahlen und Codes für exakte Lesbarkeit,
- weiche, choreografierte Übergänge (View Transitions, Modal-Animationen, Federn/Spring-Easings),
- deutliche Aktionsbuttons,
- modulare Karten und Panels.

### Warum diese UI für diesen Zweck passt

Dienstplanung erfordert viele schnelle Mikroentscheidungen. Die UI unterstützt das durch:

- sofort erkennbare Farben,
- kurze Codes,
- Hover- und Focus-Zustände,
- Tastaturbedienung inklusive Command Palette,
- planbare Modals,
- getrennte Live-/Entwurfszustände,
- starke Warnfarben bei Sync, Konflikten oder Planmodus,
- Diagramme für Fairness statt bloßer Zahlenkolonnen,
- direkte, native Interaktionsmuster (Drag & Drop, Swipe) statt zusätzlicher Klick-Umwege.

### Mikrointeraktionen

- Buttons haben aktive Zustände (Skalierung, Farbwechsel, Schatten).
- Modals erscheinen animiert und tragen einen subtilen Glanz-Akzent.
- Toasts bestätigen Aktionen.
- Grid-Hover hebt Zeilen und Zellen hervor.
- Dienstbadges lassen sich greifen (Cursor wechselt zu „grab"/„grabbing") und per Drag & Drop verschieben.
- Tageskarten in der mobilen Ansicht reagieren auf horizontales Wischen mit einer gedämpften, federnden Bewegung.
- Kontextmenüs erscheinen an der richtigen Bildschirmposition.
- Planungsmodus ist visuell eindeutig.
- Auto-Planung bekommt eine bewusst immersive Visualisierung mit entkoppelter, überspringbarer Anzeigedauer.

### Farbsemantik

Farben sind nicht dekorativ, sondern semantisch:

- Blau: MRT/Information/ruhige Primärfunktion,
- Orange: CT/aktive technische Kategorie,
- Türkis/Grün: Sonographie und produktive Zustände,
- Violett: Urlaub/Sonderstatus,
- Rot: Krankheit, Konflikt, Bereitschaftsdienst, Warnung,
- Cyan: Hintergrunddienst/RD-Neurorad-Spezialität.

### Perfekter Touch für den Anwendungszweck

Die besondere Qualität entsteht durch Details:

- RD-Neurorad ist sichtbar, aber nicht mit normalen Mitarbeitenden vermischt.
- Historische Personalstände bleiben erhalten, auch wenn Personen später ausscheiden.
- Der Planungsmodus nimmt Angst vor Experimenten — verstärkt durch die Möglichkeit, einzelne Zellen vor einem Auto-Plan-Lauf gezielt zu fixieren.
- Jahresanalysen verhindern schleichende Ungerechtigkeit.
- Auto-Planung bleibt über Berichte, klickbare Begründungen und Visualisierung nachvollziehbar, und liefert bei Bedarf mehrere Alternativen statt eines einzigen, nicht verhandelbaren Vorschlags.
- Mobile Nutzer bekommen kein geschrumpftes Desktop-Grid, sondern eine andere, auf Touch-Gesten ausgelegte Bedienform.
- Import/Export schützt vor Datenverlust; eine Druckansicht deckt den weiterhin verbreiteten Bedarf an physischen Aushängen ab.
- Server-Konflikte werden nicht still überschrieben, sondern feldweise aufgelöst.

---

## Barrierefreiheit und Tastaturbedienung

### Semantik

Viele Controls besitzen:

- `aria-label`,
- `aria-controls`,
- `aria-expanded`,
- `aria-live`,
- Rollen wie `toolbar`, `alert` oder `dialog`-ähnliche Strukturen.

### Tastatur

Die Anwendung unterstützt u. a.:

- Monatswechsel per Button/Keyboard-Konzept,
- globale Command Palette per `Cmd/Ctrl+K`,
- Grid-Navigation per Pfeiltasten,
- Ziffern für Arbeitsplatz-Schnellwahl,
- `D` für Bereitschaftsdienst,
- `H` für Hintergrunddienst,
- `Entf` zum Löschen,
- `Strg+Z`/`Strg+Y` im Planungsmodus,
- `Strg+S` für Exporthinweis/-Aktion im UI-Kontext.

### Fokus und Lesbarkeit

- Tabellenzellen sind visuell fokussierbar.
- Badges und Codes sind kurz und kontrastreich.
- Tooltips liefern Zusatzinformationen, inklusive Klartext-Konfliktgründen bei konfliktbehafteten Zellen.
- Mobile Touch-Ziele sind größer und klarer getrennt.
- Animationen (View Transitions, Swipe-Federung) respektieren `prefers-reduced-motion: reduce` und entfallen in diesem Fall vollständig, ohne die jeweilige Funktion einzuschränken.

---

## PWA, Icons und Installierbarkeit

`manifest.json` macht RadPlan als Progressive Web App installierbar.

Wichtige Eigenschaften:

- Name: `RadPlan — Klinik für Radiologie & Nuklearmedizin`,
- Kurzname: `RadPlan`,
- Standalone-Display,
- beliebige Orientierung,
- dunkle Hintergrund- und Theme-Farben,
- SVG-Icon als normales und maskierbares Icon.

`index.html` ergänzt mobile Web-App-Metadaten:

- `mobile-web-app-capable`,
- `apple-mobile-web-app-capable`,
- `apple-mobile-web-app-status-bar-style`,
- `apple-mobile-web-app-title`,
- `viewport-fit=cover`.

---

# Teil 3 — Struktur & Umfang

## Technische Grundarchitektur

RadPlan ist eine statische Webanwendung mit ES-Modulen — kein Framework, kein Build-Tool, kein Transpiler. Der Browser lädt und führt die JavaScript-Module direkt aus.

### Frontend

- HTML: `index.html`
- JavaScript: native ES Modules unter `js/` (rund 12.000 Zeilen)
- CSS: modulare Stylesheets unter `css/` (rund 8.400 Zeilen)
- Externe Libraries:
  - Chart.js (über CDN) für Diagramme in Profilen, Abteilungsübersicht und Jahresplaner,
  - GSAP (über CDN eingebunden, aktuell jedoch an keiner Stelle der Anwendung tatsächlich genutzt — Choreografien wie der Theme-Wechsel und die Monatsnavigation setzen stattdessen auf die native View Transitions API des Browsers, siehe [Theme-Umschaltung und View Transitions](#theme-umschaltung-und-view-transitions)),
  - Google Fonts für IBM Plex Sans und IBM Plex Mono.

### Backend-/Sync-Schicht

- Cloudflare-Pages-kompatible Function: `functions/api.js`
- KV-Binding: `RADPLAN_KV`
- Persistierter KV-Key: `RADPLAN_DATA`
- HTTP-Methoden:
  - `GET` liefert den aktuellen Datenstand,
  - `POST` schreibt einen neuen Stand (inklusive feldweiser Konfliktbehandlung bei veralteter Versionsmarke),
  - `OPTIONS` bedient CORS Preflight.

### Zustandsprinzip

Die Anwendung hat einen zentralen Datencontainer `DATA`. UI-Zustand, Planungsmodus, Planentwürfe, Sync-Status und responsive Flags liegen in `state.js`. Mutationen erfolgen überwiegend über `model.js`, während die Render-Module und `app.js` Oberfläche und Interaktion orchestrieren.

---

## Datei- und Modulstruktur

### Root-Dateien

| Datei | Aufgabe |
|---|---|
| `index.html` | DOM-Grundgerüst, Header, Modals, Hauptcontainer, externe Scripts und Styles. |
| `manifest.json` | PWA-Metadaten, Name, Theme-Farbe, Icons, Standalone-Anzeige. |
| `package.json` | Markiert das Projekt als ES-Modul-Paket und definiert das `npm test`-Skript für die automatisierten Tests. |
| `README.md` | Diese vollständige Anwendungsbeschreibung. |
| `radplan_2026-04-10.json` | Beispiel-/Datenexport mit historisierten Monatsdaten. |
| `Algorithmusregeln.txt` | Fachliche Algorithmusregeln in Textform. |
| `Algorithmus-Kriterien.txt` | Kriterien und Zielvorstellungen für den Algorithmus. |
| `algorithm_rules.md` | Markdown-Beschreibung wichtiger Algorithmusregeln. |
| `Algorithmusregeln_original.txt` | Ursprüngliche Regelnotizen. |

### JavaScript

Das ursprünglich monolithische `js/render.js` (rund 3.000 Zeilen, zuständig für DOM-Rendering, Modal-Management, Responsive-Logik und Chart-Rendering gleichzeitig) wurde in vier fokussierte Render-Module aufgeteilt, um zukünftige UI-Arbeit an einzelnen Bereichen zu erleichtern, ohne das gesamte Rendering anfassen zu müssen.

| Modul | Aufgabe |
|---|---|
| `js/constants.js` | Statische Konfiguration, Codes, Metadaten, Feiertage, Datumsfunktionen, Personal-Lifecycle. |
| `js/state.js` | Globaler Zustand, localStorage, Server-Sync, Planmode-Flags, Setter. |
| `js/model.js` | Datenzugriff, Mutationen, Monatsdaten, Statistiken, Plan-Sessions. |
| `js/render-grid.js` | Desktop-Grid-Rendering, mobile Tagesliste, Drag-Selection, Drag-&-Drop von Dienstbadges, Footer-Statistiken. |
| `js/render-modals.js` | Generisches Modal-/Overlay-Management, Profilmodal, Editor-Rendering. |
| `js/render-dept.js` | Abteilungsübersicht (Coverage- und Teammetriken). |
| `js/render-employee-dashboard.js` | Mitarbeitendenbereich/-dashboard inklusive Chart.js-Diagrammen. |
| `js/app.js` | Event-Orchestrierung, Editorlogik, Planung, Quick-Actions (inkl. `moveDutyBadge`), Import/Export/Druck, mobile Tagesnavigation samt Swipe-Gesten, Tastatursteuerung. |
| `js/autoplan.js` | Auto-Planungsalgorithmus, Scoring, Regeln, Lösungsalternativen, Optimierung, Ergebnisqualität, Erklärbarkeits-Begründungen. |
| `js/neuralgraph.js` | Visuelle Auto-Planungsdarstellung mit 3D-Matrix und Mini-Map. |
| `js/contextmenu.js` | Custom-Kontextmenü für Mitarbeitendenzeilen und Zell-Pinning. |
| `js/yearplan.js` | Jahresplaner, Fairnessdiagramm, Projektion, Jahresnavigation. |
| `js/commandpalette.js` | Globale Command Palette (`Cmd/Ctrl+K`) für Mitarbeitenden-, Monats- und Funktionssuche. |
| `js/viewtransition.js` | Wrapper um die native View Transitions API für Navigations- und Theme-Choreografien, mit Fallback ohne Animation. |

### CSS

| Datei | Aufgabe |
|---|---|
| `css/core.css` | Reset, Design Tokens (inkl. Dark-/Light-Theme-Variablen), Grundfarben, Typografie, Basislayout, Body-Hintergrund, View-Transition-Keyframes. |
| `css/layout.css` | Header, Planleiste, Grid-Aufbau, Tabellenlayout, responsive Hauptstruktur inkl. Tablet-Breakpoint, Drag-&-Drop-Feedback. |
| `css/components.css` | Buttons, Badges, Toasts, Inputs, Editor-Chips, wiederverwendbare Komponenten. |
| `css/modals.css` | Modal-Layout, Overlays, Profile, Auto-Plan-Dialoge, Sheets, Glass-Sheen-Highlight. |
| `css/views.css` | Spezifische Ansichten wie Mitarbeitendenbereich, Abteilung, Jahresplan. |
| `css/contextmenu.css` | Rechtsklick-Menü, Menüanimationen, Kontextaktionen. |
| `css/mobile-optimization.css` | Zusätzliche mobile Optimierungen. |
| `css/print.css` | Eigenständiges Stylesheet für die Druckansicht/den PDF-Export des Monatsplans. |
| `css/core_backup.css` | Unbenutztes Backup/Referenz einer früheren Core-CSS-Version; nicht in `index.html` eingebunden. |

### Tests

| Pfad | Aufgabe |
|---|---|
| `test/autoplan.test.js` | Automatisierte Tests der sicherheitskritischen, reinen Regelfunktionen des Solvers (siehe [Automatisierte Tests](#automatisierte-tests)). |

### Assets und Functions

| Datei | Aufgabe |
|---|---|
| `img/icon.svg` | App-Icon und PWA-Icon. |
| `img/icon_animated.svg` | Animiertes Header-/Brand-Icon. |
| `functions/api.js` | Serverlose KV-API für Lesen, Schreiben und feldweise Konfliktauflösung. |

---

## Automatisierte Tests

Die Anwendung besitzt eine automatisierte Testsuite für die fachlich komplexesten und damit regressionsanfälligsten Teile des Codes: die harten Regelprüfungen des Auto-Planungs-Solvers in `js/autoplan.js`.

### Werkzeug

Die Tests nutzen ausschließlich den in Node.js eingebauten Testrunner (`node:test`, `node:assert/strict`) — es wird keine zusätzliche Testbibliothek als Abhängigkeit eingeführt.

### Umfang

Geprüft werden u. a.:

- D-F-D-Musterkennung in beide Richtungen,
- Wochenend-Dienstzählung inklusive der Regel, dass `D` Vorrang vor `HG` hat,
- Projektion zukünftiger Wochenend-Dienstlast,
- der CT-Leitungskonflikt für das betroffene Mitarbeitendenpaar, ausschließlich an Werktagen,
- der Mammographie-Konflikt für das betroffene Mitarbeitendenpaar, ausschließlich an Sonn- und Montagen,
- Abwesenheits- und Urlaubserkennung,
- diverse kleinere reine Hilfsfunktionen (Fairness-Spread, Dienstschlüssel-Bildung, Mittelwertberechnung).

Bewusst **nicht** unit-getestet ist die große, zustandsbehaftete Orchestrierungsfunktion `computeAutoPlan` selbst, da ein sinnvoller Test dafür ein aufwändiges Mocken von Planungsmodus, Plandaten und DOM erfordern würde; stattdessen konzentrieren sich die Tests auf die darunterliegenden, reinen Regelfunktionen, die die fachliche Korrektheit tatsächlich tragen.

### Ausführung

```bash
npm test
```

Das Skript führt `node --test test/**/*.test.js` aus.

---

## Fehlerfälle, Schutzmechanismen und Datenhygiene

### Datenform

Fehlende Felder werden normalisiert. Dadurch bricht die App nicht, wenn ältere Datenstände keine `comments` oder `rbn` enthalten.

### Lifecycle

Austritte werden zentral definiert, nicht verstreut in UI-Sonderfällen. Dadurch gilt die Personalregel in:

- Monatsanlage,
- Laden,
- Server-Snapshot,
- Planentwurf,
- Jahresaggregation,
- manuellem Hinzufügen.

### Folgetag nach Dienst

`ensurePostBDFreiDays()` prüft vorhandene Daten und ergänzt fehlende `F`-Folgetage nach `D`, soweit der entsprechende Folgemonat existiert.

### Serverfehler

Die API liefert klare Fehler:

- fehlendes KV-Binding,
- KV-Lesefehler,
- ungültiges JSON,
- KV-Schreibfehler,
- nicht erlaubte Methoden,
- Konflikte (mit feldweiser Auflösung statt pauschalem Überschreiben).

### UI-Schutz

- Planmodus warnt vor ungespeicherten Änderungen.
- Force-Sync ist farblich rot hervorgehoben.
- Konflikte triggern Events und werden feldweise statt pauschal aufgelöst.
- Import muss als JSON gelesen werden.
- RD-Neurorad wird nicht versehentlich vom Auto-Solver überschrieben.
- Gepinnte Zellen werden vom Auto-Solver nicht verändert.
- Drag-&-Drop-Operationen auf Dienstbadges können keinen bereits anderweitig vergebenen Dienst stillschweigend überschreiben.

---

## Betrieb und lokale Nutzung

Da die Anwendung aus statischen Dateien und ES-Modulen besteht, sollte sie über einen lokalen HTTP-Server geöffnet werden, nicht direkt per `file://`.

Beispiel:

```bash
python3 -m http.server 8000
```

Danach im Browser öffnen:

```txt
http://localhost:8000
```

Für vollständige Server-Synchronisation muss ein kompatibler `/api`-Endpunkt mit KV-Binding bereitstehen. Ohne diesen Endpoint bleibt localStorage als lokale Persistenz nutzbar.

---

## Qualitätssicherung

### Syntaxchecks

Die JavaScript-Dateien können mit Node syntaktisch geprüft werden:

```bash
node --check js/constants.js
node --check js/model.js
node --check js/state.js
node --check js/app.js
```

### Automatisierte Tests

```bash
npm test
```

Siehe [Automatisierte Tests](#automatisierte-tests) für Umfang und Begründung.

### Gezielte Runtime-Prüfungen

Für reine Konstanten- und Lifecycle-Logik können ES-Module direkt per Node importiert werden, z. B. um sicherzustellen, dass:

- RD-Neurorad-Optionen vollständig sind,
- `Hr. Torki` bis Juni 2026 aktiv ist,
- `Hr. Torki` ab Juli 2026 inaktiv ist,
- Reconciliation zukünftige Torki-Daten entfernt.

### Manuelle UI-Prüfung

Empfohlen sind zusätzlich:

- Monat Juni 2026 öffnen und prüfen, dass `Hr. Torki` vorhanden bleiben kann.
- Monat Juli 2026 öffnen und prüfen, dass `Hr. Torki` nicht in der aktiven Liste erscheint.
- RD-Neurorad-Editor öffnen und `Dr. Martin (RAD)` sowie `Hr. El Houba (RAD)` prüfen.
- Planungsmodus aktivieren und sicherstellen, dass Entwurfsdaten dieselben Lifecycle-Regeln nutzen.
- Jahresplaner öffnen und prüfen, dass inaktive zukünftige Monate nicht fälschlich alte Personalstände fortschreiben.
- Im Desktop-Grid ein Dienstbadge per Drag & Drop auf eine andere Zelle ziehen und prüfen, dass weder die Mehrfachauswahl noch bestehende Dienstdaten dabei unbeabsichtigt verändert werden.
- In der mobilen Tagesansicht innerhalb des Tages-Sheets nach links/rechts wischen und prüfen, dass der Tageswechsel korrekt funktioniert und an den Monatsgrenzen sauber abbricht.

---

## Weiterentwicklung

RadPlan ist modular genug, um fachliche Weiterentwicklungen gezielt einzubauen.

Mögliche Erweiterungen:

- UI für Personal-Lifecycle-Regeln statt nur Code-Konfiguration,
- detaillierter Audit-Log für Änderungen mit sichtbarem "zuletzt geändert von/am",
- Benutzerrollen und Authentifizierung (aktuell kann jeder mit der API-URL lesen/schreiben),
- differenzierte Rechte für Import, Force-Sync und Planübernahme,
- serverseitige Schema-Validierung eingehender Daten,
- versionierte Snapshots/Backups des KV-Stores,
- zusätzliche Diensttypen,
- serverseitige Historisierung alter Datenstände,
- mehr Barrierefreiheitsprüfungen,
- automatisierte Browser-/E2E-Tests zusätzlich zur bestehenden Unit-Testsuite,
- bessere Offline-Queue bei Serverausfall,
- administrative Oberfläche für Stammdaten,
- ein eigenständiges UI für `#modal-dept` (die Abteilungsübersicht existiert als Modul und Modal, besitzt aber aktuell keinen sichtbaren Aufrufpunkt im Header oder in der mobilen Navigation).

---

## Kurzfazit

RadPlan ist eine domänenspezifische Dienstplananwendung, die weit über ein einfaches Tabellen-Frontend hinausgeht. Sie kombiniert operative Tagesplanung mit nativen, modernen Interaktionsmustern (Drag & Drop, Swipe-Gesten, View Transitions), Personalverwaltung, Jahresfairness, ein erklärbares Auto-Scheduling mit wählbaren Lösungsalternativen, RD-Neurorad-Sonderlogik, lokale und serverseitige Persistenz mit feldweiser Konfliktauflösung, mobile Bedienbarkeit, eine globale Command Palette sowie eine stark durchdachte, in fokussierte Module aufgeteilte und automatisiert getestete UI. Die Anwendung ist so aufgebaut, dass sie sowohl schnelle tägliche Einträge als auch strategische Planungsentscheidungen unterstützt — ohne dabei auf ein Framework, einen Build-Schritt oder externe UI-Bibliotheken jenseits von Chart.js angewiesen zu sein.
