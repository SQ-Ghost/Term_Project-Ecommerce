// database test file for error checking. Keep for now, but delete later.
const db = require('./database');

// Check tables
db.serialize(() => {
    db.all(`SELECT name FROM sqlite_master WHERE type='table'`, [], (err, rows) => {
        if (err) {
            console.error("Error fetching tables:", err.message);
        } else {
            console.log("Tables in the database:");
            rows.forEach(row => console.log(row.name));
        }
    });
});

db.close();