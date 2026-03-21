# RadPlan — Digitaler Dienstplan
## Klinik für Radiologie & Nuklearmedizin

---

## Inhaltsverzeichnis

1. [Überblick](#1-überblick)
2. [Technische Architektur](#2-technische-architektur)
3. [Benutzeroberfläche & Layout-System](#3-benutzeroberfläche--layout-system)
4. [Dienstplan-Tabelle & Interaktion](#4-dienstplan-tabelle--interaktion)
5. [Zell-Editor & Effizienz-Features](#5-zell-editor--effizienz-features)
6. [Mitarbeitenden-Verwaltung & Auswertung](#6-mitarbeitenden-verwaltung--auswertung)
7. [Planungsmodus (Entwurfs-Sandbox)](#7-planungsmodus-entwurfs-sandbox)
8. [Auto-Plan-Algorithmus (Dienstverteilungs-Engine)](#8-auto-plan-algorithmus-dienstverteilungs-engine)
9. [Datenmanagement (Import & Export)](#9-datenmanagement-import--export)
10. [Feiertage & Kalenderlogik](#10-feiertage--kalenderlogik)
11. [Performance- & GPU-Optimierung](#11-performance--gpu-optimierung)

---

## 1. Überblick

RadPlan ist eine hochspezialisierte, rein clientseitige Webanwendung zur präzisen Erstellung und statistischen Auswertung von Dienstplänen. Die Software wurde entwickelt, um komplexe medizinische Besetzungsanforderungen mit maximaler Performance und Benutzerfreundlichkeit zu vereinen. Da die Anwendung keine Server-Komponenten benötigt, findet die gesamte Datenverarbeitung und -speicherung lokal im Browser des Anwenders statt.

---

## 2. Technische Architektur

- **Core:** Vanilla JavaScript (ES2020), HTML5, CSS3.
- **Persistenz:** `localStorage` (Primärschlüssel: `radplan_v3`).
- **Typografie:** IBM Plex Sans für UI-Elemente, IBM Plex Mono für tabellarische Daten und Codes.
- **Zero-Dependency:** Keine externen Bibliotheken oder Frameworks; minimaler Overhead und sofortige Ladezeiten.

---

## 3. Benutzeroberfläche & Layout-System

### Adaptives Header-System
Der Header ist fixiert und beherbergt die zentrale Navigation. Ein intelligentes responsives System überwacht die Viewport-Breite: Bevor Schaltflächen überlaufen könnten, werden die Textbeschriftungen ausgeblendet, sodass nur die intuitiven Icons sichtbar bleiben.

### Dynamisches Zeilen-Scaling
Die Höhe der Mitarbeitenden-Zeilen in der Tabelle ist nicht statisch. Sie nutzt ein `clamp`-basiertes System, das die Zeilenhöhe an die verfügbare Viewport-Höhe anpasst. Dies ermöglicht eine optimale Übersicht sowohl auf kleinen Notebook-Displays als auch auf großen Desktop-Monitoren, wobei die Höhe auf das 1,5-fache des Basiswertes begrenzt ist.

### Der Tabellen-Container
Die Haupttabelle ist in einen spezialisierten Container eingebettet:
- **Design:** Abgerundete Ecken (`radius-lg`), Padding zu allen Seiten und eine subtile Schatten-Kontur.
- **Positionierung:** Wenn die Tabelle schmaler als der Bildschirm ist, zentriert sich der gesamte Container automatisch. Bei schmalem Viewport bleibt die volle Scrollbarkeit erhalten.
- **Abschluss:** Der Container schließt bündig direkt unter der letzten Statistikzeile (Hintergrunddienst-Summen) ab.

---

## 4. Dienstplan-Tabelle & Interaktion

### Horizontale Navigation
Die Tabelle unterstützt das horizontale Scrollen direkt über das Mausrad. Eine Bewegung des Rades (vertikaler Delta) wird innerhalb des Tabellenbereichs in eine horizontale Verschiebung umgewandelt, was die Navigation durch den Monat massiv beschleunigt.

### Visuelle Leitsysteme
- **Sticky-Elemente:** Die Namensspalte links und die Datumszeile oben bleiben stets fixiert.
- **Wochenenden & Feiertage:** Farbliche Kodierung in Grau- (WE) und Goldtönen (FT).
- **Freitags-Indikator:** Eine verstärkte Grenzlinie am Freitagabend markiert den Übergang ins Wochenende.
- **Ruhetage (F nach BD):** Automatisch generierte freie Tage nach einem Bereitschaftsdienst werden an Werktagen normal und an Wochenenden/Feiertagen gedimmt (`auto-f-rest`) dargestellt.

---

## 5. Zell-Editor & Effizienz-Features

Der Editor ermöglicht die schnelle Zuweisung von Arbeitsplätzen (Mehrfachauswahl), Status (exklusiv) und Diensten.

### Tastatur-Shortcuts (Power-User)
- **1 bis 8:** Toggelt die vordefinierten Arbeitsplätze (MRT, CT, etc.).
- **D:** Toggelt den Bereitschaftsdienst.
- **H:** Toggelt den Hintergrunddienst.
- **S / Enter:** Speichert die Eingabe und schließt den Editor.
- **Escape:** Verwirft Änderungen.

### Dienst-Validierung
Dienste (D/HG) können nicht doppelt an einem Tag vergeben werden. Der Editor blockiert bereits belegte Dienste und zeigt den aktuellen Inhaber im Tooltip an.

---

## 6. Mitarbeitenden-Verwaltung & Profile

### Dynamische MA-Liste
Mitarbeitende können monatsspezifisch verwaltet werden. Neue Monate erben automatisch die Liste des Vormonats, um den Pflegeaufwand zu minimieren.

### Deep-Analytics Profile
Ein Klick auf einen Namen öffnet ein umfassendes Auswertungs-Dashboard:
- **KPI-Cards:** Arbeitstage, Abwesenheitsquote, Dienst-Soll/Ist-Vergleich.
- **Verteilungs-Charts:** Häufigkeitsanalyse von Arbeitsplätzen und Status-Codes.
- **Mini-Kalender:** Kompakte Monatsübersicht zur schnellen Orientierung.
- **Jahrestabelle:** Kumulierte Werte über das gesamte Kalenderjahr inklusive Abdeckungsquoten.

---

## 7. Planungsmodus (Entwurfs-Sandbox)

Der Planungsmodus ist ein vollständig isolierter Arbeitsbereich.

- **Unabhängigkeit:** Alle Änderungen betreffen nur den aktuellen Entwurf (`planData`). Die produktiven Daten im Hauptplan bleiben unberührt, bis eine explizite Übernahme erfolgt.
- **Wunschsystem:** In diesem Modus können spezifische Wünsche (Dienst-Wunsch, HG-Wunsch, Dienst-Frei) hinterlegt werden, die als primäre Parameter in die Auto-Plan-Engine einfließen.
- **Undo/Redo:** Eine lückenlose Historie erlaubt das Rückgängigmachen und Wiederholen jedes Planungsschritts (Tastatur: `Strg+Z` / `Strg+Y`).

---

## 8. Auto-Plan-Algorithmus (Dienstverteilungs-Engine)

Die Engine verteilt Dienste basierend auf einem gewichteten Scoring-System und einem strikten Regelwerk.

### Besetzungsregeln (Hard Constraints)
1. **Abwesenheitssperre:** Keine Dienste bei Urlaub, Krankheit oder Weiterbildung.
2. **Exklusivität:** Nur ein Dienst (D oder HG) pro Person pro Tag.
3. **Ruhetags-Logik:** Nach jedem Bereitschaftsdienst (D) folgt zwingend ein freier Tag (F).
4. **Muster-Verbot:** Keine konsekutiven Dienste (D-D) und kein D-F-D Muster.
5. **HG-Sperre:** Ein Facharzt erhält keinen Hintergrunddienst (HG) am Tag vor einem Bereitschaftsdienst (D). **Ausnahme:** Freitage (HG am Freitag vor Samstag-BD ist erlaubt).
6. **Spezial-Sperren:**
    - Dr. Becker: Systematischer Ausschluss von Samstags-Diensten.
    - Dr. Polednia: Keine Dienste an Sonntagen, Dienstagen und Donnerstagen.
7. **Qualifikation:** HG-Dienste und Samstags-BD sind Fachärzten vorbehalten.
8. **Vormonats-Check:** Berücksichtigung des letzten Tages des Vormonats zur Vermeidung von Regelverstößen an Tag 1.

### Fairness & Verteilungslogik
- **Wochenend-Minimierung:** Der Algorithmus versucht strikt, die Anzahl der Wochenenden mit Diensten (D oder HG) pro Kopf so gering wie möglich zu halten (Ziel: max. 2 pro Monat).
- **Abstands-Optimierung:** Starke Penalties für zu dichte Dienstfolgen (D-Abstand: min. 5 Tage, HG-Abstand: min. 4 Tage).
- **Zielwert-Priorisierung:** Verteilung basierend auf individuellen monatlichen BD-Zielen.
- **Historischer Ausgleich:** Berücksichtigung der Belastung aus allen in der Datenbank vorhandenen Vormonaten.
- **WE-Bündelung:** An Wochenenden und Feiertagen werden HG-Dienste bevorzugt an Fachärzte vergeben, die bereits einen BD leisten, um zusätzliche Anreisen zu vermeiden.

### Transparenz-Bericht
Nach der Generierung zeigt die Anwendung eine Sektion "Verteilungs-Details". Hier wird präzise begründet, warum bestimmte Entscheidungen getroffen wurden (z.B. Erfüllung von Wünschen, Anwendung der Freitags-Regel oder Bündelung von Diensten).

---

## 9. Datenmanagement (Import & Export)

RadPlan nutzt ein erweitertes JSON-Format für die Datensicherung.

- **Export:** Erzeugt ein Backup, das sowohl die produktiven Daten (`main`) als auch alle gespeicherten Planungsentwürfe (`plans`) aller Monate enthält.
- **Import:** Unterstützt Drag & Drop. Die Software erkennt das Format und führt die Daten mit dem lokalen Speicher zusammen. Nach dem Import wird automatisch eine Konsistenzprüfung durchgeführt und fehlende Ruhetage werden ergänzt.

---

## 10. Feiertage & Kalenderlogik

Die Anwendung verfügt über eine integrierte sächsische Feiertagsberechnung:
- **Dynamisch:** Gaußsche Osterformel für alle beweglichen Feiertage (Karfreitag bis Pfingstmontag).
- **Landesspezifisch:** Inklusive Buß- und Bettag sowie Reformationstag.
- **ISO-Wochen:** Korrekte Berechnung der Kalenderwochen für die Becker/Martin-Vertretungsregel.

---

## 11. Performance- & GPU-Optimierung

Um eine flüssige Bedienung bei großen Datensätzen zu gewährleisten, nutzt RadPlan modernste Browser-Technologien:
- **CSS-Containment:** `contain: layout paint` auf großen Containern (Header, Stats, Tabelle) begrenzt die Repaint-Bereiche.
- **GPU-Layer:** Wichtige UI-Komponenten (Modals, Toasts, Plan-Badges) werden über `transform: translateZ(0)` auf eigene GPU-Layer ausgelagert.
- **Will-Change Hints:** Ankündigung von Transformationen an den Browser zur Vermeidung von Layout-Jitter bei Animationen.
- **Passive Listener:** Scroll- und Wheel-Events sind für maximale Reaktionsgeschwindigkeit optimiert.

---
