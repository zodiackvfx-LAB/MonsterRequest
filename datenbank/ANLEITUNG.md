# Spielstände in der Datenbank

Bisher lag jeder Spielstand nur im Browser des Spielers. Das hat zwei
Nachteile: Safari räumt den Speicher irgendwann von selbst auf, und auf einem
zweiten Gerät fängt man wieder bei null an.

Mit einer Datenbank liegt jeder Spielstand zusätzlich auf einem Server. Du
siehst dort alle, die dein Spiel geöffnet haben, und ein Spieler kann seinen
Stand mit einem kurzen Code auf ein anderes Gerät holen.

**Das Spiel läuft auch ohne.** Solange in `js/data/cloud-config.js` nichts
steht, ändert sich gar nichts – kein Fehler, keine Wartezeit.

---

## Erst einmal ausprobieren (ohne Konto)

Am Computer, wenn du einen hast:

```bash
node werkzeuge/test-datenbank.mjs
```

Dann <http://localhost:8124> öffnen – das ist das Spiel mit Datenbank. Unter
<http://localhost:8124/uebersicht> siehst du, was gespeichert wurde.

Diese Testdatenbank liegt nur im Arbeitsspeicher: Beendest du den Server, sind
die Spielstände weg. Zum Anschauen reicht das, zum Benutzen nicht.

---

## Die richtige Datenbank einrichten

Du brauchst dafür ein kostenloses Konto bei **Supabase**. Das ist eine
Postgres-Datenbank mit einer Web-Oberfläche – alles geht im Browser, also auch
vom iPad. Die kostenlose Stufe reicht für dieses Spiel bei weitem.

### 1. Projekt anlegen

1. <https://supabase.com> öffnen, **Start your project**
2. Mit GitHub anmelden (dein Konto hast du schon)
3. **New project**
   - *Name:* `monsterquest`
   - *Database Password:* auf **Generate a password** tippen und das
     Ergebnis irgendwo sicher ablegen. Du brauchst es für das Spiel nicht,
     aber ohne kommst du später nicht mehr an die Datenbank heran.
   - *Region:* `Central EU (Frankfurt)` – das ist die nächste
4. **Create new project**. Das dauert ein bis zwei Minuten.

### 2. Die Tabellen anlegen

1. Links in der Leiste auf **SQL Editor**
2. **New query**
3. Die Datei `datenbank/schema.sql` aus diesem Projekt öffnen, **den ganzen
   Inhalt** kopieren und in das Feld einfügen
4. Unten rechts auf **Run**

Es sollte `Success. No rows returned` erscheinen. Damit gibt es die Tabellen
und die vier Funktionen, die das Spiel benutzt.

**Prüfen, ob alles stimmt:** Denselben Weg noch einmal mit
`datenbank/schema.test.sql`. Unter *Messages* steht dann eine Liste mit
`ok`-Zeilen und am Ende `17 bestanden, 0 fehlgeschlagen`.

### 3. Die zwei Werte ins Spiel eintragen

1. Links unten auf **Project Settings** (Zahnrad) → **API**
2. Dort stehen zwei Dinge, die du brauchst:
   - **Project URL** – sieht aus wie `https://abcdefgh.supabase.co`
   - **Project API keys → anon / public** – ein langer Text, der mit
     `eyJ…` anfängt
3. Beides in `js/data/cloud-config.js` eintragen:

```js
export const CLOUD = {
  url: 'https://abcdefgh.supabase.co',
  schluessel: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
};
```

4. Die Änderung nach GitHub hochladen. Fertig.

> **Nimm auf keinen Fall den Schlüssel mit `service_role` im Namen.** Der darf
> alles und gehört niemals in eine Seite, die jeder öffnen kann. Der
> `anon`-Schlüssel dagegen steht bei jeder Supabase-Seite im Quelltext – das
> ist so vorgesehen und in Ordnung.

### 4. Nachsehen, wer spielt

**Table Editor** → Tabelle `spielstaende`. Jede Zeile ist ein Spieler.

Lesbarer wird es über den SQL-Editor:

```sql
select * from spielstaende_uebersicht;
```

Das zeigt je Zeile den **Namen** (den der Spieler beim ersten Start gewählt
hat), Level, Münzen, Welt, geschaffte Kämpfe und wann zuletzt gespeichert
wurde.

> **Wenn du die Datenbank schon vor dem Namens-Update eingerichtet hast:**
> Die Namensspalte fehlt in deiner Übersicht noch. Führe `schema.sql` einmal
> neu aus (SQL-Editor → einfügen → Run) – das ist gefahrlos, es überschreibt
> nur die Ansicht und lässt alle Spielstände unangetastet.

---

## Wie es funktioniert

### Wer ist wer?

Es gibt keine Anmeldung – das wäre für ein Spiel dieser Größe zu umständlich.
Stattdessen würfelt sich jeder Browser beim ersten Start eine lange
Zufallszahl aus (eine UUID) und merkt sie sich. Diese Nummer ist gleichzeitig
das Passwort: Nur wer sie kennt, kommt an diesen einen Spielstand.

Die Nummer ist 122 Bit lang. Wer sie raten wollte, müsste im Schnitt
mehr Versuche machen, als es Sandkörner auf der Erde gibt.

### Warum kommt niemand an fremde Spielstände?

Der `anon`-Schlüssel steht im Quelltext und ist damit öffentlich. Deshalb darf
er die Tabellen **nicht** direkt lesen. Genau das stellt `schema.sql` ein:

* Beide Tabellen haben *Row Level Security* an und **keine** Regel. Damit ist
  von außen nichts zu holen – auch nicht mit dem Schlüssel.
* Nach außen gibt es nur vier Funktionen. Jede verlangt entweder die
  Spielernummer oder einen gültigen Code.

`datenbank/schema.test.sql` prüft genau das nach.

### Was passiert beim Speichern?

Das Spiel speichert wie bisher sofort im Browser – das geht ohne Netz und ohne
Wartezeit. Erst danach geht der Stand an die Datenbank, und zwar gesammelt:
Nach der letzten Änderung wird 2,5 Sekunden gewartet. Während eines Kampfes
wird oft hintereinander gespeichert; ohne diese Pause wären das ein Dutzend
Anfragen für denselben Stand.

Geht etwas schief – kein Netz, Datenbank gerade weg –, bleibt der Stand
vorgemerkt und geht beim nächsten Mal mit. Verloren geht nichts, denn im
Browser liegt er ja schon.

### Welcher Stand gewinnt?

Jeder Spielstand hat einen Zähler (`revision`), der bei jedem Speichern um
eins steigt. Beim Start des Spiels gewinnt die höhere Zahl.

Absichtlich **kein** Zeitvergleich: Auf einem Gerät mit falsch gestellter Uhr
wäre das ein Glücksspiel. Der Zähler stimmt immer.

### Der Übertragungscode

In den Einstellungen unter *Spielstand*:

* **Auf ein anderes Gerät** erzeugt einen Code aus 8 Zeichen, der 30 Minuten
  gilt und genau einmal benutzt werden kann.
* **Von einem anderen Gerät** holt den Spielstand mit diesem Code.

Der Code ist kurz, damit man ihn abtippen kann – deshalb gilt er nur so kurz.
Die Zeichen `I`, `O`, `0` und `1` kommen nicht vor, die verwechselt man sonst.

Achtung: Der geholte Spielstand **ersetzt** den Stand auf dem Gerät, auf dem
man den Code eingibt.

---

## Was du wissen solltest

**Jeder Aufruf legt eine Zeile an.** Schon das bloße Öffnen des Spiels
erzeugt einen Eintrag – auch wenn danach niemand spielt. Das ist so gewollt,
du siehst dadurch, wie viele Leute reingeschaut haben. Bei sehr vielen leeren
Zeilen kannst du sie wegräumen:

```sql
delete from spielstaende
 where speicherungen = 1
   and gespeichert_am < now() - interval '7 days';
```

**Es gibt keine Bremse gegen Massenanfragen.** Wer den Schlüssel aus dem
Quelltext nimmt, kann viele leere Spielstände anlegen. Fremde Stände lesen
kann er nicht. Wird es lästig, kannst du in Supabase unter *Authentication →
Rate Limits* gegensteuern oder den Schlüssel austauschen.

**Ein Spielstand darf höchstens 64 KB groß sein.** Das ist rund das
Fünfzigfache dessen, was ein durchgespieltes Spiel braucht.

**Die kostenlose Stufe pausiert nach einer Woche ohne Zugriff.** Ein Besuch
in der Supabase-Oberfläche weckt das Projekt wieder auf. Spielt regelmäßig
jemand, passiert das nicht.

---

## Wenn etwas nicht geht

In den Einstellungen steht unter *Spielstand* immer, was gerade los ist:

| Anzeige | Bedeutung |
|---|---|
| Nur auf diesem Gerät gespeichert. | In `cloud-config.js` steht nichts. |
| In der Datenbank gespeichert. | Alles in Ordnung. |
| Kein Netz – wird nachgeholt. | Das Gerät ist offline. Kein Problem. |
| Die Datenbank ist gerade nicht erreichbar. | Falsche Adresse oder falscher Schlüssel, oder das Projekt schläft. |

Genauer nachsehen: Die Seite im Browser öffnen, in die Entwicklerkonsole
schauen. Dort steht die Antwort der Datenbank im Klartext, zum Beispiel
`404 function public.mq_speichern does not exist` – dann ist `schema.sql`
noch nicht gelaufen.
