const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Verifica se existe pasta 'data', senão usa a raiz (para compatibilidade)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'registrations.db');

console.log(`Usando banco de dados em: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        payment_method TEXT NOT NULL,
        payment_status TEXT DEFAULT 'pending', -- pending, paid
        pix_code TEXT,
        payment_id TEXT,
        whatsapp TEXT,
        birthdate TEXT,
        cpf TEXT,
        tshirt_size TEXT,
        distance TEXT,
        payment_confirmed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

module.exports = db;
