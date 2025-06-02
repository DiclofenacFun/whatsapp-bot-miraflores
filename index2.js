const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');

const client = new Client();

// Estructura para productos
const productos = {
    pastas: ['Spaghetti Bolognesa', 'Fideos con crema', 'Lasagna'],
    carnes: ['Milanesa con papas', 'Pollo al horno', 'Bife de chorizo'],
    bebidas: ['Agua', 'Gaseosa', 'Cerveza'],
    postres: ['Flan', 'Helado', 'Chocotorta']
};

// Para almacenar pedidos por número de usuario
const pedidos = {};

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot conectado y listo');
});

client.on('message', async msg => {
    const chatId = msg.from;
    const texto = msg.body.toLowerCase();

    // Inicializar pedido si no existe
    if (!pedidos[chatId]) {
        pedidos[chatId] = {
            estado: 'inicio', // Para controlar en qué paso está
            items: []
        };
    }

    const pedido = pedidos[chatId];

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
        switch (texto) {
            case '1':
                pedido.estado = 'esperando_producto';
                pedido.categoria = 'pastas';
                return msg.reply(
                    '🍝 *Pastas*:\n' +
                    productos.pastas.map((p, i) => `${i + 1}. ${p}`).join('\n') +
                    '\n\nEscribí el número del plato que querés.'
                );
            case '2':
                pedido.estado = 'esperando_producto';
                pedido.categoria = 'carnes';
                return msg.reply(
                    '🥩 *Carnes*:\n' +
                    productos.carnes.map((p, i) => `${i + 1}. ${p}`).join('\n') +
                    '\n\nEscribí el número del plato que querés.'
                );
            case '3':
                pedido.estado = 'esperando_producto';
                pedido.categoria = 'bebidas';
                return msg.reply(
                    '🥤 *Bebidas*:\n' +
                    productos.bebidas.map((p, i) => `${i + 1}. ${p}`).join('\n') +
                    '\n\nEscribí el número del plato que querés.'
                );
            case '4':
                pedido.estado = 'esperando_producto';
                pedido.categoria = 'postres';
                return msg.reply(
                    '🍰 *Postres*:\n' +
                    productos.postres.map((p, i) => `${i + 1}. ${p}`).join('\n') +
                    '\n\nEscribí el número del plato que querés.'
                );
            default:
                return msg.reply('Por favor, elegí una opción válida (1-4).');
        }
    }

    if (pedido.estado === 'esperando_producto') {
        const categoria = pedido.categoria;
        const opciones = productos[categoria];
        const indice = parseInt(texto) - 1;

        if (indice >= 0 && indice < opciones.length) {
            const elegido = opciones[indice];
            pedido.items.push(elegido);

            pedido.estado = 'preguntar_mas';

            return msg.reply(`✅ Agregaste: *${elegido}*\n¿Querés algo más? (sí/no)`);
        } else {
            return msg.reply('Por favor, escribí un número válido del plato.');
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

*Responda con el número de la opción*
            `);
        } else if (texto === 'no') {
            pedido.estado = 'esperando_pago';
            return msg.reply(`💳 ¿Cómo desea pagar?\n\n1️⃣ Al cadete\n2️⃣ Por transferencia`);
        } else {
            return msg.reply('Por favor respondé "sí" o "no".');
        }
    }

    if (pedido.estado === 'esperando_pago') {
        if (texto === '1' || texto === '1️⃣') {
            pedido.metodoPago = 'Pago al cadete';
        } else if (texto === '2' || texto === '2️⃣') {
            pedido.metodoPago = 'Transferencia bancaria';
        } else {
            return msg.reply('Por favor, elegí "1" o "2" para el método de pago.');
        }

        // Armar resumen del pedido
        const resumen = `📦 *Pedido finalizado* 📦

*Productos:*
${pedido.items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

*Método de pago:* ${pedido.metodoPago}

¡Gracias por tu compra en Club House Miraflores!`;

        // Limpiar pedido para siguiente
        pedidos[chatId] = { estado: 'inicio', items: [] };

        // Enviar resumen al cliente
        await msg.reply(resumen);

        // Opcional: enviarte el pedido a vos para cocina
        // Cambiá este número por tu número de WhatsApp con código de país, sin signos.
        const miNumero = '5493416542022@c.us';
        await client.sendMessage(miNumero, `Nuevo pedido de ${chatId}:\n\n${resumen}`);

        return;
    }

    // Si no se entiende nada, guía
    return msg.reply('Por favor escribí "menu" para comenzar a pedir.');
});

client.initialize();
