# RadPlan — Digitale Klinik-Dienstplanarchitektur

**Systemspezifikation und algorithmische Referenz** der digitalen Dienstplan-Engine für die **Klinik für Radiologie & Nuklearmedizin**. Ausführung als isolierte, clientseitige **Single-Page-Application (SPA)**. **Zero-Backend-Konzeption** zur Gewährleistung maximaler Datenintegrität und autonomer lokaler Persistenz. 

---

## 1. BEFUND: SYSTEMARCHITEKTUR & DATENMODELL

**Laufzeitumgebung:** Lokaler Webbrowser. Isolierte JavaScript-Engine (ES6+). Keine externen Abhängigkeiten.
**Persistenzschicht:** **HTML5 LocalStorage** (`radplan_v3`). Strukturierte **JSON-Trees** für Monatsdaten und Planungsentwürfe.
**Status-Verwaltung:** Deterministischer Zustandsautomat (`state`). Strenge Trennung von **Produktivdaten** (`DATA`) und **Planungs-Sandbox** (`planData`).
**Daten-Export/Import:** Vollständige Serialisierung als JSON. Integration via **Drag & Drop**. Automatisierte **Konsistenzprüfung** post-Import (z.B. Re-Evaluation fehlender Ruhetage).

### 1.1 UI/UX-Design & Performance
**Performance-Optimierung:** **GPU-Compositing** via `transform: translateZ(0)`. **CSS-Containment** (`contain: layout paint`) für Repaint-Minimierung bei massiven DOM-Manipulationen.
**Visuelle Führung:** Konsistente Farbcodierung für Dienstgrade, Workplaces und Status. Submillisekunden-genaue Render-Zyklen.
**Responsive Design:** Fluides Grid-System. Skalierbarkeit für Desktop- und Mobile-Endgeräte.

---

## 2. BEFUND: PLANUNGS-SANDBOX (ISOLIERTER MODUS)

**Isolierte Architektur:** Verzweigung der Hauptdatenstruktur für experimentelle Algorithmus-Durchläufe ohne Beeinflussung der Produktivdaten.
**Historisierungs-Speicher:** Array-basierte State-Snapshots. **Undo/Redo-Funktionalität** (Strg+Z / Strg+Y) für feingranulare Revisionszyklen.
**Entwurfs-Persistenz:** Lokale Speicherung unfertiger Pläne zur späteren Re-Evaluation.
**Merge-Mechanismus:** Konfliktfreie Injektion evaluierter Planungsentwürfe in die Produktiv-Matrix.

---

## 3. BEFUND: ALGORITHMUS-ENGINE (AUTO-PLAN)

**Data-driven Management** zur fairen, konfliktfreien und klinisch suffizienten Ressourcen-Allokation. Multiphasen-Pipeline (Analyse → BD-Verteilung → Swap-Optimierung → HG-Kopplung → HG-Verteilung → Validierung).

### 3.1 Universelle Restriktionen (Hard Constraints)
**Urlaubs-Sperre:** Striktes Verbot von **D** (Bereitschaft) und **HG** (Hintergrund) an Urlaubstagen sowie am Vortag eines Urlaubsantritts.
**Ruhezeit-Garantie:** Obligates **F** (Frei) post-**D**. **D-D-Kombinationen** physiologisch und algorithmisch unmöglich.
**BD-Target-Sperre:** Strikte Sanktionierung (**-5000 Penalty-Punkte**) bei Überschreitung der individuellen **BD-Soll-Werte**. Keine Überzuteilung an Assistenzärzte.
**Wunsch-Priorisierung:** Präferierte Injektion von **BD_WISH** und **HG_WISH**.

### 3.2 Hierarchie- & Facharzt-Logik (Clinical Evidence)
**HG-Exklusivität:** Hintergrunddienst-Zuteilung strikt limitiert auf **FA**.
**Samstags-Regulation:** **D** am Samstag zwingend an **FA** gekoppelt. 
**Befundfreigabe-Kopplung:** **AA** im **D** generiert **HG**-Pflicht für **FA**.
**Freitags-Phänomen:** **AA** im Freitag-**D** bedingt **HG**-Übernahme durch **FA** des Samstag-**D** (Wegzeit-Minimierung).
**Feiertags-Phänomen:** Vorabend-**AA** im **D** bedingt **HG**-Übernahme durch Feiertags-**FA** im **D**.
**Ruhezeit-Kollision:** Verbot von **HG** für **FA** bei folgendem eigenem **D** (Vermeidung von Freigabe-Verzögerungen). Ausnahme: Freitags.

### 3.3 Fairness-Glättung & Swaps (Stochastische Optimierung)
**Defizit-Ausgleich:** **FA** mit negativem **D**-Delta erhalten Priorität in der **HG**-Distribution.
**Varianz-Minimierung:** Iterativer **Swap-Algorithmus** zur Minimierung quadratischer Fehlerabweichungen (Fairness-Score) zwischen initial verteilten Bereitschaftsdiensten.
**Zyklen-Vermeidung:** Suppression von **D-F-D-F** Rhythmen durch strenges Distanz-Scoring.
**Urlaubs-Prämie:** **D** am Donnerstag vorzugsweise an Personal mit konsekutivem Urlaub delegiert.

### 3.4 Personen-Spezifische Restriktionen (Custom Vectors)
**Dr. Polednia:** Sperre für **D** an Sonntag, Dienstag, Donnerstag (Erhalt der **KUS**-Kapazität). Sperre für **HG** von **AA** an diesen Tagen (Vermeidung von Freigabe-Kollisionen).
**Dr. Becker:** Sperre für **Samstags-D**. Automatisierte Injektion von **FZA** am konsekutiven Montag bei algorithmischer Unabwendbarkeit.
**Dr. Martin / Dr. Becker:** Wechselseitige Werktags-**F**-Sperre bei Urlaub des Partners zur Sicherstellung der **CT**-Dauerbesetzung.

---

## 4. BEFUND: ANALYTIK & REPORTING-ARCHITEKTUR

**Abschlussbericht:** Granulare, logikbasierte Begründungs-Matrix post-Allokation. Dokumentation jeder Zuweisung ("Warum Tag X an Person Y?"). 
**Live-Terminal:** Echtzeit-Rendering der **Entscheidungsbäume** im UI (Konsolen-Ästhetik, farbcodierte Pipeline-Phasen).
**KPI-Dashboards:** Laufende Extraktion von Abdeckungs-Quoten, Urlaubs-Salden und Ausfallzeiten. Berechnung von Jahres-Trajektorien.
**Sachsen-Feiertags-Engine:** Gaußsche Osterformel-Integration für exakte Prädiktion aller beweglichen Feiertage.

---

## 5. BEURTEILUNG

**Hocheffiziente, deterministische Allokations-Engine** zur Dienstplan-Generierung. Korrekte algorithmische Trennung von Hard- und Soft-Constraints. Individuelle **Soll-Werte** und **Fairness-Gleichverteilung** werden mathematisch rigoros erzwungen (Hyper-Penalties). 

**Explizite negative Befunde:**
- **Kein Server-Backend** implementiert.
- **Keine Cloud-Synchronisation** (maximale Datensicherheit durch lokale Isolation).
- **Keine externen Software-Dependencies** (reine Vanilla JS/CSS Architektur).
- **Keine Überschreitung der BD-Ziele** durch den Algorithmus zugunsten weicher Parameter.

*Systemstatus: Produktiv. Revision verifiziert.*