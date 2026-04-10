## Nächster Meilenstein: 17.04.2026: Datenbankanbindung mit Website fertiggestellt

Dejan Was here and has commited  
Moritz was here  
Georgi was here and commited  
Marcel was here  
Ben was here



Notizen von Dejan  
-

deno task server  
fetch for userlogin  http://localhost:3000/api/search?logininfo=ben@example.com&pw=abc123  
--> returns true or false (can be changed in the future if needed) 


  
Get all categories  
http://localhost:3000/api/search?kategorie=all  


Done:
-

- login Token Tabelle in DB (Token (random wie userid) PS, UserID FS, ablaufdatum) - __**BEN**__
- register form now works in backend (users can be created) and saved
- Small bug in product search fixed
- Render ersten 20 Produkte wenn angemeldet _**Dejan**__
- Fix Product.html --> footer is not on the bottom when no products are shown
- validatePW function in api.js --> delivers bool as JSON
- getMyProducts function im api.js --> liefert alle Produkte eines bestimmten Nutzers
- updatePassword function in api.js --> ermöglicht Passwortänderung mit userID, oldPW, newPW

Offene Aufgaben:
-

MUSS (Abnahme-relevant laut Lastenheft):
- [ ] Warenkorb vollständig implementieren: add to cart, Menge ändern, remove from cart, cart anzeigen, checkout
- [ ] Bestellung aufgeben Ende-zu-Ende: Bestellung speichern, Status setzen, Bestellübersicht anzeigen
- [ ] Bestellbestätigung für Nutzer anzeigen
- [ ] Verkäuferbereich: eigene Produkte anzeigen, erstellen und bearbeiten (Name, Beschreibung, Preis, Kategorie, Bilder)
- [ ] Verkäuferbereich: Bestellungen des Verkäufers anzeigen
- [ ] Verkäuferbereich: Kontaktdaten des Käufers zur Bestellung anzeigen
- [ ] Verkäuferstatus beantragen (Formular + Speicherung + Admin-Entscheidung)
- [ ] Admin-Funktionen vollständig: Nutzer suchen, Profil anzeigen, Profil bearbeiten, Profil löschen
- [ ] Admin-Funktionen vollständig: Verkäuferstatus zuweisen und entziehen
- [ ] Admin-Funktionen vollständig: Produkte verwalten/löschen und Verkäuferanträge annehmen/ablehnen (mit Begründung)
- [ ] Profil bearbeiten vollständig speichern (Name, Telefon, Adresse) + valides Feedback bei Fehler/Erfolg
- [ ] Rollen- und Rechteprüfung serverseitig für alle geschützten Endpunkte erzwingen
- [ ] Passwörter hashen (inkl. Login/Validierung/Update anpassen)
- [ ] Start Seite: Vier beliebtesten Produkte anzeigen (mit Bild, Name, Preis) + es gibt schon platzhalter
- [ ] Sollte man auch auf die Produktseite und die Über Uns Seite zugreifen könenn ohne eingeloggt zu sein
- [ ] Produkteseite es sollt eine Button geben um weiter Produkte anzuzeigen wenn ich alle von einer Suche / Standardsuche angezeigt werden


WICHTIG (aus Projektantrag/README):
- [ ] Bilderpeicherung inkorporieren und verweise zum Frontend produk reparieren
- [ ] Reales FUSE-SHOP Logo auf allen Seiten einbauen (Farbe beachten)
- [ ] Header für eingeloggte User finalisieren (Profil-Icon/Settings statt Login/Register)
- [ ] Dropdown-Menü: "Nutzer" durch echten Nutzernamen ersetzen
- [ ] Kategorien-Filter auf Produktseite fertigstellen
- [ ] Verkäuferseite: Footer/Branding anpassen
- [ ] Fehlerfeedback für alle kritischen Aktionen vereinheitlichen (Laden, Erfolg, Fehler)

SICHERHEIT / BETRIEB -- Am Projektende:
- [ ] Token-/Session-Handling überprüfen (Ablauf, ungültige Tokens, Logout-Fälle)
- [ ] Berechtigungen für Admin/Verkäufer/Käufer zentral testen (kein Zugriff ohne Rolle)

