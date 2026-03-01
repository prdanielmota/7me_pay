const db = require('./database');

db.serialize(() => {
    db.run("ALTER TABLE registrations ADD COLUMN birthdate TEXT", (err) => {
        if (err) console.log("Coluna 'birthdate' já existe ou erro:", err.message);
        else console.log("Coluna 'birthdate' adicionada.");
    });

    db.run("ALTER TABLE registrations ADD COLUMN cpf TEXT", (err) => {
        if (err) console.log("Coluna 'cpf' já existe ou erro:", err.message);
        else console.log("Coluna 'cpf' adicionada.");
    });
});
