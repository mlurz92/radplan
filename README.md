# RadPlan — Klinik für Radiologie & Nuklearmedizin
## Intelligente Dienst- und Einsatzplanung v3.0

RadPlan ist eine hochspezialisierte Web-Anwendung zur automatisierten und manuellen Dienstplanung für radiologische Kliniken. Sie kombiniert ein responsives, premium-orientiertes User-Interface (UI) mit einem fortschrittlichen, regelbasierten heuristischen Algorithmus zur fairen Verteilung von Diensten unter Berücksichtigung komplexer klinischer Anforderungen.

---

## 1. Systemübersicht & Designphilosophie

RadPlan wurde nach dem **Glassmorphism-Design-Prinzip** entwickelt. Die Benutzeroberfläche ist darauf ausgelegt, maximale Informationsdichte bei gleichzeitig hoher Ästhetik zu bieten.

### UI/UX-Kernfeatures:
*   **Smart-Hybrid-Scrolling:** 
    *   Horizontaler Bildlauf für das Kalender-Raster.
    *   Automatisches Umschalten auf vertikalen Bildlauf, sobald sich der Mauszeiger über der Mitarbeiterspalte befindet.
    *   Explizite vertikale Steuerung im Raster durch Halten der `Shift`-Taste.
*   **Adaptive Viewport-Synchronisation:** Die Anwendung berechnet die verfügbare Höhe (`--app-vh`) dynamisch bei jeder Fenstergrößenänderung, um den Viewport unabhängig von Browser-Symbolleisten oder DevTools-Docks optimal auszunutzen.
*   **Visuelle Hierarchie:** 
    *   Wochenenden und Feiertage sind farblich (Blautöne/Violett) hervorgehoben.
    *   Der aktuelle Tag wird durch eine pulsierende Animation markiert.
    *   Einsatzorte (CT, MRT, US) und Status (Urlaub, Krank, FZA) nutzen ein konsistentes Farbschema für sofortige Erfassbarkeit.

---

## 2. Datenmodell & Entitäten

### 2.1 Mitarbeiter-Meta-Daten (`EMP_META`)
Jeder Mitarbeiter ist mit spezifischen Rollen und Attributen hinterlegt:
*   **CA (Chefarzt):** Prof. Schäfer (vom Regeldienst befreit).
*   **LOA (Leitender Oberarzt):** Dr. Lurz (spezifische Aufgaben in der MRT/KV-Radiologie).
*   **OA/OÄ (Oberärzte):** Dr. Polednia (Kinderradiologie), Fr. Dalitz (Mammographie), Dr. Becker (CT).
*   **FA/FÄ (Fachärzte):** Dr. Martin.
*   **AA/AÄ (Assistenzärzte):** Hr. El Houba, Fr. Licenji, Hr. Torki, Hr. Sebastian.

### 2.2 Diensttypen & Codes
*   **Einsatzorte (`WORKPLACES`):** MR (MRT), CT, US (Sonographie), AN (Angiographie), MA (Mammo), KUS (Ki-US), W (Wermsdorf), T (Teleradiologie).
*   **Dienste (`DUTIES`):**
    *   **D (Bereitschaftsdienst / BD):** Präsenzdienst vor Ort.
    *   **HG (Hintergrunddienst):** Hintergrundrufbereitschaft (nur Fachärzte).
*   **Abwesenheiten (`ABSENCES`):** U (Urlaub), ZU (Zusatzurlaub), SU (Sonderurlaub), FZA (Freizeitausgleich), K (Krank), KK (Kind Krank), §15c, WB (Weiterbildung).

---

## 3. Der „Neural“ Autoplan-Algorithmus

Der Kern von RadPlan ist ein mehrphasiger heuristischer Planungsalgorithmus (`autoplan.js`), der darauf optimiert ist, ein globales Minimum an „Unfairness“ zu finden.

### 3.1 Die Gewichtungs-Logik (Fairness-Scoring)
Jeder potenzielle Dienst wird mit einem Score bewertet. Ein hoher Score bedeutet hohe Eignung.
*   **Zielerfüllung (+5000 pro fehlendem Dienst):** Priorisiert Personen, die ihr monatliches Soll noch nicht erreicht haben.
*   **Wünsche (+220 / +500):** Explizite Wünsche (BD Wunsch / HG Wunsch) werden stark priorisiert.
*   **Wochenend-Spreizung (-1000 bis -15000):** Starke Abzüge bei Verletzung des Puffer-Abstands zwischen Wochenenddiensten.
*   **Historieneffekt:** Einbeziehung der Vormonate, um langfristige Gerechtigkeit (z.B. Feiertagsdienste über Jahre hinweg) sicherzustellen.

### 3.2 Die harten Regeln (Constraints)
Der Algorithmus verwirft Kandidaten sofort (`-Infinity`), wenn:
1.  **Dienst-Abstand:** Keine zwei Dienste (D/D oder D/HG) an aufeinanderfolgenden Tagen (Ausnahme: Bestimmte HG-Kopplungen).
2.  **Sabbat-Regel:** Nach einem BD folgt zwingend ein Ruhetag (Code `F`).
3.  **Abwesenheit:** Kein Dienst bei Urlaub, Krankheit oder gesetztem FZA.
4.  **Qualifikation:** Nur Fachärzte (FA) dürfen Hintergrunddienst (HG) leisten.
5.  **Spezialregel Dr. Polednia:** Keine Dienste an Tagen mit Kinderradiologie-Verpflichtungen (Mo, Mi, Fr).
6.  **CT-Leitungskonflikt:** Dr. Becker und Dr. Martin dürfen nicht gleichzeitig abwesend oder im Dienst-Ausgleich sein, um die CT-Supervision zu gewährleisten.
7.  **Mammographie-Konflikt:** Fr. Dalitz darf keinen HG leisten, wenn bestimmte Assistenzärzte (El Houba/Sebastian) im BD sind (Supervisions-Spezialisierung).

### 3.3 Der Planungs-Zyklus (Phasen)
1.  **Initialization:** Analyse der Historie und Initialisierung der Zielwerte.
2.  **Weekend BD:** Verteilung der wertvollsten Dienste (Freitag/Samstag/Sonntag/Feiertag).
3.  **Workday BD:** Auffüllen der Werktage.
4.  **HG-Gekoppelt (Intelligente Kopplung):**
    *   Ein Facharzt im Samstags-BD übernimmt automatisch den Sonntags-HG.
    *   Ein Facharzt im Freitags-BD übernimmt oft den Freitags-HG (Reduktion der beteiligten Personen am Wochenende).
5.  **HG-Assign:** Verteilung der verbleibenden HG-Dienste durch Fairness-Maximierung.
6.  **Deep Moves (Optimierung):** In bis zu 25 Zyklen werden bestehende Dienste zwischen berechtigten Personen getauscht, um den globalen Spread (Abweichung vom Durchschnitt) weiter zu minimieren.

---

## 4. Spezial-Logiken im Detail

### 4.1 Die Samstags-Kompensation (Dr. Becker)
Aufgrund gesetzlicher Ruhezeiten und klinischer Supervision wird bei einem Samstags-BD von Dr. Becker automatisch geprüft, ob der folgende Montag als FZA blockiert werden kann. Falls der Montag bereits durch Urlaub anderer Fachärzte blockiert ist, generiert das System eine **Kritische Warnung**, anstatt den Plan fälschlicherweise als „perfekt“ zu markieren.

### 4.2 RD Neurorad (Spezial-Zeile)
Die Zeile „RD Neurorad“ ist eine virtuelle Zeile am Ende der Tabelle. Sie dient der Dokumentation von Fremdleistungen oder spezifischen Neuroradiologie-Zuweisungen. Sie nimmt nicht am Autoplan teil, bleibt aber beim vertikalen Scrollen als Anker am Ende der Liste bestehen.

### 4.3 F-Tage-Automatik
Das System erkennt automatisch erforderliche Ruhetage nach Bereitschaftsdiensten. Diese werden als temporäre „Auto-F“ markiert. Wenn ein Dienst manuell verschoben wird, „wandert“ der Ruhetag intelligent mit oder löscht sich selbst, falls er nicht mehr benötigt wird.

---

## 5. Technische Architektur

### 5.1 State Management (`state.js`)
Die Anwendung nutzt ein zentrales reaktives State-Objekt. Alle Änderungen an `planData` lösen über `render.js` ein effizientes UI-Update aus. 

### 5.2 Persistenz
*   **LocalStorage:** Primärer Speicher ist der Browser (`radplan_v3`).
*   **Backup/Export:** Pläne können als JSON exportiert und importiert werden, um Versionsstände lokal zu sichern.

### 5.3 Rendering-Pipeline
Das System nutzt kein schwerfälliges Framework wie React, sondern eine hochperformante **Vanilla-JS DOM-Diffing-Strategy**:
1.  Berechnung des virtuellen Grids.
2.  Batch-Update der Tabellenzellen.
3.  Asynchrone Animation der Fortschrittsbalken im Neural-Scheduler via **GSAP**.

---

## 6. Glossar der Entscheidungsschritte

| Schritt | Aktion | Ziel |
| :--- | :--- | :--- |
| **Pre-Check** | Suche nach fixierten Diensten | Respektierung manueller Vorgaben |
| **History-Sync** | Abgleich mit den letzten 6 Monaten | Vermeidung von "Dienst-Pechsträhnen" |
| **Gap-Analysis** | Prüfung der Abstände | Minimierung von Überlastung |
| **Deep-Swap** | Probetäusche von Diensten | Finden des globalen Fairness-Optimums |

---
*RadPlan — Entwickelt für höchste Präzision in der medizinischen Ressourcenplanung.*
