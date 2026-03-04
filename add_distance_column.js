const db = require('./database');

db.serialize(() => {
    db.run("ALTER TABLE registrations ADD COLUMN distance TEXT", (err) => {
        if (err) console.log("Coluna 'distance' já existe ou erro:", err.message);
        else console.log("Coluna 'distance' adicionada com sucesso.");
    });
});
