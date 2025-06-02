const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./productos.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            precio REAL NOT NULL,
            categoria TEXT NOT NULL
        )
    `);

    console.log('✅ Tabla "productos" creada o ya existente');
});

db.close();