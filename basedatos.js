const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./productos.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            apellido TEXT NOT NULL,
            lote TEXT NOT NULL,
            telefono TEXT NOT NULL UNIQUE
        )
    `);

    console.log('✅ Tabla "clientes" creada o ya existente');
});

db.close();