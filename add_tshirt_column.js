const db = require('./database');

db.serialize(() => {
    // Tenta adicionar a coluna tshirt_size se ela não existir
    db.run("ALTER TABLE registrations ADD COLUMN tshirt_size TEXT", (err) => {
        if (err) {
            console.log("Coluna 'tshirt_size' já existe ou erro:", err.message);
        } else {
            console.log("Coluna 'tshirt_size' adicionada com sucesso.");
        }
    });
});
