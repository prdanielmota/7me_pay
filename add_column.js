const db = require('./database');

db.serialize(() => {
    db.run("ALTER TABLE registrations ADD COLUMN payment_confirmed_at DATETIME", (err) => {
        if (err) {
            console.log("Coluna 'payment_confirmed_at' já existe ou erro:", err.message);
        } else {
            console.log("Coluna 'payment_confirmed_at' adicionada com sucesso.");
        }
    });
});
