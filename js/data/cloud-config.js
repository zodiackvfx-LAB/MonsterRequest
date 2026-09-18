/**
 * Zugang zur Datenbank.
 *
 * SO SCHALTEST DU DIE DATENBANK EIN
 * ---------------------------------
 * 1. Bei supabase.com ein kostenloses Projekt anlegen
 * 2. datenbank/schema.sql im SQL-Editor ausfuehren
 * 3. Unter Settings -> API die beiden Werte kopieren und hier eintragen
 *
 * Schritt fuer Schritt mit Bildern: datenbank/ANLEITUNG.md
 *
 * SOLANGE HIER NICHTS STEHT, laeuft das Spiel genau wie bisher: Der
 * Spielstand liegt nur im Browser. Es gibt keine Fehlermeldung und nichts
 * haengt - die Datenbank ist dann einfach aus.
 *
 * IST DER SCHLUESSEL GEHEIM?
 * Nein, und das ist so gewollt. Der "anon key" steht in jeder Seite, die
 * Supabase benutzt, und jeder kann ihn lesen. Er allein reicht zu nichts:
 * Die Tabellen sind gesperrt, und die vier Funktionen in schema.sql
 * verlangen die Spielernummer. Den Schluessel mit "service_role" im Namen
 * darfst du dagegen NIE hier eintragen - der darf alles.
 */
export const CLOUD = {
  /** Die Projektadresse, z. B. 'https://abcdefgh.supabase.co' */
  url: '',

  /** Der oeffentliche Schluessel (anon / publishable key). */
  schluessel: '',
};
