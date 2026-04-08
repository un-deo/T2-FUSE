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


ToDos / Next steps:
-
  - Fix pictures. currently every time it seeds it changes produkt id --> picture paths wrong - __**Dejan/Moritz**__
  - add our real LOGO to all pages - __**Georgi / Marcel**__
  - Es fehlt ein Webdesign fuer user die bereits angemeldet sind (also wo statt anmelden / registrieren) Bsp ein profillogo + einstellungen knopf oä. ist - __**Georgi / Marcel / Moritz**__
  - change so names don't have to be unique in schema.prisma - __**Ben**__
  - Userprofiledata (fetch funktion einfach über der funktion __fetchUserProfile(userId, token)__) __**Moritz**__


Done:
-

- login Token Tabelle in DB (Token (random wie userid) PS, UserID FS, ablaufdatum) - __**BEN**__
- register form now works in backend (users can be created) and saved
- Small bug in product search fixed
- Render ersten 20 Produkte wenn angemeldet _**Dejan**__
- Fix Product.html --> footer is noton the bottom when no products are shown (whitespace bellow footer is ugly)
- validatePW function in api.js --> delivers bool as JSON

