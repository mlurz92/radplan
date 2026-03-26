# RadPlan — Vollständige Anwendungs- und Algorithmusdokumentation

> **Stand dieser Dokumentation:** Entspricht dem aktuellen Verhalten der Implementierung in `index.html`, `app.css`, `app.js` sowie den Regel-/Prüfdateien im Repository.

## 1. Zweck der Anwendung

RadPlan ist eine rein clientseitige, browserbasierte Dienstplananwendung für die Klinik für Radiologie & Nuklearmedizin. Die Software deckt den vollständigen Zyklus der monatlichen Dienstplanung ab:

- manuelle Tages- und Zellenpflege,
- sichere Entwurfsplanung im Planungsmodus,
- regelbasierte Auto-Planung für Bereitschaftsdienst (D) und Hintergrunddienst (HG),
- Ergebnisqualität mit Kennzahlen,
- lückenlose Nachvollziehbarkeit über Telemetrie, Abschlussbericht und Regelereignisse,
- persistente lokale Speicherung und strukturierten Import/Export.

Die Anwendung benötigt kein Backend und keine Build-Pipeline zum Betrieb.

---

## 2. Technischer Aufbau

### 2.1 Dateien

- `index.html`: Gesamte App-Struktur, Header, Hauptansicht, modale Dialoge (inkl. Auto-Plan und Abschlussbericht).
- `app.css`: Designsystem, Tabellen-/Modal-Layouts, responsive Regeln, Auto-Plan-Visualisierung und Kompaktverhalten.
- `app.js`: Zustand, Rendering, Benutzerinteraktionen, Persistenz, Import/Export, Auto-Plan-Algorithmus inkl. Telemetrie.
- `Algorithmusregeln.txt`, `Algorithmus-Kriterien.txt`, `Algorithm_check.md`, `Algorithm_check_alt.md`: Fachliche Regel-/Prüfkontexte.

### 2.2 Architekturprinzip

- **Single-Page-Anwendung ohne Serverlogik.**
- **Zustandsorientierte UI:** Monat/Jahr, Planmodus, Overlay-Zustände und ausgewählte Zeilen/Tage steuern den Renderzustand.
- **Monatsdaten als zentrale Einheit:** Mitarbeitende, Zellenbelegung, Wünsche und RBN-Daten sind monatsbezogen.
- **Lokaler Zustand + Persistenz:** Änderungen werden im Browser gespeichert; Export dient als portable Sicherung.

---

## 3. Domänenmodell und Codesystem

### 3.1 Tageszelle

Jede Zelle kann enthalten:

1. `assignment` (Arbeits-/Statuscodes, auch mehrfach codiert wie `MR/CT`),
2. `duty` (`D` oder `HG`).

### 3.2 Typische Assignment-Codes

- Fach-/Arbeitsplatzcodes: `MR`, `CT`, `US`, `AN`, `MA`, `KUS`, `W`, `T`.
- Abwesenheits-/Sondercodes: `F`, `U`, `ZU`, `SU`, `FZA`, `K`, `KK`, `§15c`, `WB`.

### 3.3 Dienste

- **D (Bereitschaftsdienst):** Ziel ist 1 Besetzung pro Tag.
- **HG (Hintergrunddienst):** Ziel ist 1 Besetzung pro Tag.
- D/HG werden mit harten und weichen Regeln verteilt.

### 3.4 Rollen und Ausnahmen

- Mitarbeiterrollen (u. a. Facharzt/Assistenzarzt) beeinflussen Kandidatenmengen und HG-Logik.
- `DUTY_EXEMPT`-Personen sind aus der Auto-Dienstplanung ausgeschlossen.

---

## 4. Bedienbereiche der Oberfläche

### 4.1 Header

- Monatsnavigation (`←`, `→`, Heute),
- Zeitraum-Flyout (Monat/Jahr direkt wählen),
- Aktionen: Abteilung, Planung, Mitarbeitende, Import, Export.

### 4.2 Hauptansicht

- Desktop: tabellarischer Monatsplan.
- Mobile: tageskartenorientierte Liste mit Touch-optimierter Bearbeitung.

### 4.3 Modals

Wesentliche Dialoge:

- Editor (Tages-/Zellenbearbeitung),
- Abteilungsauswertung,
- Planungsmodus-Aktionen,
- Auto-Plan-Konfiguration,
- Auto-Plan-Live-Engine,
- Auto-Plan-Ergebnisübersicht,
- Algorithmischer Abschlussbericht.

---

## 5. Planungsmodus (Entwurfssicherheit)

Der Planungsmodus trennt **Hauptplan** und **Entwurf** strikt:

- Änderungen erfolgen zunächst isoliert im Entwurf.
- Undo/Redo wirkt auf die Entwurfshistorie.
- Entwurf kann gespeichert, verworfen oder in Hauptplan übernommen werden.
- Wünscheingaben werden planungsbezogen ausgewertet.

Verwaltete Entwurfsteile:

- `employees`
- `assignments`
- `rbn`
- `wishes`

---

## 6. Auto-Plan: Pipeline, Logik, Regeln

## 6.1 Pipeline-Phasen

Die Auto-Plan-Engine arbeitet in mehreren Phasen (inkl. Telemetriephasen):

1. `init` – Datenanalyse/Initialisierung,
2. `bd_weekend` – BD-Wochenende/Feiertage,
3. `bd_workday` – BD-Werktage,
4. `bd_optimize` – BD-Optimierung,
5. `hg_bundle` – HG-Bündelung,
6. `hg_assign` – HG-Verteilung,
7. `deep_optimize` – übergreifende Feinoptimierung,
8. `validate` – Endprüfung,
9. `done` – Abschluss.

## 6.2 Vorverarbeitung

- Historische Statistik wird geladen (`collectHistoricalDutyStats`).
- Bestehende feste Dienste werden als gesperrt betrachtet.
- Fehlende automatische Folgetagsruhe nach gesetztem BD wird repariert (`F` am Folgetag, wenn möglich).
- Monats- und Feiertagskontext (Sachsen, Ostern/Pfingsten inkl. Monatsrand) wird vorbereitet.

## 6.3 Zielwerte und Default-Gewichtung

- BD-Ziele sind konfigurierbar pro Person.
- Falls kein Custom-Ziel gesetzt ist, nutzt die Engine Standardziele (`defaultBDTarget`).
- Duty-Exempt wird auf Ziel `0` gesetzt.

## 6.4 Harte Einschränkungen (nicht bzw. nur mit Fallback verletzbar)

- Kein Dienst auf Tagen mit nicht-kompatiblen Belegungen/Abwesenheiten.
- Keine Doppelbelegung gleicher Dienstart am gleichen Tag.
- Rollen-/Eignungsrestriktionen (HG bevorzugt/erfordert passende Qualifikation).
- Distanzregeln zwischen gleichen Diensten.
- Wochenend- und Feiertagsblöcke mit Konfliktlogik (Ostern/Pfingsten-Ausgleich über Monatsgrenzen).

## 6.5 Weiche Regeln / Optimierungsziele

- möglichst gleichmäßige Verteilung von D/HG,
- Reduktion der Streuung bei Wochenenddiensten,
- Erfüllung von Dienstwünschen,
- Minimierung offener Tage,
- Verbesserung über Swap-/Reassign-Schritte.

## 6.6 Wochenendabstand und Kettenlogik

- Wochenenddienste werden so priorisiert, dass keine zu dichte Folge entsteht.
- In knappen Kandidatenlagen kann Relaxed-Fallback greifen (transparente Kennzeichnung über Warn-/Info-Logik).

## 6.7 HG-spezifische Kopplung/Verteilung

- HG-Bündelung und HG-Verteilung laufen separat,
- mit Anschlussoptimierung für faire Lastverteilung,
- unter Berücksichtigung der jeweils besetzten D-Konstellation.

## 6.8 Validierung und Ergebnisobjekte

Die Engine liefert:

- `assignments` (finale D/HG-Belegung),
- `summary` (pro Mitarbeitenden + aggregierte Hinweise/Warnungen),
- `log` (zeitliche Engine-Ereignisse),
- `report` (begründete Entscheidungszeilen pro Dienst),
- `externalAssignments` (monatsübergreifende Folgeeffekte, z. B. Ruhetag),
- `ruleTelemetry` (strukturierte Regelereignisse mit Zählerständen).

---

## 7. Qualitätsmodell (Scoring)

Das Ergebnis enthält `summary.quality`.

### 7.1 Metriken

- `dutyCoverageMisses` (D-Lücken),
- `hgCoverageMisses` (HG-Lücken),
- `bdSpread` (BD-Verteilungsspanne),
- `hgSpread` (HG-Verteilungsspanne),
- `weekendSpread` (Wochenendverteilungs-Spanne),
- `wishFulfillmentRate` (Wunscherfüllung),
- `deepMoves`, `bdOptimizationMoves`, `hgOptimizationMoves`.

### 7.2 Score-Formel (0–100)

Der Qualitätswert wird als gewichtete, geclampte Kombination aus Abdeckung, Fairness, Wünschen und Warnstrafen berechnet; hohe Abdeckung und niedrige Streuung steigern, Warnhäufung senkt den Endscore.

---

## 8. Live-Telemetrie und Constraint Flux Matrix

Während der Berechnung zeigt die App:

- Fortschrittsbalken (Workload/Prozent),
- Live-Zähler (BD/HG/Regeln/Moves),
- Trace-Konsole mit zeitlicher Ereignisfolge,
- **Constraint Flux Matrix** mit aktivem Phase-/Severity-Kontext,
- granularen Details zu aktiver Regel, Kurzdetail, Priorität und Trefferzähler.

Damit ist im Lauf jederzeit ersichtlich, welche konkrete Regel gerade verarbeitet wird.

---

## 9. Ergebnisübersicht und Abschlussbericht

## 9.1 Ergebnisübersicht (Auto-Plan)

- Hero-Bereich mit `Solution Fitness`.
- Indikatorkacheln (`BD-Streuung`, `HG-Streuung`, `WE-Streuung`, `Feinopt.`, `Wünsche`, `Lücken`).
- Akkordeonblöcke für Verteilungen, Details und Hinweise.

Layoutregeln:

- Die Indikatorkacheln bleiben in **einer horizontalen Reihe** (kompakt skaliert bei engen Viewports).
- In der Übersichtsansicht ist der Modal-Body scrollbar.
- Ausgeklappte Kategorien bleiben vollständig sichtbar, übriger Inhalt wird nach unten verschoben.

## 9.2 Algorithmischer Abschlussbericht

- Chronologische Entscheidungsitems pro Tag und Dienst.
- Begründungstexte und Tags pro Entscheidung.
- Fokus auf Auditierbarkeit statt nur Endergebnisdarstellung.

---

## 10. RBN-Sonderlogik (RD Neurorad)

Die RBN-Zeile ist bewusst separat:

- rein manuell,
- nicht durch Auto-Plan überschrieben,
- Import/Export-fähig,
- explizit zur Trennung klinisch sensibler Spezialabsprachen.

---

## 11. Persistenz, Import, Export

## 11.1 Lokale Speicherung

- Daten werden im Browser gehalten (pro Monat/Planstand).
- Historische Monate können in Fairness-/Kontextlogik einfließen.

## 11.2 Export

JSON enthält typischerweise:

- `main` (Hauptplan),
- `plans` (Entwurfsstände),
- inklusive `assignments`, `wishes`, `rbn`.

## 11.3 Import

- Vollständige Exporte und monatsdirekte Daten werden normalisiert eingelesen.
- Konsistenzreparaturen (z. B. Folgetagsruhe nach Dienst) werden berücksichtigt.

---

## 12. Responsive & UX-Grundsätze

- Touch-optimierte mobile Bedienung.
- Mobile Sheets für Modals, inklusive Safe-Area- und Scrollhandling.
- Kontrastreiche Status-/Warnkodierung.
- Semantische Rollen/ARIA-Attribute für wichtige Interaktionsflächen.

---

## 13. Bekannte Grenzen und bewusste Entscheidungen

- Kein Garant auf globales mathematisches Optimum in jedem Randfall.
- Bei extremer Restriktionsdichte priorisiert die Engine Versorgungsabdeckung und markiert notwendige Lockerungen.
- Vollständige Fachentscheidung bleibt in der finalen menschlichen Verantwortung (klinischer Review empfohlen).

---

## 14. Betriebshinweise

- Start: `index.html` im Browser öffnen.
- Empfehlung: regelmäßige JSON-Backups durchführen.
- Bei Monatsabschluss Abschlussbericht und Warnungen fachlich prüfen.

---

## 15. Änderungsprinzip dieser README

Diese README ist als **vollständige Produktdokumentation** aufgebaut (nicht als Delta- oder Changelog-Dokument):

- UI-Bedienung,
- Domänenlogik,
- Planungsmodus,
- Auto-Plan-Regelwerk,
- Qualitätsmetriken,
- Telemetrie,
- Persistenz,
- Grenzen und Betriebsrahmen.

Sie ist damit als zentrale Referenz für Nutzung, Fachabstimmung und technische Weiterentwicklung gedacht.
