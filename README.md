# RadPlan — Vollständige Anwendungsdokumentation

**Digitale Dienstplan-Engine für die Klinik für Radiologie & Nuklearmedizin, Klinikum St. Georg Leipzig.**
Clientseitige Single-Page-Application (SPA) ohne Backend, ohne Cloud, ohne externe Laufzeit-Abhängigkeiten. Alle Daten verbleiben lokal im Browser des Nutzers. Vollständige automatische Erkennung und separate Bedienoberfläche für iOS- und Android-Smartphones.

---

## Inhaltsverzeichnis

1. [Systemarchitektur](#1-systemarchitektur)
2. [Dateistruktur & Technologiestack](#2-dateistruktur--technologiestack)
3. [Datenbankmodell & Persistenz](#3-datenbankmodell--persistenz)
4. [Entitäten & Nomenklatur](#4-entitäten--nomenklatur)
5. [Mitarbeitende & Qualifikationsstufen](#5-mitarbeitende--qualifikationsstufen)
6. [Desktop-Benutzeroberfläche](#6-desktop-benutzeroberfläche)
7. [Mobile Benutzeroberfläche](#7-mobile-benutzeroberfläche)
8. [Planungsmodus](#8-planungsmodus)
9. [Zelleditor](#9-zelleditor)
10. [Dienstwunsch-System](#10-dienstwunsch-system)
11. [Mitarbeiterprofil-Modal](#11-mitarbeiterprofil-modal)
12. [Abteilungsübersicht](#12-abteilungsübersicht)
13. [Export & Import](#13-export--import)
14. [Sächsische Feiertags-Engine](#14-sächsische-feiertags-engine)
15. [Auto-Planung: Überblick & Pipeline](#15-auto-planung-überblick--pipeline)
16. [Auto-Planung: Harte Restriktionen (Hard Constraints)](#16-auto-planung-harte-restriktionen-hard-constraints)
17. [Auto-Planung: Scoring für Bereitschaftsdienst (D)](#17-auto-planung-scoring-für-bereitschaftsdienst-d)
18. [Auto-Planung: Scoring für Hintergrunddienst (HG)](#18-auto-planung-scoring-für-hintergrunddienst-hg)
19. [Auto-Planung: HG-Kopplung (Bundling)](#19-auto-planung-hg-kopplung-bundling)
20. [Auto-Planung: Swap-Optimierer](#20-auto-planung-swap-optimierer)
21. [Auto-Planung: Abschlussvalidierung & Ausgabe](#21-auto-planung-abschlussvalidierung--ausgabe)
22. [Personenspezifische Sonderregeln](#22-personenspezifische-sonderregeln)
23. [Historische Fairness-Statistik](#23-historische-fairness-statistik)
24. [Wochenend-Äquivalente: Block-basierte Zählung](#24-wochenend-äquivalente-block-basierte-zählung)
25. [Keyboard-Shortcuts & Tastatursteuerung](#25-keyboard-shortcuts--tastatursteuerung)
26. [Fehlerbehandlung & Reparaturmechanismen](#26-fehlerbehandlung--reparaturmechanismen)
27. [Technische Designentscheidungen](#27-technische-designentscheidungen)

---

## 1. Systemarchitektur

RadPlan ist eine vollständig clientseitige Single-Page-Application. Kein Server, keine API-Endpunkte, keine Cloud-Synchronisation, keine externen Laufzeit-Abhängigkeiten.

**Laufzeitumgebung:** Moderner Webbrowser mit ES6+-Unterstützung. Hardwarebeschleunigtes Rendering durch gezielten `translateZ(0)`- und `will-change`-Einsatz. `contain: layout paint` auf kritischen Elementen für Render-Performance.

**Persistenzschicht:** HTML5 `localStorage`. Produktionsdaten unter Schlüssel `radplan_v3`. Planungsentwürfe unter monatsspezifischen Schlüsseln `radplan_v3_plan_YYYY-M`.

**Mobile Erkennung:** User-Agent-Prüfung beim Initialisieren via regulärem Ausdruck `/iPhone|iPad|iPod|Android/i`. Bei positivem Match wird `IS_MOBILE = true` gesetzt — die globale Konstante steuert alle branching-Entscheidungen in JavaScript und CSS. `document.body` erhält sofort die Klasse `is-mobile`, wodurch das komplette CSS-Layout automatisch in den Mobile-Modus wechselt.

**Zero-Backend:** Maximale Datensicherheit, volle DSGVO-Konformität durch ausschließlich lokale Datenhaltung. Kein Datentransfer an externe Server.

**Fonts:** IBM Plex Sans (UI-Text) und IBM Plex Mono (Codes, Badges, Terminal-Ausgaben). Laden via Google Fonts mit `preconnect`-Optimierung. Systemschrift-Fallbacks für Offline-Nutzung.

---

## 2. Dateistruktur & Technologiestack

```
radplan/
├── index.html    — 612 Zeilen: vollständiges HTML mit allen Modal-Strukturen
├── app.css       — 2177 Zeilen: gesamtes Styling + vollständiges Mobile-System
└── app.js        — 3790 Zeilen: gesamte Applikationslogik, 86 Funktionen
```

Kein Build-Prozess. Keine npm-Pakete. Keine Abhängigkeiten zur Laufzeit. Alle drei Dateien werden direkt vom Browser geladen und ausgeführt. Alle Buttons tragen `type="button"` um unerwünschtes Form-Submit-Verhalten in allen Browser-Umgebungen — speziell iOS Safari — zuverlässig zu verhindern.

**JavaScript:** `"use strict"` am Dateianfang. Globale Konstanten und Variablen, keine Module, kein Bundling. Alle 86 Funktionen sind im globalen Scope.

**CSS:** Custom Properties (`--var`-System) für alle Farben, Abstände, Maße. Glassmorphism via `backdrop-filter`. Responsive via `@media`-Queries bei 1200px, 768px, 480px. Mobile-spezifisches System via `body.is-mobile`-Selektoren.

---

## 3. Datenbankmodell & Persistenz

### 3.1 Haupt-Datenspeicher (`radplan_v3`)

Wurzelobjekt `DATA` — flaches Dictionary mit Monatsschlüsseln.

**Monatsschlüssel-Format:** `"YYYY-M"` — Jahr vierstellig, Monat nullbasiert (0 = Januar, 11 = Dezember). Beispiel: `"2026-2"` für März 2026.

**Monatsdaten-Struktur:**
```json
{
  "2026-2": {
    "employees": ["Dr. Lurz", "Dr. Polednia"],
    "assignments": {
      "Dr. Lurz": {
        "5":  { "assignment": "MR",    "duty": "D"  },
        "6":  { "assignment": "F"                   },
        "14": {                         "duty": "HG" }
      }
    }
  }
}
```

**Tages-Zell-Objekt** pro `assignments[empName][dayNumber]`:
- `assignment` (String, optional): Arbeitsplatz-Codes via `/` kombinierbar (`"MR/CT"`) oder ein einzelner Status-Code (`"U"`, `"F"`, …)
- `duty` (String, optional): `"D"` oder `"HG"`

Beide Felder sind vollständig unabhängig — ein Mitarbeiter kann gleichzeitig einen Arbeitsplatz und einen Dienst haben.

### 3.2 Planungsentwürfe (`radplan_v3_plan_YYYY-M`)

Isolierter localStorage-Eintrag pro Monat, erzeugt beim Aktivieren des Planungsmodus:
```json
{
  "employees": ["..."],
  "assignments": { "...": { "5": { "assignment": "MR" } } },
  "wishes": {
    "Dr. Lurz": { "5": "BD_WISH", "12": "NO_DUTY" }
  }
}
```

### 3.3 Export-Format

Vollständiger Export enthält Produktionsdaten und alle gespeicherten Planungsentwürfe:
```json
{
  "main":  { "2026-2": { ... } },
  "plans": { "2026-2": { ... } }
}
```

Beim Import: `Object.assign`-Merge (vorhandene Daten bleiben erhalten, neue Daten werden hinzugefügt). Anschließend automatische Reparatur fehlender F-Tage nach BD.

### 3.4 Datenzugriffsfunktionen

| Funktion | Beschreibung |
|---------|-------------|
| `getMonthData(y, m)` | Liefert Monatsdaten; erzeugt neuen Eintrag mit Vormonats-Mitarbeiterliste wenn fehlend |
| `getCell(y, m, emp, day)` | Liefert Zell-Objekt oder `{}` |
| `setCell(y, m, emp, day, patch)` | Merged Patch in Zell-Objekt; löscht leere Objekte |
| `clearCell(y, m, emp, day)` | Löscht gesamten Tageseintrag |
| `dutyOwner(y, m, day, dt)` | Name des D/HG-Inhabers oder `null` |
| `dayCodeCount(y, m, day, code)` | Zählt Einträge eines Codes an einem Tag |

---

## 4. Entitäten & Nomenklatur

### 4.1 Arbeitsplätze (Workplaces)

Acht Arbeitsplätze mit festen Farb-Tokens für konsistentes UI in Tabelle, Chips, Profil-Charts:

| Code | Bezeichnung | Hintergrund | Textfarbe |
|------|------------|-------------|-----------|
| `MR` | MRT | `#DBEAFE` | `#1D4ED8` |
| `CT` | CT | `#FFEDD5` | `#C2410C` |
| `US` | Sonographie | `#CCFBF1` | `#0F766E` |
| `AN` | Angiographie | `#F3E8FF` | `#7E22CE` |
| `MA` | Mammographie | `#FCE7F3` | `#BE185D` |
| `KUS` | Kinder-US | `#DCFCE7` | `#15803D` |
| `W` | Wermsdorf | `#FEF9C3` | `#854D0E` |
| `T` | Teleradiologie | `#E0E7FF` | `#3730A3` |

Mehrfachauswahl via `/`-Konkatenation möglich (z.B. `"MR/CT"`).

### 4.2 Status-Codes

| Code | Bezeichnung | Kategorie | Urlaubscode |
|------|-------------|-----------|-------------|
| `F` | Frei | Ruhetag | nein |
| `U` | Urlaub | Urlaub | **ja** |
| `ZU` | Zusatzurlaub | Urlaub | **ja** |
| `SU` | Sonderurlaub | Urlaub | **ja** |
| `FZA` | Freizeitausgleich | Ausgleich | nein |
| `K` | Krank | Abwesenheit | nein |
| `KK` | Kind Krank | Abwesenheit | nein |
| `§15c` | §15c ArbZG | Urlaub | **ja** |
| `WB` | Weiterbildung | Abwesenheit | nein |

`VACATION_CODES = ["U", "ZU", "SU", "§15c"]` triggern den Vor-Urlaubs-Bonus (+150) und die Becker-Martin-Konfliktprüfung.

`ABSENCE_CODES = ["U", "ZU", "SU", "FZA", "K", "KK", "§15c", "WB"]` führen zum Ausschluss aus der Dienstvergabe (Hard Constraint).

Status-Codes und Arbeitsplatz-Codes sind exklusiv: Setzen eines Status löscht alle Arbeitsplätze, Setzen eines Arbeitsplatzes löscht den Status.

### 4.3 Dienst-Codes

| Code | Bezeichnung | Träger | Folgeeffekte |
|------|-------------|--------|-------------|
| `D` | Bereitschaftsdienst | FA und AA | Erzwingt `F` am Folgetag. Samstag: nur FA |
| `HG` | Hintergrunddienst | Nur FA | Telefonische Bereitschaft. Bei AA-BD: Befundfreigabe-Pflicht |

---

## 5. Mitarbeitende & Qualifikationsstufen

### 5.1 Qualifikationshierarchie & Dienst-Berechtigung

| Kürzel | Bezeichnung | D-fähig | HG-fähig | Samstags-D |
|--------|-------------|---------|----------|-----------|
| `CA` | Chefarzt | nein (befreit) | nein | — |
| `LOA` | Leitender Oberarzt | ja | ja | ja |
| `OA` | Oberarzt | ja | ja | ja |
| `OÄ` | Oberärztin | ja | ja | ja |
| `FA` | Facharzt | ja | ja | ja |
| `FÄ` | Fachärztin | ja | ja | ja |
| `AA` | Assistenzarzt | ja | **nein** | nein |
| `AÄ` | Assistenzärztin | ja | **nein** | nein |

`isFacharzt()` = `true` für CA, LOA, OA, OÄ, FA, FÄ. `isAssistenzarzt()` = `true` für AA, AÄ. Für unbekannte Mitarbeitende: `isAssistenzarzt()` gibt sicherheitshalber `true` zurück.

**HG-Kontext:** Wenn AA im D ist, muss der HG-tragende FA telefonisch erreichbar sein und am Folgetag die Befunde freigeben. Wenn FA im D ist, ist kein HG für weitere Freigaben nötig — der HG ist damit entspannter.

### 5.2 Vordefinierte Mitarbeitende mit Stammdaten

| Name | Position | Bereich / Funktion | Sonderregeln |
|------|----------|--------------------|-------------|
| Prof. Schäfer | CA | Chefarzt | Dienst-befreit (`DUTY_EXEMPT`) |
| Dr. Lurz | LOA | Leitender Oberarzt, MRT · Röntgen KV | — |
| Dr. Polednia | OA | Leiter Kinderradiologie | KUS-Kollisionsschutz (§22.2) |
| Fr. Dalitz | OÄ | Leiterin Mammographie | — |
| Fr. Thaler | FÄ | Fachärztin | — |
| Dr. Becker | OÄ | CT-Leitung | Samstags-Sonderregel + CT-Paarung (§22.3) |
| Dr. Martin | FA | CT-Vertreter | CT-Paarung mit Dr. Becker (§22.4) |
| Hr. El Houba | AA | Assistenzarzt | — |
| Fr. Licenji | AÄ | Assistenzärztin | — |
| Hr. Torki | AA | Assistenzarzt | — |
| Hr. Sebastian | AA | Assistenzarzt | Reduziertes BD-Soll (3 statt 4) |

Jedes Metadaten-Objekt enthält: `fullName`, `position`, `posLabel`, `type`, `area`, `deputy`. Mitarbeitende ohne Eintrag in `EMP_META` erhalten generischen Fallback mit Position `"—"`.

### 5.3 Positionsfarben

| Position | Hintergrund | Text | Rahmen |
|----------|------------|------|--------|
| CA | `#F3E8FF` | `#7E22CE` | `#A855F7` |
| LOA | `#DBEAFE` | `#1D4ED8` | `#3B82F6` |
| OA/OÄ | `#CCFBF1` | `#0F766E` | `#14B8A6` |
| FA/FÄ | `#DCFCE7` | `#15803D` | `#22C55E` |
| AA/AÄ | `#F1F5F9` | `#475569` | `#94A3B8` |

---

## 6. Desktop-Benutzeroberfläche

Aktiv wenn `IS_MOBILE === false`. Horizontales Tabellenraster mit vollem Funktionsumfang.

### 6.1 Strukturlayout (von oben nach unten)

1. `#app-header` — Branding, Monatsnavigation, Aktions-Toolbar
2. `#plan-bar` — Kontextuelle Planungsleiste (nur Planungsmodus)
3. `#stats-bar` — Monatliche Code-Häufigkeits-Statistik
4. `main > #grid-wrapper` — Horizontale, scrollbare Dienstplan-Tabelle

### 6.2 Header

Branding: RP-Icon-Badge + „RadPlan"-Schriftzug. Monatsnavigation: Zurück/Vorwärts mit Alt+← / Alt+→. Monatsname als `aria-live`-Region. Heute-Button: springt zum aktuellen Monat, scrollt heutigen Tag in den sichtbaren Bereich, zeigt akzentfarbene Hervorhebung wenn aktueller Monat angezeigt wird.

Im Planungsmodus: Vorwärts/Zurück-Buttons gesperrt (Opacity 0.2, `pointer-events: none`), Planung-Button goldfarben hervorgehoben.

Toolbar-Buttons: `btn-today`, `btn-dept`, `btn-plan`, `btn-employees`, `btn-export` (Strg+S), `btn-import`.

### 6.3 Stats-Bar

Horizontale scrollbare Leiste. Zeigt MA-Zähler (mit Personen-SVG), dann für jeden Code mit mindestens einem Eintrag: farbiger Code-Badge + Zahlenwert. Anzeigereihenfolge: D, HG, U, K, F, MR, CT, US, WB, FZA, ZU, SU, KK, §15c, AN, MA, KUS, W, T.

Im Planungsmodus: goldener oberer Rand.

### 6.4 Dienstplan-Tabelle

Horizontal scrollbarer Container (`overflow: auto`). Mausrad-Scroll: `deltaY` wird zu `scrollLeft` addiert wenn `|deltaX| < 10` (verhindert Konflikt mit echtem horizontalem Scrollen).

**Kopfzeile (thead):** Sticky oben. KW-Anzeige am ersten Wochentag und am 1. des Monats. Tagesnummer, Wochentagskürzel, Feiertagsname. WE/FT/Heute farblich hervorgehoben. Freitag-Spalten mit verstärktem rechten Rahmen.

**Namensspalte:** Sticky links. Name + Positions-Badge (8.5px Monospace). Profil-Icon und Löschen-Button erscheinen beim Hover. Klick öffnet Profil-Modal.

**Datenzellen:** Hintergrundfarbe aus Code-Farbtabelle via `cellColor()`. Dienst-Badge (D/HG) als absolut positionierter Chip oben rechts. Wunsch-Indikator unten links (nur Planungsmodus). Automatisch gesetzte F-Tage nach BD: kursiv, 35% Opacity, kleiner Unterstrich-Balken. Leere Werktage: kleiner grauer Dot. Heute: Blauer Inset-Rahmen. Hover: `filter: brightness(.9)` + Akzent-Inset-Rahmen.

**Fußzeile (tfoot):** 4 Statistikzeilen für MR, CT, D, HG. Mehrfachbelegung bei D/HG (> 1): rote Warnung.

### 6.5 Planungsmodus-Visuals

`body.plan-mode-active` aktiviert: goldener Header-Unterstrich, Tabelle mit goldenem 3px Inset-Rahmen, Tisch-Eckzelle mit „PLAN"-Label, leere Werktage mit goldenen Dots, Editor-Modal mit braunem Header.

---

## 7. Mobile Benutzeroberfläche

Eigenständige Darstellung für Smartphones. Kein Fallback auf skalierte Desktop-Ansicht — vollständige UX-Neukonzeption für Touch.

### 7.1 Layout-Aktivierung

`IS_MOBILE === true` → `body.classList.add("is-mobile")` → CSS-Regelwerk `body.is-mobile *` aktiviert:
- `main` ausgeblendet (Desktop-Tabelle)
- `#stats-bar` ausgeblendet
- `#mobile-view` sichtbar (`display: flex; flex-direction: column; flex: 1`)
- Alle Modals als Bottom-Sheets (Ausrichtung unten, 92vh max, Einfahrt-Animation)
- Toast zentriert über der Nav-Bar
- Chip-Mindestgröße 48px
- Input-Font-Size 16px (verhindert iOS-Zoom)
- Plan-Bar als horizontal scrollbare, einzeilige Leiste

### 7.2 Monats-Zusammenfassungsleiste

Horizontal scrollbar, direkt unter dem Header. Zeigt MA-Zähler + farbige Code-Chips mit Zählwerten. Identische Datenbasis wie Desktop-Stats-Bar, mobile Chip-Gestaltung mit `mms-item`-Klassen.

### 7.3 Tagesliste

Vollständig scrollbarer Bereich mit `padding-bottom` gleich `var(--mnav-h) + 16px` damit der Inhalt nicht hinter der Nav-Bar verschwindet.

**Wochentrenner:** Vor dem ersten Tag jeder ISO-KW: `mobile-week-sep` mit „KW N" + dekorativer Trennlinie.

**Tageskarte (`mobile-day-card`):**

Aufbau:
- Links: Datums-Bereich — Tageszahl (24px, 800 Gewicht), Wochentagskürzel, KW-Anzeige (am 1. Wochentag oder Tag 1)
- Vertikaler Trenner (1px, angepasst an Kartentyp)
- Mitte: Inhaltsbereich — Feiertagsname (bei FT), Dienst-Badges mit kurzem Nachnamen, Arbeitsplatz-Chips (max. 5, Rest als „+N")
- Rechts: Pfeil-Icon
- Optional: Goldener Puls-Dot (Planungsmodus)

Kartentypen:
- Standard: weißer Hintergrund
- `.mdc-we`: gedimmter grau-blauer Hintergrund
- `.mdc-hol`: warmer Gelbton
- `.mdc-today`: blauer Rahmen + blauer 2px-Balken oben, blaue Tageszahl

Auto-Scroll: Heutiger Tag scrollt nach 120ms automatisch in den sichtbaren Bereich.

Touch-Targets: Karten nutzen `transform: scale(.984)` bei `:active` für haptisches Feedback.

### 7.4 Tages-Detailblatt (`#modal-mobile-day`)

Bottom-Sheet mit 90vh max-Höhe. Besteht aus:

**Handle:** Abgerundetes weißes Element für Bottom-Sheet-Semantik.

**Kopfzeile (dunkel):** Wochentag + Datum + ggf. Feiertagsname (farbkodiert: blau für Heute, gold für FT). Duty-Pills: farbige Badges mit D/HG-Buchstabe und Name des Inhabers.

**Body:** Zwei Abschnitte „Fachärzte" / „Assistenzärzte". Pro Mitarbeiter eine Zeile mit:
- Farbigem Positions-Dot (Kreis, Farbe aus `posColor`)
- Name und Positions-Bezeichnung
- Badges: farbige Arbeitsplatz-Chips, D/HG-Tags, Wunsch-Tags (im Planungsmodus)
- Edit-Pfeil-Icon (im editierbaren Modus)

Tippen auf eine Zeile → schließt das Blatt → öffnet nach 200ms Zelleditor.

### 7.5 Alle Modals als Bottom-Sheets

Auf Mobile werden alle folgenden Modals als Bottom-Sheet gerendert: `modal-editor`, `modal-autoplan`, `modal-dept`, `modal-profile`, `modal-emps`, `modal-import`, `modal-ap-report`. Kein Padding auf dem Overlay, Ausrichtung unten, volle Breite, `max-height: 92vh`, abgerundete obere Ecken, `slideUp`-Animation beim Öffnen, `slideDown`-Animation beim Schließen.

### 7.6 Mobile Navigation

Fixierte Bottom-Nav mit drei Buttons plus Safe-Area-Inset:
- **Abteilung** (links) → `openDeptOverview()`
- **Planung** (Mitte, prominent, goldener Rahmen) → `enterPlanMode()` / `closePlanMode()`; aktiver Planungsmodus: orangefarbener Hintergrund
- **Menü** (rechts) → mobiles Action-Sheet

Mobiles Action-Sheet enthält: Mitarbeitende verwalten, Daten exportieren, Daten importieren.

---

## 8. Planungsmodus

Isolierte, non-destruktive Planung: Der Produktionsplan bleibt während der gesamten Planungsphase unberührt.

### 8.1 Aktivierung

`enterPlanMode()`: Tiefe JSON-Kopie des aktuellen Produktionsmonats in `planData`. Baseline-Snapshot für Änderungs-Erkennung in `planBaseline`. Undo-Stack mit initialem Zustand. `planMode = true`. `autoPlanTargets = {}` zurückgesetzt.

### 8.2 Deaktivierung

`closePlanMode()`: Prüft `JSON.stringify(planData.assignments) !== JSON.stringify(planBaseline)`. Bei Unterschied: Bestätigungs-Dialog. Dann `exitPlanMode()`.

`exitPlanMode()`: Alle Planungs-Variablen zurückgesetzt, `render()` aufgerufen.

### 8.3 Undo/Redo-Stack

Jede Zellbearbeitung und jede Auto-Plan-Übernahme erzeugt zwei Snapshots (vor und nach der Änderung). `recordPlanHistory()` speichert `JSON.parse(JSON.stringify(planData.assignments))`. Stack wird bei jeder neuen Aktion auf `[0..planHistoryIdx]` gekürzt (Redo-Historie verworfen). Undo: `planHistoryIdx--`. Redo: `planHistoryIdx++`. Buttons deaktiviert wenn kein Verlauf/Ende des Verlaufs erreicht.

### 8.4 Planungsschritte

- **Abbrechen**: Setzt auf `planBaseline` zurück. Stack auf initialen Zustand. `render()`.
- **Speichern** (Strg+S): Entwurf in `radplan_v3_plan_YYYY-M` gesichert. `planBaseline` aktualisiert.
- **Übernehmen** (Bestätigung): Kopiert `planData.assignments` in `DATA[k].assignments`. `saveToStorage()`. `exitPlanMode()`.

---

## 9. Zelleditor

Öffnet via Klick/Touch auf Tabellenzelle (Desktop) oder Mitarbeiter-Zeile im Tages-Detailblatt (Mobile).

### 9.1 Aufbau

Kopfzeile: Name, Datum, Day-Type-Label (Feiertag/Wochenende), PLANUNG-Badge. Vorschau-Box: Live-Rendering der Auswahl (Code + Duty-Badge). Arbeitsplatz-Sektion. Status-Sektion. Dienst-Sektion. Wunsch-Sektion (nur Planungsmodus). Footer: Löschen, Abbrechen, Speichern.

### 9.2 Arbeitsplatz-Chips

8 Chips, Mehrfachauswahl. Tastatur 1–8. Keyboard-Hinweis-Zeile unter Chips (auf Mobile via `IS_MOBILE` ausgeblendet). Bei aktivem Status: alle Arbeitsplatz-Chips gedimmt und deaktiviert.

### 9.3 Status-Chips

9 Chips, exklusiv. Setzen eines Status löscht alle Arbeitsplätze.

### 9.4 Dienst-Chips

Chips für D und HG. Bereits von anderer Person belegt: `blocked` (Opacity 0.3, Name angezeigt). Wenn Folgetag Urlaub: Warnhinweis `⚠ Folgetag (N.) ist Urlaub`.

### 9.5 Speichern-Logik (`saveEditor`)

Patcht Zelle. Wenn `duty === "D"`: `nextCalendarDay()` bestimmt Folgetag, F wird gesetzt wenn Folgetag leer ist (Toast „F automatisch gesetzt"). Bug-fix: frühere fehlerhafte Bedingung `next.y === y || next.m >= 0` (immer `true`) ist behoben — F-Injektion erfolgt jetzt bedingungslos korrekt.

---

## 10. Dienstwunsch-System

Drei Wunsch-Typen, nur im Planungsmodus:

| Code | Label | Icon | Hintergrund | Text | Rahmen | Algorithmus-Effekt |
|------|-------|------|-------------|------|--------|--------------------|
| `NO_DUTY` | Kein Dienst | ✗ | `#FEE2E2` | `#991B1B` | `#FCA5A5` | Hard Constraint: Ausschluss für D und HG |
| `BD_WISH` | BD Wunsch | D | `#FEE2E2` | `#B91C1C` | `#F87171` | Soft: +200 Punkte im D-Scoring |
| `HG_WISH` | HG Wunsch | H | `#E0F2FE` | `#0369A1` | `#7DD3FC` | Soft: +200 Punkte im HG-Scoring |

Gespeichert in `planData.wishes[empName][day]`. Sichtbar in Tabellenzellen (Desktop) als Micro-Badge unten links und im Tages-Detailblatt (Mobile) als Wunsch-Tag.

---

## 11. Mitarbeiterprofil-Modal

Vollständige, implementierte Profilansicht. Öffnet via Klick auf Mitarbeiternamen (Desktop) oder Profil-Eintrag.

### 11.1 Kopfbereich

Avatar: Initialen aus `empInitials()` (zwei Großbuchstaben aus Namenstokens), farblich nach Qualifikationsposition per Gradient `border → fg`. Vollständiger Name aus `EMP_META.fullName`. Monat + Jahr + Werktage als Untertitel. Meta-Row: Positions-Pill, Bereich-Chip (blau), Stellvertreter-Chip (grau).

### 11.2 KPI-Grid (8 Kennzahlen)

Desktop: `repeat(4, 1fr)`. Mobile: `repeat(3, 1fr)`.

| Kennzahl | Berechnung | Akzentfarbe |
|----------|-----------|------------|
| Werktage gesamt | Arbeitstage im Monat | Blau |
| Nicht geplant | `totalWorkdays - coveredWorkdays` | Orange wenn > 0, sonst Grün |
| D-Dienste | `dutyD.length`, Tagesliste als Subtext | Rot |
| HG-Dienste | `dutyHG.length`, Tagesliste als Subtext | Cyan |
| Urlaub | U + ZU + SU + §15c | Violett |
| Krank | K + KK | Dunkelrot |
| FZA | Freizeitausgleich | Indigo |
| Frei | F-Tage | Grau |

Kennzahl-Karten mit `border-top` in Akzentfarbe und optionalem Fortschrittsbalken (für Abdeckungsprozent).

### 11.3 Arbeitsplatz-Verteilung

Horizontale Balkendiagramme per Arbeitsplatz-Code. Maximaler Balken = 100% des Höchstwerts. Absolute Anzahl + Prozentwert am Gesamtportfolio. Sektion ausgeblendet wenn leer.

### 11.4 Status-Übersicht

Analoge Balken für Status-Codes. Sektion ausgeblendet wenn leer.

### 11.5 Dienst-Detail

D-Gruppe mit roten Tages-Badges, HG-Gruppe mit blauen Tages-Badges. WE/FT-Tage erhalten kontrastierende Färbung. Sektion ausgeblendet wenn kein Dienst.

### 11.6 Monatskalender

7-Spalten-Grid mit Wochentags-Kopf. Jede Zelle: Code, Duty-Badge, Tagesnummer. Heute: blauer Outline. WE/FT-Zellen: nicht klickbar. Werktage: klickbar → schließt Profil-Modal → öffnet nach 180ms Zelleditor.

### 11.7 Jahresauswertung

KPI-Strip: 6 Gesamtwerte (AP, Urlaub, Krank, FZA, D, HG) für das laufende Jahr aus `buildYearlyStats()`. 12-Monats-Tabelle: AP, U, K, FZA, WB, D, HG. Aktueller Monat hervorgehoben. Gesamtzeile am Ende.

---

## 12. Abteilungsübersicht

### 12.1 Monatsansicht

Coverage-Strip mit Besetzungsquoten für MR, CT, D, HG (% Werktage mit Besetzung). Fortschrittsbalken, grün ab 80%. Mitarbeiter-Tabelle: AP, MR, CT, Urlaub, Krank, FZA, D, HG, Frei, Offen (ungedeckte Werktage). Team-Gesamtzeile.

### 12.2 Jahresansicht

KPI-Strip: Mitarbeitendenzahl, AP-Tage, Urlaub, Krank, D/HG-Verhältnis, Abdeckungsprozent. Tabelle pro Mitarbeiter: AP-Tage, Urlaub, Krank, FZA, WB, D, HG, Abdeckung. Farbkodierung: grün ≥ 80%, orange ≥ 60%, rot < 60%.

---

## 13. Export & Import

### 13.1 Export

`doExport()`: Iteriert `localStorage` nach `radplan_v3_plan_*`-Schlüsseln. Baut `{ main: DATA, plans }`. Blob-Download via `URL.createObjectURL`. Dateiname: `radplan_YYYY-MM-DD.json`. Shortcut: Strg+S (außerhalb Planungsmodus).

### 13.2 Import

Drei Eingabewege: Drag & Drop (über `dragenter/dragover/drop`-Events), Datei-Browser (Klick → `<input type="file">`), Textarea-Paste. Nur `.json` oder `application/json` akzeptiert. Lesen via `FileReader.readAsText(file, "UTF-8")`.

Verarbeitungslogik: JSON parsen, Strukturprüfung. Wenn `parsed.main` → in `DATA` mergen. Wenn `parsed.plans` → pro Eintrag in localStorage schreiben. Fallback: direkt in `DATA` mergen. Dann `ensurePostBDFreiDays()` + `render()`. Fehler: rote Fehlermeldung unterhalb des Feldes.

---

## 14. Sächsische Feiertags-Engine

### 14.1 Gaußsche Osterformel (`easterDate`)

Berechnet Ostersonntag via vollständigem Gaußschen Algorithmus (8 Zwischenvariablen a–l und m2). Liefert `Date`-Objekt. Alle beweglichen Feiertage werden durch Addition von `addDays(easter, offset)` berechnet.

### 14.2 Alle Sächsischen Feiertage (`getSaxonyHolidays`)

| Feiertag | Datum / Berechnung |
|---------|-------------------|
| Neujahr | 01.01. (fest) |
| Karfreitag | Ostersonntag − 2 Tage |
| Ostermontag | Ostersonntag + 1 Tag |
| Tag der Arbeit | 01.05. (fest) |
| Christi Himmelfahrt | Ostersonntag + 39 Tage |
| Pfingstmontag | Ostersonntag + 50 Tage |
| Tag der Deutschen Einheit | 03.10. (fest) |
| Reformationstag | 31.10. (fest) |
| Buß- und Bettag | Mittwoch vor 23. November (Rückwärts-Iteration) |
| 1. Weihnachtstag | 25.12. (fest) |
| 2. Weihnachtstag | 26.12. (fest) |

Rückgabe: Dictionary `{ "YYYY-MM-DD": "Feiertagsname" }`.

### 14.3 ISO-Kalenderwochennummer (`isoWeekNumber`)

ISO 8601-konform: Wochen beginnen Montag, KW1 enthält den ersten Donnerstag des Jahres. Formel: ISO-Donnerstag berechnen → Abstand zum 4. Januar → `1 + Math.round(diff / 604800000)`. Korrekt für alle Jahres- und Jahrhundertübergänge.

---

## 15. Auto-Planung: Überblick & Pipeline

Nur im Planungsmodus verfügbar. `computeAutoPlan(customTargets)` ist vollständig synchron — das Ergebnis ist sofort verfügbar. Die animierte Terminal-Darstellung ist ein asynchrones Replay des vorab vollständig berechneten Log-Arrays.

### 15.1 Voraussetzungen

`planMode === true` und `planData` vorhanden. Alle manuell gesetzten D/HG-Einträge werden vollständig beibehalten und nie überschrieben. Der Algorithmus füllt ausschließlich noch leere Tage.

### 15.2 BD-Standardziele

| Mitarbeiter | Standard-BD-Ziel/Monat |
|-------------|----------------------|
| Prof. Schäfer | 0 (befreit) |
| Dr. Polednia | 3 |
| Dr. Becker | 3 |
| Hr. Sebastian | 3 |
| Alle anderen | 4 |

Ziele sind im Konfigurationsdialog auf 0–10 anpassbar. Die Summe aller Ziele wird live angezeigt.

### 15.3 Pipeline

```
Phase 1  init          Historische Statistiken laden, F-Repair, Vormonat-Status
Phase 2  bd_weekend    WE/FT-BD vergeben (Priorisierung vor Werktagen)
Phase 3  bd_workday    Werktags-BD vergeben
Phase 4  bd_optimize   3 Swap-Passes für Fairness-Glättung
Phase 5  hg_bundle     Freitags/Sonntags/FT-HG logisch koppeln
Phase 6  hg_assign     Verbleibende HG-Tage via Scoring vergeben
Phase 7  validate      Doppel-D-Prüfung und Bereinigung
Phase 8  done          Zusammenfassung, Warnungen, Infos aufbauen
```

---

## 16. Auto-Planung: Harte Restriktionen (Hard Constraints)

Hard Constraints liefern Score `-Infinity` → Kandidat bedingungslos ausgeschlossen. Wer mit `-Infinity` bewertet wird, erhält den Dienst nicht, egal was der Rest des Felds liefert.

### 16.1 Shared Hard Constraints (D und HG)

| Constraint | Bedingung |
|------------|----------|
| Dienst-Befreiung | `isDutyExempt(emp)` |
| Abwesenheit | Jeder Code aus `ABSENCE_CODES` an diesem Tag |
| Doppelbelastung | `result[emp][d].duty` bereits vorhanden |
| F-Tag | `result[emp][d].assignment === "F"` (bei HG: F auf WE erlaubt) |
| Wunsch-Sperre | `wishes[emp][d] === "NO_DUTY"` |

### 16.2 Hard Constraints nur für D

| Constraint | Bedingung | Im Relaxed-Modus aufhebbar? |
|------------|----------|-----------------------------|
| Null-Ziel | `bdTarget[emp] === 0` | nein |
| Samstag-Qualifikation | `wd === 6 && !isFacharzt(emp)` | nein |
| Folgender D | `result[emp][d+1].duty === "D"` | nein |
| Vorheriger D | `result[emp][d-1].duty === "D"` | nein |
| Vor-Urlaub | `isNextDayVacation(emp, d)` | nein |
| HG-Ruhezeit | `result[emp][d-1].duty === "HG" && weekday(d-1) !== 5` | nein |
| Monatsübergang | `d === 1 && prevMonthLastDayBD[emp]` | nein |
| DFDF-Muster | `wouldCreateDFDF(emp, d)` | nein |
| Becker-Martin-Konflikt | `beckerMartinConflict(emp, d)` | nein |
| Polednia So/Di/Do | `emp === "Dr. Polednia" && wd ∈ {0, 2, 4}` | nein |
| Soll-Überschreitung | `currentBD[emp] >= bdTarget[emp]` | **ja** |
| WE-Limit | `countWeekendDuties(emp) >= 2` | **ja** |
| Becker Samstag | `emp === "Dr. Becker" && wd === 6` | **ja** |
| Mindestabstand D | Nächster/letzter D < 4 Tage entfernt | **ja** |

### 16.3 Hard Constraints nur für HG

| Constraint | Bedingung | Im Relaxed-Modus aufhebbar? |
|------------|----------|-----------------------------|
| Nicht-FA | `!isFacharzt(emp)` | nein |
| HG-vor-D | `result[emp][d+1].duty === "D" && wd !== 5` | nein |
| Polednia AA-HG | So/Di/Do + AA im D (Freigabe-Kollision) | **ja** |
| WE-Limit | `countWeekendDuties(emp) >= 2` | **ja** |
| HG-Mindestabstand | Nächster/letzter HG < 3 Tage | **ja** |

### 16.4 DFDF-Mustererkennung (`wouldCreateDFDF`)

Prüft bidirektional ob ein D an Tag `d` das Muster D-F-D-F erzeugen würde. Rückwärts: `result[emp][d-2].duty === "D" && result[emp][d-1].assignment === "F"`. Vorwärts: `result[emp][d+2].duty === "D" && result[emp][d+1].assignment === "F"`.

### 16.5 Becker-Martin-Konflikt (`beckerMartinConflict`)

Für Dr. Becker und Dr. Martin: Ist der konkrete F-Folgetag (Tag `d+1`) im `assignments` des Partners ein Urlaubstag (VACATION_CODES)? Falls ja → Conflict. Berücksichtigt Monatsübergänge korrekt (liest aus `DATA[nextMonthKey]`). Verhindert CT-Leitungsausfall wenn eine Person D hat und der Partner an dem daraus resultierenden F-Tag Urlaub hat.

### 16.6 Relaxed-Modus

Wenn nach strikter Kandidatenprüfung kein einziger Kandidat verfügbar ist, werden die mit „ja" markierten Constraints deaktiviert und erneut nach Kandidaten gesucht. Anzahl relaxierter Zuteilungen wird in der Zusammenfassung ausgewiesen.

---

## 17. Auto-Planung: Scoring für Bereitschaftsdienst (D)

**Basis-Score: 100 Punkte.** Höchster Score gewinnt. Alle Faktoren sind additiv.

| Faktor | Formel | Typischer Wertebereich |
|--------|--------|----------------------|
| **Basis** | Startwert | +100 |
| **Soll-Unterschreitung** | `(bdTarget − currentBD) × 50` | +50 bis +200 |
| **Soll-Überschreitung** | `(currentBD − bdTarget + 1) × 5000` | −5000 bis −∞ |
| **BD-Wunsch** | Wunsch `BD_WISH` gesetzt | +200 |
| **Historische Fairness** | `(avgHistBD − histBD[emp]) × 3` | variabel |
| **Donnerstag-Vor-Urlaub** | `wd === 4` und Folgewoche mit Urlaub | +150 |
| **WE-Belastung laufend** | `countWeekendDuties(emp) × 150` | −150 bis −600+ |
| **Historische WE-Fairness** | `(avgHistWE − histWE[emp]) × 5` | variabel |
| **Konsekutive WE** | Vorwochenende hatte Dienst | −50 |
| **Samstags-Fairness (nur FA)** | `(avgHistSatBD − histSatBD − currentSatBD) × 800` | sehr dominant |
| **Becker-Notfall-Samstag** | Dr. Becker + wd=6 + relaxed | −2000 |
| **Erholungs-Abstand** | `minDistD < 4 → (4 − minDistD) × 150` | −150 bis −450 |
| **Feiertags-Fairness** | `(avgHistHol − histHol[emp]) × 8` | variabel |
| **Oster/Pfingst-Wechsel** | Hat Ostern gearbeitet → Pfingst-Penalty | −80 (und umgekehrt) |
| **Deterministischer Tiebreaker** | `(charCode(emp[0]) × 31 + d × 7) % 10 × 0.1` | 0 bis +0.9 |

Zur Einordnung der Gewichte: Der Soll-Überschreitungs-Faktor (×5000) macht es praktisch unmöglich, eine Person über ihr Soll hinaus einzuplanen solange andere noch darunter liegen. Der Samstags-Fairness-Faktor (×800) ist dominantestes Soft-Signal bei FA-Samstags-D-Vergabe.

---

## 18. Auto-Planung: Scoring für Hintergrunddienst (HG)

**Basis-Score: 100 Punkte.** Kandidatenpool: nur `hgFAs` (Fachärzte ohne Befreiung).

| Faktor | Formel | Typischer Wertebereich |
|--------|--------|----------------------|
| **Basis** | Startwert | +100 |
| **Laufende HG-Anzahl** | `currentHG[emp] × 120` | −120 pro HG |
| **BD-Ausgleich** | `(avgBD − currentBD[emp]) × 30` (nur bei BD-Defizit) | +30 pro fehlendem BD |
| **AA-im-D Fairness** (hist+aktuell) | `devAA × |devAA| × 35` | quadratisch, variabel |
| **FA-im-D Fairness** (hist+aktuell) | `devFA × |devFA| × 20` | quadratisch, variabel |
| **HG-Wunsch** | Wunsch `HG_WISH` gesetzt | +200 |
| **Vor-Urlaubs-Penalty** | Folgetag ist Urlaub | −20 |
| **WE-Belastung Sa/So** | `countWeekendDuties(emp) × 100` | variabel |
| **Konsekutive WE** | Vorwochenende hatte Dienst | −30 |
| **Erholungs-Abstand** | `minDistHG < 4 → (4 − minDistHG) × 20` | −20 bis −60 |
| **Oster/Pfingst-Wechsel** | Analog D-Scoring | −80 |
| **Direkter Folge-HG** | `result[emp][d-1].duty === "HG"` | −15 |
| **Deterministischer Tiebreaker** | `(charCode(emp[1 % len]) × 17 + d × 13) % 10 × 0.1` | 0 bis +0.9 |

Die quadratische Formel für AA/FA-Balance (`devAA × |devAA| × Faktor`) toleriert kleine Ungleichgewichte, bestraft aber große Abweichungen exponentiell. Historische Werte aus Vormonaten fließen additiv ein: Wer über viele Monate zu viele AA-HGs hatte, bekommt im aktuellen Monat deutlich schlechteren Score für weitere AA-HGs.

---

## 19. Auto-Planung: HG-Kopplung (Bundling)

Vor der freien HG-Vergabe werden bestimmte HG-Tage logisch gebunden. Ziel: zusammenhängende Wochenend-Last, minimale Anfahrten für Fachärzte.

### 19.1 Freitags-HG-Kopplung

Bedingung: `wd(d) === 5` UND AA hat D an Tag `d` UND Samstag `d+1` existiert UND FA hat D an `d+1` UND Samstags-FA ≠ Freitags-AA.

Aktion: Samstags-FA erhält automatisch HG für Freitag.

Begründung: Der Freitags-AA-BD-Inhaber braucht am Samstag Befundfreigabe. Da der Samstags-FA ohnehin in der Klinik ist, ist die Kopplung effizient.

### 19.2 Sonntags-HG-Kopplung

Bedingung: `wd(d) === 6` UND FA hat D am Samstag UND Sonntag `d+1` existiert UND jemand hat D am Sonntag UND dieser ≠ Samstags-FA.

Aktion: Samstags-FA erhält automatisch HG für Sonntag.

Begründung: Wochenendbündelung.

### 19.3 Feiertags-Vorab-HG-Kopplung

Bedingung: Tag `d` kein Feiertag UND `d+1` Feiertag UND AA hat D an `d` UND FA hat D an `d+1` UND Feiertags-FA ≠ Vorab-AA.

Aktion: Feiertags-FA erhält HG für Tag `d`.

Begründung: Kein extra FA-Einsatz für einzelnen HG-Tag vor Feiertag.

### 19.4 Validierung vor Kopplung

`assignBundledHG()` prüft: FA-Qualifikation, Nicht-Abwesend, kein bereits vorhandener Dienst, kein F-Tag (außer bei WE), HG noch nicht besetzt von jemand anderem, kein D am Folgetag (außer Freitag).

---

## 20. Auto-Planung: Swap-Optimierer

Nach der initialen BD-Vergabe: bis zu 3 Optimierungs-Passes über alle BD-Paare.

### 20.1 Algorithmus

Für jedes Paar `(d1, d2)` mit `d1 < d2` und verschiedenen D-Inhabern: Tausch probeweise durchführen → Validität prüfen (`canDoBD` relaxed + WE-Limit ≤ 3) → Fairness-Score berechnen → bei Verbesserung: Tausch behalten, sonst: rückgängig. Bei Verbesserung in einem Pass: weiterer Pass.

### 20.2 Fairness-Score-Funktion

Globale Summe über alle `dutyEmps`:

| Komponente | Formel | Gewicht |
|------------|--------|--------|
| Soll-Überschreitung | `diff × 5000` (wenn diff > 0) | sehr hoch |
| Soll-Unterschreitung | `diff² × 20` (wenn diff < 0) | mittel |
| WE-Belastung | `weCount² × 10` | niedrig |
| Samstags-Belastung (FA) | `(histSatBD + currentSatBD)² × 500` | hoch |

Quadratische Terme: kleine Ungleichgewichte toleriert, große stark bestraft.

### 20.3 F-Tag-Management nach Swap

Alter Auto-F-Eintrag des getauschten Tages wird entfernt (wenn kein anderer Inhalt), neuer Auto-F-Eintrag für den neuen BD-Tag wird gesetzt. Monatsübergänge korrekt über `nextCalendarDay()` gehandhabt.

---

## 21. Auto-Planung: Abschlussvalidierung & Ausgabe

### 21.1 Doppel-D-Bereinigung

Alle aufeinanderfolgenden D-Paare bei gleicher Person werden entfernt (zweiter D gelöscht). Defensives Sicherheitsnetz nach der Swap-Phase. `currentBD`-Zähler wird anschließend neu berechnet.

### 21.2 Zusammenfassung

Pro Mitarbeiter: BD-Anzahl, Ziel, WE-Äquivalente (KW-Block-basiert), FT-Anzahl, Liste der BD-Tage. Pro FA: HG-Anzahl, Liste der HG-Tage. Warnungen bei: Unter-Soll, hohe WE-Belastung (> 2), unbesetzte Tage. Infos: Relaxed-Einsätze, Logik-Erklärungen, Wunscherfüllungsquote.

### 21.3 Live-Terminal

`renderProgressAndThenResult()` ist async. Log-Array wird mit folgenden Delays replayed:

| Entry-Typ | Delay |
|-----------|-------|
| Zuweisung (→) | 40–120ms (zufällig) |
| Begründung (💡) | 80ms |
| Header-Einträge | 300ms |
| Abschluss (✅) | 600ms |

Pipeline-Phasen-Knoten: wartend → aktiv (orangefarbener Pulsator) → fertig (grünes Häkchen). Live-Zähler: BD, HG, Regeln, Swaps.

### 21.4 Berechnen-Button iOS-Fix

`ap-compute` hat `type="button"`, `cursor:pointer`, `-webkit-appearance:none`. Ein `doCompute()`-Named-Function-Handler wird für `click` registriert. Auf Mobile zusätzlich `touchend`-Handler mit `e.preventDefault()`. `input`-Events auf Zahlenfeldern (zusätzlich zu `change`) für sofortige `autoPlanTargets`-Aktualisierung. Verhindert iOS Safari Doppelklick-Anforderung und Buttons in scrollbaren Containern.

---

## 22. Personenspezifische Sonderregeln

### 22.1 Prof. Schäfer — Vollständige Dienst-Befreiung

`DUTY_EXEMPT = ["Prof. Schäfer"]`. Erscheint in keiner Kandidatenliste, BD-Ziel = 0. In allen Dienststatistiken übersprungen. Im Ergebnisdialog nicht gelistet.

### 22.2 Dr. Polednia — KUS-Kollisionsschutz

**D-Sperre (Hard Constraint, nicht aufhebbar):** Kein D an Sonntag (0), Dienstag (2), Donnerstag (4). F nach D an diesen Tagen würde KUS-Ausfall am Folgetag erzeugen. Da Dr. Polednia der einzige KUS-fähige Arzt ist, ist diese Regel absolut.

**HG-Sperre mit AA im D (Soft Constraint, im Relaxed aufhebbar):** Kein HG an So/Di/Do wenn AA im D ist. HG bei AA-BD erfordert Befundfreigabe am Folgetag — dieser kollidiert mit KUS.

### 22.3 Dr. Becker — CT-Leitung & Samstags-Sonderregel

**Samstags-D-Sperre (Soft, im Relaxed aufhebbar):** Im Strict-Modus gesperrt. Im Relaxed: erlaubt, aber −2000 Punkte. Dr. Becker erhält Samstags-D nur wenn kein anderer FA verfügbar ist.

**FZA-Automatik:** Wenn Dr. Becker zwangsweise Samstags-D erhält: FZA für Montag wird automatisch gesetzt. Implementierung: `nextCalendarDay(y, m, d)` → Sonntag, dann `nextCalendarDay(...)` → Montag. Monatsübergang korrekt via direktem Schreiben in `DATA[nextMonthKey]`.

**Becker-Martin-Regel:** `beckerMartinConflict()` prüft den konkreten F-Folgetag auf Urlaubscode des Partners Dr. Martin.

### 22.4 Dr. Martin — CT-Leitungsschutz

Symmetrische Becker-Martin-Regel: Kein D wenn F-Folgetag mit Urlaubstag von Dr. Becker zusammenfällt.

---

## 23. Historische Fairness-Statistik

`collectHistoricalDutyStats(upToYear, upToMonth)` aggregiert aus allen Monaten in `DATA` die strikt vor dem Planungsmonat liegen.

### 23.1 Felder pro Mitarbeiter

| Feld | Bedeutung |
|------|-----------|
| `bd` | Gesamt-Bereitschaftsdienste (historisch) |
| `hg` | Gesamt-Hintergrunddienste (historisch) |
| `weDuty` | WE-Äquivalente KW-Block-basiert (§24) |
| `holDuty` | D+HG-Dienste an Feiertagen |
| `thuBd` | D-Dienste an Donnerstagen |
| `hgForAA` | HG-Dienste bei AA im D (mit Freigabepflicht) |
| `hgForFA` | HG-Dienste bei FA im D (ohne Freigabepflicht) |
| `satBd` | D-Dienste an Samstagen |

### 23.2 Verwendung im Scoring

Alle historischen Felder fließen als Fairness-Ausgleich ein. Mitarbeitende mit unterdurchschnittlichen historischen Werten erhalten positive Aufschläge; überdurchschnittlich belastete Personen erhalten negative Aufschläge. Langfristige Fairness über viele Monate ist dadurch strukturell verankert — nicht nur innerhalb eines Monats.

---

## 24. Wochenend-Äquivalente: Block-basierte Zählung

WE-Belastung wird **per ISO-Kalenderwochen-Block (Fr–Sa–So)** gezählt, nicht pro Einzeltag.

Für jeden Wochenend-Block einer Person:
- Enthält ≥ 1 D → +1,0
- Enthält nur HG, kein D → +0,5
- Enthält D und HG → +1,0 (D dominiert)

Diese Logik gilt konsistent in: `countWeekendDuties()` (laufender Monat), `collectHistoricalDutyStats()` (historisch), Summary-Berechnung in `computeAutoPlan()`. Damit entspricht die Zählung exakt der Fairness-Regel: ein Wochenende mit D zählt als 1, ein Wochenende nur mit HG als 0,5 — unabhängig davon wie viele Einzeltage im Block belegt sind.

---

## 25. Keyboard-Shortcuts & Tastatursteuerung

### 25.1 Globale Shortcuts (Desktop)

| Shortcut | Aktion | Kontext |
|----------|--------|---------|
| Alt + ← | Vorheriger Monat | Außerhalb Planungsmodus |
| Alt + → | Nächster Monat | Außerhalb Planungsmodus |
| Strg+S | JSON-Export | Außerhalb Planungsmodus |
| Strg+S | Entwurf speichern | Im Planungsmodus |
| Strg+Z | Rückgängig | Im Planungsmodus |
| Strg+Y | Vorwärts | Im Planungsmodus |
| Strg+Shift+Z | Vorwärts | Im Planungsmodus |
| Escape | Aktives Modal schließen | Immer |

Escape schließt: `modal-editor`, `modal-emps`, `modal-import`, `modal-profile`, `modal-dept`, `modal-autoplan`, `modal-ap-report`, `modal-mobile-menu`, `modal-mobile-day`.

### 25.2 Shortcuts im Zelleditor (Desktop)

| Taste | Aktion |
|-------|--------|
| `1`–`8` | Arbeitsplatz MR–T togglen (nur ohne aktiven Status) |
| `D` | Bereitschaftsdienst togglen |
| `H` | Hintergrunddienst togglen |
| `S` | Speichern |
| `Enter` | Speichern (wenn kein Button fokussiert oder `ed-save` fokussiert) |
| `Escape` | Schließen ohne Speichern |

### 25.3 Grid-Navigation

Alle Tabellenzellen: `tabindex="0"`. Fokus via Tab. Aktivieren via Enter oder Leertaste.

### 25.4 Accessibility

Alle interaktiven Elemente: `aria-label` oder sichtbare Beschriftung. Modals: `role="dialog" aria-modal="true"`. Live-Bereiche: `aria-live="polite"` für Monatslabel, Stats-Bar, Toast. Fokus-Management: erster fokussierbarer Inhalt nach 60ms beim Öffnen eines Modals. `button:focus-visible` mit 2px Outline in Akzentfarbe. Tabelle als `role="grid"`.

---

## 26. Fehlerbehandlung & Reparaturmechanismen

### 26.1 `ensurePostBDFreiDays()`

Läuft beim App-Start und nach jedem Import. Iteriert alle Monate in `DATA`. Für jeden D-Eintrag: prüft ob Folgetag leer ist, setzt `"F"` wenn ja. Berücksichtigt Monatsübergänge. Gibt Reparaturanzahl zurück. Bei > 0: Toast „N Ruhetage ergänzt".

### 26.2 Repair-Phase im Auto-Planer

Vor der BD-Vergabe prüft `computeAutoPlan()` den `planData.assignments`-Snapshot auf fehlende F-Folgetage nach vorhandenen BD und ergänzt sie. Anzahl im Terminal-Log ausgegeben.

### 26.3 Doppel-D-Bereinigung

Finaler Safety-Check nach Swap-Phase: aufeinanderfolgende D-Paare bereinigt. Zähler wird geloggt und angezeigt. Defensives Sicherheitsnetz.

### 26.4 Monatsdaten-Initialisierung

`getMonthData(y, m)` erzeugt bei fehlendem Eintrag automatisch einen neuen mit der Mitarbeiterliste des Vormonats. Fehlt der Vormonat: leere Liste.

### 26.5 EMP_META-Fallback

`getEmpMeta(name)` liefert für unbekannte Mitarbeitende generischen Datensatz mit Position `"—"`. Alle UI-Funktionen sind dadurch robust gegen manuell hinzugefügte Mitarbeitende ohne Stammdaten.

### 26.6 localStorage-Fehlerbehandlung

`loadFromStorage()` und `saveToStorage()` in `try/catch`. Fehler werden still ignoriert — Anwendung startet mit leerem Datensatz wenn nötig. `setCell()` speichert im Produktionsmodus sofort, im Planungsmodus nicht.

---

## 27. Technische Designentscheidungen

### 27.1 Kein Framework, kein Build-Schritt

Vanilla JavaScript ES6+. Keine npm-Pakete, kein React/Vue/Svelte, kein Webpack/Vite. Vorteile: Null Build-Zeit, maximale Portabilität, funktioniert als lokale HTML-Datei ohne Webserver.

### 27.2 Synchroner Algorithmus, asynchrones UI

`computeAutoPlan()` läuft vollständig synchron und liefert sofort das Ergebnis inkl. vollständigem Log-Array. `renderProgressAndThenResult()` ist async und replayed das fertige Log. Dadurch bleibt der Algorithmus deterministisch, debugbar und testbar, während das UI trotzdem lebendig wirkt.

### 27.3 Immutable Assignment-Kopie

Der Algorithmus arbeitet auf einer tiefen JSON-Kopie. Produktionsdaten werden erst beim expliziten „In Planung übernehmen" überschrieben.

### 27.4 Deterministische Tiebreaker

`(charCode(name[0]) × 31 + d × 7) % 10 × 0.1` (für D), `(charCode(name[1 % len]) × 17 + d × 13) % 10 × 0.1` (für HG). Reproduzierbar und stabil — beeinflusst das Ergebnis nur bei echtem Score-Gleichstand.

### 27.5 `IS_MOBILE` als globale Konstante

Einmal beim Laden berechnet: `const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)`. Verhindert wiederholte UA-Prüfungen im Render-Loop.

### 27.6 iOS-spezifische Touch-Optimierungen

`type="button"` auf allen 46 Buttons (verhindert Form-Submit in Safari). `-webkit-tap-highlight-color: transparent`. `touch-action: manipulation` (verhindert Double-Tap-Zoom). `font-size: 16px` auf Inputs (verhindert iOS-Zoom beim Fokus). `touchend`-Fallback auf kritischen Buttons. `-webkit-overflow-scrolling: touch` auf scrollbaren Modal-Bodies. `overscroll-behavior: contain` in Tagesliste.

### 27.7 CSS-Architektur

Custom Properties für alle Farbwerte, Abstände, Maße. Glassmorphism via `backdrop-filter: blur()` mit `-webkit-`-Prefix. `contain: layout paint` auf Header, Stats-Bar, Grid. `will-change: transform` auf Elementen mit Transitions. `translateZ(0)` für Hardware-Beschleunigung. Animationen: `modalIn`, `modalOut`, `slideUp`, `slideDown`, `planPulse`, `apNodePulse`, `apBarShimmer`, `apLogIn`. `@media (prefers-reduced-motion: reduce)` deaktiviert alle Animationen.

### 27.8 Monatskey-Format

`"YYYY-M"` (nullbasierter Monat) entspricht JavaScript `Date`-Monatsindex und verhindert Off-by-One-Fehler. `monthKey(y, m)` und `prevMK(y, m)` als Helper-Konstanten.
