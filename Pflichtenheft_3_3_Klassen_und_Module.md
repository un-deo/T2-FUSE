# 3.3 Klassen und Module

Das System ist modular aufgebaut und verwendet keine streng objektorientierte Klassenstruktur, sondern Frontend- und Backend-Module sowie ein relationales Datenmodell mit Prisma.

**Zentrale Datenstrukturen:**  
Die wichtigste Entität ist der Benutzer (`user`) mit Attributen wie `userId`, `statusId`, `name`, `email`, `passwort` und Adressdaten. Mit dem Benutzer verbunden sind Produkte (`produkte`) mit Attributen wie `produktId`, `name`, `beschreibung`, `preis`, `status`, `Bestand` und `kategorieId`, Kategorien (`kategorie`) zur Gruppierung von Produkten, Warenkörbe (`warenkorb`) und Warenkorbpositionen (`warenkorbProdukte`) zur Verwaltung ausgewählter Produkte sowie Bestellungen (`bestellung`) und Bestellpositionen (`bestellungProdukte`) zur Abwicklung von Käufen. Zusätzlich gibt es `token` für die Sitzungsverwaltung, `einstellungen` für Benutzereinstellungen und `verkäuferstatusanfrage` für die Rollenverwaltung.

**Hauptmodule:**  
Im Backend übernimmt `productSearch.ts` die zentralen Funktionen wie Produktsuche, Login, Registrierung, Token-Prüfung und das Abrufen von Benutzerdaten. Das Modul `user.ts` enthält grundlegende Funktionen zur Benutzerverwaltung, während `seed.ts` Testdaten für die Datenbank erzeugt. Im Frontend steuert `home.js` den Login- und Registrierungsprozess, `product.js` die Produktsuche und Produktanzeige, `profil.js` die Profilansicht, `api.js` die Kommunikation mit dem Backend, `session-menu.js` den Sitzungsstatus und `seller.js` die Verkäuferansicht.

**Beziehungen zwischen den Modulen:**  
Das Frontend kommuniziert über HTTP-Anfragen mit dem Backend. Das Backend verarbeitet diese Anfragen in seinen Modulen und greift über Prisma auf die miteinander verknüpften Datenbanktabellen zu. Dadurch sind Benutzer, Produkte, Kategorien, Warenkörbe, Bestellungen und Tokens logisch miteinander verbunden.
