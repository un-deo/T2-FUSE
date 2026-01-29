
document.getElementById('editBtn').addEventListener('click', function() {

    const modal = document.getElementById('editModal');
    modal.classList.remove('hidden');
});


document.getElementById('deleteBtn').addEventListener('click', function() {

    const modal = document.getElementById('deleteModal');
    modal.classList.remove('hidden');
});


fetch('http://localhost:3000/api/search?kategorie=all')
            .then(response => response.json())
            .then(data => {
                // untötige console log kann man entfernen
                console.log('Alle Kategorien:', data);
                
                
                const select = document.getElementById('kategorie');
                
                
                const placeholder = select.querySelector('option[value=""]');
                
                
                select.innerHTML = '';
                if (placeholder) {
                    select.appendChild(placeholder);
                }
                
                
                data.forEach((kategorie) => {
                    //cann auch entfernt werden
                    console.log(`${kategorie.name}`);
                    
                    
                    const option = document.createElement('option');
                    option.value = kategorie.kategorieId;
                    option.textContent = kategorie.name;
                    select.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Fehler beim Abrufen der Kategorien:', error);
            });

        
        document.getElementById('produktForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
           
            const produktDaten = {
                name: document.getElementById('name').value,
                kategorie: document.getElementById('kategorie').value,
                beschreibung: document.getElementById('beschreibung').value,
                preis: parseFloat(document.getElementById('preis').value),
                bestand: parseInt(document.getElementById('bestand').value),
                gewicht: document.getElementById('gewicht').value,
                herkunft: document.getElementById('herkunft').value,
                bildUrl: document.getElementById('bildUrl').value
            };
            
            // Dejan hier ist es als Json und als Json-String ausgeben
            console.log('Produkt-Daten als JSON:', produktDaten);
            console.log('Produkt-Daten als JSON-String:', JSON.stringify(produktDaten, null, 2));
            
            
            document.getElementById('editModal').classList.add('hidden');
        });


document.getElementById('cancelBtn').addEventListener('click', function() {
    document.getElementById('editModal').classList.add('hidden');
});


document.getElementById('closeBtn').addEventListener('click', function() {
    document.getElementById('editModal').classList.add('hidden');
});


document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
    document.getElementById('deleteModal').classList.add('hidden');
});

document.getElementById('closeDeleteBtn').addEventListener('click', function() {
    document.getElementById('deleteModal').classList.add('hidden');
});


document.getElementById('confirmDeleteBtn').addEventListener('click', function() {

    console.log('Produkt wird gelöscht...');
    
    // Hier sollten wir die Lösch-Logik implementieren
});