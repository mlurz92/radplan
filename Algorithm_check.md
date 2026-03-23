# Algorithmus-Check – RadPlan Auto-Planung und Regelwerk

## Ziel dieses Dokuments
Dieses Dokument bewertet die in `app.js` implementierten Planungs-, Prüf- und Vergabelogiken auf Basis des aktuellen Anwendungsstands. Es beschreibt nicht nur die theoretischen Regeln, sondern analysiert explizit, **wie** sie in der Anwendung technisch umgesetzt werden, welche Prioritäten gelten, wo harte und weiche Restriktionen greifen und welche betrieblichen Auswirkungen daraus entstehen.

---

## 1. Architektureller Rahmen

Die Anwendung trennt drei Ebenen der Planungslogik:

1. **Operative Monatsplanung**
   - Tageszellen pro Mitarbeitenden.
   - Vergabe von Arbeitsplatzcodes, Statuscodes und Diensten (`D`, `HG`).
   - Sofortige Plausibilisierung auf Zellebene.

2. **Planungsmodus**
   - Entwurfsmodus mit eigener Historie, Wünschen, Auto-Planung und Entwurfsständen.
   - Seit der aktuellen Erweiterung kann der Planungsmodus monatsübergreifend bedient werden; pro Monat wird ein eigener Entwurfskontext verwaltet.

3. **Auto-Planung Engine**
   - Algorithmische Verteilung von Bereitschaftsdiensten (`D`) und Hintergrunddiensten (`HG`).
   - Historische Vorbelastung, Ferien-/Feiertagsregeln, Wochenendbalance und Rollenrestriktionen werden berücksichtigt.

---

## 2. Datenmodell der Planungslogik

### 2.1 Stammdaten und Rollen
Die Anwendung arbeitet mit vordefinierten Metadaten pro Mitarbeitendenprofil:
- Langname
- Positionskürzel
- Positionsbezeichnung
- Qualifikationstyp
- Bereichsschwerpunkte
- Stellvertretungsinformationen

Diese Stammdaten beeinflussen die algorithmische Logik direkt:
- `isFacharzt(...)`
- `isAssistenzarzt(...)`
- Farb- und Rollenklassifikation in Dashboards
- Zuteilungsrestriktionen für D/HG

### 2.2 Tagescodierung
Es existieren drei Logikebenen pro Zelle:
- **Arbeitsplätze**: `MR`, `CT`, `US`, `AN`, `MA`, `KUS`, `W`, `T`
- **Statuscodes**: `F`, `U`, `ZU`, `SU`, `FZA`, `K`, `KK`, `§15c`, `WB`
- **Dienste**: `D`, `HG`

Wichtig:
- Arbeitsplatz- und Statuslogik schließen sich in einer Zelle gegenseitig aus.
- Dienstzuweisungen sind zusätzlich zur Belegung möglich, unterliegen aber harten Prüfungen.
- Wunschcodes existieren nur im Planungsmodus.

---

## 3. Kalendermodell und Kontextlogik

### 3.1 Feiertagsberechnung
Die Anwendung berechnet sächsische Feiertage algorithmisch pro Jahr. Dazu gehören:
- feste Feiertage,
- bewegliche Feiertage auf Basis des Osterdatums,
- Buß- und Bettag über die Mittwoch-vor-22.-November-Logik.

### 3.2 Werktagsermittlung
Ein Tag gilt als regulärer Werktag, wenn:
- kein Samstag/Sonntag,
- kein sächsischer Feiertag.

Darauf bauen auf:
- Abdeckungsquoten,
- Monats- und Jahresstatistiken,
- Jahres-Dashboard der Mitarbeitenden,
- Teile der D/HG-Planung.

### 3.3 Folgetagslogik nach Bereitschaftsdienst
Nach einem `D` wird automatisch ein `F` am Folgetag ergänzt, wenn dort noch keine Belegung existiert. Diese Regel gilt:
- beim manuellen Speichern einer Zelle,
- beim Datenreparaturlauf beim Start/Import,
- innerhalb der Auto-Planung,
- bei Monatsgrenzen auch in den Folgemonat hinein, sofern dort Datenstrukturen existieren oder externe Zuweisungen erzeugt werden.

**Bewertung:**
Diese Regel ist robust umgesetzt und zählt zu den zuverlässigsten Schutzmechanismen im System. Sie reduziert Bedienfehler erheblich.

---

## 4. Regelklassen

Die Anwendung verwendet faktisch drei Klassen von Regeln.

### 4.1 Harte Regeln
Diese Regeln blockieren eine Zuteilung vollständig:
- Dienstbefreiung (`DUTY_EXEMPT`)
- Abwesenheit am Tag
- Urlaub/urlaubsähnliche Codes am Folgetag bei `D`
- bereits belegter Dienstslot
- direkte Nachbarschaft bestimmter Dienste
- bestimmte fachliche Rollenrestriktionen
- Feiertagsblock-Ausschluss Ostern/Pfingsten
- Konfliktlogik Becker/Martin

### 4.2 Weiche Regeln
Diese Regeln verringern die Attraktivität, erlauben aber in Notlagen weiterhin eine Vergabe:
- D-F-D-F-Mustervermeidung
- Verteilungsabstand ähnlicher Dienste
- Wochenendlast nahe Zielwert
- Samstagsausgleich innerhalb fachärztlicher Gruppen
- historische Feiertagsbelastung
- Wunschbeachtung
- Bündelungseffekte für `HG`

### 4.3 Eskalationsregeln
Wenn keine harte-konforme Lösung mehr verfügbar ist, lockert die Engine bestimmte harte Regeln kontrolliert:
- Wochenendabstand
- Distanz- und Fairnessrestriktionen
- ausgewählte Notlösungen für sonst unterversorgte Tage

**Bewertung:**
Diese Dreiteilung ist für einen klinischen Planer fachlich sinnvoll. Besonders positiv ist, dass die Auto-Planung nicht blind „perfekt fair“, sondern robust auf **Vollbesetzung** optimiert und Fairness graduell einpreist.

---

## 5. Historische Einbeziehung

Die Funktion zur historischen Lastbetrachtung sammelt monatsübergreifend vor dem Zielmonat:
- Anzahl BD (`bd`)
- Anzahl HG (`hg`)
- Wochenenddienstäquivalente (`weDuty`)
- Feiertagslast (`holDuty`)
- Donnerstag-BD (`thuBd`)
- HG für AA versus HG für FA
- Samstags-BD (`satBd`)

### Bewertung
Die Historisierung ist sehr wertvoll, weil sie nicht nur absolute Mengen zählt, sondern auch Kontextgrößen erfasst. Das verbessert:
- Fairness über Monatsgrenzen,
- Feiertagsrotation,
- Belastungsausgleich bei Samstagen,
- Rollengerechtigkeit bei HG.

**Einschränkung:**
Die Historik betrachtet nur Daten, die bereits in den Hauptdaten vorliegen. Nicht in den Hauptplan übernommene Entwürfe anderer Monate fließen nur begrenzt ein. Für den aktuellen Funktionsumfang ist das vertretbar, aber dokumentationspflichtig.

---

## 6. Bereitschaftsdienst (`D`) – Regelanalyse

### 6.1 Grundvoraussetzungen
Ein `D` ist unzulässig, wenn mindestens einer der folgenden Punkte erfüllt ist:
- Person ist dienstbefreit.
- Person ist am Tag abwesend.
- Dienstslot ist bereits anderweitig besetzt.
- Wunschtyp `NO_DUTY` liegt vor.
- Samstagsdienst für nicht fachärztliche Person.
- `Dr. Polednia` an Sonntag, Dienstag oder Donnerstag.
- Konflikt Becker/Martin greift.
- Am Tag ist bereits `F` gesetzt.
- Folgetag ist Urlaub.
- Am Vortag oder Folgetag existiert bereits `D`.
- Vortags-`HG` blockiert den `D` in bestimmten Konstellationen.
- Oster-/Pfingstblock-Konflikt greift.

### 6.2 Zielmengensteuerung
Die Engine arbeitet mit personenindividuellen BD-Zielen.
Standardmäßig:
- dienstbefreit → `0`
- `Dr. Polednia`, `Dr. Becker`, `Hr. Sebastian` → `3`
- sonst typischerweise `4`

### 6.3 Scoring-Komponenten
Das BD-Scoring gewichtet u. a.:
- Abstand zum Zielwert
- erfüllte BD-Wünsche
- Donnerstag vor Urlaubswoche
- Wochenenddienst-Ausgleich
- Samstagsgerechtigkeit bei Fachärzten
- Feiertagslast-Historie
- Distanz zu anderen BD
- D-F-D-F-Vermeidung
- deterministische Mini-Tie-Breaker

### 6.4 Bewertung
**Stärken:**
- klinisch brauchbare Mischung aus harten Regeln und gerechter Verteilung,
- historischer Belastungsausgleich,
- klare Wochenendsteuerung,
- nachvollziehbare Zielmengen.

**Schwächen / Grenzen:**
- Ziele sind statisch und personenbasiert, nicht dynamisch aus Beschäftigungsgrad oder Abwesenheitsquote hergeleitet;
- einige Regeln sind namentlich kodiert und nicht datengetrieben;
- spezielle Ausnahmeregeln sind wirksam, aber langfristig wartungsintensiv.

---

## 7. Hintergrunddienst (`HG`) – Regelanalyse

### 7.1 Grundstruktur
`HG` wird nach der BD-Planung verteilt. Damit reagiert die HG-Zuweisung auf:
- bereits vergebene BD,
- Rollen des BD-Inhabers,
- Wochenend-/Feiertagskontexte,
- Abwesenheiten,
- Wunschlagen.

### 7.2 Verteilungslogik
Die Anwendung priorisiert fachärztliche Eignung und versucht zugleich:
- HG über Fachärzte zu glätten,
- HG an Wochenenden/Feiertagen effizient zu bündeln,
- direkte HG-Häufungen zu vermeiden,
- Verhältnis HG für AA / HG für FA zu balancieren.

### 7.3 Bewertung
Die HG-Logik ist pragmatisch und betrieblich sinnvoll. Besonders positiv ist die explizite Berücksichtigung, **für wen** HG geleistet wird. Das ist keine triviale Zählung, sondern ein qualitatives Fairnessmerkmal.

---

## 8. Feiertagsblock Ostern/Pfingsten

### Regel
Wer im Osterblock Dienst hat, soll im Pfingstblock ausgeschlossen werden – und umgekehrt.

### Technische Umsetzung
Die Engine bildet Mengen für relevante Feiertage und prüft auch benachbarte Monatsdaten, falls die Feiertagsblöcke über Monatsgrenzen laufen.

### Bewertung
Das ist fachlich sehr stark, weil die Regel:
- nicht nur tagesbezogen,
- sondern blockbezogen,
- und monatsübergreifend gedacht ist.

Diese Logik hebt die Planung qualitativ deutlich über einfache Monatsalgorithmen hinaus.

---

## 9. Spezielle Personenregeln

Im aktuellen Stand existieren personenindividuelle Sonderregeln, z. B.:
- generelle Dienstbefreiung einzelner Personen,
- Reduktion individueller BD-Ziele,
- Samstags-/Wochentagsausschlüsse,
- Partner-/Vertretungskonflikte (Becker/Martin).

### Bewertung
**Positiv:**
- hohe fachliche Praxistauglichkeit,
- reale Kliniklogik lässt sich so kurzfristig gut abbilden.

**Negativ:**
- starke Kopplung an konkrete Namen,
- begrenzte Skalierbarkeit,
- höhere Pflegekosten bei Personalwechseln.

**Empfehlung:**
Mittelfristig in konfigurierbare, UI-pflegbare Regelattribute überführen.

---

## 10. Wochenenddienstlogik

Wochenendlast wird nicht binär, sondern als Äquivalent betrachtet:
- Wochenende mit `D` → `1.0`
- Wochenende mit nur `HG` → `0.5`

### Bewertung
Diese Modellierung ist fachlich elegant, weil sie die Belastung realistischer quantifiziert als bloße Zählungen. Sie ist eine der stärksten Fairnessideen der gesamten Engine.

---

## 11. Planungsmodus und Entwurfslogik

### Aktueller Stand
Mit der aktuellen Erweiterung verwaltet die Anwendung im Planungsmodus Entwürfe pro Monat separat. Dadurch ist möglich:
- Monat/Jahr auch im aktiven Planungsmodus umzuschalten,
- pro Monat eigene Entwurfshistorie zu behalten,
- zwischen Monaten zu navigieren, ohne den Entwurfskontext zu verlieren.

### Bewertung
Das ist für die Bedienbarkeit ein deutlicher Fortschritt. Es reduziert Reibung bei:
- Monatswechseln am Quartals-/Jahresrand,
- Feiertagsblockprüfungen,
- Abstimmung angrenzender Monate,
- Mehrfenster-artiger Prüfung ohne echten Fensterwechsel.

**Wichtige Einschränkung:**
Nicht automatisch alle Monatsentwürfe werden sofort in den Hauptplan übernommen. Das ist korrekt und schützt vor unbeabsichtigter Veröffentlichung. Gleichzeitig verlangt es klare Nutzerkommunikation – diese erfolgt inzwischen über Zeitraumsteuerung und Planungsmodus-Hinweise.

---

## 12. Dashboard- und Kontrolllogiken

Die Anwendung enthält zusätzlich analytische Kontrollschichten:
- Monatsstatistik in Kopf-/Mobilansicht
- Abteilungsübersicht Monat/Jahr
- Profilansicht pro Mitarbeitenden
- neues Jahres-Dashboard Mitarbeitende

Das neue Mitarbeitenden-Dashboard bewertet nicht nur Stammdaten, sondern verbindet:
- Jahresgesamtsicht aller Mitarbeitenden,
- Rollenfilter,
- Suchbarkeit,
- monatliche Kennzahlen,
- Jahreskalender-Cluster,
- Verwaltungsfunktionen des aktuellen Monats.

### Bewertung
Diese UI-Ebene ist algorithmisch relevant, weil sie Regelwirkungen sichtbar macht. Ein Algorithmus ist nur dann praxistauglich, wenn seine Konsequenzen gut kontrollierbar sind. Genau das verbessert diese Ebene deutlich.

---

## 13. Transparenz und Nachvollziehbarkeit

### Stärken
- Abschlussbericht mit Begründungen
- Fortschrittsdarstellung der Auto-Planung
- Monats- und Jahreskennzahlen
- sichtbare Warnhinweise bei konfliktträchtigen Dienstvergaben
- Mitarbeiterjahresdashboard als Kontrollinstrument

### Bewertung
Die Engine ist nicht „Black Box“, sondern weitgehend auditierbar. Für operative Planung ist das ein sehr großer Vorteil.

---

## 14. Risiken und Restfehlerpotenzial

### 14.1 Konfigurierbarkeit
Einige Regeln sind weiterhin direkt im Code definiert. Das ist für ein internes Werkzeug akzeptabel, für wachsende Organisationen aber begrenzt skalierbar.

### 14.2 Stammdatenpflege
Die Qualität der Planung hängt stark an korrekten Mitarbeitenden-Metadaten. Fehlende oder veraltete Rollencodes verschlechtern automatisch Fairness und UI-Auswertbarkeit.

### 14.3 Monatsgrenzen
Die Anwendung adressiert Monatsgrenzen bereits deutlich besser als einfache Dienstplaner. Dennoch bleibt dies die fachlich sensibelste Zone – insbesondere bei Urlaub, Ostern/Pfingsten und Folgetagsruhe.

---

## 15. Gesamtbewertung

## Fachliche Qualität
**hoch**

## Technische Umsetzungsqualität
**hoch mit punktuellen Konfigurationsgrenzen**

## Fairnesslogik
**gut bis sehr gut**

## Bedienbarkeit / Kontrollierbarkeit
**nach aktueller Erweiterung deutlich verbessert**

## Wartbarkeit
**mittel** – insbesondere wegen personenspezifischer Sonderregeln im Code.

---

## 16. Konkretes Fazit

Die aktuelle Implementierung liefert für einen spezialisierten klinischen Dienstplaner eine bemerkenswert ausgereifte Kombination aus:
- harten Schutzregeln,
- praxisnaher Fairness,
- historischer Rücksicht,
- monatsübergreifender Betrachtung,
- transparenter Visualisierung.

Die wichtigsten Stärken sind:
1. robuste D/HG-Regellogik,
2. korrekte Feiertags- und Monatsgrenzeneinbindung,
3. sinnvolle Eskalationsstrategie zur Vollbesetzung,
4. neue, deutlich verbesserte Bedienbarkeit über die globale Zeitraumsteuerung,
5. neues Mitarbeitenden-Jahresdashboard als starke Kontrollinstanz.

Die wichtigsten nächsten Entwicklungsoptionen wären:
1. Regelparameter aus dem Code in konfigurierbare Stammdaten auszulagern,
2. Beschäftigungsgrade und Sollarbeitsanteile algorithmisch einzubeziehen,
3. Monatsübergreifende Entwürfe optional gesammelt speicher- oder übernehmbar zu machen,
4. Sonderregeln personenneutral zu parametrisieren.

In Summe ist die Implementierung für den aktuellen Scope **fachlich überzeugend, technisch stringent und im Alltag gut kontrollierbar**.
