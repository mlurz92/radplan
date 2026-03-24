# RadPlan – vollständige Anwendungsdokumentation

RadPlan ist eine vollständig lokal im Browser laufende Dienstplan-Anwendung für radiologische Teams. Die App kombiniert manuelle Planung, einen geschützten Planungsmodus, automatische Dienstverteilung (BD/HG), umfassende Auswertungen, Import/Export und einen transparenten Algorithmus-Trace im Auto-Plan-Modal.

> **Kurz gesagt:** Du kannst den kompletten Monatsdienstplan ohne Backend erstellen, iterativ verbessern, intern prüfen, als Entwurf sichern und anschließend kontrolliert in den Hauptplan übernehmen.

---

## Inhaltsverzeichnis

1. [Zielbild und Einsatzrahmen](#1-zielbild-und-einsatzrahmen)
2. [Technischer Betrieb und Start](#2-technischer-betrieb-und-start)
3. [Datenhaltung, Speicherorte und Schlüssel](#3-datenhaltung-speicherorte-und-schlüssel)
4. [Domänenmodell: Mitarbeitende, Zellen, Sonderzeilen](#4-domänenmodell-mitarbeitende-zellen-sonderzeilen)
5. [UI-Struktur und Navigation](#5-ui-struktur-und-navigation)
6. [Monatsraster im Detail](#6-monatsraster-im-detail)
7. [Editor-Modal (Desktop + Mobile)](#7-editor-modal-desktop--mobile)
8. [Planungsmodus (Draft-Sandbox)](#8-planungsmodus-draft-sandbox)
9. [Auto-Planung Engine (BD/HG)](#9-auto-planung-engine-bdhg)
10. [Regelkatalog und harte/weiche Restriktionen](#10-regelkatalog-und-harteweiche-restriktionen)
11. [Qualitätsmetriken, Warnungen und Abschlussbericht](#11-qualitätsmetriken-warnungen-und-abschlussbericht)
12. [Abteilungsübersicht und Mitarbeitenden-Dashboard](#12-abteilungsübersicht-und-mitarbeitenden-dashboard)
13. [Import/Export inklusive Datenmigrationen](#13-importexport-inklusive-datenmigrationen)
14. [Speziallogik RBN (RD Neurorad)](#14-speziallogik-rbn-rd-neurorad)
15. [Tastatur, UX-Details, Responsivität](#15-tastatur-ux-details-responsivität)
16. [Fehlerbilder, Diagnostik und Best Practices](#16-fehlerbilder-diagnostik-und-best-practices)
17. [Dateistruktur und Code-Orientierung](#17-dateistruktur-und-code-orientierung)
18. [Datenschutz, Sicherheit, Grenzen](#18-datenschutz-sicherheit-grenzen)
19. [Praktische Arbeitsabläufe (Empfehlungen)](#19-praktische-arbeitsabläufe-empfehlungen)
20. [FAQ](#20-faq)

---

## 1) Zielbild und Einsatzrahmen

RadPlan adressiert den typischen radiologischen Monatsplan mit drei gleichzeitig relevanten Ebenen:

- **Tageszuweisung** je Mitarbeiter:in (Arbeitsplatz/Status).
- **Dienstbesetzung** je Kalendertag (`D` Bereitschaft, `HG` Hintergrund).
- **Fairness und Restriktionen** über den Monat (Ziele, Wochenenden, Abstände, Wünsche, Abwesenheiten).

Die Anwendung ist darauf ausgelegt, sowohl rein manuell als auch teilautomatisiert zu arbeiten:

- Manuell, wenn individuelle Feinsteuerung nötig ist.
- Planungsmodus + Auto-Planung, wenn komplexe Nebenbedingungen konsistent und reproduzierbar erfüllt werden sollen.

---

## 2) Technischer Betrieb und Start

### 2.1 Laufzeitmodell

- **Client-only**: Es gibt kein Backend.
- **Persistenz im Browser** über `localStorage`.
- **Offline-fähig**, solange die Dateien lokal verfügbar sind.

### 2.2 Start

1. Projektdateien lokal bereitstellen.
2. `index.html` im Browser öffnen.
3. Optional: als PWA installieren (wenn Browser/Umgebung dies unterstützt).

### 2.3 Empfohlene Nutzung

- Desktop für umfangreiche Bearbeitung.
- Mobile für schnelle Tageskorrekturen und Überblick.
- Regelmäßige JSON-Exporte als Backup (siehe Kapitel 13).

---

## 3) Datenhaltung, Speicherorte und Schlüssel

### 3.1 Persistenz

Zentrale lokale Speicherung erfolgt unter:

- `radplan_v3` (Hauptspeicher der Anwendung)

### 3.2 Monatsschlüssel

Monatsdaten werden unter `YYYY-M` geführt (Monat 0-basiert im internen Key).

### 3.3 Datensegmente

- **`main`**: produktiver Hauptplan.
- **`plans`**: Planungsentwürfe (Planungsmodus-Drafts).

Jeder Monatsblock enthält mindestens:

- `employees: string[]`
- `assignments: { [employee]: { [day]: { assignment?, duty? } } }`
- `rbn: { [day]: string }`

Optional (Planungsmodus):

- `wishes: { [employee]: { [day]: 'NO_DUTY' | 'BD_WISH' | 'HG_WISH' } }`

---

## 4) Domänenmodell: Mitarbeitende, Zellen, Sonderzeilen

### 4.1 Mitarbeitende

Mitarbeitende besitzen Rollen-/Metadaten (z. B. CA/LOA/OA/FA/AA), die in der Algorithmik genutzt werden:

- Facharzt-/Assistenzarzt-Erkennung
- Einschränkungen für bestimmte Tage/Regeln
- Darstellung in Dashboards

### 4.2 Zellenmodell

Eine Tageszelle kann unabhängig kombinieren:

- **`assignment`**: Arbeitsplatz oder Status (z. B. `MR`, `CT`, `U`, `K`, `FZA`, ...)
- **`duty`**: `D` oder `HG`

### 4.3 Folgetag-Mechanik nach BD

Nach einem gesetzten `D` kann ein Folgetag automatisch auf `F` gesetzt werden (wenn leer), inkl. Reparaturmechanismen bei Import/Planübernahme.

### 4.4 Sonderzeile RBN

Ab Juni 2025 existiert eine zusätzliche, rein manuelle Zeile:

- **`RD Neurorad (RBN)`**
- eigene Auswahlwerte pro Tag
- nicht Teil der Auto-Plan-Optimierung

---

## 5) UI-Struktur und Navigation

### 5.1 Hauptkopf

- Monat/Jahr-Navigation
- Aktionen (Planungsmodus, Import/Export, Dashboards etc.)

### 5.2 Hauptbereich

- Monatsraster als zentrale Arbeitsfläche
- farbcodierte Zellen, Badges und Hinweise

### 5.3 Mobile Navigation

- Bottom-Nav für zentrale Funktionen
- mobile Sheets für Tagesdetails und Aktionen

### 5.4 Modals

Wichtige Modals:

- Editor
- Profilansicht
- Import
- Abteilungsübersicht
- Mitarbeitenden-Dashboard
- Auto-Planung (Konfiguration, Laufansicht, Ergebnis, Bericht)

---

## 6) Monatsraster im Detail

- Tageskopf mit Wochentagskürzeln und Kontextmarkierung
- Mitarbeiterzeilen mit klickbaren Zellen
- Dienstmarker (`D`, `HG`) pro Tag
- Summenzeilen für Schnellüberblick
- Sonderzeile `RD Neurorad (RBN)` bei relevanten Monaten

Ziel des Rasters: schnelle visuelle Erkennung von

- Abwesenheitsclustern
- Diensthäufungen
- Wochenendlast
- Lücken in der Besetzung

---

## 7) Editor-Modal (Desktop + Mobile)

### 7.1 Standard-Bearbeitung

- Arbeitsplatzcodes setzen/entfernen (inkl. Mehrfachzuweisung)
- Status setzen (Urlaub/Krank/FZA/…)
- Dienste (`D`, `HG`) setzen mit Exklusivprüfung je Tag

### 7.2 Planungsmodus-Zusatz

- Wunschcodes setzen:
  - `NO_DUTY`
  - `BD_WISH`
  - `HG_WISH`

### 7.3 RBN-Bearbeitung

Im RBN-Kontext zeigt der Editor nur die zulässigen RBN-Optionen; keine normalen Dienst-/Statusfelder.

### 7.4 Sicherheitsprüfungen

Der Editor blockiert oder warnt bei Konflikten (z. B. wenn Tagesregeln verletzt würden).

---

## 8) Planungsmodus (Draft-Sandbox)

Planungsmodus trennt Hauptplan und Entwurf strikt.

### 8.1 Grundprinzip

- Änderungen erfolgen im Entwurf, nicht direkt im Hauptplan.
- Undo/Redo historisiert Entwurfsänderungen.
- Entwurf kann gespeichert/verworfen oder übernommen werden.

### 8.2 Übernahme in Hauptplan

Beim Übernehmen werden die Entwurfsdaten in den Hauptplan geschrieben; anschließend kann ein Reparaturlauf erfolgen (z. B. fehlende Folgetage `F` nach `D`).

### 8.3 Warum das wichtig ist

- Sichere „Sandbox“ für riskante Replanungen.
- Nachvollziehbare Iteration ohne Produktivdatenverlust.

---

## 9) Auto-Planung Engine (BD/HG)

Die Auto-Planung arbeitet ausschließlich auf Planungsdaten.

### 9.1 Ablaufphasen

1. **Analyse/Initialisierung**
2. **BD-Verteilung** (Wochenende/Feiertag zuerst, dann Werktage)
3. **BD-Optimierung**
4. **HG-Kopplung + HG-Verteilung**
5. **Metaheuristik (global)**
6. **Validierung**
7. **Ergebnisaufbereitung**

### 9.2 BD-Zielsteuerung

Vor der Berechnung können pro Mitarbeiter:in Zielwerte für BD gesetzt werden.

Neuere Optimierungslogik priorisiert explizit, Überhänge bei einzelnen Personen abzubauen, wenn anderswo Unterdeckung gegen Zielwerte existiert.

### 9.3 Laufansicht („Algorithmus-Modal“)

Während der Berechnung zeigt das Modal live:

- Phasenpipeline
- Fortschrittsbalken
- Live-Statistiken (BD/HG/Regeln/Moves)
- Regeltheater mit Severity-Anzeige
- Terminal-Trace mit Zeitstempeln und Phasenbadges

---

## 10) Regelkatalog und harte/weiche Restriktionen

Die Engine kombiniert harte und weiche Regeln.

### 10.1 Harte Regeln (Auszug)

- Abwesenheiten blockieren Dienste.
- `NO_DUTY` blockiert Dienste.
- Tagesexklusivität je Diensttyp.
- Distanz-/Direktfolgeregeln für Dienste.
- Spezifische Personenregeln (z. B. Wochentagsrestriktionen).
- Feiertags-/Wochenendrestriktionen.

### 10.2 Weiche Regeln (Auszug)

- Zielerfüllung BD je Person.
- Monatsausgleich HG.
- Wochenendlast-Ausgleich.
- Wunschberücksichtigung.
- D-F-D-F-Muster weich vermeiden.

### 10.3 Relaxed Fallback

Wenn keine harte Lösung existiert, kann die Engine kontrolliert Regeln lockern, um Vollbesetzung zu sichern. Das wird im Report/Warnungen transparent gemacht.

---

## 11) Qualitätsmetriken, Warnungen und Abschlussbericht

### 11.1 Qualitätsindikatoren

- Streuung BD/HG
- Abdeckungslücken
- Wunscherfüllung
- Wochenend- und Feiertagslast

### 11.2 Warnungen

Warnungen entstehen z. B. bei:

- nicht erreichbarer Zielerfüllung
- unvermeidbaren Regelrelaxationen
- kritischen personenspezifischen Konstellationen

### 11.3 Bericht

Ein detaillierter Report listet pro Tag/Zuweisung:

- wer zugewiesen wurde
- warum (Begründung)
- welche Regel-/Optimierungstags beteiligt waren

---

## 12) Abteilungsübersicht und Mitarbeitenden-Dashboard

### 12.1 Abteilungsübersicht

Monatliche Gesamtsicht mit aggregierten Kennzahlen.

### 12.2 Mitarbeitenden-Dashboard

Jahresansicht pro Person inkl. Rollen-/Filtermöglichkeiten, Dienst- und Lastverläufe.

---

## 13) Import/Export inklusive Datenmigrationen

### 13.1 Export

JSON-Export enthält:

- `main`
- `plans`

Somit sind Hauptdaten, Entwürfe, Wünsche und RBN-Daten vollständig transportierbar.

### 13.2 Import

Unterstützt:

- vollständige Exportpakete
- geeignete Monatsdatenstrukturen

Beim Import werden Daten normalisiert (fehlende Container ergänzt) und notwendige Reparaturlogik angewendet.

### 13.3 Empfehlung

- Vor größeren Replanungen stets Export erzeugen.
- Nach Import stichprobenartig Monate prüfen.

---

## 14) Speziallogik RBN (RD Neurorad)

- Sichtbar ab Juni 2025.
- Eigene Auswahlwerte je Tag.
- `Fr. Thaler (RAD)` nur bis einschließlich März 2026 auswählbar.
- Auto-Planung liest/schreibt RBN nicht.

---

## 15) Tastatur, UX-Details, Responsivität

- Mobile-optimierte Modalhöhen/Scrollbereiche
- visuelle Zustandschips und Badges
- Toast-Feedback bei Aktionen
- Fokus auf performante, klare Rückmeldung bei langen Auto-Plan-Läufen

---

## 16) Fehlerbilder, Diagnostik und Best Practices

### Häufige Ursachen für unerwartete Ergebnisse

1. Unvollständige Mitarbeitendenlisten im Monat.
2. Sehr strikte Zielwerte bei gleichzeitig hoher Abwesenheit.
3. Vorbelegte Dienste aus Vormonat/Folgemonat erzeugen Randkonflikte.

### Maßnahmen

- Ziele moderat setzen und iterativ nachschärfen.
- Regelwarnungen im Ergebnis ernst nehmen.
- Bei Bedarf manuell nachjustieren und erneut optimieren.

---

## 17) Dateistruktur und Code-Orientierung

- `index.html` – komplette UI-Struktur inkl. Modals
- `app.css` – Layout, Komponenten, responsive Verhalten, Visualisierung
- `app.js` – State, Rendering, Editor, Persistenz, Import/Export, Auto-Plan-Engine

Weitere Dateien:

- `manifest.json`, Icons (`img/`), Regel-/Check-Dokumente (`Algorithm_*`, `ChangeChecklist.md`)

---

## 18) Datenschutz, Sicherheit, Grenzen

- Daten bleiben lokal im Browser, solange kein Export geteilt wird.
- Kein serverseitiges User-/Rechtemodell.
- Browser-Storage ist geräte-/browsergebunden.

**Wichtig:** Für produktivkritische Umgebungen sollten organisatorische Backup- und Freigabeprozesse definiert sein.

---

## 19) Praktische Arbeitsabläufe (Empfehlungen)

### Workflow A: Monatsneuanlage

1. Mitarbeitende prüfen
2. Abwesenheiten setzen
3. Planungsmodus starten
4. BD-Ziele setzen
5. Auto-Plan laufen lassen
6. Ergebnis prüfen (Warnungen, Fairness)
7. manuell feinjustieren
8. übernehmen
9. exportieren

### Workflow B: kurzfristige Korrektur

1. betroffenes Datum öffnen
2. Editoranpassung
3. Konfliktprüfung
4. optional Mini-Replan im Planungsmodus
5. Abschluss-Export

---

## 20) FAQ

**Kann ich RadPlan ohne Internet nutzen?**  
Ja, nach lokalem Bereitstellen der Dateien.

**Werden meine Daten an einen Server gesendet?**  
Nein, die App arbeitet clientseitig.

**Kann die Auto-Planung alles perfekt lösen?**  
Nicht immer: harte Restriktionen können Zielwerte unvollständig erfüllbar machen. Die App macht das transparent über Warnungen/Report.

**Kann ich einen Entwurf zurücknehmen?**  
Ja, über Undo/Redo im Planungsmodus und durch Verwerfen des Entwurfs.

---

Wenn du für dein Team zusätzlich eine **Betriebs-SOP** (z. B. Rollen, Freigaben, Backup-Intervalle, Monatsabschluss-Checkliste) möchtest, kann diese README direkt als Grundlage erweitert werden.
