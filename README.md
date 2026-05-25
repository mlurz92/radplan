# RadPlan – Leitstellen-taugliche Dienst- und Arbeitsplatzplanung für Radiologie

## Produktvision
RadPlan ist eine klinisch ausgerichtete Progressive Web App zur hochperformanten Monatsplanung von:
- Arbeitsplatzzuweisungen (z. B. MR, CT, US, AN, MA, KUS, W, T),
- Diensten (Bereitschaft `D`, Hintergrund `HG`),
- Abwesenheiten/Statuscodes (z. B. `U`, `K`, `FZA`, `WB`) und
- rollenspezifischer Auswertung auf Team- und Personenebene.

Der Fokus liegt auf leitender Steuerung: schnell erfassen, sofort umplanen, konfliktarm verteilen, fair analysieren.

---

## 1) Kernfunktionen im Überblick

### 1.1 Interaktive Monatsmatrix
- Zeilen: Mitarbeitende plus optionale RBN-Zeile.
- Spalten: Kalendertage eines Monats.
- Jede Zelle zeigt Assignment, Dienstbadges und im Planmodus Wunschindikatoren.
- Wochenenden, Feiertage, Freitage und der heutige Tag sind visuell hervorgehoben.

### 1.2 Editor für Zellbearbeitung
- Arbeitsplätze als Mehrfachauswahl (z. B. `MR/CT`).
- Statuscodes exklusiv zu Arbeitsplätzen.
- Dienstvergabe `D`/`HG` mit Kollisionsprüfung.
- Tastatursteuerung (Power-User): 1–8, D, H, S/Enter.

### 1.3 Neue Mehrtages-Bearbeitung (STRG/CMD)
- **Neu:** Mit gedrückter STRG-/CMD-Taste mehrere Tage **für dieselbe Person** markieren.
- Die markierten Zellen werden visuell signalisiert.
- Öffnet man danach den Editor für diese Person, wird die Auswahl als Batch gespeichert.
- Ideal für schnelle Serienzuweisungen, z. B. MR über mehrere nicht zusammenhängende Tage.

### 1.4 Dashboard-Ebene
- Mitarbeiter-Dashboard: Filter, Rollenansicht, Monats-/Jahresmuster.
- Abteilungs-Dashboard: Coverage, Duty-Lasten, Unterdeckung, Trendsicht.
- Profilmodal: KPI-Karten, Monatsverteilung, Jahresüberblick je Person.

### 1.5 Planungsmodus (Sandbox)
- Entwurf getrennt vom Live-Datenstand.
- Undo/Redo-Historie.
- Persistenz von Entwürfen pro Monat.
- Übernahme per expliziter Aktion.

---

## 2) UX- und Design-Philosophie

### 2.1 Leitgedanken
1. **Geschwindigkeit vor Klicklast**: Direkte Zellinteraktion und Shortcuts.
2. **Informationshierarchie**: Farbe + Text + Badge, nicht nur Farbe.
3. **Konfliktprävention**: Dienste werden auf Belegung geprüft.
4. **Fehlerrobustheit**: Speicherung lokal-first, serverseitige Konfliktbehandlung.
5. **Kontextstabilität**: Modale behalten Fachkontext und Zeitraumbezug.

### 2.2 Visual Refinements (aktuell)
- **Heute-Markierung verstärkt**: klarere Kontur, Glow und leichter Verlauf.
- **Mehrtagesauswahl sichtbar**: amberfarbener Rahmen/Highlight in markierten Zellen.
- Ziel: hohe Erkennbarkeit auch bei dichtem Belegungsmuster.

---

## 3) Bedienung im Detail

### 3.1 Desktop-Workflow
1. Monat/Jahr auswählen.
2. Zelle anklicken → Editor öffnen.
3. Arbeitsplatz/Status/Dienst setzen.
4. Speichern → sofortiges Re-Rendering + Persistenzqueue.

### 3.2 Batch-Workflow für Leitungsaufgaben
1. Für Mitarbeitende X mit **STRG/CMD + Klick** mehrere Tage markieren.
2. Normalklick auf einen markierten Tag → Editor.
3. Zuweisung setzen (z. B. MR) und speichern.
4. Alle markierten Tage werden in einem Schritt aktualisiert.

### 3.3 Mobile
- Kartenorientierte Tagesdarstellung.
- Tagesmodal mit gruppierter Teamansicht.
- Fokus auf lesbare, schnelle Einzelkorrekturen.

---

## 4) Datenmodell

### 4.1 Hauptspeicher
- `DATA` als Monatscontainer (`YYYY-M`).
- Strukturen:
  - `employees: string[]`
  - `assignments[emp][day] = { assignment, duty }`
  - `rbn[day] = name`
  - optional `wishes`

### 4.2 UI-State
- `state.year`, `state.month`, `state.edit`, `state.ed`.
- **Neu:** `state.multiEdit = { emp, days[] }` für Mehrtagesselektion.

---

## 5) Regeln und Automatik

### 5.1 Dienstlogik
- Eindeutige Dienstbelegung pro Tag/Typ.
- `D` setzt bei Bedarf automatisch `F` am Folgetag.
- Feiertage/Wochenenden in der Darstellung und in Regeln berücksichtigt.

### 5.2 AutoPlan (Neural Scheduler)
- Mehrphasige Heuristik mit harten/weichen Constraints.
- Ziel: faire Lastverteilung, hohe Coverage, geringe Konfliktrate.
- Ergebnis inkl. Warnungen und Qualitätsmetriken.

---

## 6) Persistenz, Sync, Konflikte

- Local-first mit `localStorage` als primäre Arbeitskopie.
- Asynchroner Sync gegen `/api`.
- Konflikte (`409`) werden serverseitig aufgelöst, Snapshot kann lokal ersetzen.
- Save-Queue reduziert Schreiblast und verhindert unnötige Requests.

---

## 7) Accessibility, Ergonomie, Qualität

- Fokuszustände für Tastaturbedienung.
- Semantische Rollen/Tabindex an interaktiven Elementen.
- Gliederung durch Farben, Badges, Icons, Textlabels.
- Hover- und Aktionsfeedback für hohe Handlungssicherheit.

---

## 8) Technischer Aufbau

- `index.html`: App-Shell + Modals.
- `js/app.js`: Interaktionen, Editorlogik, Modussteuerung.
- `js/render.js`: Rendering Desktop/Mobile, Tabellen, Dashboards.
- `js/model.js`: Datenzugriff/-mutation.
- `js/state.js`: globaler Zustand.
- `js/autoplan.js`: Planungsalgorithmik.
- `css/*.css`: Layout, Komponenten, Views, Modals.
- `functions/api.js`: Backend-Synchronisationsendpunkt.

---

## 9) Tastaturkürzel

- Editor:
  - `1..8` Arbeitsplatz toggeln
  - `D` Bereitschaft toggeln
  - `H` Hintergrund toggeln
  - `S`/`Enter` speichern
- Global:
  - `Alt + ←/→` Monat wechseln
  - `Ctrl/Cmd + S` speichern/exportieren (kontextabhängig)
  - Planmodus: `Ctrl/Cmd + Z` undo, `Ctrl/Cmd + Y` redo

---

## 10) Änderungsfokus dieser Version

1. **Mehrtages-Selection per STRG/CMD** für denselben Mitarbeitenden.
2. **Batch-Speicherung** im Editor über markierte Tage.
3. **Stärkere Heute-Hervorhebung** für sofortige Orientierung.
4. **Dokumentation vollständig neu strukturiert** auf aktuellen Funktionsstand.

---

## 11) Empfohlene nächste Ausbaustufen

- Shift-Range-Selektion zusätzlich zu STRG/CMD.
- Auswahl-Toolbar („x Tage markiert“, „Auswahl löschen“).
- Optionale Sperren/Regelsets je Rolle (z. B. OA/FA/AA).
- Audit-Trail pro Zelländerung für revisionssichere Nachvollziehbarkeit.

