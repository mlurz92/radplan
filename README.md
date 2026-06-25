# RadPlan — Digitaler Dienstplan für die Klinik für Radiologie & Nuklearmedizin

> **RadPlan** ist eine vollständig im Browser laufende, hochspezialisierte Dienstplan­anwendung für die **Klinik für Radiologie & Nuklearmedizin am Klinikum St. Georg Leipzig**. Sie verbindet ein dichtes, tabellarisches Monatsraster mit einem regelbasierten, mehrzyklischen Optimierungs­algorithmus (dem *RadPlan Neural Scheduler*), tiefen Mitarbeiter- und Jahresauswertungen, einem isolierten Planungsmodus und einer servergestützten Echtzeit-Synchronisation — verpackt in eine sorgfältig ausgearbeitete, barrierearme und touch-taugliche Oberfläche mit Hell-/Dunkelmodus.

Diese README beschreibt den **vollständigen aktuellen Funktionsstand** der Anwendung bis ins Detail: jede Ansicht, jedes Bedienelement, jede Regel, jeden Datenpfad und jede Tastenkombination.

---

## Inhaltsverzeichnis

1. [Was RadPlan löst — die Domäne](#1-was-radplan-löst--die-domäne)
2. [Technologie-Stack & Architektur](#2-technologie-stack--architektur)
3. [Fachliches Datenmodell](#3-fachliches-datenmodell)
4. [Stammdaten, Rollen & Sonderregeln](#4-stammdaten-rollen--sonderregeln)
5. [Persistenz & Server-Synchronisation](#5-persistenz--server-synchronisation)
6. [Gesamtaufbau der Oberfläche](#6-gesamtaufbau-der-oberfläche)
7. [Das Dienstplan-Raster im Detail](#7-das-dienstplan-raster-im-detail)
8. [Zell-Interaktion: Editor, Schnellaktionen, Tastatur](#8-zell-interaktion-editor-schnellaktionen-tastatur)
9. [Der Planungsmodus](#9-der-planungsmodus)
10. [Der RadPlan Neural Scheduler (Auto-Plan)](#10-der-radplan-neural-scheduler-auto-plan)
11. [Mitarbeitendenbereich (Team- & Person-Modal)](#11-mitarbeitendenbereich-team--person-modal)
12. [Jahresplaner](#12-jahresplaner)
13. [Abteilungsübersicht](#13-abteilungsübersicht)
14. [Befehlspalette](#14-befehlspalette)
15. [Drucken & PDF-Export](#15-drucken--pdf-export)
16. [Import & Export von Daten](#16-import--export-von-daten)
17. [Darstellung, Theming & Barrierefreiheit](#17-darstellung-theming--barrierefreiheit)
18. [Mobile- & Responsive-Erfahrung](#18-mobile--responsive-erfahrung)
19. [Kalender- & Feiertagslogik](#19-kalender--feiertagslogik)
20. [Vollständige Tastaturkürzel-Referenz](#20-vollständige-tastaturkürzel-referenz)
21. [Projektstruktur](#21-projektstruktur)
22. [Entwicklung, Tests & Deployment](#22-entwicklung-tests--deployment)
23. [Glossar & Codetabellen](#23-glossar--codetabellen)

---

## 1. Was RadPlan löst — die Domäne

Eine radiologische Klinik muss jeden Kalendertag lückenlos zwei Dienste absichern:

- **Bereitschaftsdienst (BD / Code „D")** — der Front-Dienst, der vor Ort die Akutversorgung trägt.
- **Hintergrunddienst (HG)** — die fachärztliche Rückfallebene, die Befunde freigibt und bei Komplikationen einspringt.

Daneben werden die Mitarbeitenden täglich auf **Arbeitsplätze** (Modalitäten wie MRT, CT, Sonographie, Angiographie, Mammographie, Kinder-Ultraschall, Außenstandort Wermsdorf, Teleradiologie) verteilt und führen **Status** (Urlaub, Krankheit, Freizeitausgleich, Weiterbildung …) ein.

Die Schwierigkeit liegt nicht im Eintragen, sondern in der **fairen, regelkonformen Verteilung** der Dienste: gesetzliche Ruhezeiten, Qualifikations­vorbehalte (Samstags- und Hintergrunddienste nur für Fachärzte), personenbezogene Sonderregeln, Feiertagsrotation, gleichmäßige Wochenend-Last und individuelle Dienstziele. RadPlan bildet all dies sowohl **manuell bedienbar** als auch **automatisch optimierbar** ab und macht die Qualität jeder Lösung über den **Neural Fitness Index (NFI)** transparent messbar.

RadPlan ist eine **Single-Page-Application ohne Build-Schritt**: reines HTML, modernes ES-Modul-JavaScript und CSS, ergänzt um wenige CDN-Bibliotheken. Sie ist als **installierbare PWA** ausgelegt und funktioniert auch offline (lokaler Datenstand), synchronisiert sich aber bei Verbindung automatisch mit einem zentralen Server.

---

## 2. Technologie-Stack & Architektur

### 2.1 Laufzeit & Sprachen
- **Reines ES-Modul-JavaScript** (`<script type="module">`), kein Bundler, kein Transpiler, kein `node_modules`-Laufzeitbedarf im Browser.
- **HTML5** als statisches Grundgerüst (`index.html`, eine Datei, alle Modal-Skelette enthalten).
- **CSS3** in zehn thematisch getrennten Dateien (siehe [Projektstruktur](#21-projektstruktur)) mit umfangreicher Nutzung von CSS-Custom-Properties für das Theming.

### 2.2 Externe Bibliotheken (per CDN eingebunden)
| Bibliothek | Version | Zweck |
| :--- | :--- | :--- |
| **Chart.js** | 4.4.4 | Alle Diagramme: Donut (Arbeitsplatzverteilung), Trend-Bar/Line (Jahresverlauf), Fairness-Linienkurven, Projektions-Balken |
| **GSAP** | 3.12.2 | Bewegungs-Feinschliff / Animationen (u. a. Auto-Plan-Visualisierung) |
| **jsPDF** | 2.5.1 | Native PDF-Erzeugung des Dienstplans |
| **jspdf-autotable** | 3.8.2 | Tabellen-Layout im PDF |
| **IBM Plex Sans / IBM Plex Mono** | — | Typografie (Google Fonts); Mono für Zahlen/Codes, Sans für Fließtext |

> Diagramme und PDF degradieren *graceful*: Ist Chart.js bzw. jsPDF nicht erreichbar, bleiben Tabellen und Daten vollständig nutzbar.

### 2.3 Backend
- **Cloudflare Pages Function** (`functions/api.js`) — eine einzige Edge-Funktion unter der Route `/api`.
- **Persistenter Speicher:** Cloudflare **KV-Namespace** (Binding `RADPLAN_KV`, Schlüssel `RADPLAN_DATA`).
- **Methoden:** `GET` (liefert den gesamten Datenstand), `POST` (speichert mit Konflikterkennung), `OPTIONS` (CORS-Preflight). Vollständige CORS-Header, strikte `no-store`-Cache-Direktiven.
- **Optimistische Nebenläufigkeitskontrolle** über einen `lastModified`-Zeitstempel (Details in [Abschnitt 5](#5-persistenz--server-synchronisation)).

### 2.4 Modul-Architektur (Frontend)
RadPlan ist klar in Module mit definierten Verantwortlichkeiten geschnitten. Der zentrale Einstiegspunkt ist `js/app.js`.

```
constants.js   → Domänenkonstanten, Codes, Stammdaten, Regel-Engine-Konfiguration, Datums-/Feiertagsmathematik
state.js       → globaler Zustand, localStorage, Server-Sync, 3-Wege-Merge
model.js       → Datenzugriff (Zellen, Monate), Statistik-Aggregation, Plan-Sessions
history.js     → Undo/Redo (delta-basiert) für den Normalmodus
autoplan.js    → der Neural Scheduler (Constraint-Engine, Optimierung, Bericht)
neuralgraph.js → die „Orbital Core"-Animation während der Auto-Planung
render-grid.js → das Monatsraster, Schnell-Popover, Radialmenü, Mobile-Tagesansicht
render-modals.js → Editor-, Profil-/Person-, Score-Info-Modale, Toast, Overlay-Steuerung
render-employee-dashboard.js → Mitarbeitendenbereich (Team-Screen + Person-Detail-Tabs)
render-dept.js → Abteilungsübersicht (Monat/Jahr)
yearplan.js    → Jahresplaner (5 Tabs)
printpreview.js → Druckvorschau + jsPDF-Export
commandpalette.js → die ⌘K-Befehlspalette
contextmenu.js → Rechtsklick-Kontextmenü
celltooltip.js → reichhaltige Hover-Tooltips an Zellen
viewtransition.js → sanfte View-Transitions beim Monatswechsel
icons.js       → SVG-Icon-Helfer
```

---

## 3. Fachliches Datenmodell

### 3.1 Grundstruktur `DATA`
Der gesamte Plan ist ein einziges JavaScript-Objekt `DATA`, dessen Schlüssel **Monate** im Format `"<Jahr>-<MonatIndex>"` sind (Monat 0-basiert, z. B. `"2026-5"` = Juni 2026).

```jsonc
DATA = {
  "2026-5": {
    "employees": ["Prof. Schäfer", "Dr. Lurz", …],   // Reihenfolge = Anzeigereihenfolge
    "assignments": {
      "Dr. Martin": {
        "3":  { "assignment": "CT",     "duty": "HG" },  // Tag 3: Arbeitsplatz CT, Hintergrunddienst
        "12": { "assignment": "MR/US",  "duty": "D"  },  // Mehrfach-Arbeitsplatz + Bereitschaft
        "13": { "assignment": "F" }                       // Tag 13: Frei (z. B. Ruhetag nach D)
      }
    },
    "rbn": { "5": "Dr. Maybaum (NRAD)" },                // Neurorad-Rufdienst je Tag
    "comments": { "Dr. Martin": { "12": "Vertretung" } } // freie Tagesnotizen
  }
}
```

**Eine Zelle** (`assignments[emp][day]`) ist ein schlankes Objekt mit bis zu zwei Feldern:
- `assignment` — ein String, der **Arbeitsplatz(e) oder einen Status** trägt. Mehrere Arbeitsplätze werden mit `/` getrennt (`"MR/CT"`). Status sind exklusiv (kein `/`).
- `duty` — `"D"` (Bereitschaft) oder `"HG"` (Hintergrund) oder fehlt.

Leere Felder werden konsequent **entfernt** (keine `null`-Reste); eine vollständig leere Zelle wird aus dem Objekt gelöscht. Das hält den Datenbestand minimal und JSON-Diffs sauber.

### 3.2 Arbeitsplätze (8 Modalitäten)
| Code | Bezeichnung | Farbwelt |
| :--- | :--- | :--- |
| `MR` | MRT | Blau |
| `CT` | CT | Orange |
| `US` | Sonographie | Türkis |
| `AN` | Angiographie | Violett |
| `MA` | Mammographie | Pink |
| `KUS` | Kinder-Ultraschall | Grün |
| `W` | Wermsdorf (Außenstandort) | Gelb |
| `T` | Teleradiologie | Indigo |

### 3.3 Status (9 Codes)
| Code | Bedeutung | Gruppe |
| :--- | :--- | :--- |
| `F` | Frei (inkl. automatischer Ruhetag nach Dienst) | — |
| `U` | Urlaub | Urlaub |
| `ZU` | Zusatzurlaub | Urlaub |
| `SU` | Sonderurlaub | Urlaub |
| `§15c` | Freistellung nach §15c | Urlaub |
| `FZA` | Freizeitausgleich | Abwesenheit |
| `K` | Krank | Abwesenheit |
| `KK` | Kind krank | Abwesenheit |
| `WB` | Weiterbildung | Abwesenheit |

Abgeleitete Gruppen (in `constants.js`):
- **`VACATION_CODES`** = `U, ZU, SU, §15c` — „echter" Urlaub (zählt nicht als Werktagsbelegung).
- **`ABSENCE_CODES`** = `U, ZU, SU, FZA, K, KK, §15c, WB` — alle dienstausschließenden Abwesenheiten.
- **`VACATION_LIKE_CODES`** = Urlaub + `FZA` + `WB` — „urlaubsähnlich"; sperrt u. a. einen BD am Vortag.

### 3.4 Dienste
- **`D`** — Bereitschaftsdienst (BD). Erzeugt zwingend einen Ruhetag `F` am Folge-Werktag.
- **`HG`** — Hintergrunddienst. Ausschließlich Fachärzten vorbehalten.
- Pro Person und Kalendertag ist **maximal ein** Dienst zulässig (Dienst-Exklusivität).

### 3.5 Dienstwünsche (nur Planungsmodus)
Wünsche steuern die Auto-Planung und werden je Zelle gespeichert:
| Code | Bedeutung | Wirkung |
| :--- | :--- | :--- |
| `NO_DUTY` | „Kein Dienst" | **Hartes** Ausschlusskriterium — die Person wird an diesem Tag nie verplant. |
| `BD_WISH` | „BD-Wunsch" | Erhöht die Priorität für einen D an diesem Tag (Bonus im Score). |
| `HG_WISH` | „HG-Wunsch" | Erhöht die Priorität für einen HG an diesem Tag. |

### 3.6 Fixierungen / Pins (nur Planungsmodus)
Eine **fixierte Zelle (Pin)** wird von der Auto-Planung als unveränderlich behandelt — manuell gesetzte Dienste bleiben erhalten, der Algorithmus plant um sie herum.

### 3.7 Die RBN-Zeile (Neuroradiologie-Rufdienst)
Zusätzlich zur personenbezogenen Matrix führt RadPlan eine eigene Zeile **„RD Neurorad"** (Rufdienst Neuroradiologie), gespeichert in `md.rbn[day]`:
- Sichtbar **ab Juni 2025** (`RBN_ROW_START`).
- Auswahl aus einer kuratierten Liste von Neuroradiolog:innen und unterstützenden Radiolog:innen (`RBN_OPTIONS`), z. B. *Prof. Schob (NRAD)*, *Dr. Maybaum (NRAD)*, *Dr. Bailis (NRAD)*, *Dr. Schüngel (NRAD)* sowie *Fr. Dalitz/Fr. Thaler/Dr. Martin/Hr. El Houba (RAD)*.
- **Zeitliche Gültigkeit:** *Fr. Thaler* steht nur **bis einschließlich März 2026** zur Auswahl (`RBN_THALER_LAST_MONTH`) und wird danach automatisch aus der Optionsliste entfernt.
- Im PDF-Export optional ein-/ausblendbar.

### 3.8 Personalabgänge
`EMPLOYEE_DEPARTURES` modelliert befristete Zugehörigkeit. Beispiel: **Hr. Torki** ist bis Juni 2026 aktiv (Abgang Juli 2026). Die Funktion `isEmployeeActiveInMonth()` blendet abgegangene Personen ab dem Abgangsmonat aus; beim Laden/Speichern **bereinigt** `reconcileEmployeesForMonth()` Mitarbeiterlisten, Zuweisungen und Kommentare automatisch.

---

## 4. Stammdaten, Rollen & Sonderregeln

### 4.1 Mitarbeiter-Stammdaten (`EMP_META`)
Jede Person trägt ein reiches Stammdatenblatt: **vollständiger Name**, **Position** (Kürzel + Klartext), **Facharzttyp**, **Schwerpunkt/Bereich**, **Vertreter (Deputy)**, **Zugehörigkeit seit**, **Beschäftigungsgrad (FTE)**, **Telefon-Kürzel** und **Tags**. Diese Daten speisen das Profil, die Avatare (Initialen + positionsabhängige Farbverläufe), Rollenfilter und Tooltips.

**Positions-Hierarchie** (mit eigener Farbcodierung in `posColor`):
`CA` (Chefarzt) → `LOA` (Leitender Oberarzt) → `OA`/`OÄ` (Ober­arzt/-ärztin) → `FA`/`FÄ` (Facharzt/-ärztin) → `AA`/`AÄ` (Assistenzarzt/-ärztin).

### 4.2 Rollenklassifikation für die Engine
- **Facharzt (`isFacharzt`)**: alle Positionen außer AA/AÄ. Nur Fachärzte dürfen **HG** und **Samstags-BD** leisten.
- **Assistenzarzt (`isAssistenzarzt`)**: AA/AÄ — und als **Fallback** jede Person ohne hinterlegte Rolle (mit Hinweis, die Stammdaten zu ergänzen).
- **`EMP_ROLE_OVERRIDES`**: optionale, datengetriebene Rollen-Übersteuerung für Personen ohne `EMP_META`.
- **`hasKnownRole`**: meldet, ob eine Person rollentechnisch bekannt ist.

### 4.3 Datengetriebene Sonderregeln (`SPECIAL_RULES`)
Alle personen- und paarbezogenen Ausnahmen sind **zentral und konfigurierbar** hinterlegt (keine im Code verstreute Namenslogik):

| Regel | Konfiguration (aktueller Stand) | Wirkung |
| :--- | :--- | :--- |
| `dutyExempt` | `Prof. Schäfer` | Komplett dienstbefreit (BD-Ziel 0). |
| `reducedBdTarget` | `Dr. Polednia: 3`, `Dr. Becker: 3`, `Hr. Sebastian: 3` | Reduziertes monatliches BD-Ziel (Standard sonst **4**). |
| `noBdWeekdays` | `Dr. Polednia: So/Di/Do` | Absolutes BD-Verbot an diesen Wochentagen. |
| `noHgFromAaWeekdays` | `Dr. Polednia: So/Di/Do` | Kein HG für einen AA an diesen Tagen (Kollision mit Kinder-US am Folgetag). |
| `saturdayUltimaRatio` | `Dr. Becker` | Samstags-BD nur als Notlösung (gelockerter Modus). |
| `saturdayFzaCompensation` | `Dr. Becker` | Nach Samstags-BD zwingend ein FZA-Tag. |
| `ctLeadershipPairs` | `[Dr. Becker, Dr. Martin]` | CT-Leitungspaar: nie gleichzeitig abwesend/frei an Werktagen. |
| `hgConflictRules` | `Fr. Dalitz` (So/Mo) ↔ BD-Halter `Hr. Torki`/`Hr. Sebastian` | Kein HG für Dalitz, wenn an So/Mo einer der genannten den BD hält. |

Zugriffshelfer (`getReducedBdTarget`, `isNoBdWeekday`, `isSaturdayUltimaRatio`, `getCtLeadershipPartner`, `getHgConflictBd` …) kapseln diese Tabelle für die Engine.

---

## 5. Persistenz & Server-Synchronisation

RadPlan verfolgt eine **Offline-First-, Server-Truth-Strategie**: lokal sofort, Server als Quelle der Wahrheit, robuste Konfliktauflösung.

### 5.1 Lokale Speicherung (`localStorage`)
| Schlüssel | Inhalt |
| :--- | :--- |
| `radplan_v3` | der gesamte Hauptdatenstand (`DATA`) |
| `radplan_v3_plan_<Jahr>-<Monat>` | gespeicherte Planungsentwürfe je Monat |
| `radplan_v3_theme` | `light` / `dark` |
| `radplan_v3_colorblind` | `1`, wenn Farbenblind-Modus aktiv |

### 5.2 Lade-Sequenz (`loadFromStorage`)
1. **`GET /api`** versuchen → bei Erfolg wird der Server-Snapshot übernommen, normalisiert und um Personalabgänge bereinigt.
2. **Fällt der Server aus**, wird transparent auf den `localStorage`-Stand zurückgefallen (Offline-Betrieb).

### 5.3 Speicher-Sequenz (`saveToStorage` → `flushSaveToServer`)
- Jede Mutation schreibt **sofort** nach `localStorage` und stößt eine **entprellte** (120 ms) Server-Übertragung an.
- Vor dem ersten Schreiben wird sichergestellt, dass ein gültiger Server-Stand vorliegt (sonst `forceSync`).
- **Statusereignisse** (`radplan-save-queued/-start/-success/-error`) werden als CustomEvents gefeuert und in der UI angezeigt.
- **In-Flight-Schutz:** Während ein Speichervorgang läuft, werden weitere zu einem einzigen Folge-Flush zusammengefasst (`saveQueuedWhileInFlight`).

### 5.4 Optimistische Nebenläufigkeit & 3-Wege-Merge
- Der Server vergibt bei jedem `POST` einen frischen `lastModified`-Zeitstempel. Stimmt der vom Client mitgesendete Zeitstempel **nicht** mit dem Serverstand überein, antwortet die Edge-Funktion mit **HTTP 409** und liefert den aktuellen Serverdatenstand mit.
- Der Client führt dann einen **feldgenauen 3-Wege-Merge** (`mergeThreeWay`) durch: `base` (zuletzt bekannter Serverstand) × `local` (eigene ungespeicherte Änderungen) × `server` (verlorenes Rennen). Der Merge rekursiert in die Baumstruktur *Monat → Mitarbeiter → Tag → Zelle*, sodass nur tatsächlich auf beiden Seiten geänderte Felder als Konflikt gelten — alles andere wird **verlustfrei** zusammengeführt. Eine Konfliktstatistik (`localWins`, `serverWins`, `conflicts`) wird per Event gemeldet.
- Planungsentwürfe werden separat gemerged (`mergePlanDrafts`); der gerade aktive Entwurf gewinnt.

### 5.5 Manuelle Synchronisation
- **„Server-Sync erzwingen"** (Mehr-Menü) verwirft lokale Stände und holt den Server-Stand frisch (`forceSyncWithServer`).
- Beim Hintergrund-Sync (`syncWithServer`) wird nur übernommen, wenn der Server einen **neueren** Zeitstempel trägt.

---

## 6. Gesamtaufbau der Oberfläche

Die Desktop-Oberfläche besteht aus festen Zonen (oben → unten):

1. **Kopfzeile (`#app-header`)** — Markenlogo (animiertes SVG), Monatsnavigation, Aktionsleiste.
2. **Planungsleiste (`#plan-bar`)** — nur sichtbar im Planungsmodus.
3. **Statistikleiste (`#stats-bar`)** — Live-Kennzahlen des Monats.
4. **Hauptbereich (`<main>`)** — das scrollbare Dienstplan-Raster plus Tastatur-Hinweiszeile.
5. **Mobile-Ansicht / Mobile-Navigation** — auf schmalen Viewports anstelle des Rasters.

### 6.1 Kopfzeile & Monatsnavigation
- **Marke** „RadPlan" mit animiertem Icon.
- **Monats-Navigation:** ‹ / › für Vor-/Zurück, dazwischen ein **Monats-Label-Button** (`Januar 2026 ▾`), der die **Zeitraumsteuerung** öffnet.
- **Aktionsleiste** (gruppiert):
  - *Verlauf:* Rückgängig / Wiederherstellen (mit Aktiv-/Inaktiv-Zustand).
  - *Werkzeuge:* „Heute"-Sprung, Befehlspalette (Lupe), Theme-Umschalter (Mond/Sonne).
  - *Module:* **Planung**, **Mitarbeitende**, **Jahresplan**.
  - *Mehr-Menü* (Drei-Punkte): Rasterdichte, Farbenblind-Modus, Exportieren, Importieren, Drucken/PDF, Server-Sync erzwingen. (Das Menü wird bewusst außerhalb des `contain`-Headers positioniert und per JS unter dem Button verankert.)

### 6.2 Zeitraumsteuerung (Period-Flyout)
Ein eigenes Flyout zum **unabhängigen** Umschalten von Monat und Jahr — bewusst auch nutzbar **bei offenem Modal** und **im aktiven Planungsmodus**:
- Monats-Dropdown + Jahres-Eingabe mit −/+-Schritten.
- Schnellsprünge „← Monat" / „Monat →".
- „Zeitraum anwenden" und „Heute".
- Kontextzeile mit Live-Rückmeldung.
- Aus dem Mitarbeitenden-Modal heraus über den „Zeitraum"-Knopf erreichbar.

### 6.3 Statistikleiste
Aggregiert den aktuellen Monat in Echtzeit: Anzahl Mitarbeitender sowie pro Code (`MR, CT, US, …, D, HG, U, K, F, WB, FZA, ZU, SU, KK, §15c`) die Gesamtzahl der Vorkommen — jeweils als farbiges Code-Chip mit Zähler. Bei leerem Monat erscheint „Keine Daten".

---

## 7. Das Dienstplan-Raster im Detail

Das Herzstück ist eine dichte Tabelle (`#plan-table`): **Zeilen = Mitarbeitende**, **Spalten = Kalendertage** des Monats.

### 7.1 Tabellenkopf (`renderThead`)
Jede Tagesspalte zeigt gestapelt:
- **Kalenderwoche** (`KW##`) — nur am Wochenbeginn (Montag bzw. Monatsanfang), ISO-konform berechnet (`isoWeekNumber`).
- **Tageszahl** und **Wochentagskürzel** (Mo–So).
- **Feiertagsname** (z. B. „Pfingstmontag"), falls zutreffend.
- Eine **Abdeckungs-Statusleiste** (farbiger Streifen) unter dem Tag:
  - **Grün** = D **und** HG besetzt,
  - **Gelb** = genau einer von beiden besetzt,
  - **Rot** = beide unbesetzt (an Wochenende/Feiertag abgeschwächtes Orange).
- Wochenenden (`we`), Feiertage (`hol`), Freitage (`is-fri`) und der **heutige Tag** (`today`) sind eigens markiert. Ein `title`-Tooltip nennt den Besetzungsstand von D und HG.

### 7.2 Tabellenkörper (`renderTbody`)
- **Rollenbänder:** Wechselt die Rollenkategorie zwischen aufeinanderfolgenden Zeilen (Leitung → FA → AA), zieht das Raster einen sichtbaren Trenner und einen dezenten Bandton ein — **ohne** die Datenreihenfolge zu verändern.
- **Namensspalte:** Name + Positions-Chip + Profil-Icon; ein farbiger linker Rand codiert die Position. Ein **Klick** öffnet das Personenprofil, ein **Rechtsklick** das Kontextmenü („Profil öffnen", „Aus Monat entfernen", „Ab hier dauerhaft entfernen").
- **Tageszellen** sind in der Arbeitsplatzfarbe hinterlegt; Status/Dienst werden als Text bzw. Badge dargestellt. Besondere Zustände:
  - `empty-wd` — leerer Werktag (visuell zurückhaltend),
  - `auto-f-rest` — automatisch gesetzter Ruhetag `F` an Wochenende/Feiertag,
  - `pinned` — fixierte Zelle (nur Planungsmodus),
  - `cell-conflict` — Live-Regelkonflikt (siehe 7.5).
- **Tagesnotizen** werden als kleiner Punkt-Indikator angezeigt; der volle Text erscheint im Tooltip.

### 7.3 Die RBN-Zeile
Unterhalb der Mitarbeitenden (ab Juni 2025) erscheint die Zeile **„RD Neurorad"** mit der tagesweisen Auswahl des Neuroradiologie-Rufdienstes aus der zeitlich gefilterten Optionsliste.

### 7.4 Tabellenfuß (`renderTfoot`)
Spaltenweise Summen/Abdeckungs-Indikatoren je Tag, die den Besetzungsstand zusätzlich verdichten.

### 7.5 Live-Konflikterkennung
Bereits **während der manuellen Bearbeitung** prüft das Raster (`computeGridConflicts`) auf Regelverstöße (z. B. unzulässige Dienstfolgen, Doppelbelegungen, Paar-Konflikte) und markiert betroffene Zellen mit einer **⚠-Flagge** und einem erläuternden `data-conflict`-Tooltip. So werden Probleme sichtbar, lange bevor der Auto-Plan läuft.

### 7.6 Cross-Highlight & Scrollverhalten
- Beim Überfahren/Fokussieren einer Zelle werden **Zeile und Spalte** dezent hervorgehoben (`initGridCrossHighlight`), was die Orientierung in der dichten Matrix erleichtert.
- Das Mausrad scrollt horizontal durch die Tage; mit **Shift** oder über der Namensspalte vertikal (`wheel`-Handler).
- „Heute" zentriert die aktuelle Tagesspalte sanft im Viewport.

---

## 8. Zell-Interaktion: Editor, Schnellaktionen, Tastatur

RadPlan bietet **vier** sich ergänzende Wege, eine Zelle zu bearbeiten — vom schnellsten Tastendruck bis zum vollständigen Editor.

### 8.1 Der Zuweisungs-Editor (`#modal-editor`)
Ein vierstufiges Modal mit Live-Vorschau:
1. **Einsatz** — Arbeitsplatz-Chips (Mehrfachauswahl, z. B. „MR/CT") **oder** ein exklusiver Status-Chip (deaktiviert die Arbeitsplatzwahl).
2. **Dienst** — D / HG, mit Warnhinweis bei Konflikten (z. B. wenn der Slot bereits besetzt ist).
3. **Planung** *(nur im Planungsmodus)* — Dienstwunsch (`NO_DUTY`/`BD_WISH`/`HG_WISH`) und Fixierung/Pin.
4. **Notiz** — freie Tagesnotiz (max. 200 Zeichen, Live-Zähler).

Eine **Vorschau-Box** zeigt fortlaufend das resultierende Zellbild und die Dienste. Fußaktionen: **Löschen**, **Abbrechen**, **Speichern**. Im Planungsmodus markiert ein „PLANUNG"-Badge den Editor.

**Editor-Tastatur:** Tasten `1`–`8` schalten Arbeitsplätze, `D`/`H` schalten Dienste, `S` oder `Enter` speichert, `Esc` schließt. Dienst-Tasten respektieren bereits vergebene Slots.

### 8.2 Desktop-Schnell-Popover (`showCellQuickPopover`)
Beim Fokussieren einer Zelle erscheint ein an die Zelle **angedocktes** Popover mit Arbeitsplatz-Buttons, D/HG, „Löschen" und „Vollständig bearbeiten…". Es positioniert sich automatisch ober-/unterhalb je nach Platz.

### 8.3 Mobile-Radialmenü (`openRadialQuickMenu`)
Per **Langdruck** auf eine Zelle öffnet sich ein radiales Schnellmenü; durch Ziehen wird die Aktion ausgewählt und beim Loslassen ausgeführt (`updateRadialHover`/`releaseRadialMenu`).

### 8.4 Mehrfachauswahl & Drag
- **Strg/Cmd-Klick** fügt einzelne Tage zu einer Mehrfachauswahl hinzu/entfernt sie.
- **Shift-Klick** wählt einen **zusammenhängenden Bereich** vom Anker bis zum Zieltag.
- **Ziehen** über mehrere Zellen erzeugt eine Drag-Auswahl (`applyDragSelection`).
  So lassen sich z. B. ganze Urlaubswochen in einem Zug setzen.

### 8.5 Raster-Tastaturnavigation (`handleGridKeydown`)
Bei fokussierter Zelle (Desktop):
- **Pfeiltasten** — Navigation zur Nachbarzelle,
- **`1`–`8`** — Arbeitsplatz direkt umschalten,
- **`D` / `H`** — Bereitschaft/Hintergrund umschalten,
- **Entf / Rücktaste** — Zelle leeren,
- **Enter** — vollständigen Editor öffnen.

### 8.6 Reichhaltige Tooltips (`celltooltip.js`)
Beim Verweilen über einer Zelle zeigt ein Tooltip: Datum/Status, die **jüngste Diensthistorie** der Person (letzte D-/HG-Dienste über aktuellen und Vormonat), etwaige **Konflikte** und die **Tagesnotiz**.

---

## 9. Der Planungsmodus

Der Planungsmodus erlaubt **risikofreies Experimentieren**: ein vollständig **isolierter Entwurf**, der den Hauptplan nicht berührt, bis er explizit übernommen wird.

### 9.1 Konzept der Plan-Sessions
- Beim Betreten wird je Monat eine **Plan-Session** erzeugt (`createPlanSession`): eine tiefe Kopie von Mitarbeitenden, Zuweisungen, RBN, plus leere **Wünsche** und **Pins**, sowie eine **Baseline** und ein **History-Stack**.
- Entwürfe werden lokal als `radplan_v3_plan_<Monat>` gehalten und beim Server-Sync separat zusammengeführt.
- Der Wechsel des Zeitraums im Planungsmodus persistiert die aktuelle Session und lädt/erzeugt die Ziel-Session.

### 9.2 Die Planungsleiste (`#plan-bar`)
Erscheint oben, sobald der Modus aktiv ist:
- **Links:** pulsierendes „Planungsmodus aktiv"-Badge, betroffener Monat, Hinweis „Änderungen sind unabhängig vom Hauptplan".
- **Mitte:** Rückgängig / Vorwärts (eigener Plan-History-Stack).
- **Rechts:** **Auto-Plan**, **Abbrechen** (verwirft Änderungen), **Speichern** (Entwurf sichern), **Schließen** (Modus verlassen), **Übernehmen** (Entwurf in den Hauptplan überführen).

### 9.3 Undo/Redo
Zwei getrennte Verlaufssysteme:
- **Normalmodus:** delta-basierter Undo/Redo-Stack (`history.js`, bis zu 80 Schritte) für direkte Bearbeitungen am Hauptplan.
- **Planungsmodus:** ein sessiongebundener History-Stack je Entwurf.
Beide sind per Tastatur (Strg/Cmd+Z, Strg/Cmd+Y bzw. +Shift+Z) und über die jeweiligen Buttons bedienbar; die Aktiv-Zustände der Buttons spiegeln die Verfügbarkeit.

---

## 10. Der RadPlan Neural Scheduler (Auto-Plan)

Der Auto-Planer (`autoplan.js`) ist eine **regelbasierte Optimierungs-Engine**, die im Planungsmodus auf Knopfdruck einen vollständigen, fairen Monatsplan erzeugt. Er kombiniert deterministische Regeln, probabilistisches Scoring und eine mehrzyklische Swap-Metaheuristik und macht das Ergebnis über den **Neural Fitness Index (NFI)** messbar.

### 10.1 Gewichtungs-Profile
Vor dem Lauf wählbar (`AUTO_PLAN_WEIGHT_PROFILES`):
| Profil | Label | Charakter |
| :--- | :--- | :--- |
| `standard` | Ausgewogen | Standardbalance aus Regelkonformität, Fairness und Wunscherfüllung. |
| `fairness` | Fairness-optimiert | Gewichtet gleichmäßige WE-/Samstags-/HG-Verteilung stärker; Wünsche treten zurück. |
| `wish` | Wunscherfüllung-optimiert | Gewichtet erfüllte Dienstwünsche deutlich stärker; Fairness tritt zurück. |

Zusätzlich lassen sich **individuelle BD-Monatsziele** je Person vor dem Lauf übersteuern.

### 10.2 Die Optimierungs-Pipeline
1. **Initialisierung** — Aggregation historischer Kennzahlen **seit dem 1. Januar des Zieljahres** (`collectHistoricalDutyStats`: BD, HG, WE-Dienste, Feiertagslast, Donnerstag-BD, HG-für-AA, HG-für-FA, Samstags-BD), Sicherung manuell gesetzter/fixierter Dienste, Auto-Reparatur fehlender Ruhetage.
2. **Konstruktive Phase (Greedy)** — Erstverteilung der BDs zuerst an Wochenenden/Feiertagen, dann an Werktagen, unter strikter Beachtung harter Ausschlüsse.
3. **HG-Bundling** — deterministische Kopplung von HG an BD-Szenarien (s. u.).
4. **HG-Rhythmisierung** — Verteilung der HG-Lücken unter Anti-Clustering-Logik.
5. **Multi-Zyklus-Optimierung — 25 Zyklen**, je Zyklus:
   - **BD-Swap-Pass** (Verfeinerung der BD-Gerechtigkeit),
   - **HG-Swap-Pass** (Aufbrechen von HG-Clustern, Rhythmus-Glättung),
   - **Globaler Deep-Optimize-Pass** (rollenübergreifende Cross-Swaps, z. B. CT-Leitung),
   - **Coverage-Repair** (Zwangszuweisung an die am wenigsten belastete Person zum Lückenschluss).
6. **Validierung** — Dienst-Exklusivität (max. ein Dienst/Tag) und Datenkonsistenz.

### 10.3 Harte Constraints (K.-o.-Kriterien)
- **Abwesenheits-Integrität** — kein Dienst bei `U/ZU/SU/§15c/K/KK/FZA/WB`.
- **Wunsch `NO_DUTY`** — hartes Ausschlusskriterium.
- **Gesetzliche Ruhezeit** — nach jedem BD ist der Folge-Werktag zwingend `F`.
- **Dienst-Exklusivität** — max. ein D/HG pro Person/Tag.
- **Qualifikations-Sperre** — Samstags- und HG-Dienste nur für Fachärzte.
- **BD-Folge-Sperre** — kein BD an zwei aufeinanderfolgenden Tagen (D-D-Verbot).
- **HG-Vortag-Sperre (AA-Regel)** — ein FA leistet keinen HG für einen AA, wenn der FA am Folgetag selbst BD hat.
- **Spezial-Sperre Dr. Polednia** — absolutes BD-Verbot So/Di/Do; ebenso HG-für-AA-Verbot an diesen Tagen.
- **CT-Leitungs-Interdependenz** — Dr. Becker & Dr. Martin nie gleichzeitig abwesend/frei an Werktagen.
- **Urlaubs-Puffer** — kein BD am Tag direkt vor Urlaubsantritt.
- **Feiertags-Alternanz** — wer Ostern Dienst hat, wird für Pfingsten gesperrt (und umgekehrt).

### 10.4 Anti-Clustering & Rhythmus (HG-Fokus)
- **Abstands-Malus (3-Tage):** HG innerhalb 3 Tagen nach einem anderen HG wird stark bestraft.
- **Direkt-Folge-Malus:** Back-to-back-HG (außer Kopplungen) massiv abgewertet.
- **Dichte-Prüfung (Rolling 7-Tage-Fenster):** mehr als 1 HG pro Fenster (ohne Kopplung) wird bestraft.

### 10.5 Kopplungs-Modelle (Bundling)
- **Freitags-Support:** Hat ein AA am Freitag BD, übernimmt der FA des Samstags-BD zwingend den Freitag-HG.
- **Wochenend-Kette:** Ein FA mit Samstags-BD übernimmt zwingend den Sonntag-HG (HG-D-HG-Kette).
- **Feiertags-Vortag:** Hat ein AA am Vortag eines Feiertags BD, übernimmt der FA des Feiertags-BD den Vortags-HG.

### 10.6 Workload-Fairness-Kalkül
Die HG-Last wird mathematisch an die BD-Last gekoppelt:
`Ideal_HG = Ø_HG + (Ø_BD_der_FAs − individuelle_BD) × 1.0`
— wer einen BD weniger als der Schnitt leistet, übernimmt exakt einen HG mehr. Vorjahresdaten dienen nur als minimaler Tie-Breaker bei Punktgleichstand.

### 10.7 Eskalation / Lockerung
Lässt sich keine Vollbesetzung unter allen Regeln erzielen, werden gezielt **weiche** Restriktionen gelockert (vor allem Wochenendabstände, Distanzanforderungen, punktuelle Notlösungen bei engem Kandidatenfeld) — Ziel: Vollbesetzung bei minimalem Fairness-Verlust.

### 10.8 Die „Orbital Core"-Visualisierung (`neuralgraph.js`)
Während der Berechnung läuft eine vollflächige Canvas-Animation mit Phasen (`init` → Konstruktion → Optimierung → `success`/`error`) und einem Live-Fortschrittslog (`phase`, `icon`, `msg`, `pct`). Der Lauf wird bewusst über **~22 Sekunden** gestreckt, um Rechentiefe und Kombinationsvolumen erlebbar zu machen; Fehlerzustände werden visuell abgesetzt.

### 10.9 Ergebnis, Bericht & Score-Erklärung
- **Abschlussbericht** (`#modal-ap-report`): tagesweise Begründungen je Vergabe inkl. Score, Tags und den besten **Alternativ-Kandidaten** — vollständig nachvollziehbar.
- **Übernehmen:** Das Ergebnis wird in den **aktiven Planungsentwurf** übernommen (nicht direkt in den Hauptplan).
- **Neural Fitness Index (NFI, 0–100):** gewichtet aus **BD-Abdeckung (36 %)**, **HG-Abdeckung (24 %)**, **BD-Gerechtigkeit (16 %)**, **HG-Gerechtigkeit (10 %)**, **WE-Fairness (8 %)**, **Wunscherfüllung (6 %)** sowie einem winzigen Deep-Move-Feinabzug.
- **Qualitäts-Detailmodal** (`#modal-score-info`): visualisiert den NFI als Ring, schlüsselt jede Metrik als Karte mit Punktewirkung auf und erläutert die Penalty-Mathematik (Basis 100; harte Verstöße = ∞-Penalty; weiche Verstöße gewichtet) in lesbaren Begründungs-Zeilen.

---

## 11. Mitarbeitendenbereich (Team- & Person-Modal)

Das zusammengeführte Mitarbeiter-Modal (`#modal-emps`) vereint **Teamübersicht** und **Personendetail** in **einem** Modal mit einem Kopf-Umschalter **Team / Person**.

### 11.1 Team-Screen
- **KPI-Leiste:** Mitarbeitende im Jahr (mit Aktivität), aktueller Monatsbestand, Dienste im Jahr (D+HG), Rollenmix (Leitung/FA/AA).
- **Team-Analytics:** Abteilungskennzahlen für **dynamische Zeiträume** — Monat / Quartal / Jahr / Rolling 12M / **Custom** (frei wählbarer Von-Bis-Bereich). Liefert Team-Abdeckung, Dienste D/HG, Ausfalltage, „Top-Aktivität", „Dienst-Fokus", offene Abdeckung sowie eine Top-8-Mitarbeitertabelle (klickbar → Personendetail).
- **Werkzeugleiste:** Volltext-Filter, **Rollenfilter-Pills** (Alle/Chefärzte/Oberärzte/Fachärzte/Assistenz/Ohne Profil, je mit Zähler), „Nur Aktive", **Sortierung** (Name/Position/Dienste/Urlaub/Krank/aktive Monate) und **CSV-Export** der sichtbaren Auswahl (UTF-8-BOM, Excel-/de-locale-freundlich).
- **Karten-Gitter:** je Person eine Karte mit Avatar (Initialen, positionsfarbig), Position, KPIs (Aktiv/D/HG/Urlaub/Krank/FZA), **Abdeckungsbalken**, „X/12 Monate aktiv", Top-Arbeitsplätzen und — beim Betrachten des laufenden Monats — einem **Heute-Badge**. Ein Klick öffnet den Person-Screen.

### 11.2 Person-Screen
Kopf mit Zurück-Button („Team"), Avatar, Name/Meta-Chips (Position, Typ, Bereich, Telefon, Vertreter, Tags) und einem **Personen-Dropdown** zum direkten Wechsel. Darunter ggf. ein **Heute-Status**. Der Inhalt ist in **fünf Tabs** gegliedert:

1. **Übersicht** — Monats-KPIs (Werktage/aktiv/Abdeckung, Nicht geplant, D-/HG-Dienste mit Tagesliste, Urlaub, Krank, FZA, Weiterbildung — jeweils mit **Trendpfeil** zum Vormonat und **Jahres-Summe**), **Arbeitsplatz-Verteilung** als Balken + Donut, **Abwesenheiten & Status**.
2. **Dienste & Feiertage** — Dienst-Detailtabelle (D/HG-Tage als Badges, Wochenend-/Feiertagstage hervorgehoben), der Abschnitt **Feiertagsdienste** (alle gesetzlichen Feiertage des Jahres mit echtem Dienst/Einsatz inkl. Kurzbilanz; reine Abwesenheiten ausgeklammert) und **Dienste nach Wochentag** (gestapeltes Balkenprofil Arbeitstage/HG/D mit Legende).
3. **Kalender** — umschaltbar zwischen **Monatskalender** (klickbare Werktage öffnen den Editor) und **Jahreskalender** (alle 12 Monate kompakt: Tageszellen arbeitsplatzfarbig, D/HG-Marker, Feiertage hervorgehoben, aktueller Monat und heutiger Tag markiert; Klick auf einen Werktag wechselt in den Monat und öffnet den Editor).
4. **Jahresauswertung** — **Jahresverlauf & Trend** (Chart.js: aktive Tage als Balken, D/HG/Urlaub als Linien) plus die **Jahres-Tabelle** (je Monat: Aktiv, Urlaub, Krank, FZA, WB, D, HG, Abdeckung; mit Gesamtzeile).
5. **Verwaltung** — Person dem aktuellen Monat hinzufügen/entfernen, plus die **Monatsliste** mit Hinzufügen/Entfernen beliebiger Personen.

> Charts in zunächst verborgenen Tabs werden nach dem Einblenden korrekt neu vermessen. Das Personenprofil ist außerdem aus dem Raster (Namensklick/Kontextmenü) und aus der Befehlspalette direkt erreichbar.

---

## 12. Jahresplaner

Der Jahresplaner (`#modal-yearplan`, `yearplan.js`) blickt über das ganze Kalenderjahr und besitzt eine eigene Jahresnavigation (‹ Jahr ›) sowie **fünf Tabs**:

1. **Jahres-Gitter** — eine **Heatmap** (Mitarbeitende × Monate). Jede Zelle zeigt BD-Zahl (und HG für FÄ); die Hintergrundfarbe codiert die **Abweichung vom monatlichen Kollegiums-Durchschnitt** (fünfstufige Skala „deutlich unter Ø" bis „deutlich über Ø"). Eine `Ø BD`-Zeile zeigt den Monatsdurchschnitt, eine `Σ Jahr`-Spalte die Jahressumme. Fachärzte und Assistenzärzte sind gruppiert; künftige Monate sind markiert; ein Zellklick navigiert in den jeweiligen Monat.
2. **Fairness-Analyse** — **kumulierte Abweichungskurven** je Person vom monatlichen Ø (Chart.js-Liniendiagramm mit Ideallinie bei 0), umschaltbar zwischen **BD** und **HG**, plus eine begleitende Heatmap-Tabelle mit Σ und Gesamtabweichung.
3. **Dienst Soll/Ist** — je dienstfähiger Person: Monatsziel, aktive Monate, Soll Σ, Ist Σ, Δ und Erfüllungsquote (%); mit Rollenfilter, Sortierung und CSV-Export.
4. **Abwesenheiten** — Urlaub, Krank, FZA, Weiterbildung, Frei und Σ-Abwesenheit je Person; mit Rollenfilter, Sortierung und CSV-Export.
5. **Jahresprojektion** — Hochrechnung des Jahresendstands aus den vorhandenen Monaten (individuelle Monatsrate × Restmonate), Vergleich gegen das Jahresziel (Monatsziel × 12), mit Abweichung und Fortschrittsbalken sowie einem horizontalen Ist-/Projektions-Balkendiagramm.

Die Auswertungs-Tabs teilen sich eine gemeinsame Werkzeugleiste (Rollenfilter-Pills, Sortierung, CSV) im Stil des Mitarbeitenden-Modals.

---

## 13. Abteilungsübersicht

Die Abteilungsübersicht (`#modal-dept`, `render-dept.js`) verdichtet das **gesamte Team** in zwei Tabs:
- **Aktueller Monat** — Abdeckungs-KPIs (u. a. D-/HG-Besetzung als Prozentanteil der Tage) und eine Mitarbeitertabelle mit Aktiv-Tagen, D-/HG-Zahlen und Abwesenheiten.
- **Jahresübersicht** — Jahres-KPIs (D/HG, Abdeckung) und je Person die Jahressummen.

---

## 14. Befehlspalette

Die Befehlspalette (`#modal-command-palette`, `commandpalette.js`) öffnet sich mit **Strg/Cmd+K** (oder über die Lupe) und bietet eine **Fuzzy-Suche** über:
- **Funktionsbefehle:** Jahresplan öffnen, Mitarbeitende verwalten, Daten exportieren/importieren, Drucken/PDF, Planungsmodus starten, Auto-Plan ausführen, „Heute", Theme umschalten, Spaltendichte umschalten.
- **Monate** (springt zum gewählten Zeitraum).
- **Mitarbeitende** (öffnet direkt das Personenprofil).

Bedienbar vollständig per Tastatur (Tippen filtert, ↑/↓ navigiert, Enter führt aus, Esc schließt).

---

## 15. Drucken & PDF-Export

`printpreview.js` bietet zwei Ausgabewege über eine **Druckvorschau** (Strg/Cmd+P oder Mehr-Menü):
- **Browser-Druck** — eine für Papier optimierte, in Tagesbänder gebrochene Darstellung (`print.css`), Quer- oder Hochformat.
- **Native PDF-Erzeugung** — via **jsPDF + autotable** als A4 (Quer-/Hochformat), inklusive eingebettetem, gerastertem App-Logo. Spalten werden in Bänder aufgeteilt (Querformat ~46, Hochformat ~64 Tage pro Bandlogik) und sauber paginiert.
- **Optionen:** Ausrichtung (Quer-/Hochformat) und **RBN-Zeile ein-/ausblenden**.

---

## 16. Import & Export von Daten

- **Export (Strg/Cmd+S außerhalb des Planungsmodus oder Mehr-Menü):** der komplette Datenbestand als **JSON-Datei**.
- **Import (`#modal-import`):** per **Drag & Drop** einer `.json`-Datei, Dateiauswahl **oder** direktem Einfügen von JSON-Text. Eingaben werden validiert; Fehler werden inline gemeldet.

---

## 17. Darstellung, Theming & Barrierefreiheit

### 17.1 Hell-/Dunkelmodus
- Voll ausgearbeitete **Light-** und **Dark-Themes** (CSS-Custom-Properties, Attribut `data-theme`).
- **Automatische Erstwahl** nach `prefers-color-scheme`; manuelle Wahl wird in `radplan_v3_theme` persistiert. Ein **Inline-Skript im `<head>`** setzt das Theme **vor** dem ersten Paint, sodass kein Aufblitzen entsteht. Die `theme-color`-Metaangabe wird mitgeführt.

### 17.2 Farbenblind-Modus
Umschaltbar (Attribut `data-cb`, persistiert in `radplan_v3_colorblind`): maximal unterscheidbare Arbeitsplatzfarben für eingeschränktes Farbsehen. Eine `contrast-audit.mjs`-Routine begleitet die Farbqualität.

### 17.3 Rasterdichte
Umschaltbar zwischen **kompakter** und **komfortabler** Zeilendichte für unterschiedliche Bildschirmgrößen und Vorlieben.

### 17.4 Barrierefreiheit
- Durchgängige **ARIA-Rollen** (`dialog`, `grid`, `tablist`/`tab`/`tabpanel`, `listbox`, `toolbar`, `status`, `alert`), `aria-modal`, `aria-live`-Regionen für dynamische Bereiche.
- Vollständige **Tastaturbedienbarkeit** (Navigation, Editor, Modale, Befehlspalette).
- Sichtbare Fokus-Stile, sinnvolle `title`/`aria-label`, Skip-freundliche Strukturen.
- Sanfte **View-Transitions** (`viewtransition.js`) und reduzierte Bewegungspfade.

### 17.5 Feinschliff („perfekter Touch")
Viele kleine, fachspezifische Details machen RadPlan für den Klinikalltag passgenau: die **Abdeckungs-Statusleiste** im Spaltenkopf signalisiert Lücken auf einen Blick; **automatische Ruhetage** nach Diensten verhindern stille Regelverstöße; die **Live-Konfliktflaggen** warnen während des Tippens; **Rollenbänder** strukturieren die dichte Matrix; **Trendpfeile** und **Jahres-Summen** im Profil setzen jeden Monat in Relation; die **Feiertagsdienst-Liste** macht die faire Feiertagslast nachvollziehbar; die **Heatmap** und **Fairness-Kurven** übersetzen Gerechtigkeit in Bilder; und der **NFI** macht abstrakte Planqualität zu einer einzigen, erklärbaren Zahl.

---

## 18. Mobile- & Responsive-Erfahrung

Unterhalb des Breakpoints (Touch-/Schmalgeräte, `MOBILE_BREAKPOINT`) ersetzt RadPlan das Raster durch eine **mobile Ansicht**:
- **Monats-Zusammenfassung** + **Tagesliste** als Karten (heutige Karte hervorgehoben, automatisches Zentrieren).
- **Untere Navigationsleiste** mit drei Zielen: **Mitarbeitende**, **Planung** (zentral hervorgehoben), **Menü**.
- **Tages-Sheet** (Bottom-Sheet, `#modal-mobile-day`) mit Dienst-Badges und scrollbarem Inhalt zum Bearbeiten eines Tages.
- **Mobile-Menü-Sheet** (`#modal-mobile-menu`) mit allen Aktionen (Ansicht/Navigation, Module, Darstellung, Daten).
- **Radial-Schnellmenü** per Langdruck (siehe 8.3).
- Modale werden auf Mobilgeräten als randlose, bildschirmfüllende Sheets dargestellt; Layouts reagieren live auf `visualViewport` (Tastatur-Overlays).

Die responsive Schicht (`refreshResponsiveLayout`, `mobile-optimization.css`) schaltet Klassen (`is-mobile`), schließt nicht passende Overlays und hält Modal-Layouts (`updateModalLayout`) konsistent.

---

## 19. Kalender- & Feiertagslogik

- **Feiertage Sachsens** werden vollständig berechnet (`getSaxonyHolidays`, gecached), inkl. **beweglicher** Feiertage über die **Gauß'sche Osterformel** (`easterDate`): Neujahr, Karfreitag, Ostermontag, Tag der Arbeit, Christi Himmelfahrt, Pfingstmontag, Tag der Deutschen Einheit, **Reformationstag**, **Buß- und Bettag** (korrekt auf den Mittwoch vor dem 23. November berechnet), 1. & 2. Weihnachtstag.
- **Werktagslogik:** `isWorkday` = kein Wochenende und kein Feiertag; Statistiken trennen Werktage, aktive Tage, Abwesenheiten und Frei sauber.
- **ISO-Kalenderwochen** (`isoWeekNumber`) für die Spaltenköpfe.
- **Monatsgrenzen-Übergänge** (`nextCalendarDay`/`prevCalendarDay`) werden korrekt behandelt — u. a. beim automatischen Setzen des Ruhetags, wenn ein Dienst am Monatsletzten liegt.

---

## 20. Vollständige Tastaturkürzel-Referenz

### Global
| Taste | Aktion |
| :--- | :--- |
| `Alt` + `←` / `→` | Vorheriger / nächster Monat |
| `Strg/Cmd` + `K` | Befehlspalette öffnen |
| `Strg/Cmd` + `S` | Daten exportieren (im Planungsmodus: Entwurf speichern) |
| `Strg/Cmd` + `P` | Druckvorschau / PDF |
| `Strg/Cmd` + `Z` | Rückgängig |
| `Strg/Cmd` + `Y` *oder* `Strg/Cmd` + `Shift` + `Z` | Wiederherstellen |
| `Esc` | Offenes Modal / Flyout schließen |

### Raster (fokussierte Zelle, Desktop)
| Taste | Aktion |
| :--- | :--- |
| `←` `↑` `→` `↓` | Zur Nachbarzelle navigieren |
| `1`–`8` | Arbeitsplatz umschalten (MR, CT, US, AN, MA, KUS, W, T) |
| `D` | Bereitschaftsdienst umschalten |
| `H` | Hintergrunddienst umschalten |
| `Entf` / `Rücktaste` | Zelle leeren |
| `Enter` | Editor öffnen |
| `Strg/Cmd`-Klick | Tag zur Mehrfachauswahl hinzufügen/entfernen |
| `Shift`-Klick | Bereich vom Anker bis Zieltag auswählen |

### Editor
| Taste | Aktion |
| :--- | :--- |
| `1`–`8` | Arbeitsplatz umschalten |
| `D` / `H` | Bereitschaft / Hintergrund umschalten |
| `S` / `Enter` | Speichern |
| `Esc` | Schließen |

---

## 21. Projektstruktur

```
radplan/
├── index.html              # SPA-Grundgerüst, alle Modal-Skelette, CDN-Einbindungen
├── manifest.json           # PWA-Manifest (standalone, Icons, Theme-Farben)
├── package.json            # type:module, Test-Skript (node --test)
├── img/
│   ├── icon.svg            # App-Icon
│   └── icon_animated.svg   # animiertes Markenlogo
├── functions/
│   └── api.js              # Cloudflare Pages Function (KV-Persistenz, /api)
├── js/
│   ├── app.js              # Einstiegspunkt: Verdrahtung, Editor, Tastatur, Lebenszyklus
│   ├── constants.js        # Codes, Stammdaten, Sonderregeln, Datums-/Feiertagsmathematik
│   ├── state.js            # Zustand, localStorage, Server-Sync, 3-Wege-Merge
│   ├── model.js            # Datenzugriff, Statistik-Aggregation, Plan-Sessions
│   ├── history.js          # Undo/Redo (Normalmodus)
│   ├── autoplan.js         # Neural Scheduler (Constraints, Optimierung, Bericht)
│   ├── neuralgraph.js      # „Orbital Core"-Animation der Auto-Planung
│   ├── render-grid.js      # Monatsraster, Schnell-Popover, Radialmenü, Mobile-Tagesansicht
│   ├── render-modals.js    # Editor-/Person-/Score-Modale, Toast, Overlay-Steuerung
│   ├── render-employee-dashboard.js  # Mitarbeitendenbereich (Team + Person-Tabs)
│   ├── render-dept.js      # Abteilungsübersicht (Monat/Jahr)
│   ├── yearplan.js         # Jahresplaner (5 Tabs)
│   ├── printpreview.js     # Druckvorschau + jsPDF-Export
│   ├── commandpalette.js   # ⌘K-Befehlspalette
│   ├── contextmenu.js      # Rechtsklick-Kontextmenü
│   ├── celltooltip.js      # reichhaltige Zell-Tooltips
│   ├── viewtransition.js   # View-Transitions beim Monatswechsel
│   └── icons.js            # SVG-Icon-Helfer
├── css/
│   ├── core.css            # Custom-Properties, Theme-Variablen, Basis
│   ├── layout.css          # Header, Hauptlayout, Grid-Wrapper
│   ├── components.css       # Buttons, Badges, Chips, Karten
│   ├── chips.css           # Code-/Status-Chips
│   ├── modals.css          # Overlay- & Modal-System
│   ├── views.css           # Mitarbeiter-/Jahres-/Abteilungs-Ansichten, Kalender, Tabs
│   ├── contextmenu.css     # Kontextmenü
│   ├── mobile-optimization.css  # responsive/mobile Schicht
│   ├── enhancements.css    # Feinschliff/Animationen
│   └── print.css           # Druck-Stylesheet
├── test/
│   ├── autoplan.test.js    # Engine-Tests
│   ├── history.test.js     # Undo/Redo-Tests
│   └── contrast-audit.mjs  # Farbkontrast-Audit
├── algorithm_rules.md          # algorithmische Spezifikation (v3.2)
├── Algorithmus-Kriterien.txt   # Vergabekatalog / Kriterien
├── Algorithmusregeln.txt       # Regelwerk
└── radplan.json                # Beispiel-/Produktivdatenstand (Snapshot)
```

---

## 22. Entwicklung, Tests & Deployment

### 22.1 Lokal ausführen
RadPlan benötigt **keinen Build**. Es genügt, das Verzeichnis über einen beliebigen statischen Webserver auszuliefern (die `/api`-Route ist nur für die Server-Synchronisation nötig; ohne sie läuft RadPlan offline gegen `localStorage`). Beispiel:

```bash
# irgendein statischer Server, z. B.:
npx serve .
# oder
python3 -m http.server 8000
```

> Die App lädt ES-Module und externe CDN-Skripte — sie muss über `http(s)://` (nicht `file://`) ausgeliefert werden.

### 22.2 Tests
```bash
npm test        # node --test test/**/*.test.js
```
Die Tests decken die Auto-Plan-Engine und das Undo/Redo-System ab; `contrast-audit.mjs` prüft die Farbkontraste.

### 22.3 Deployment
- Auslieferung als **Cloudflare Pages**-Projekt: statische Assets + `functions/api.js` als Pages Function.
- **KV-Binding** `RADPLAN_KV` muss konfiguriert sein (Schlüssel `RADPLAN_DATA`). Fehlt das Binding, antwortet `/api` mit HTTP 500 und einem klaren Fehlertext.
- Als **PWA** installierbar (Manifest „standalone", Apple-Touch-Meta, Theme-Farben, maskable Icon).

---

## 23. Glossar & Codetabellen

### Dienste & Abkürzungen
| Begriff | Bedeutung |
| :--- | :--- |
| **BD / D** | Bereitschaftsdienst (Front-Dienst vor Ort) |
| **HG** | Hintergrunddienst (fachärztliche Rückfallebene; nur FÄ) |
| **RBN / „RD Neurorad"** | Rufdienst Neuroradiologie (eigene Planzeile) |
| **NFI** | Neural Fitness Index — Planqualität 0–100 |
| **FZA** | Freizeitausgleich |
| **WB** | Weiterbildung |
| **KW** | Kalenderwoche (ISO) |
| **FTE** | Beschäftigungsgrad (Voll­zeitäquivalent) |
| **Pin** | fixierte Zelle, von der Auto-Planung unangetastet |

### Positionen
| Kürzel | Bedeutung | Dienstrelevanz |
| :--- | :--- | :--- |
| `CA` | Chefarzt | i. d. R. dienstbefreit (konfigurierbar) |
| `LOA` | Leitender Oberarzt | Facharzt (D + HG) |
| `OA` / `OÄ` | Oberarzt/-ärztin | Facharzt (D + HG) |
| `FA` / `FÄ` | Facharzt/-ärztin | D + HG + Samstags-BD |
| `AA` / `AÄ` | Assistenzarzt/-ärztin | nur BD (kein HG, kein Samstags-BD) |

### Arbeitsplätze (Tastenkürzel 1–8)
`1 MR` · `2 CT` · `3 US` · `4 AN` · `5 MA` · `6 KUS` · `7 W` · `8 T`

### Status
`F` Frei · `U` Urlaub · `ZU` Zusatzurlaub · `SU` Sonderurlaub · `§15c` Freistellung · `FZA` Freizeitausgleich · `K` Krank · `KK` Kind krank · `WB` Weiterbildung

---

<div align="center">

**RadPlan** — entwickelt für die **Klinik für Radiologie & Nuklearmedizin, Klinikum St. Georg Leipzig**.
Faire Dienste, transparente Regeln, ein Klick zum perfekten Monat.

</div>
