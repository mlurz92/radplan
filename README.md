# RadPlan — Digitaler Dienstplan für die Klinik für Radiologie & Nuklearmedizin

RadPlan ist eine hochspezialisierte, performante und kompromisslos auf Nutzererfahrung (UX) optimierte Web-Applikation zur digitalen Dienst- und Personalplanung in der Radiologie und Nuklearmedizin am Klinikum St. Georg Leipzig. Das System wurde konzipiert, um hochkomplexe Planungsaufgaben in einer intuitiven, visuell ansprechenden und fehlerresistenten Oberfläche zu vereinen.

---

## 1. Kernkonzept & Philosophie

Die Kernphilosophie von RadPlan basiert auf drei Säulen:
1. **Desktop-First Effizienz & Keyboard-Steuerung:** Für Planer, die große Dienstpläne schnell und effizient am PC erstellen müssen, ist jeder Klick einer zu viel. Die App lässt sich zu großen Teilen vollständig über die Tastatur bedienen (z.B. Pfeiltasten-Navigation im Grid, Schnelltasten für Zuweisungen).
2. **Native iOS-Erfahrung (PWA) für Anwender:** Für Ärzte und Mitarbeiter, die ihren Plan auf dem Smartphone abrufen, verhält sich RadPlan exakt wie eine in Swift geschriebene, native iPhone-App (Bottom-Sheets, physikbasiertes Scrollen, Dynamic-Island-Awareness, Haptisches Feedback).
3. **Zwei-Ebenen-Planung (Planungsmodus):** Die strikte Trennung von Live-Daten (dem aktiven Dienstplan) und einem entkoppelten "Sandkasten"-Planungsmodus, in dem KI-gestützte oder manuelle Entwürfe getestet werden können, bevor sie live gehen.

---

## 2. UI, UX & Design-Philosophie

### 2.1 Visuelles Design (Glassmorphismus & Dark Navy Theme)
Das Design setzt auf ein modernes, medizinisches "Dark Navy"-Farbkonzept. Anstatt reines Schwarz oder langweilige Grautöne zu verwenden, basiert die Palette auf tiefen Blautönen (`--navy-900` bis `--navy-400`). 
*   **Transparenz & Tiefe:** Header, Footer, Modals und Navigationsleisten nutzen hochmoderne CSS `backdrop-filter` (Blur-Effekte), um darunterliegende Inhalte leicht durchschimmern zu lassen. Dies erzeugt eine klare räumliche Hierarchie.
*   **Fokus & Farbkodierung:** Ein dezentes Aqua/Teal (`--accent`) dient als primäre Hervorhebungsfarbe. Wochenende, Feiertage und der aktuelle Tag sind farblich subtil, aber eindeutig im Grid kodiert (z.B. gelblich glühende Ränder für den heutigen Tag, sanftes Grau für Wochenenden).

### 2.2 Mikro-Interaktionen & Feedback
Jede Interaktion liefert visuelles oder haptisches Feedback:
*   **Aktive Zustände:** Buttons skalieren bei Klick leicht nach unten (`transform: scale(0.96)`), um den physischen Widerstand eines realen Knopfes nachzuahmen.
*   **Hardwarebeschleunigte Animationen:** Modals und Menüs gleiten mit 60-120fps auf den Bildschirm. Animationen basieren ausschließlich auf GPU-freundlichen Eigenschaften (`transform` und `opacity`).

### 2.3 Mobile & iOS Optimierung (PWA)
RadPlan wurde bis ins mikroskopische Detail für das iPhone 14 Pro Max und moderne Smartphones optimiert:
*   **Dynamischer Viewport (`100dvh`):** Das Interface passt sich intelligent an iOS-Systemleisten an, sodass nichts abgeschnitten wird.
*   **Safe-Area Insets:** Das Layout reagiert dynamisch auf Hardware-Eigenheiten wie die *Dynamic Island* (Top-Notch) oder den *Home Indicator* (Wischleiste unten). Header und Footer weichen diesen Bereichen pixelgenau aus.
*   **Bottom Sheets:** Anstatt zentraler Popups, die auf Handys schwer erreichbar sind, gleiten Dialoge (wie der Editor oder das Profil) aus dem unteren Bildschirmrand als wischbare "Bottom Sheets" mit typischen 24px-Apple-Eckenradien herein.
*   **Overscroll-Sperre:** Das native, störende "Gummiband"-Scrollen (Bouncing) des Browsers wurde auf Root-Ebene deaktiviert. Die App fühlt sich fest und nativ an.
*   **WCAG Touch-Targets:** Alle klickbaren Elemente auf mobilen Geräten haben eine minimale Zielgröße von 44x44px, um Fehleingaben (Fat-Finger-Syndrom) komplett auszuschließen.
*   **Zoom-Sperre & Tap-Highlights:** Das System verhindert unfreiwilliges Heranzoomen beim schnellen Tippen und eliminiert das blaue Browser-Flackern zugunsten sauberer CSS-Statusänderungen.

---

## 3. Architektur & Kernkomponenten (Detaillierte Funktionsbeschreibung)

### 3.1 Das Main-Grid (Der Dienstplan)
Das Herzstück ist das tabellarische Monats-Grid, welches sich dynamisch aus den Stammdaten generiert.
*   **Sticky Header & Columns:** Die Namensspalte links und die Tagesleiste oben sind beim Scrollen fixiert (Sticky). Dies garantiert auch bei 40 Mitarbeitern und 31 Tagen stets volle Orientierung.
*   **Zellaufbau:** Jede Zelle repräsentiert einen Mitarbeiter an einem Tag. Sie zeigt den zugewiesenen Arbeitsplatz (Kürzel) mittig, Dienste (z.B. Bereitschaft "D") oben rechts und Dienstwünsche dezent unten links an.
*   **Keyboard-Navigation & Multi-Select:** Nutzer können per Pfeiltasten durch das Gitter navigieren. Durch Halten der Umschalttaste lassen sich mehrere Zellen markieren.
*   **Hotkeys:** 
    *   Tasten `1` bis `8`: Schnelle Zuweisung von Arbeitsplätzen.
    *   `D` (Dienst) / `H` (Hintergrund): Zuweisung von Diensten.
    *   `Entf`: Löschen der Zellinhalte.
    *   `Enter`: Öffnet den detaillierten Modal-Editor für komplexe Zuweisungen.

### 3.2 Planungsmodus (Sandkasten)
Dieser Modus ist der "Safe Space" für den Dienstplaner.
*   **Visuelle Warnung:** Ein markanter, pulsierender Header ("Planungsmodus aktiv") mit orange/bernsteinfarbenen Akzenten signalisiert den Status.
*   **Undo / Redo Historie (Strg+Z / Strg+Y):** Jeder Schritt, jede Änderung und jede Löschung innerhalb des Planungsmodus wird aufgezeichnet und kann unendlich vor- und zurückgesprungen werden.
*   **Übernehmen vs. Verwerfen:** Erst wenn der Entwurf perfekt ist, wird er mit einem Klick in die Live-Datenbank ("Hauptplan") übertragen. Andernfalls kann er folgenlos abgebrochen oder als temporärer lokaler Entwurf gespeichert werden.

### 3.3 Automatischer Dienstplan-Algorithmus (Auto-Plan)
Die App verfügt über eine integrierte, regelbasierte Planungs-Engine.
*   **Fairness & Kriterien:** Der Algorithmus verteilt Dienste basierend auf komplexen Regelwerken. Er beachtet Dienstwünsche, maximale Dienstanzahlen, Erholungszeiten nach Nachtschichten und Qualifikationen (z.B. Facharzt vs. Assistenzarzt).
*   **Konfigurations-Modal:** Vor der Generierung kann der Planer in einem umfangreichen Menü die Zielwerte (Soll-Dienste) für jeden Mitarbeiter justieren.
*   **Feedback:** Etwaige Engpässe oder ungelöste Zuweisungen (z.B. wegen Urlaub) werden nach dem Durchlauf als formatiertes Warnsystem ausgespielt.

### 3.4 Mitarbeitermanagement & Profile
*   **Dashboard:** Übersicht aller Mitarbeiter, deren Arbeitszeitmodelle, Qualifikationen und Rollen.
*   **Mitarbeiter-Profil (KPIs):** Klick auf einen Namen im Grid öffnet ein umfassendes Profil. Es visualisiert (via Diagramme und Graphen) die Verteilung der Arbeitsplätze, Urlaube und Dienste im aktuellen Monat sowie Jahresstatistiken zur Fairness-Kontrolle.

### 3.5 Zeitraum-Steuerung & Monatsnavigation
*   Die Navigationsleiste im Header ermöglicht das Springen zum vorherigen oder nächsten Monat.
*   **Period Flyout:** Ein spezielles Kontextmenü erlaubt präzise Sprünge zu einem bestimmten Jahr oder Monat, ohne unzählige Klicks durchführen zu müssen. Ein "Heute"-Button setzt die Ansicht sofort auf den aktuellen Monat zurück.

### 3.6 Datenverwaltung (Import / Export / Sync)
*   RadPlan verzichtet auf eine zwingende komplexe Backend-Infrastruktur. 
*   **JSON-Export/Import:** Der gesamte State (Mitarbeiter, Konfiguration, alle Pläne) lässt sich als eine saubere `.json` Datei exportieren und importieren. Ideal für Offline-Backups.
*   **Server-Sync:** Ein Button erlaubt es, bei Diskrepanzen die lokale Ansicht hart mit der Serverseite zu überschreiben, um den "Truth-State" wiederherzustellen.

---

## 4. Lokale Speicherung & Technologie-Stack

*   **Vanilla JS & CSS:** Die gesamte Anwendung kommt komplett ohne schwere Frameworks (kein React, kein Vue) aus. Dies sorgt für mikroskopische Ladezeiten und eine extrem effiziente RAM-Nutzung.
*   **DOM-Effizienz:** Die Rendering-Engine (`render.js`) berechnet das Grid hochoptimiert. Events werden über Event-Delegation am Grid-Container abgefangen, was hunderte ungenutzter Event-Listener spart.
*   **Zustandsverwaltung (`state.js`):** Ein zentraler Store verwaltet den Applikations-Status. Er steuert das Rendering, die Kommunikation zwischen dem Planungsmodus und der Live-Ansicht sowie das Speichern im lokalen Browser-Speicher.

---

## 5. Bedienoberfläche (Mobile vs. Desktop)

### 5.1 Desktop Ansicht
*   Kompaktes Header-Layout mit direkten Aktionsbuttons.
*   Horizontale, fixierte Monats-Statistikleiste (`#stats-bar`), die kontinuierlich die Abdeckung (Wie viele Personen an welchem Arbeitsplatz?) für jeden Tag visualisiert.

### 5.2 Mobile Ansicht
*   **Header:** Reduziert auf Marke und Monatssteuerung.
*   **Tab-Bar (Bottom Navigation):** Die Desktop-Toolbar wird für Handys in eine untere, Daumen-freundliche Tab-Leiste umgewandelt (Mitarbeitende, Heute, Planung, Menü).
*   **Tages-Übersicht:** Das komplexe Monats-Gitter wird ergänzt durch eine vertikale "Listenansicht", in welcher man tageweise nach unten scrollt – die deutlich natürlichere Geste auf dem Smartphone.

---

## 6. Zusammenfassung

RadPlan ist nicht nur eine digitale Tabelle. Es ist ein maßgeschneidertes, hochgradig optimiertes Werkzeug, das die komplexen Herausforderungen der Krankenhaus-Dienstplanung mit den Prinzipien modernen, nativen Software-Designs löst. Durch die kompromisslose Optimierung für sowohl Power-User am Desktop (Keyboard-First) als auch für Konsumenten am Smartphone (iOS PWA) setzt es einen neuen Standard für Klinik-interne Softwarelösungen.