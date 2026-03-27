# RadPlan — Digitaler Dienstplan Dokumentation

RadPlan ist eine hochspezialisierte, browserbasierte Single-Page-Application (SPA) für die effiziente Dienst- und Arbeitsplatzplanung in der Klinik für Radiologie & Nuklearmedizin. Das System verzichtet vollständig auf ein Backend und agiert als autarkes Planungstool direkt im Browser-Speicher.

## 1. Systemarchitektur & Technologie

### 1.1 Stack
Die Anwendung ist eine reine Vanilla-Anwendung (HTML5, CSS3, ES6+ JavaScript). Es werden keine externen Frameworks oder Build-Pipelines benötigt. Dies gewährleistet maximale Performance und Datensicherheit, da keine Daten den lokalen Browser-Kontext verlassen.

### 1.2 Datenspeicherung
Die Persistenz erfolgt über die `localStorage`-API (`radplan_v3`). Die Daten sind als JSON-Objekt strukturiert, wobei jeder Monat einen eigenen Key nach dem Schema `YYYY-M` besitzt. Alle Daten sind verschachtelt in `employees`, `assignments` und `rbn` gespeichert.

### 1.3 Performance-Optimierung
*   **DOM-Management:** Durch `requestAnimationFrame` und `document.createDocumentFragment`-ähnliche Techniken werden DOM-Updates auf ein Minimum reduziert.
*   **Asynchronität:** Die Auto-Planungslogik nutzt asynchrone Delays (`sleep`), um das UI während der komplexen Berechnung (30-sekündige Simulation) reaktionsfähig zu halten.
*   **Layout:** Das Interface nutzt CSS `contain` und `will-change`, um Browser-Rendering-Pipelines für die hochdynamischen Kalender-Grids zu optimieren.

---

## 2. Der "RadPlan Neural Scheduler" (KI-Planungsalgorithmus)

Der Kern von RadPlan ist eine heuristische Metaheuristik zur Dienstverteilung. Er optimiert Dienste basierend auf harten Bedingungen (Constraint Satisfaction) und weichen Zielsetzungen (Score-Maximierung).

### 2.1 Algorithmus-Phasen
Der Scheduler agiert in 9 sequenziellen Phasen:
1.  **Initialisierung:** Laden historischer Statistiken (bis zum 1. Jan des aktuellen Jahres). Reparatur von Ruhetagen nach BD-Zuweisungen.
2.  **BD Wochenende:** Priorisierte Besetzung von Wochenenden/Feiertagen (wegen Komplexität der FA-Regeln).
3.  **BD Werktage:** Verteilung der Standard-Bereitschaftsdienste.
4.  **BD Optimierung:** Iterative Swaps zur Fairness-Glättung (Minimierung der Standardabweichung).
5.  **HG Bündelung:** Kopplung von HG-Diensten an spezifische BD-Konstellationen (Freitag-AA/Samstag-FA Koppelung).
6.  **HG Zuweisung:** Verteilung der verbleibenden Hintergründe.
7.  **HG Optimierung:** Iterative Verbesserung der HG-Verteilung.
8.  **Metaheuristik (Deep Optimize):** Finale 16 Durchläufe mit globaler Score-Bewertung (Cross-Duty-Swaps).
9.  **Validierung:** Bereinigung von Dienst-Exklusivitäts-Fehlern.

### 2.2 Harte Nebenbedingungen (Hard Constraints)
*   **Exklusivität:** Pro Tag darf exakt ein D und ein HG zugewiesen werden.
*   **Qualifikation:** Samstags-Dienste und alle HGs sind ausschließlich Fachärzten (CA, LOA, OA, OÄ, FA, FÄ) vorbehalten.
*   **Spezifische Verbote:** Dr. Polednia macht keine Dienste an So, Di, Do.
*   **CT-Leitung:** Dr. Becker und Dr. Martin können nicht am selben Tag frei/urlauben.
*   **Feiertagsschutz:** Wer an Ostern Dienst hat, darf nicht an Pfingsten arbeiten.
*   **BD-Ruhetage:** Nach einem BD-Einsatz wird zwingend ein Ruhetag (F) am Folgetag erzwungen.
*   **D-D-Vermeidung:** Keine Dienste an aufeinanderfolgenden Tagen für den gleichen Mitarbeiter.

### 2.3 Fairness-Score (Soft Constraints)
Der Fitness-Score (maximal 100 Punkte) wird durch eine gewichtete Summe normierter Faktoren berechnet:

| Kriterium | Gewichtung | Beschreibung |
| :--- | :--- | :--- |
| **BD-Abdeckung** | 36% | Erfüllung aller benötigten Bereitschaftsdienste. |
| **HG-Abdeckung** | 24% | Erfüllung aller benötigten Hintergrunddienste. |
| **BD-Fairness** | 16% | Minimierung der Spread-Differenz zwischen BD-Zielen. |
| **HG-Fairness** | 10% | Minimierung der Spread-Differenz bei HG-Zuweisungen. |
| **WE-Fairness** | 8% | Gleichverteilung der Wochenenddienste (Ziel 1.0). |
| **Wunsch-Erfüllung** | 10% | Erfüllung hinterlegter `BD_WISH` oder `HG_WISH`. |

Die finale Qualität wird im Ergebnisbildschirm visualisiert. Ein Klick auf den Score öffnet ein detailliertes Modal mit mathematischer Aufschlüsselung der Faktoren.

---

## 3. UI-Komponenten & Features

### 3.1 Planungsmodus (Sandbox)
*   Aktivierbar über den "Planung"-Button.
*   Ermöglicht "What-if"-Analysen, ohne den Hauptplan zu ändern.
*   Bietet `Undo`/`Redo` für jeden Planungsschritt.
*   Nur im Planungsmodus sind Dienstwünsche für die KI bearbeitbar.

### 3.2 Mobile-Ansicht
Ab `< 768px` wechselt die Anwendung in eine Listen-Ansicht. Die Matrix-Tabelle wird ausgeblendet. Die Navigation erfolgt über ein `mnav` Bottom-Dock. Ein Klick auf einen Tag öffnet ein Bottom-Sheet mit exklusiven Funktionen für die mobile Bearbeitung.

### 3.3 Dashboarding
*   **Mitarbeiter-Dashboard:** Zeigt Jahresvergleiche, Rollenverteilung und Rollen-Filter.
*   **Abteilungsübersicht:** Aggregiert Leistungen (AP-Tage, Dienste, Abwesenheiten) über den Monat oder das Jahr.

---

## 4. Tastenkürzel & Bedienung

| Kürzel | Funktion |
| :--- | :--- |
| **1-8** | Zuweisung Arbeitsplatz (im Editor) |
| **D** | Toggle Bereitschaftsdienst (im Editor) |
| **H** | Toggle Hintergrunddienst (im Editor) |
| **Enter/S** | Speichern (im Editor) |
| **Escape** | Schließen/Abbruch |
| **Strg+Z/Y** | Undo/Redo (Planungsmodus) |
| **Alt+Pfeiltasten** | Monatswechsel |

---

## 5. Datenverwaltung
Alle Daten verbleiben lokal im Browser. Der Import/Export-Button ermöglicht den Austausch der JSON-Daten (`radplan_v3`). Es findet kein Datenabgleich mit externen Servern statt.
