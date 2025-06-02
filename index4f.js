const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth()
});

// Base de datos de usuarios (temporal en memoria)
const usuarios = {};

// Precios asignados por producto
const productos = {
    pastas: [
        { nombre: 'Spaghetti Bolognesa', precio: 3000 },
        { nombre: 'Fideos con crema', precio: 2800 },
        { nombre: 'Lasagna', precio: 3500 }
    ],
    carnes: [
        { nombre: 'Milanesa con papas', precio: 3200 },
        { nombre: 'Pollo al horno', precio: 3300 },
        { nombre: 'Bife de chorizo', precio: 4000 }
    ],
    bebidas: [
        { nombre: 'Agua', precio: 800 },
        { nombre: 'Gaseosa', precio: 1000 },
        { nombre: 'Cerveza', precio: 1200 }
    ],
    postres: [
        { nombre: 'Flan', precio: 1500 },
        { nombre: 'Helado', precio: 1600 },
        { nombre: 'Chocotorta', precio: 2000 }
    ]
};

const pedidos = {};

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot conectado y listo');
});

client.on('message', async msg => {
    const chatId = msg.from;
    const texto = msg.body.trim().toLowerCase();

    if (!pedidos[chatId]) {
        pedidos[chatId] = {
            estado: 'registro',
            items: [],
            total: 0
        };
    }

    const pedido = pedidos[chatId];

    // Registro: pedimos nombre y apellido primero
    if (pedido.estado === 'registro') {
        await msg.reply('👋 ¡Bienvenido/a a *Club House Miraflores*! Por favor escribí tu *nombre y apellido*.');
        pedido.estado = 'esperando_lote';
        return;
    }

    // Pedimos lote después
    if (pedido.estado === 'esperando_lote') {
        usuarios[chatId] = usuarios[chatId] || {};
        usuarios[chatId].nombre = msg.body.trim();

        await msg.reply('Perfecto, ahora escribí tu *número de lote*.');
        pedido.estado = 'esperando_datos';
        return;
    }

    // Guardamos lote
    if (pedido.estado === 'esperando_datos') {
        const lote = msg.body.trim();
        if (!lote) {
            return msg.reply('Por favor escribí un número de lote válido.');
        }
        usuarios[chatId].lote = lote;

        pedido.estado = 'inicio';
        return msg.reply(`🙌 Gracias ${usuarios[chatId].nombre}, ya registramos tu lote (${usuarios[chatId].lote}). Escribí *menu* para comenzar tu pedido.`);
    }

    if (pedido.estado === 'inicio') {
        if (texto === 'menu') {
            pedido.estado = 'esperando_categoria';
            return msg.reply(`
🍽 *Club House Miraflores* 🍽

Seleccione una categoría:
1️⃣ Pastas
2️⃣ Carnes
3️⃣ Bebidas
4️⃣ Postres

*Responda con el número de la opción*
            `);
        } else {
            return msg.reply('Por favor, escribí "menu" para comenzar a pedir.');
        }
    }

    if (pedido.estado === 'esperando_categoria') {
        const categorias = ['pastas', 'carnes', 'bebidas', 'postres'];
        const index = parseInt(texto) - 1;
        if (index >= 0 && index < categorias.length) {
            const categoria = categorias[index];
            pedido.categoria = categoria;
            pedido.estado = 'esperando_producto';

            return msg.reply(`📋 *${categoria.charAt(0).toUpperCase() + categoria.slice(1)}*\n` +
                productos[categoria]
                    .map((prod, i) => `${i + 1}. ${prod.nombre} - $${prod.precio}`)
                    .join('\n') +
                '\n\nEscribí el número del producto que querés agregar.');
        } else {
            return msg.reply('Por favor, elegí una opción válida (1-4).');
        }
    }

    if (pedido.estado === 'esperando_producto') {
        const index = parseInt(texto) - 1;
        const categoria = pedido.categoria;
        const items = productos[categoria];

        if (index >= 0 && index < items.length) {
            const producto = items[index];
            pedido.items.push(producto);
            pedido.total += producto.precio;
            pedido.estado = 'preguntar_mas';

            return msg.reply(`✅ Agregaste: *${producto.nombre}*\n¿Querés algo más? (sí/no)`);
        } else {
            return msg.reply('Número inválido. Elegí una opción del menú anterior.');
        }
    }

    if (pedido.estado === 'preguntar_mas') {
        if (texto === 'sí' || texto === 'si') {
            pedido.estado = 'esperando_categoria';
            return msg.reply(`
🍽 *Club House Miraflores* 🍽

Seleccione una categoría:
1️⃣ Pastas
2️⃣ Carnes
3️⃣ Bebidas
4️⃣ Postres
            `);
        } else if (texto === 'no') {
            pedido.estado = 'esperando_pago';
            return msg.reply(`💳 ¿Cómo desea pagar?\n1️⃣ Al cadete\n2️⃣ Por transferencia`);
        } else {
            return msg.reply('Por favor respondé "sí" o "no".');
        }
    }

    if (pedido.estado === 'esperando_pago') {
        if (texto === '1' || texto === '2') {
            pedido.metodoPago = texto === '1' ? 'Pago al cadete' : 'Transferencia';

            const cliente = usuarios[chatId];
            const lista = pedido.items.map((item, i) => `${i + 1}. ${item.nombre} - $${item.precio}`).join('\n');

            let resumen = `🧾 *Resumen del pedido de ${cliente.nombre} (${cliente.lote})*\n\n` +
                          `*Productos:*\n${lista}\n\n` +
                          `*Método de pago:* ${pedido.metodoPago}\n` +
                          `*Total:* $${pedido.total}\n\n` +
                          `🙏 ¡Gracias por tu pedido en *Club House Miraflores*!`;

            if (pedido.metodoPago === 'Transferencia') {
                resumen += `\n\n💳 *Datos para transferir:*\nCBU: 1234567890123456789012\nAlias: club.miraflores.mp`;
            }

            // Enviar resumen al cliente
            await msg.reply(resumen);

            // Enviar resumen a cocina (tu número)
            const miNumero = '5493416542022@c.us';
            await client.sendMessage(miNumero, `📬 *Nuevo pedido recibido:*\n\n${resumen}`);

            // Resetear pedido para nuevo ciclo
            pedidos[chatId] = { estado: 'inicio', items: [], total: 0 };

            return;
        } else {
            return msg.reply('Por favor escribí *1* para Pago al cadete o *2* para Transferencia.');
        }
    }

    return msg.reply('Escribí "menu" para comenzar un pedido.');
});

client.initialize();
