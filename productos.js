const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./productos.db');

const productos = [
    { nombre: 'Spaghetti Bolognesa', precio: 3500, categoria: 'pastas' },
    { nombre: 'Fideos con crema', precio: 3300, categoria: 'pastas' },
    { nombre: 'Lasagna', precio: 4000, categoria: 'pastas' },
    { nombre: 'Milanesa con papas', precio: 4200, categoria: 'carnes' },
    { nombre: 'Pollo al horno', precio: 3900, categoria: 'carnes' },
    { nombre: 'Bife de chorizo', precio: 4700, categoria: 'carnes' },
    { nombre: 'Agua', precio: 800, categoria: 'bebidas' },
    { nombre: 'Gaseosa', precio: 1200, categoria: 'bebidas' },
    { nombre: 'Cerveza', precio: 1600, categoria: 'bebidas' },
    { nombre: 'Flan', precio: 1400, categoria: 'postres' },
    { nombre: 'Helado', precio: 1800, categoria: 'postres' },
    { nombre: 'Chocotorta', precio: 2200, categoria: 'postres' },
];

db.serialize(() => {
    const stmt = db.prepare('INSERT INTO productos (nombre, precio, categoria) VALUES (?, ?, ?)');
    productos.forEach(p => {
        stmt.run(p.nombre, p.precio, p.categoria);
    });
    stmt.finalize();
    console.log('✅ Productos insertados correctamente');
});

db.close();