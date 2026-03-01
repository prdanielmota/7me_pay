const db = require('./database');

db.all('SELECT * FROM registrations ORDER BY created_at DESC', (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
});
