# RadPlan

RadPlan ist eine vollständig clientseitige Progressive-Web-App zur Monats- und Dienstplanung für eine radiologische Klinik. Die Anwendung läuft ohne Backend, speichert alle Daten lokal im Browser und kombiniert drei Ebenen in einer einzigen Oberfläche:

1. **operativen Monatsplan** für Arbeitsplätze, Statuscodes und Dienste,
2. **Planungsmodus** mit separatem Entwurf, Wünschen, Undo/Redo und Auto-Planung,
3. **Auswertungen** für einzelne Mitarbeitende, die Abteilung und die automatische Dienstverteilung.

Diese README ist keine Änderungsnotiz, sondern eine **vollständige Anwendungsbeschreibung entlang des aktuellen Implementierungsstands** in `index.html`, `app.css`, `app.js` und `manifest.json`. Sie beschreibt bewusst auch kleine und unscheinbare Details, weil genau diese Details das Verhalten der Anwendung bestimmen.

---

## Inhaltsverzeichnis

1. [Produktüberblick](#1-produktüberblick)
2. [Architektur und Laufzeitmodell](#2-architektur-und-laufzeitmodell)
3. [Dateistruktur](#3-dateistruktur)
4. [Datenmodell und Persistenz](#4-datenmodell-und-persistenz)
5. [Stammdaten der Anwendung](#5-stammdaten-der-anwendung)
6. [Desktop-Oberfläche](#6-desktop-oberfläche)
7. [Mobile Oberfläche](#7-mobile-oberfläche)
8. [Manuelle Bearbeitung im Zelleditor](#8-manuelle-bearbeitung-im-zelleditor)
9. [Planungsmodus](#9-planungsmodus)
10. [Wünsche im Planungsmodus](#10-wünsche-im-planungsmodus)
11. [Mitarbeiterverwaltung und Profildialog](#11-mitarbeiterverwaltung-und-profildialog)
12. [Abteilungsübersicht](#12-abteilungsübersicht)
13. [Import, Export und Reparaturlogik](#13-import-export-und-reparaturlogik)
14. [Feiertags- und Kalenderlogik](#14-feiertags--und-kalenderlogik)
15. [Auto-Planung: Gesamtpipeline](#15-auto-planung-gesamtpipeline)
16. [Auto-Planung: feste Stammlogik und Ziele](#16-auto-planung-feste-stammlogik-und-ziele)
17. [Auto-Planung: historische Statistik](#17-auto-planung-historische-statistik)
18. [Auto-Planung: harte Regeln für BD](#18-auto-planung-harte-regeln-für-bd)
19. [Auto-Planung: BD-Scoring und Gewichte](#19-auto-planung-bd-scoring-und-gewichte)
20. [Auto-Planung: BD-Optimierung nach Erstvergabe](#20-auto-planung-bd-optimierung-nach-erstvergabe)
21. [Auto-Planung: harte Regeln für HG](#21-auto-planung-harte-regeln-für-hg)
22. [Auto-Planung: HG-Scoring und Gewichte](#22-auto-planung-hg-scoring-und-gewichte)
23. [Auto-Planung: HG-Kopplung](#23-auto-planung-hg-kopplung)
24. [Auto-Planung: HG-Optimierung nach Erstvergabe](#24-auto-planung-hg-optimierung-nach-erstvergabe)
25. [Auto-Planung: Validierung, Warnungen und Berichte](#25-auto-planung-validierung-warnungen-und-berichte)
26. [Regelabweichungen zwischen Textwunsch und Code](#26-regelabweichungen-zwischen-textwunsch-und-code)
27. [PWA-, Design- und Bedienungsdetails](#27-pwa--design--und-bedienungsdetails)
28. [Tastaturkürzel und Interaktionen](#28-tastaturkürzel-und-interaktionen)
29. [Grenzen der aktuellen Implementierung](#29-grenzen-der-aktuellen-implementierung)
30. [Kurzfazit](#30-kurzfazit)

---

## 1. Produktüberblick

RadPlan verwaltet pro Tag und pro Mitarbeitendem zwei unabhängige Informationsebenen:

- **Assignment**: Arbeitsplatz oder Status, z. B. `MR`, `CT`, `U`, `FZA`, `WB`.
- **Duty**: Diensttyp, aktuell `D` für Bereitschaftsdienst und `HG` für Hintergrunddienst.

Ein Tagesfeld kann also gleichzeitig einen Arbeitsplatz und einen Dienst tragen. Genau deshalb ist z. B. `MR + D` oder `F + HG` technisch möglich, solange die jeweilige Logik das zulässt.

Die App richtet sich funktional an einen Monatsplan mit:

- Mitarbeitendenliste pro Monat,
- Tagesraster mit Dienst- und Einsatzcodes,
- Monats- und Jahresauswertungen,
- Wunschsystem für Auto-Planung,
- Auto-Verteilung von `D` und `HG` nach Regeln und Fairnesskriterien,
- mobiler Ansicht für Smartphone-Nutzung,
- PWA-Installation auf dem Homescreen.

Wichtig: Es existiert **kein Serverzustand**. Alles passiert lokal im Browser.

---

## 2. Architektur und Laufzeitmodell

### 2.1 Grundprinzip

Die Anwendung besteht aus einer einzigen HTML-Seite mit statischen Modalstrukturen und einem großen globalen JavaScript-Skript. Es gibt:

- kein Build-System,
- keine npm-Abhängigkeiten,
- keine Module,
- keine API-Aufrufe,
- keine externe Datenbank.

### 2.2 Technische Grundlage

- **HTML** liefert alle festen Oberflächencontainer und Modals.
- **CSS** enthält das komplette visuelle System für Desktop und Mobile.
- **JavaScript** hält den gesamten Zustand, die Persistenz, die Berechnungen und die Renderlogik.
- **localStorage** ist die einzige Persistenzschicht.
- **Manifest + Icons** machen die Seite installierbar als PWA.

### 2.3 Zustandsmodell

Der operative Laufzeitzustand verteilt sich im Wesentlichen auf:

- `DATA`: Hauptdaten aller Monate,
- `state`: aktuell ausgewählter Monat, laufende Editierposition und Editorzustand,
- `planMode`, `planData`, `planBaseline`, `planHistory`, `planHistoryIdx`: Planungsmodus und dessen Undo/Redo-Historie,
- `autoPlanTargets`, `autoPlanResult`, `apViewMode`: Zustand der Auto-Planung.

### 2.4 Mobile Detection

Die App prüft den `navigator.userAgent` gegen `/iPhone|iPad|iPod|Android/i`. Bei Treffer wird `IS_MOBILE = true` gesetzt. Diese eine Konstante beeinflusst anschließend:

- welche Hauptansicht gerendert wird,
- welche Navigation sichtbar ist,
- ob Keyboard-Hinweise im Editor gezeigt werden,
- wie „heutiger Tag“ gescrollt wird,
- welche Bedienelemente im Alltag dominieren.

---

## 3. Dateistruktur

```text
radplan/
├── index.html
├── app.css
├── app.js
├── manifest.json
├── README.md
├── Algorithmusregeln.txt
├── Algorithm_check.md
└── img/
    ├── icon.svg
    └── icon_animated.svg
```

### 3.1 Bedeutung der Hauptdateien

- `index.html`: komplette DOM-Struktur inklusive Header, Tabellen, Mobile-Ansichten und sämtlicher Modals.
- `app.css`: komplettes Designsystem, Tabellenlayout, Modal-Design, Mobile-Komponenten und Auto-Plan-Visualisierung.
- `app.js`: Stammdaten, Persistenz, Rendering, Editor, Import/Export, Profile, Abteilungsübersichten und der gesamte Auto-Planungsalgorithmus.
- `manifest.json`: PWA-Metadaten für Homescreen-Installation.
- `Algorithmusregeln.txt`: textliche Sollregeln.
- `Algorithm_check.md`: bereits vorhandene technische Gegenüberstellung zwischen Regelwunsch und Code.

---

## 4. Datenmodell und Persistenz

### 4.1 Hauptspeicher

Der produktive Datenspeicher liegt unter dem Key:

- `radplan_v3`

Er enthält ein Objekt mit Monatsschlüsseln im Format `YYYY-M`, also mit **nullbasiertem Monat**:

- `2026-0` = Januar 2026
- `2026-2` = März 2026

### 4.2 Struktur eines Monats

```json
{
  "employees": ["Dr. Lurz", "Dr. Becker"],
  "assignments": {
    "Dr. Lurz": {
      "5": { "assignment": "MR", "duty": "D" },
      "6": { "assignment": "F" }
    }
  }
}
```

### 4.3 Bedeutung der Zellobjekte

Ein Zellobjekt kann enthalten:

- `assignment`: Arbeitsplatz- oder Statusstring,
- `duty`: `D` oder `HG`.

`assignment` darf auch mehrere Arbeitsplätze enthalten, getrennt durch `/`, z. B. `MR/CT`.

### 4.4 Planungsentwürfe

Planungsentwürfe werden getrennt gespeichert unter:

- `radplan_v3_plan_YYYY-M`

Dort liegt zusätzlich ein `wishes`-Block:

```json
{
  "employees": ["..."],
  "assignments": { "...": {} },
  "wishes": {
    "Dr. Lurz": {
      "5": "BD_WISH",
      "9": "NO_DUTY"
    }
  }
}
```

Diese Wünsche werden **nicht** in die Hauptdaten übernommen. Sie sind reine Planungssteuerung.

### 4.5 Initialisierung fehlender Monate

`getMonthData(y, m)` erzeugt einen Monatsdatensatz automatisch, wenn er noch nicht existiert. Dabei wird die Mitarbeitendenliste des Vormonats übernommen. Das bedeutet:

- neue Monate starten nicht leer,
- die Mitarbeiterstruktur „vererbt“ sich standardmäßig weiter,
- nur die Belegungen beginnen leer.

### 4.6 Speicherung und Fehlerbehandlung

`loadFromStorage()` und `saveToStorage()` kapseln den Zugriff auf `localStorage`. Beim Laden wird JSON geparst; bei Fehlern wird auf `{}` zurückgefallen. Beim Speichern werden Fehler still geschluckt.

Das ist robust gegen defekte Einträge, aber nicht dialogisch: die App zeigt bei kaputten Hauptdaten keine gesonderte Diagnose an.

---

## 5. Stammdaten der Anwendung

### 5.1 Arbeitsplätze

Aktuell sind acht Arbeitsplatzcodes fest eingebaut:

| Code | Label |
|------|-------|
| `MR` | MRT |
| `CT` | CT |
| `US` | Sonographie |
| `AN` | Angiographie |
| `MA` | Mammographie |
| `KUS` | Kinder-US |
| `W` | Wermsdorf |
| `T` | Teleradiologie |

Jeder Code hat feste UI-Farben (`bg`, `fg`), die in Tabelle, Chips und Auswertungen wiederverwendet werden.

### 5.2 Statuscodes

Die Statusliste ist ebenfalls fest definiert:

| Code | Bedeutung |
|------|-----------|
| `F` | Frei |
| `U` | Urlaub |
| `ZU` | Zusatzurlaub |
| `SU` | Sonderurlaub |
| `FZA` | Freizeitausgleich |
| `K` | Krank |
| `KK` | Kind krank |
| `§15c` | §15c |
| `WB` | Weiterbildung |

### 5.3 Abwesenheits- und Urlaubsmengen

Die App unterscheidet logisch zwei Mengen:

- **ABSENCE_CODES** = `U`, `ZU`, `SU`, `FZA`, `K`, `KK`, `§15c`, `WB`
- **VACATION_CODES** = `U`, `ZU`, `SU`, `§15c`

Diese Unterscheidung ist algorithmisch zentral:

- Für „an diesem Tag darf kein Dienst stattfinden“ gelten alle `ABSENCE_CODES`.
- Für „am Folgetag ist Urlaub“ gelten nur `VACATION_CODES`.

Das heißt: Ein Tag vor `FZA`, `WB`, `K` oder `KK` wird **nicht** automatisch wie „Tag vor Urlaub“ behandelt.

### 5.4 Wunschtypen

Im Planungsmodus gibt es genau drei Wünsche:

| Code | Label | Bedeutung |
|------|-------|-----------|
| `NO_DUTY` | Kein Dienst | harter Ausschluss für BD/HG in den regulären Prüfungen |
| `BD_WISH` | BD Wunsch | Bonus bei BD-Vergabe |
| `HG_WISH` | HG Wunsch | Bonus bei HG-Vergabe |

### 5.5 Mitarbeitenden-Metadaten

Für bekannte Personen existiert ein fest codiertes Metadatenobjekt mit:

- Vollname,
- Positionscode,
- Positionslabel,
- Typ/Fachrichtung,
- Bereich,
- Vertretung.

Positionen unterscheiden u. a.:

- `CA`, `LOA`, `OA`, `OÄ`, `FA`, `FÄ` → gelten als Facharztgruppe,
- `AA`, `AÄ` → gelten als Assistenzarztgruppe.

Diese Einteilung wird später für D/HG-Regeln benutzt.

### 5.6 Dienstbefreiung

Aktuell ist nur eine Person hart vom Algorithmus ausgenommen:

- `Prof. Schäfer`

Diese Person erscheint weiter im Plan, wird aber durch die Auto-Planung weder für `D` noch `HG` eingeplant.

### 5.7 Standard-BD-Ziele

Die Funktion `defaultBDTarget()` setzt folgende Zielwerte:

- `Prof. Schäfer` → `0`
- `Dr. Polednia` → `3`
- `Dr. Becker` → `3`
- `Hr. Sebastian` → `3`
- alle übrigen nicht befreiten Mitarbeitenden → `4`

Diese Zielwerte können im Auto-Plan-Dialog manuell angepasst werden.

---

## 6. Desktop-Oberfläche

### 6.1 Header

Der Header enthält:

- animiertes App-Icon,
- Monatsnavigation mit Vor/Zurück,
- Sprung zum heutigen Monat,
- Abteilungsübersicht,
- Einstieg in den Planungsmodus,
- Mitarbeitendenverwaltung,
- Export,
- Import.

### 6.2 Monatsraster

Die Desktop-Hauptansicht ist eine große Tabelle mit:

- fixer Namensspalte,
- einem Tagesspaltenkopf pro Kalendertag,
- Wochenenden/Feiertagen mit Sonderstyling,
- Freitag-Markierung,
- „Heute“-Markierung,
- Tageszellen pro Mitarbeitendem,
- Fußzeilenstatistik für `MR`, `CT`, `D`, `HG`.

### 6.3 Kopfzeilenlogik

Die Tabellenköpfe zeigen je Tag:

- ISO-Kalenderwoche (`KW`) nur an sinnvollen Übergängen,
- Tagesnummer,
- Wochentagskürzel,
- Feiertagsnamen, falls vorhanden.

### 6.4 Zellanzeige

Eine Zelle kann gleichzeitig zeigen:

- Assignmenttext,
- Duty-Badge (`D`/`HG`),
- Wunschindikator im Planungsmodus.

Spezialfall: Ein automatisch gesetztes `F` auf Wochenende/Feiertag wird visuell gedimmt als `auto-f-rest`.

### 6.5 Monatsstatistikleiste

Die obere Statistikleiste summiert für den aktuellen Monat:

- Anzahl Mitarbeitender,
- alle vorkommenden Arbeitsplatzcodes,
- `D`, `HG`,
- Statuscodes.

Nicht vorkommende Codes werden nicht angezeigt.

### 6.6 Fußzeile

Die Tabellenfußzeile zählt je Tag:

- `MR`
- `CT`
- `D`
- `HG`

Für `D` und `HG` werden Werte > 1 als Warnzustand dargestellt, weil pro Tag eigentlich nur eine Person diesen Dienst tragen soll.

---

## 7. Mobile Oberfläche

Wenn `IS_MOBILE` aktiv ist, rendert die App keine Desktop-Tabelle, sondern eine separate Mobiloberfläche.

### 7.1 Mobile Summary

Oben steht eine kompakte Monatszusammenfassung mit:

- Mitarbeitendenzahl,
- Dienst- und Statuszählungen,
- ausgewählten Arbeitsplatzsummen.

### 7.2 Tageskartenliste

Jeder Kalendertag wird als Karte dargestellt mit:

- Datum,
- Wochentag,
- ggf. KW-Hinweis,
- Feiertagsname,
- aktuellem `D`-Inhaber,
- aktuellem `HG`-Inhaber,
- an diesem Tag vorkommenden Assignment-Codes.

Es werden maximal fünf unterschiedliche Assignment-Chips angezeigt; weitere Codes werden als `+n` zusammengefasst.

### 7.3 Mobile Bottom Navigation

Die mobile Navigation besteht aus:

- `Abteilung`,
- `Planung`,
- `Menü`.

Das Menü öffnet ein Sheet mit Zugriff auf:

- heute,
- Mitarbeitende,
- Export,
- Import.

### 7.4 Mobile Day Sheet

Beim Tippen auf einen Tag öffnet sich ein Sheet mit:

- Datumsüberschrift,
- Dienstbadges für `D` und `HG`,
- Trennung in `Fachärzte` und `Assistenzärzte`,
- allen Mitarbeitenden dieses Tages,
- sichtbaren Assignments,
- Wünschen im Planungsmodus,
- Editierindikator, sofern Bearbeitung erlaubt ist.

---

## 8. Manuelle Bearbeitung im Zelleditor

### 8.1 Öffnen

Der Editor wird geöffnet durch:

- Klick auf eine Desktop-Zelle,
- Tastaturfokus + `Enter`/Leerzeichen,
- Auswahl einer Person im Mobile-Day-Sheet,
- Klick aus dem Profilkalender auf einen Werktag.

### 8.2 Editorinhalt

Der Editor zeigt:

- Mitarbeitendenname,
- Datum inkl. Feiertagsbezeichnung,
- Tagesklassifikation „Wochenende“ oder „Feiertag“,
- Arbeitsplatzchips,
- Statuschips,
- Duty-Chips,
- Wunschchips im Planungsmodus,
- Live-Vorschau,
- Warntext bei speziellen Konstellationen.

### 8.3 Workplace- und Statuslogik

- Mehrere Arbeitsplätze können parallel gewählt werden.
- Ein Status ist exklusiv.
- Sobald ein Status aktiv ist, werden Arbeitsplätze deaktiviert.
- Sobald Arbeitsplätze aktiv sind, werden andere Status-Chips gedimmt.

### 8.4 Duty-Logik im Editor

Für `D` und `HG` gilt pro Tag Exklusivität über alle Mitarbeitenden:

- ist `D` bereits bei jemand anderem vergeben, wird der Chip blockiert,
- ist `HG` bereits bei jemand anderem vergeben, wird der Chip blockiert.

Der Editor erzwingt **keine komplette Regelprüfung** des Auto-Planers. Manuelle Eingaben können also Konstellationen erzeugen, die algorithmisch später als problematisch gelten.

### 8.5 Automatisches `F` nach manuellem `D`

Wird manuell ein `D` gespeichert, setzt `saveEditor()` automatisch am Folgetag `assignment = "F"`, **aber nur wenn dort noch kein Assignment existiert**.

Wichtig:

- vorhandene Assignments werden nicht überschrieben,
- vorhandenes `HG` auf dem Folgetag bleibt erhalten,
- über Monatsgrenzen hinweg wird ebenfalls gearbeitet, solange `getCell()`/`setCell()` Zugriff auf den Folgemonat bekommen.

### 8.6 Löschen

`Clear` entfernt die gesamte Zelle, also Assignment und Duty. Wünsche werden dabei nicht explizit gelöscht; sie sind separat am Entwurf gespeichert.

---

## 9. Planungsmodus

### 9.1 Zweck

Der Planungsmodus ist ein isolierter Bearbeitungsraum für den aktuell gewählten Monat. Änderungen landen zunächst **nicht** im Hauptplan.

### 9.2 Start

Beim Eintritt in den Planungsmodus passiert Folgendes:

- der aktuelle Monatsplan wird tief kopiert,
- `wishes` wird leer initialisiert,
- ein Baseline-Snapshot wird gespeichert,
- die Undo-Historie startet mit dem ersten Zustand,
- die UI zeigt die Planungsleiste an.

### 9.3 Planungsleiste

Die Planungsleiste bietet:

- `Rückgängig`,
- `Vorwärts`,
- `Auto-Plan`,
- `Abbrechen` (Reset auf Baseline),
- `Speichern` (Entwurf speichern),
- `Schließen` (Entwurf verlassen),
- `Übernehmen` (Entwurf in Hauptplan schreiben).

### 9.4 Undo/Redo

Die Historie speichert nur `assignments`, nicht den gesamten `planData`-Block. Wünsche werden also **nicht** mit Undo/Redo historisiert.

### 9.5 Speichern des Entwurfs

`savePlanDraft()` legt den aktuellen Entwurf in `localStorage` ab. Dabei wird die Baseline auf den aktuellen Stand gesetzt.

### 9.6 Übernehmen in den Hauptplan

`applyPlanToMain()` kopiert ausschließlich `assignments` aus dem Entwurf in `DATA`. Wünsche werden verworfen.

### 9.7 Abbrechen vs. Schließen

- **Abbrechen** setzt den Planungsentwurf auf die letzte Baseline zurück.
- **Schließen** verlässt den Modus; bei ungespeicherten Änderungen erscheint eine Bestätigungsfrage.

---

## 10. Wünsche im Planungsmodus

### 10.1 Speicherort

Wünsche existieren nur in `planData.wishes`.

### 10.2 Arten und Wirkung

- `NO_DUTY` sperrt regulär sowohl BD als auch HG.
- `BD_WISH` gibt bei BD-Vergabe `+220` Punkte.
- `HG_WISH` gibt bei HG-Vergabe `+220` Punkte.

### 10.3 Anzeige

Wünsche werden dargestellt:

- in Desktop-Zellen als kleines Wunschsymbol,
- im Editor als Wunschchips,
- in der mobilen Tagesansicht als Wunsch-Tag.

### 10.4 Wichtige Einschränkung

Die regulären Prüfpfade respektieren `NO_DUTY`, die HG-Kopplungsfunktion prüft es aber nur in `assignBundledHG()`. Dadurch ist die frühere Inkonsistenz aus älteren Dokumentationsständen im aktuellen Code **behoben**; gekoppelte HG werden ebenfalls nicht auf `NO_DUTY` gesetzt.

---

## 11. Mitarbeiterverwaltung und Profildialog

### 11.1 Mitarbeitendenverwaltung

Der Mitarbeitendendialog erlaubt:

- neue Namen für den aktuellen Monat hinzuzufügen,
- vorhandene Namen zu entfernen.

Die Änderung gilt direkt für den Monat und wird im Hauptspeicher gespeichert.

### 11.2 Profildialog

Ein Klick auf den Namen öffnet einen Profildialog mit:

- Avatar aus Initialen,
- Positionsbadge,
- Bereich und Vertretung,
- KPI-Karten,
- Monatsverteilung der Arbeitsplätze,
- Statusverteilung,
- Diensttage (`D`, `HG`),
- Monatskalender,
- Jahresübersicht.

### 11.3 KPI-Logik

Es werden u. a. berechnet:

- Werktage,
- belegte Werktage,
- nicht geplante Werktage,
- Anzahl `D`,
- Anzahl `HG`,
- Urlaub,
- Krankheit,
- `FZA`,
- `F`.

### 11.4 Jahresübersicht

Die Jahresübersicht aggregiert pro Monat:

- AP-Tage,
- Urlaub,
- Krankheit,
- `FZA`,
- `WB`,
- `D`,
- `HG`.

Nur Monate mit vorhandenen Daten werden als echte Datenmonate gewertet.

---

## 12. Abteilungsübersicht

Die Abteilungsübersicht besitzt zwei Tabs.

### 12.1 Monatstab

Für den aktuellen Monat werden gezeigt:

- Zahl der Werktage,
- Zahl der Mitarbeitenden,
- prozentuale Werktagsabdeckung von `MR`, `CT`, `D`, `HG`,
- tabellarische Mitarbeitendenübersicht mit AP-Tagen, MR, CT, Urlaub, Krank, FZA, D, HG, Frei, Offen.

„Offen“ bedeutet: Werktage ohne Assignment und ohne Duty.

### 12.2 Jahrestab

Die Jahresübersicht zeigt pro Mitarbeitendem:

- AP-Tage,
- Urlaub,
- Krankheit,
- FZA,
- WB,
- D,
- HG,
- Abdeckungsquote.

Zusätzlich gibt es eine Teamzusammenfassung über alle im Jahr vorkommenden Mitarbeitenden.

---

## 13. Import, Export und Reparaturlogik

### 13.1 Export

Der Export erzeugt eine JSON-Datei mit:

```json
{
  "main": { ... },
  "plans": { ... }
}
```

Die Datei wird auf den aktuellen Tag datiert (`radplan_YYYY-MM-DD.json`).

### 13.2 Import

Der Import akzeptiert:

- komplette Exportstruktur mit `main` und optional `plans`,
- oder direkt ein Hauptdatenobjekt.

### 13.3 Merge-Verhalten

Importierte Hauptdaten werden per `Object.assign(DATA, parsed.main)` bzw. `Object.assign(DATA, parsed)` eingemischt. Bestehende Monatsobjekte werden dabei auf Objektebene ersetzt, nicht tief zusammengeführt.

### 13.4 Drag & Drop

Der Importdialog unterstützt:

- manuelle JSON-Eingabe,
- Dateiauswahl,
- Drag & Drop.

Erlaubt sind nur `.json`-Dateien bzw. `application/json`.

### 13.5 Reparatur fehlender `F`-Tage

Nach Import und auch beim normalen Datenbestand kann `ensurePostBDFreiDays()` fehlende Ruhetage nach vorhandenen `D` nachtragen.

Eigenschaften dieser Reparatur:

- sie läuft über alle gespeicherten Monate,
- sie ergänzt `F` nur, wenn am Folgetag noch **kein Assignment** existiert,
- sie schreibt bei vorhandenem Folgemonat auch monatsübergreifend,
- sie speichert nur dann, wenn wirklich Reparaturen passiert sind.

---

## 14. Feiertags- und Kalenderlogik

### 14.1 Kalendergrundlagen

Hilfsfunktionen der App:

- `daysInMonth()`
- `weekday()`
- `isWeekend()`
- `isFriday()`
- `isoWeekNumber()`
- `nextCalendarDay()`
- `prevCalendarDay()`

### 14.2 Feiertage Sachsen

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
- 1. Weihnachtstag,
- 2. Weihnachtstag.

### 14.3 Oster- und Pfingstbezug

Für Auto-Planung wird zusätzlich eine Blocklogik verwendet:

- **Ostern** = Karfreitag, Ostersonntag, Ostermontag
- **Pfingsten** = Pfingstsonntag, Pfingstmontag

Wer im einen Feiertagsblock arbeitet, wird im anderen Block ausgeschlossen.

### 14.4 Wochenendäquivalente

Wochenendbelastung wird nicht pro Tag gezählt, sondern pro ISO-KW über Freitag/Samstag/Sonntag aggregiert:

- mindestens ein `D` im Wochenende → `1.0`
- kein `D`, aber mindestens ein `HG` → `0.5`

Diese Logik gilt:

- historisch,
- im aktuellen Monat,
- in BD/HG-Scoring,
- in den Abschlusswarnungen.

Das Ziel ist aktuell:

- `TARGET_WEEKEND_DUTY = 1`

Der strenge Grenzwert vor Relaxation ist:

- `RELAXED_WEEKEND_DUTY_LIMIT = 1.5`

---

## 15. Auto-Planung: Gesamtpipeline

Die Auto-Planung läuft nur im Planungsmodus.

### 15.1 Ablauf in groben Phasen

1. Historische Daten laden.
2. Bestehende Dienste und feste Diensttage erkennen.
3. Fehlende automatische `F` nach bereits vorhandenen `D` ergänzen.
4. Fehlende `D`-Tage bestimmen.
5. `D` zuerst für Wochenenden/Freitage/Feiertage vergeben.
6. Danach `D` für übrige Werktage vergeben.
7. Anschließend iterative BD-Optimierung.
8. HG-Kopplungen setzen.
9. Verbleibende `HG` vergeben.
10. Iterative HG-Optimierung.
11. Validierung auf Doppel-`D`.
12. Zusammenfassung, Warnungen und Bericht erzeugen.

### 15.2 Fixe Dienste

Bereits gesetzte `D` oder `HG` im Entwurf werden als **fixedDutyKeys** fest markiert. Diese dürfen in den Optimierungsphasen nicht verschoben werden.

---

## 16. Auto-Planung: feste Stammlogik und Ziele

### 16.1 Dienstpflichtige Gruppen

- `dutyEmps` = alle Mitarbeitenden außer dienstbefreiten Personen
- `hgFAs` = alle dienstpflichtigen Fachärzte

Damit gilt:

- `D` kann grundsätzlich an dienstpflichtige AA und FA gehen,
- `HG` kann grundsätzlich nur an dienstpflichtige FA gehen.

### 16.2 Zielmatrix für BD

Die verwendeten Ziele stammen aus:

- benutzerdefiniertem Ziel im Dialog, falls gesetzt,
- sonst `defaultBDTarget()`.

### 16.3 Bereits vorhandene `F`

Vor jeder neuen Vergabe ergänzt der Algorithmus fehlende `F` hinter bereits vorhandenen `D` **innerhalb des aktuellen Monats**. Diese automatisch erzeugten Ruhetage werden in `autoRestDays` verfolgt, damit sie bei späteren Optimierungen notfalls wieder entfernt werden können.

---

## 17. Auto-Planung: historische Statistik

`collectHistoricalDutyStats(upToYear, upToMonth)` betrachtet nur Monate **vor** dem aktuellen Monat. Zukunftsmonate gehen nicht ein.

Pro Mitarbeitendem werden gesammelt:

- `bd`
- `hg`
- `weDuty`
- `holDuty`
- `thuBd`
- `hgForAA`
- `hgForFA`
- `satBd`

### 17.1 Zweck der historischen Werte

Diese Statistik beeinflusst aktuell vor allem:

- Anzeige im Ziel-Dialog,
- Feiertagsausgleich bei BD,
- Berichts- und Transparenzaspekte.

Wichtig: Historische BD/HG-Zahlen wirken **weniger breit** in die Punktelogik hinein, als man aus einer sehr allgemeinen Regelbeschreibung vielleicht erwarten würde.

---

## 18. Auto-Planung: harte Regeln für BD

`canDoBD(emp, d, relaxed = false, assignments = result, options = {})` entscheidet, ob ein Mitarbeitender an Tag `d` überhaupt in Frage kommt.

### 18.1 Immer harte Sperren

Ein BD ist ausgeschlossen, wenn mindestens eine der folgenden Bedingungen zutrifft:

1. Person ist dienstbefreit.
2. BD-Ziel ist `0`.
3. Person ist am Tag abwesend (`ABSENCE_CODES`).
4. In der Zelle existiert bereits ein Duty, außer derselbe BD wird explizit ignoriert.
5. Wunsch `NO_DUTY` liegt vor.
6. Samstag und Person ist **kein Facharzt**.
7. `Dr. Polednia` an Sonntag, Dienstag oder Donnerstag.
8. `beckerMartinConflict()` greift.
9. Am selben Tag steht bereits `assignment = "F"`.
10. Der nächste Kalendertag ist Urlaub im Sinne von `VACATION_CODES`.
11. Am Vortag existiert bereits `D`.
12. Am Folgetag existiert bereits `D`.
13. Am Vortag existiert `HG`, außer dieser Vortag ist Freitag.
14. Oster-/Pfingstblock-Konflikt greift.

### 18.2 Strenge Regeln nur im normalen Modus

Nur solange `relaxed = false` gilt zusätzlich:

15. aktuelles BD-Soll bereits erreicht oder überschritten,
16. projizierte Wochenendbelastung würde `> 1.5` werden,
17. `Dr. Becker` am Samstag,
18. minimaler Abstand zum nächsten anderen `D` wäre `< 3` Tage.

Damit ist klar: Diese vier Regeln können im Relaxed-Modus fallen.

---

## 19. Auto-Planung: BD-Scoring und Gewichte

Wenn `canDoBD()` positiv ist, bewertet `scoreBDCandidate()` die Kandidaten.

### 19.1 Startwert

Jeder Kandidat beginnt mit:

- `score = 100`

### 19.2 Zielerfüllung

- wenn `currentBD[emp] >= bdTarget[emp]`:
  - Strafe `-5000 * (currentBD - target + 1)`
- sonst:
  - Bonus `+(target - currentBD) * 80`

Das ist die dominante Steuerung der Sollverteilung.

### 19.3 Wunschbonus

- `BD_WISH` → `+220`

### 19.4 Donnerstag vor Urlaub

Wenn der Tag ein Donnerstag ist und in der **nächsten ISO-Woche** Urlaub gefunden wird:

- Bonus `+150`

Wichtig: Geprüft wird nicht „unmittelbar der nächste Tag“, sondern „Folgewoche hat Urlaub“.

### 19.5 Wochenendlogik

Für Freitag/Samstag/Sonntag:

- Strafe `-abs(projectedWe - 1) * 220`
- zusätzliche Strafe bei Überschreitung von `1.5`:
  - `-(projectedWe - 1.5) * 500`
- falls bereits das Vorwochenende belastet war:
  - `-40`

### 19.6 Samstagsausgleich für Fachärzte

Wenn der Tag Samstag und die Person Facharzt ist:

- `projectedSat = currentSatBD + 1`
- `avgProjectedSat = (Summe aller aktuellen Sat-BD der HG-FA + 1) / Anzahl hgFAs`
- Strafe `-abs(projectedSat - avgProjectedSat) * 700`

Das ist eine der schärfsten Fairnessgewichtungen im BD-Scoring.

### 19.7 Sonderfall Dr. Becker am Samstag

Wenn Relaxed-Modus aktiv ist und `Dr. Becker` dennoch am Samstag vergeben wird:

- zusätzliche Strafe `-2000`
- im Bericht Tag „Notlösung“
- zusätzlich wird am darauffolgenden Montag `FZA` gesetzt, falls dort noch kein Assignment existiert

### 19.8 D-Abstand

Wenn der minimale Abstand zu einem anderen `D` unter 4 Tagen liegt:

- Strafe `-(4 - minDistD) * 120`

### 19.9 D-F-D-F-Muster

Wenn `wouldCreateDFDF()` anschlägt:

- Strafe `-260`

Die Regel ist also **kein Hard-Constraint**, sondern Soft-Penalty.

### 19.10 Feiertagsausgleich

An Feiertagen gilt zusätzlich:

- `holAvg = Durchschnitt historischer Feiertagsdienste aller dutyEmps`
- Bonus/Malus `+(holAvg - hist[emp].holDuty) * 6`

### 19.11 Tiebreaker

Ein kleiner deterministischer Jitter wird addiert:

- `((emp.charCodeAt(0) * 31 + d * 7) % 10) * 0.1`

Der Zweck ist nur stabile Reihenfolge bei Gleichstand.

### 19.12 Vergabereihenfolge

Die noch offenen BD-Tage werden sortiert in:

1. Freitag/Samstag/Sonntag/Feiertag,
2. danach übrige Tage.

Die restriktivsten Tage werden also zuerst vergeben.

---

## 20. Auto-Planung: BD-Optimierung nach Erstvergabe

Nach der ersten BD-Verteilung startet eine iterative Optimierung.

### 20.1 BD-Objektivfunktion

`computeBDObjective()` summiert u. a.:

- `+20000` pro unbesetztem BD-Tag,
- Zielabweichungen:
  - Überziel: `diff² * 2600`
  - Unterziel: `diff² * 1200`
- Wochenendabweichung: `weDiff² * 480`
- Überschreitung von `1.5` WE-Äquivalenten: `+(weProjected - 1.5) * 12000`
- Samstag-Fairness bei Fachärzten: `(currentSatBD - satAvg)² * 850`
- aufeinanderfolgende `D`: `+40000`
- Abstand `< 3`: `+(3 - minDistD) * 6000`
- Abstand `< 5`: `+(5 - minDistD) * 350`
- D-F-D-F-Muster: `+380`
- `Dr. Becker` Samstag: `+30000`

### 20.2 Durchläufe

- maximal 12 Pässe,
- nur nicht-fixierte BD-Tage dürfen verändert werden,
- pro Tag wird geprüft, ob ein anderer Kandidat die Zielfunktion verbessert,
- Verbesserung wird akzeptiert, wenn `newFairness + 0.01 < bestFairness`.

### 20.3 Ergebnis

Wenn ein Wechsel übernommen wird:

- Reporteintrag wird angepasst,
- Tag `Optimiert` wird ergänzt,
- Logeintrag `🔀` wird geschrieben.

---

## 21. Auto-Planung: harte Regeln für HG

`canDoHG(emp, d, relaxed = false, assignments = result, options = {})` steuert die HG-Zulässigkeit.

### 21.1 Immer harte Sperren

HG ist ausgeschlossen, wenn:

1. Person dienstbefreit ist.
2. Person kein Facharzt ist.
3. Person am Tag abwesend ist (`ABSENCE_CODES`).
4. Die Zelle bereits einen Duty trägt, außer derselbe HG wird ignoriert.
5. Wunsch `NO_DUTY` gesetzt ist.
6. `assignment = "F"` am selben Tag gesetzt ist und der Tag **kein Samstag/Sonntag** ist.
7. Am nächsten Tag ein eigener `D` liegt und der aktuelle Tag **nicht Freitag** ist.
8. Oster-/Pfingstblock-Konflikt besteht.

### 21.2 Strenge Regeln nur im normalen Modus

Zusätzlich nur bei `relaxed = false`:

9. `Dr. Polednia` an Sonntag, Dienstag oder Donnerstag **wenn am selben Tag ein AA den D trägt**.
10. projizierte Wochenendbelastung würde `> 1.5`.

Wichtig: Es gibt für HG **keine harte Mindestabstandsregel** mehr im normalen Prüfschritt. Die Nähe wird nur noch weich bewertet.

---

## 22. Auto-Planung: HG-Scoring und Gewichte

### 22.1 Startwert

- `score = 100`

### 22.2 Monatsausgleich HG gesamt

- `projectedHG = currentHG + 1`
- `avgProjectedHG = (Summe aktueller HG aller hgFAs + 1) / Anzahl hgFAs`
- Strafe `-abs(projectedHG - avgProjectedHG) * 240`

### 22.3 Wunschbonus

- `HG_WISH` → `+220`

### 22.4 Vor Urlaub

Wenn der nächste Tag Urlaub ist:

- Strafe `-20`

Das ist bewusst nur ein kleiner Malus, kein Ausschluss.

### 22.5 Wochenendlogik

Für Samstag oder Sonntag:

- Strafe `-abs(projectedWe - 1) * 150`
- zusätzliche Strafe bei Überschreitung `1.5`:
  - `-(projectedWe - 1.5) * 360`
- Vorwochenende bereits belastet:
  - `-25`

### 22.6 Direkt aufeinanderfolgende HG

Wenn `hasAdjacentHG()` wahr ist:

- Strafe `-220`

Auch das ist ein Soft-Kriterium, kein harter Ausschluss im normalen HG-Pfad.

### 22.7 Tiebreaker

- `((emp.charCodeAt(1 % emp.length) * 17 + d * 13) % 10) * 0.1`

---

## 23. Auto-Planung: HG-Kopplung

Vor der regulären HG-Verteilung versucht der Algorithmus bewusst, bestimmte Dienste zu koppeln.

### 23.1 Regel A: Freitag-AA → Samstag-FA

Wenn am Freitag ein **AA** `D` hat und am Samstag ein **FA** `D` hat, wird der Freitag-`HG` bevorzugt an den Samstags-FA gekoppelt.

Berichtstext:

- „Freitags-HG gekoppelt an eigenen Samstags-BD (da Freitag AA im Dienst).“

### 23.2 Regel B: Samstag-FA → Sonntag-HG

Wenn am Samstag ein **FA** `D` hat und am Sonntag jemand anders `D` hat, wird der Sonntag-`HG` an den Samstags-FA gekoppelt.

Berichtstext:

- „Sonntags-HG gekoppelt an eigenen Samstags-BD.“

### 23.3 Regel C: AA vor Feiertag → Feiertags-FA

Wenn ein Nicht-Feiertag direkt vor einem Feiertag liegt, dort ein **AA** `D` hat und am Feiertag ein **FA** `D` hat, wird der `HG` des Vortags an diesen Feiertags-FA gekoppelt.

Berichtstext:

- „HG vor Feiertag gekoppelt an eigenen Feiertags-BD (da AA im Dienst).“

### 23.4 Zusätzliche Schutzprüfungen in `assignBundledHG()`

Eine Kopplung findet **nicht** statt, wenn:

- Person kein FA ist,
- Person dienstbefreit ist,
- `NO_DUTY` gesetzt ist,
- Abwesenheit vorliegt,
- Zelle schon einen Duty hat,
- Feiertagsblockkonflikt besteht,
- `F` auf Werktag steht,
- der Tag schon einen HG hat,
- am nächsten Tag eigener `D` liegt und heute nicht Freitag ist,
- direkt benachbarter HG existiert.

Damit ist die Kopplung nicht blind, sondern ein regelgebundener Vorzugspfad.

---

## 24. Auto-Planung: HG-Optimierung nach Erstvergabe

Nach HG-Erstvergabe berechnet `computeHGObjective()` eine Zielfunktion.

### 24.1 HG-Objektivfunktion

Sie enthält u. a.:

- `+15000` pro unbesetztem HG-Tag,
- `avgHG = Durchschnitt aktueller HG aller hgFAs`,
- `avgBDforFAs = Durchschnitt aktueller BD aller hgFAs`,
- `avgHGForAA`, `avgHGForFA` als getrennte Mittelwerte.

Für jeden FA gilt dann:

- `idealHG = avgHG + (avgBDforFAs - currentBD[emp]) * 0.7`
- Strafe für HG-Gesamtabweichung:
  - `(currentHG - idealHG)² * 520`
- Strafe für HG bei AA im D:
  - `(currentHGForAA - avgHGForAA)² * 700`
- Strafe für HG bei FA im D:
  - `(currentHGForFA - avgHGForFA)² * 280`
- Wochenendabweichung:
  - `(weCount - 1)² * 260`
- Überschreitung `1.5` WE:
  - `+(weCount - 1.5) * 8000`
- benachbarte HG:
  - `+1800`
- HG vor eigenem D (außer Freitag):
  - `+24000`

### 24.2 Durchläufe

- maximal 14 Pässe,
- nur nicht-fixierte HG-Tage dürfen verschoben werden,
- Kandidaten werden nach Bias `currentHG - currentBD * 0.55` sortiert,
- Verbesserung wird übernommen, wenn `newObjective + 0.01 < bestHGObjective`.

### 24.3 Ergebnischarakter

Damit wird umgesetzt:

- HG insgesamt angleichen,
- HG zugunsten von FÄ mit weniger BD verschieben,
- HG bei AA vs. HG bei FA getrennt fair verteilen,
- Wochenendlast glätten,
- direkt aufeinanderfolgende HG eher vermeiden.

---

## 25. Auto-Planung: Validierung, Warnungen und Berichte

### 25.1 Endvalidierung

Am Ende wird explizit geprüft, ob dieselbe Person an zwei aufeinanderfolgenden Tagen `D` trägt.

Wenn ja:

- der spätere `D` wird gelöscht,
- leere Zellen werden aufgeräumt,
- eine Warnung wird geloggt.

### 25.2 Summary pro Person

Für jede Person werden berechnet:

- BD-Anzahl,
- BD-Ziel,
- BD-Tage,
- Wochenendäquivalente,
- Feiertagsdienste,
- HG-Anzahl,
- HG-Tage.

### 25.3 Globale Warnungen

Warnungen entstehen u. a. bei:

- Person bleibt unter BD-Ziel,
- Person liegt über `1.5` WE-Äquivalenten,
- Tag ohne BD,
- Tag ohne HG.

### 25.4 Globale Infos

Die Ergebnisansicht nennt zusätzlich u. a.:

- wie oft Relaxed-Regeln nötig waren,
- dass HG über FA ausgeglichen wurden,
- wie viele HG gebündelt wurden,
- welches WE-Ziel verfolgt wurde,
- dass Samstagsdienste gleichverteilt wurden,
- dass `D-F-D-F` nur noch soft gewichtet ist,
- dass benachbarte HG nur weich bestraft werden,
- dass Oster-/Pfingstblöcke sich ausschließen,
- wie viele Wünsche erfüllt wurden.

### 25.5 Reportliste

Der Report speichert pro automatischer Zuweisung:

- Tag,
- Person,
- Duty-Typ,
- Begründung,
- Tags.

Diese Liste wird als Modal angezeigt und erklärt die einzelnen Entscheidungen im Nachgang.

### 25.6 Progress-Visualisierung

Während der Berechnung zeigt die App:

- Pipeline-Nodes,
- Fortschrittsbalken,
- Live-Zähler für BD, HG, Regeln und Swaps,
- Terminal-artiges Log.

Die Darstellung ist rein UI-seitig; gerechnet wird synchron vorab, die Loganzeige läuft anschließend animiert ab.

---

## 26. Regelabweichungen zwischen Textwunsch und Code

Dieser Abschnitt ist wichtig, weil der implementierte Algorithmus nicht an jeder Stelle 1:1 dem freien Regeltext entspricht.

### 26.1 Zukunftsmonate in der Fairness

Der Regeltext erwähnt ggf. auch zukünftige Zuteilungen. Die Historienfunktion berücksichtigt aber **nur Monate vor dem aktuellen Monat**.

### 26.2 Tag vor Urlaub

„Kein Dienst am Tag vor Urlaub“ ist im Code nur für `VACATION_CODES` hart umgesetzt. Vor `FZA`, `WB`, `K`, `KK` gilt diese harte Sperre nicht.

### 26.3 D-F-D-F

Das Muster wird aktuell **nur weich bestraft**, nicht hart verboten.

### 26.4 HG-Abstand

Direkt benachbarte HG werden im aktuellen Stand weich bestraft und in Kopplungslogik teils hart vermieden, aber nicht als generelle harte Abstandssperre im Standard-HG-Pfad umgesetzt.

### 26.5 Donnerstag-vor-Urlaub

Die Logik schaut auf Urlaub in der **nächsten ISO-Woche**, nicht zwingend auf unmittelbar anschließenden Urlaub.

### 26.6 Feiertagsausgleich

Es existiert historischer Feiertagsausgleich für BD, aber keine gleichwertig breite Gewichtung historischer Faktoren über alle Dienstarten und Konstellationen hinweg.

### 26.7 Beibehaltung gesetzter Dienste

Bereits vorhandene Dienste werden als fix betrachtet und in Optimierungen nicht verschoben. Manuell vorhandene Assignments ohne Duty bleiben ebenfalls stehen; die Auto-Planung ergänzt primär Dienste.

---

## 27. PWA-, Design- und Bedienungsdetails

### 27.1 PWA

`manifest.json` definiert u. a.:

- `name`,
- `short_name`,
- `start_url`,
- `display: standalone`,
- `orientation: any`,
- `background_color`,
- `theme_color`,
- SVG-Icon als normales und maskierbares Icon.

### 27.2 Kopf-Metadaten

`index.html` enthält zusätzlich:

- Favicon,
- Apple-Touch-Icon,
- Apple-Web-App-Meta-Tags,
- Theme-Color,
- Google-Fonts-Einbindung für IBM Plex Sans und IBM Plex Mono.

### 27.3 Styling-Grundsätze

Das Design kombiniert:

- dunklen App-Hintergrund,
- halbtransparente Flächen,
- Blur- und Glow-Effekte,
- fixe Farbzuordnung pro Code,
- sticky Tabellenbereiche,
- mobile Bottom-Sheets,
- animierte Auto-Plan-Ansichten.

### 27.4 Performance-Details

Das CSS setzt an mehreren Stellen auf:

- `contain`,
- `backdrop-filter`,
- `will-change`,
- glatte Scrollbereiche,
- unterdrückte Standardscrollbars in bestimmten Elementen.

---

## 28. Tastaturkürzel und Interaktionen

### 28.1 Globale Shortcuts

- `Alt + ←` → vorheriger Monat
- `Alt + →` → nächster Monat
- `Ctrl/Cmd + S` → Export oder im Planungsmodus Entwurf speichern
- `Escape` → offene Modals schließen

### 28.2 Planungsmodus

- `Ctrl/Cmd + Z` → Undo
- `Ctrl/Cmd + Y` oder `Ctrl/Cmd + Shift + Z` → Redo

### 28.3 Editor

- `1` bis `8` → Arbeitsplatzchips toggeln
- `D` → Bereitschaftsdienst toggeln
- `H` → Hintergrunddienst toggeln
- `S` → speichern
- `Enter` → speichern, sofern nicht bewusst ein Cancel/Clear-Button im Fokus steht

### 28.4 Maus- und Scrollverhalten

Im Desktop-Grid wird vertikales Mausrad in horizontales Scrollen umgesetzt, sofern kaum horizontale Delta-Bewegung vorhanden ist. Das erleichtert breite Monatstabellen.

---

## 29. Grenzen der aktuellen Implementierung

1. **Kein Mehrbenutzerbetrieb**: Es gibt keine Synchronisation und keine Benutzerkonten.
2. **Keine Servervalidierung**: Alles basiert auf lokalem JavaScript.
3. **Keine echte tiefgehende Merge-Strategie beim Import**: Monatsobjekte können überschrieben werden.
4. **Regeln manuell umgehbar**: Der Editor lässt Konstellationen zu, die der Auto-Planer selbst nicht vergeben würde.
5. **Historie ohne Wünsche**: Undo/Redo betrifft nur Assignments.
6. **Keine generische Konfiguration**: Mitarbeitendenmetadaten, Codes, Ziele und Sonderregeln sind fest im Code hinterlegt.
7. **Monatsmodell statt Schichtdatenbank**: Viel Logik hängt an einem Monatsraster und nicht an abstrahierten Dienstobjekten.
8. **Keine tiefe Konfliktanalyse im UI**: Viele algorithmische Konflikte werden erst im Auto-Plan berücksichtigt.
9. **Zukunftsplanung fließt kaum in Fairness ein**: Historisch wird nur rückwärts geschaut.
10. **Teilweise Regelcharakter weich statt hart**: Vor allem `D-F-D-F` und HG-Abstände sind Gewichtungen, keine absoluten Verbote.

---

## 30. Kurzfazit

RadPlan ist im aktuellen Stand eine lokale Spezialanwendung für Monats- und Dienstplanung mit relativ hoher fachlicher Spezialisierung, aber bewusst einfacher technischer Architektur. Die Stärke liegt in:

- extrem direkter Bedienung,
- lokalem Datenschutz,
- getrenntem Planungsentwurf,
- nachvollziehbarer Auto-Planung mit Report,
- klar implementierten Sonderregeln für bestimmte Personen und Konstellationen.

Der entscheidende Punkt für das Verständnis der Anwendung ist: **Nicht jede textlich gewünschte Regel ist im Code als hartes Verbot hinterlegt.** Ein großer Teil des realen Verhaltens entsteht aus einer Kombination aus Hard-Constraints, Relaxed-Fallbacks, gewichteten Scores und anschließender iterativer Optimierung.

Genau deshalb beschreibt diese README die Anwendung nicht nur aus Nutzersicht, sondern auch aus Sicht der tatsächlich implementierten Entscheidungslogik.
