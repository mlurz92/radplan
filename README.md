# RadPlan — vollständige Anwendungsbeschreibung

RadPlan ist eine spezialisierte Web-Anwendung für die ärztliche Monats-, Jahres- und Dienstplanung einer Klinik für Radiologie und Nuklearmedizin. Die Anwendung verbindet eine sehr schnelle Vanilla-JavaScript-Oberfläche mit einem medizinisch-domänenspezifischen Datenmodell, einer lokalen Planungs-Sandbox, einem automatischen Dienstplan-Solver, Jahresanalysen, Mitarbeitendenprofilen, Import/Export, Server-Synchronisation und einer konsequent responsiven UX für Desktop und Mobile.

Diese README beschreibt den aktuellen Stand der Anwendung als Gesamtprodukt. Sie ist kein Changelog, sondern eine systematische Dokumentation der Funktionen, Datenstrukturen, UI-Logik, Bedienkonzepte, Designentscheidungen, Architektur und fachlichen Regeln.

---

## Inhaltsverzeichnis

1. [Kernidee](#kernidee)
2. [Zielgruppe und Nutzungssituation](#zielgruppe-und-nutzungssituation)
3. [Funktionsüberblick](#funktionsüberblick)
4. [Technische Grundarchitektur](#technische-grundarchitektur)
5. [Datei- und Modulstruktur](#datei--und-modulstruktur)
6. [Datenmodell](#datenmodell)
7. [Personal-, Rollen- und Lifecycle-Logik](#personal--rollen--und-lifecycle-logik)
8. [Arbeitsplätze, Statuscodes, Dienste und Wünsche](#arbeitsplätze-statuscodes-dienste-und-wünsche)
9. [Kalenderlogik und Feiertage](#kalenderlogik-und-feiertage)
10. [Hauptoberfläche](#hauptoberfläche)
11. [Desktop-Grid](#desktop-grid)
12. [Mobile Oberfläche](#mobile-oberfläche)
13. [Editor und Zellbearbeitung](#editor-und-zellbearbeitung)
14. [RD-Neurorad-Sonderzeile](#rd-neurorad-sonderzeile)
15. [Mitarbeitendenbereich und Profile](#mitarbeitendenbereich-und-profile)
16. [Abteilungsübersicht](#abteilungsübersicht)
17. [Jahresplaner](#jahresplaner)
18. [Planungsmodus](#planungsmodus)
19. [Auto-Planung und Solver](#auto-planung-und-solver)
20. [Neural-Graph-Visualisierung](#neural-graph-visualisierung)
21. [Import, Export und Datenportabilität](#import-export-und-datenportabilität)
22. [Persistenz, Synchronisation und Konfliktbehandlung](#persistenz-synchronisation-und-konfliktbehandlung)
23. [PWA, Icons und Installierbarkeit](#pwa-icons-und-installierbarkeit)
24. [UI-, UX- und Design-Philosophie](#ui--ux--und-design-philosophie)
25. [Barrierefreiheit und Tastaturbedienung](#barrierefreiheit-und-tastaturbedienung)
26. [Fehlerfälle, Schutzmechanismen und Datenhygiene](#fehlerfälle-schutzmechanismen-und-datenhygiene)
27. [Betrieb und lokale Nutzung](#betrieb-und-lokale-nutzung)
28. [Qualitätssicherung](#qualitätssicherung)
29. [Weiterentwicklung](#weiterentwicklung)

---

## Kernidee

RadPlan ersetzt Tabellen, manuelle Listen und lose JSON- oder Excel-basierte Dienstpläne durch eine fokussierte Fachanwendung. Der wichtigste Gedanke ist: Die Planung soll nicht nur Daten speichern, sondern den Denkprozess der radiologischen Dienstplanung abbilden.

Die Anwendung behandelt daher nicht nur einfache Einträge wie „Dr. X arbeitet CT“, sondern kombiniert:

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
- Cloud-/KV-Synchronisierung,
- Import/Export,
- Desktop- und Mobile-Bedienung.

Das Ergebnis ist ein Planungswerkzeug, das sich wie eine moderne App anfühlt, aber bewusst ohne schweres Frontend-Framework auskommt.

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
- Bereitschafts- und Hintergrunddienste werden manuell oder automatisch geplant.
- Ein Entwurf wird im Planungsmodus getestet, ohne Live-Daten zu verändern.
- Jahreslasten werden geprüft, um eine faire Verteilung zu erreichen.
- Ein JSON-Export wird erstellt oder ein alter Stand importiert.
- Mehrere Clients synchronisieren über den Server-Endpunkt.

---

## Funktionsüberblick

### Kernfunktionen

- Monatsbasierter Dienstplan mit täglicher Spaltenstruktur.
- Mitarbeitendenzeilen mit Rollen-, Positions- und Profilinformationen.
- Arbeitsplatzzuteilung über farbcodierte Codes.
- Abwesenheits- und Statusverwaltung.
- Bereitschaftsdienst `D` und Hintergrunddienst `HG`.
- Kommentare pro Mitarbeitendem und Tag.
- Spezielle RD-Neurorad-Zeile mit eigenem Datenbereich.
- Mitarbeitendenverwaltung mit Hinzufügen und Entfernen.
- Profilmodal mit Monats- und Jahresstatistiken.
- Abteilungsdashboard mit Coverage- und Teammetriken.
- Jahresplaner mit Grid, Fairnesskurven und Projektion.
- Planungsmodus als Sandbox mit Undo/Redo und Entwurfsspeicherung.
- Auto-Planung mit konfigurierbaren BD-Zielen.
- Live-Visualisierung der Auto-Planung.
- Ergebnisbericht und Score-Erklärung.
- Import/Export als JSON.
- Lokale Speicherung im Browser.
- Server-Synchronisation mit Konflikterkennung.
- Mobile Bottom-Navigation und mobile Kartenansicht.
- PWA-Metadaten und installierbares App-Verhalten.

### Besonders wichtige fachliche Eigenschaften

- `Hr. Torki` ist ab Juli 2026 nicht mehr aktiver Mitarbeiter und wird aus zukünftigen Mitarbeitendenlisten sowie zugehörigen zukünftigen Datenstrukturen entfernt.
- Die Historie vor Juli 2026 bleibt erhalten.
- `Dr. Martin (RAD)` und `Hr. El Houba (RAD)` stehen in der RD-Neurorad-Auswahl zur Verfügung.
- `Fr. Thaler (RAD)` bleibt in der RD-Neurorad-Auswahl nur bis einschließlich März 2026 verfügbar.
- Die RD-Neurorad-Zeile ist vom normalen Mitarbeitenden- und Auto-Planungsmodell getrennt.
- Ein `D`-Dienst erzeugt bzw. erzwingt logisch einen Folgetag mit `F`, soweit der Folgetag in vorhandenen Daten reparierbar ist.

---

## Technische Grundarchitektur

RadPlan ist eine statische Webanwendung mit ES-Modulen.

### Frontend

- HTML: `index.html`
- JavaScript: native ES Modules unter `js/`
- CSS: modulare Stylesheets unter `css/`
- Externe Libraries:
  - Chart.js für Diagramme,
  - GSAP für Animationen,
  - Google Fonts für IBM Plex Sans und IBM Plex Mono.

### Backend-/Sync-Schicht

- Cloudflare-Pages-kompatible Function: `functions/api.js`
- KV-Binding: `RADPLAN_KV`
- Persistierter KV-Key: `RADPLAN_DATA`
- HTTP-Methoden:
  - `GET` liefert den aktuellen Datenstand,
  - `POST` schreibt einen neuen Stand,
  - `OPTIONS` bedient CORS Preflight.

### Zustandsprinzip

Die Anwendung hat einen zentralen Datencontainer `DATA`. UI-Zustand, Planungsmodus, Planentwürfe, Sync-Status und responsive Flags liegen in `state.js`. Mutationen erfolgen überwiegend über `model.js`, während `render.js` und `app.js` Oberfläche und Interaktion orchestrieren.

---

## Datei- und Modulstruktur

### Root-Dateien

| Datei | Aufgabe |
|---|---|
| `index.html` | DOM-Grundgerüst, Header, Modals, Hauptcontainer, externe Scripts und Styles. |
| `manifest.json` | PWA-Metadaten, Name, Theme-Farbe, Icons, Standalone-Anzeige. |
| `README.md` | Diese vollständige Anwendungsbeschreibung. |
| `radplan_2026-04-10.json` | Beispiel-/Datenexport mit historisierten Monatsdaten. |
| `Algorithmusregeln.txt` | Fachliche Algorithmusregeln in Textform. |
| `Algorithmus-Kriterien.txt` | Kriterien und Zielvorstellungen für den Algorithmus. |
| `algorithm_rules.md` | Markdown-Beschreibung wichtiger Algorithmusregeln. |
| `Algorithmusregeln_original.txt` | Ursprüngliche Regelnotizen. |

### JavaScript

| Modul | Aufgabe |
|---|---|
| `js/constants.js` | Statische Konfiguration, Codes, Metadaten, Feiertage, Datumsfunktionen, Personal-Lifecycle. |
| `js/state.js` | Globaler Zustand, localStorage, Server-Sync, Planmode-Flags, Setter. |
| `js/model.js` | Datenzugriff, Mutationen, Monatsdaten, Statistiken, Plan-Sessions. |
| `js/render.js` | DOM-Rendering für Grid, Mobile View, Dashboards, Profile, Modals. |
| `js/app.js` | Event-Orchestrierung, Editorlogik, Planung, Import/Export, Tastatursteuerung. |
| `js/autoplan.js` | Auto-Planungsalgorithmus, Scoring, Regeln, Optimierung, Ergebnisqualität. |
| `js/neuralgraph.js` | Visuelle Auto-Planungsdarstellung mit 3D-Matrix und Mini-Map. |
| `js/contextmenu.js` | Custom-Kontextmenü für Mitarbeitendenzeilen. |
| `js/yearplan.js` | Jahresplaner, Fairnessdiagramm, Projektion, Jahresnavigation. |

### CSS

| Datei | Aufgabe |
|---|---|
| `css/core.css` | Reset, Design Tokens, Grundfarben, Typografie, Basislayout, Body-Hintergrund. |
| `css/layout.css` | Header, Planleiste, Grid-Aufbau, Tabellenlayout, responsive Hauptstruktur. |
| `css/components.css` | Buttons, Badges, Toasts, Inputs, Editor-Chips, wiederverwendbare Komponenten. |
| `css/modals.css` | Modal-Layout, Overlays, Profile, Auto-Plan-Dialoge, Sheets. |
| `css/views.css` | Spezifische Ansichten wie Mitarbeitendenbereich, Abteilung, Jahresplan. |
| `css/contextmenu.css` | Rechtsklick-Menü, Menüanimationen, Kontextaktionen. |
| `css/mobile-optimization.css` | Zusätzliche mobile Optimierungen. |
| `css/core_backup.css` | Backup/Referenz einer früheren Core-CSS-Version. |

### Assets und Functions

| Datei | Aufgabe |
|---|---|
| `img/icon.svg` | App-Icon und PWA-Icon. |
| `img/icon_animated.svg` | Animiertes Header-/Brand-Icon. |
| `functions/api.js` | Serverlose KV-API für Lesen, Schreiben und Konflikte. |

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

Der Dienst ist getrennt vom Arbeitsplatzstatus. Eine Zelle kann also z. B. Arbeitsplatz `CT` und zusätzlich `D` enthalten.

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

Ostern wird algorithmisch über `easterDate(year)` berechnet. Buß- und Bettag wird ausgehend vom 23. November bzw. dem Mittwoch vor dem ersten Adventszeitraum bestimmt. Ein Cache (`HOLIDAY_CACHE`) verhindert wiederholte Neuberechnung.

---

## Hauptoberfläche

### Header

Der Header enthält:

- Brand-Bereich mit animiertem RadPlan-Icon,
- Monatsnavigation mit vorherigem/nächstem Monat,
- klickbares Monatslabel mit Flyout,
- Heute-Button,
- Planungsmodus-Button,
- Mitarbeitendenbereich,
- Jahresplan,
- Export,
- Import,
- Server-Sync.

Der Header ist als Arbeitsleiste gestaltet, nicht als rein dekorativer Bereich. Alle zentralen Aktionen sind von dort erreichbar.

### Zeitraumsteuerung

Das Period-Flyout erlaubt:

- Monat per Select,
- Jahr per Zahleneingabe,
- Jahr schrittweise hoch/runter,
- Monat vor/zurück,
- Sprung auf Heute,
- Anwenden des gewählten Zeitraums.

Die Kontextzeile beschreibt, ob die Anwendung im Planungsmodus ist und welcher Zeitraum aktiv bzw. ausgewählt ist.

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

### Zellen

Eine Zelle kann enthalten:

- Arbeitsplatzcode,
- Statuscode,
- Mehrfacharbeitsplatz wie `MR/CT`,
- Dienstbadge `D`,
- Dienstbadge `HG`,
- Kommentarindikator,
- Farbfläche passend zum Code,
- besondere Hover-/Focus-Zustände.

### Interaktionen

- Klick auf Zelle öffnet Editor.
- Strg-Klick kann mehrere Tage eines Mitarbeitenden sammeln.
- Drag-Selection erlaubt schnelles Markieren mehrerer Zellen.
- Pfeiltasten bewegen den Fokus im Grid.
- Tastenkürzel im Grid erlauben schnelle Direktbearbeitung.
- Kontextmenüs auf Mitarbeitendennamen bieten Profil- und Verwaltungsaktionen.

### Fuß-/Zusatzinformationen

Je nach View werden zusammenfassende Kennzahlen gerendert, z. B. Dienstabdeckung, Tageslasten oder Hinweise. Das Grid ist damit nicht nur Eingabemaske, sondern Kontrollinstrument.

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

## Editor und Zellbearbeitung

Der Editor ist das zentrale Werkzeug für manuelle Planung.

### Öffnung

Der Editor öffnet sich aus:

- normalem Grid-Klick,
- Multi-Edit-Auswahl,
- mobiler Tageskarte,
- RD-Neurorad-Zelle.

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
- `baseline`,
- `history`,
- `historyIdx`.

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

Der Solver soll Bereitschaftsdienste und Hintergrunddienste möglichst fair, regelkonform und nachvollziehbar verteilen.

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

### Dienstfähigkeit

Nicht jede Person ist gleich dienstfähig. Der Algorithmus berücksichtigt u. a.:

- Facharztstatus,
- Dienstbefreiungen,
- Abwesenheiten,
- vorhandene Dienste,
- Wochenend-/Feiertagsstruktur,
- Wünsche,
- harte domänenspezifische Regeln.

### Ergebnis

Das Ergebnis enthält:

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
- Mammographie-Konflikt bei spezifischen Kombinationen.

#### Weiche Regeln

Beispiele:

- faire Verteilung,
- Zielwerte,
- Wunsch-Erfüllung,
- Wochenendverteilung,
- Reduktion ungünstiger Muster,
- Minimierung von Gaps,
- Verringerung von Spread und Penalties.

### Ergebnisbericht

Der Bericht erklärt, wie der Plan zustande kam:

- Phasen,
- Warnungen,
- Regeltelemetrie,
- Qualitätsmetriken,
- Mitarbeiterübersicht,
- Tagesübersicht,
- offene Probleme.

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
- Die komplexe Solverlogik wirkt nicht wie eine Black Box.

### Initialenlogik

Namen werden zu kompakten Kürzeln verdichtet. Dabei werden Titel und Namensbestandteile berücksichtigt, damit auch Namen mit Präfixen lesbar bleiben.

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

### Import

Import akzeptiert JSON-Dateien und überschreibt nach Prüfung den lokalen Datenbestand. Der Import ist über Button und Drag&Drop-UI erreichbar.

### Datenintegrität nach Import

Nach dem Laden werden Monatsdaten normalisiert und Lifecycle-Regeln angewendet. Dadurch können ältere oder externe Datenstände sicherer verarbeitet werden.

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

### Konflikte

Wenn der Client mit einer veralteten `lastModified` schreibt, antwortet der Server mit `409 Conflict` und liefert den neuesten Stand. Die Anwendung reagiert mit Konflikt-Events und lädt bei Bedarf neu.

### Force Sync

Der Force-Sync-Button verwirft lokale Daten und lädt den Serverstand neu. Er ist optisch warnend gestaltet, weil er bewusst destruktiv sein kann.

### Heartbeat

Im Hintergrund kann regelmäßig geprüft werden, ob serverseitig ein neuerer Datenstand existiert.

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

## UI-, UX- und Design-Philosophie

### Grundhaltung

RadPlan ist bewusst kein nüchternes Tabellenformular. Die Oberfläche soll klinische Komplexität reduzieren und gleichzeitig Vertrauen in die Daten geben.

### Visuelle Sprache

- dunkler, ruhiger Hintergrund,
- Glassmorphism-Flächen,
- klare Kontraste,
- farbcodierte medizinische Planungscodes,
- Monospace-Zahlen und Codes für exakte Lesbarkeit,
- weiche Übergänge,
- deutliche Aktionsbuttons,
- modulare Karten und Panels.

### Warum diese UI für diesen Zweck passt

Dienstplanung erfordert viele schnelle Mikroentscheidungen. Die UI unterstützt das durch:

- sofort erkennbare Farben,
- kurze Codes,
- Hover- und Focus-Zustände,
- Tastaturbedienung,
- planbare Modals,
- getrennte Live-/Entwurfszustände,
- starke Warnfarben bei Sync oder Planmodus,
- Diagramme für Fairness statt bloßer Zahlenkolonnen.

### Mikrointeraktionen

- Buttons haben aktive Zustände.
- Modals erscheinen animiert.
- Toasts bestätigen Aktionen.
- Grid-Hover hebt Zeilen und Zellen hervor.
- Kontextmenüs erscheinen an der richtigen Bildschirmposition.
- Planungsmodus ist visuell eindeutig.
- Auto-Planung bekommt eine bewusst immersive Visualisierung.

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
- Der Planungsmodus nimmt Angst vor Experimenten.
- Jahresanalysen verhindern schleichende Ungerechtigkeit.
- Auto-Planung bleibt über Berichte und Visualisierung nachvollziehbar.
- Mobile Nutzer bekommen kein geschrumpftes Desktop-Grid, sondern eine andere Bedienform.
- Import/Export schützt vor Datenverlust.
- Server-Konflikte werden nicht still überschrieben.

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
- Tooltips liefern Zusatzinformationen.
- Mobile Touch-Ziele sind größer und klarer getrennt.

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
- Konflikte.

### UI-Schutz

- Planmodus warnt vor ungespeicherten Änderungen.
- Force-Sync ist farblich rot hervorgehoben.
- Konflikte triggern Events.
- Import muss als JSON gelesen werden.
- RD-Neurorad wird nicht versehentlich vom Auto-Solver überschrieben.

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

---

## Weiterentwicklung

RadPlan ist modular genug, um fachliche Weiterentwicklungen gezielt einzubauen.

Mögliche Erweiterungen:

- UI für Personal-Lifecycle-Regeln statt nur Code-Konfiguration,
- detaillierter Audit-Log für Änderungen,
- Benutzerrollen und Authentifizierung,
- differenzierte Rechte für Import, Force-Sync und Planübernahme,
- zusätzliche Diensttypen,
- Export als PDF oder CSV,
- serverseitige Historisierung alter Datenstände,
- visuelle Konfliktauflösung bei paralleler Bearbeitung,
- mehr Barrierefreiheitsprüfungen,
- automatisierte Browser-/E2E-Tests,
- bessere Offline-Queue bei Serverausfall,
- administrative Oberfläche für Stammdaten.

---

## Kurzfazit

RadPlan ist eine domänenspezifische Dienstplananwendung, die weit über ein einfaches Tabellen-Frontend hinausgeht. Sie kombiniert operative Tagesplanung, Personalverwaltung, Jahresfairness, Auto-Scheduling, RD-Neurorad-Sonderlogik, lokale und serverseitige Persistenz, mobile Bedienbarkeit und eine stark durchdachte UI. Die Anwendung ist so aufgebaut, dass sie sowohl schnelle tägliche Einträge als auch strategische Planungsentscheidungen unterstützt.
