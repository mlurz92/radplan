# Auto-Plan Modal – Visualisierungs-Ideen statt „Constraint Flux Matrix“

## Ausgangslage im aktuellen Code
- Das Auto-Plan-Modal wird als eigener Overlay-Dialog gerendert (`#modal-autoplan`) und bekommt seinen Inhalt über `#ap-body`. 
- In der Progress-Ansicht wird aktuell links/rechts ein zweispaltiges Layout mit `ap-flux-panel` (Titel: „Constraint Flux Matrix“) und `ap-terminal` aufgebaut.
- Der Fortschritt wird über Log-Einträge (`result.log`) gestreamt und in `streamProgressLogs(...)` schrittweise visualisiert; parallel werden Metriken (D/HG/Regeln/Optimierung) aktualisiert.
- Eine Canvas-HUD (`#ap-hud-canvas`) läuft per `requestAnimationFrame`, während der Fortschritt in Simulationsgeschwindigkeit abgespielt wird.
- Für Mobile wird das Modal als Bottom-Sheet dargestellt; zusätzlich gibt es bereits globale Reduced-Motion-Fallbacks.

## Ziel
Die Matrix ersetzen durch eine visuell starke, cineastische „Algorithm Journey“, die nachvollziehbar zeigt:
1. **Wo im Plan gearbeitet wird** (Tag/Cluster/Phase)
2. **Welche Entscheidung gerade fällt** (Kandidat, Regel, Trade-off)
3. **Wie sich die Qualität verändert** (Fairness, Coverage, Konvergenz)

## Vorschläge (nummeriert)

1. **Constraint Radar Globe (2.5D Orbit View)**
   - Zeige einen zentralen „Planeten“ (Monat), darum orbitierende Constraint-Ringe (Coverage, Fairness, Ruhezeit, Wochenenden, Wünsche).
   - Aktive Regel pulsiert im jeweiligen Ring; Regelverletzung erzeugt kurze rote Interferenzwelle.
   - Entscheidung wirkt als „Gravitationsimpuls“: Kandidat mit bester Eignung zieht den Marker auf stabile Bahn.

2. **Scheduling Timeline Scanner (Tag-für-Tag mit Lichtkegel)**
   - Horizontaler Kalender-Strip (1..31) mit vertikalen Layern für BD/HG.
   - Ein Scan-Kegel fährt kontinuierlich von links nach rechts und „locked“ jeweils auf den aktuellen Tag.
   - Pro Schritt erscheinen kleine Entscheidungs-Karten: „Tag 14: Becker vs. Martin → Becker (Score +18)".

3. **Decision Duel Cards (Kandidaten-Duell live)**
   - Zwei bis vier Kandidatenkarten gegeneinander, Werte in Echtzeit: Target-Delta, WE-Load, Distanz, Wish-Match.
   - Weiche Kriterien animiert als Balken, harte Constraints als „Gate Locks“ (locked/unlocked).
   - Gewinnerkarte snappt in die Tageszelle; Verlierer verblassen mit Begründung.

4. **Neural Lattice / Heat Network**
   - Ersetze Matrix durch Knoten-Netz: Tage × Mitarbeitende als lattice.
   - Edge-Intensität = Kandidatenwahrscheinlichkeit / Bewertung.
   - Bei Zuweisung wird ein Pfad „gebrannt“; bei Swap-Optimierung wandern Lichtimpulse über alternative Pfade.

5. **Objective Function ECG (Live-Kurven statt Textlog)**
   - Drei Live-Linien: `BD objective`, `HG objective`, `Global objective`.
   - Bei jedem akzeptierten Move fällt die Kurve sichtbar ab; bei Revert kurze rote Spitze.
   - Tooltips pro Event: „Deep Swap angenommen: ΔGlobal -420".

6. **Trade-off Balance Scale (Abwägung sichtbar machen)**
   - Eine stilisierte Waage mit linken/rechten Schalen: „Fairness“ vs „Coverage/Stabilität“.
   - Während Decisions kippt die Waage; bei gültiger Lösung zentriert sie sich.
   - Zuschauer versteht sofort: warum nicht immer derselbe Kandidat gewählt wird.

7. **Phase Corridor / Cinematic Flythrough**
   - Die Pipeline-Phasen als futuristischer Korridor (Init → BD Weekend → ... → Validate).
   - Kamera „fliegt“ in die aktive Phase; bereits absolvierte Phasen leuchten grün.
   - Jede Phase hat eigenes visuelles Thema (z. B. Weekend = Mond/Freitag-Samstag-Cluster).

8. **Constraint Shield Wall**
   - Harte Constraints als Schildsegmente um den aktiven Tag.
   - Kandidat darf nur durch, wenn alle relevanten Schilde geöffnet sind.
   - Bei gelockerten Regeln (Fallback) sieht man bewusst ein „Override-Siegel“ (warnend, aber kontrolliert).

9. **Month Digital Twin (Mini-Plan in Echtzeit)**
   - Kompakte Mini-Ansicht des gesamten Monats mit Heat-Layern für Auslastung/Fairness.
   - Aktiver Tag zoomt kurz heraus, Assignment wird sofort eingetragen.
   - Zuschauer sieht gleichzeitig „lokale Entscheidung“ und „globalen Planzustand“.

10. **Swap Storm (Optimierungsphase spektakulär)**
   - In Optimize-Phasen visuelles Partikelsystem: jeder Swap = Partikelspur.
   - Akzeptierte Swaps: grün/cyan, verworfene: orange.
   - Intensität nimmt bei Konvergenz ab → starker „Beruhigungseffekt“ Richtung Ende.

11. **Explainable AI Capsule (kurze, starke Erklärsätze)**
   - Statt generischer STATE_OK-Zeilen: 1-Satz-Reasoning in natürlicher Sprache.
   - Beispiele: „Polednia ausgeschlossen: Donnerstag-Constraint aktiv.“
   - Maximal 1 Satz + 1 Kennzahl, damit es cineastisch bleibt und nicht textlastig wirkt.

12. **Finale „Lock-in“ Sequenz (Abschlussmoment)**
   - Nach `validate`: kurzer Endshot (1.2–1.8s) mit „Plan Stabilized“.
   - Score-Ringe schließen sich, verbleibende Gaps/Hinweise werden eingeblendet.
   - Perfekt für Demo-Eindruck vor Publikum.

## Technische Umsetzung (ohne Ruckler)

### Rendering-Strategie
- Animationen primär über **transform/opacity**; kein layout-thrashing.
- Canvas nur für Partikel/Glow; UI-Elemente als DOM/CSS-Layer.
- Einen zentralen Render-Ticker nutzen (bestehend auf `requestAnimationFrame` aufsetzen), keine konkurrierenden Dauerschleifen.

### Datenanbindung
- Nutze bestehende Streams (`result.log`, `ruleTelemetry.events`) als Event-Backbone.
- Ergänze Eventtypen (z. B. `candidate_eval`, `candidate_reject`, `swap_accept`, `constraint_block`) für präzisere Visualsignale.
- Alle Visuals rein aus diesen Events treiben; keine zusätzliche schwere Berechnung im Renderpfad.

### Performance-Budget
- Ziel: **60fps stabil**, Peak-Lasten für Midrange-Mobiles begrenzen.
- DOM-Knoten im Live-Panel hart begrenzen (wie bereits beim Flux-Stream mit max. 12 Zeilen).
- Shader-/Blur-Effekte nur auf wenigen Ebenen; bei Mobile Qualität drosseln (Partikelzahl, Blur-Radius, Shadow-Layer).

### Responsive Verhalten
- Desktop: Split-View (Hauptvisual + kompakter Trace).
- Tablet: Hauptvisual oben, darunter reduzierte Metrik.
- Mobile: eine Kernvisualisierung + 1 KPI-Leiste + 1 Mini-Reason-Zeile (kein überladenes Multi-Panel).

### Accessibility / Robustheit
- Bestehenden `prefers-reduced-motion` respektieren: statische Progress-Variante ohne cineastische Motion.
- Alle entscheidungsrelevanten Informationen zusätzlich als Text verfügbar halten.
- Fallback auf „lite mode“ bei schwacher GPU oder niedriger Device-Memory-Heuristik.

## Konkrete Auswahl-Empfehlung (Top 3 Kombinationen)

### A) „Digital Twin + Decision Duel“ (beste Nachvollziehbarkeit)
- Kombiniert Vorschlag 9 + 3 + 11.
- Ideal, wenn Zuschauer Entscheidungen verstehen sollen, nicht nur Effekte sehen.

### B) „Radar Globe + Objective ECG“ (starkes Sci-Fi-Gefühl)
- Kombiniert Vorschlag 1 + 5 + 12.
- Sehr beeindruckend für Demos; mathematische Verbesserung bleibt sichtbar.

### C) „Phase Corridor + Swap Storm“ (maximal cineastisch)
- Kombiniert Vorschlag 7 + 10 + 8.
- Größter Wow-Faktor, benötigt aber strengstes Performance-Tuning.

## Empfohlene Reihenfolge für Umsetzung
1. Event-Schema präzisieren (welche Algorithmus-Entscheidungen als UI-Events veröffentlicht werden).
2. Einen Kern-Visualizer bauen (Digital Twin oder Radar Globe).
3. Decision-Overlay ergänzen (duell/constraints/explanation).
4. Optimize-Special-Effekte hinzufügen.
5. Mobile-/Reduced-Motion-/Low-End-Profile feinschleifen.
6. Erst ganz am Ende High-Polish-Layer (cinematic finale, lens, particles).
