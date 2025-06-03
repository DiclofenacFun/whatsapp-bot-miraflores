const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth()
});

// Base de datos de usuarios (temporal en memoria)
const usuarios = {};

// Productos y precios
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
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('❌ Error generando el QR:', err);
            return;
        }
        console.log('📱 Escaneá este código QR en tu navegador:');
        console.log(url);
    });
});

client.on('ready', () => {
    console.log('✅ Bot conectado y listo');
});

client.on('message', async msg => {
    const chatId = msg.from;
    const texto = msg.body.trim().toLowerCase();

    // Inicializa el pedido si no existe para este chat
    if (!pedidos[chatId]) {
        pedidos[chatId] = {
            estado: 'registro',
            items: [],
            total: 0
        };
    }

    const pedido = pedidos[chatId];

    switch (pedido.estado) {
        case 'registro':
            await msg.reply('👋 ¡Bienvenido/a a *Club House Miraflores*! Para comenzar, por favor escribí tu *nombre y apellido*, y luego el *número de lote*, separados por una coma. Ejemplo:\n\nJuan Pérez, Lote 45');
            pedido.estado = 'esperando_datos';
            break;

        case 'esperando_datos':
            {
                const partes = msg.body.trim().split(',');
                if (partes.length < 2) {
                    await msg.reply('Por favor escribí los datos en el formato correcto: *Nombre Apellido, Lote 45*');
                    return;
                }
                usuarios[chatId] = {
                    nombre: partes[0].trim(),
                    lote: partes[1].trim()
                };
                pedido.estado = 'inicio';
                await msg.reply(`🙌 Gracias ${usuarios[chatId].nombre}, ya registramos tu lote (${usuarios[chatId].lote}). Escribí *menu* para comenzar tu pedido.`);
            }
            break;

        case 'inicio':
            if (texto === 'menu') {
                pedido.estado = 'esperando_categoria';
                await msg.reply(`
🍽 *Club House Miraflores* 🍽

Seleccione una categoría:
1️⃣ Pastas
2️⃣ Carnes
3️⃣ Bebidas
4️⃣ Postres

*Responda con el número de la opción*`);
            } else {
                await msg.reply('Por favor, escribí "menu" para comenzar a pedir.');
            }
            break;

        case 'esperando_categoria':
            {
                const categorias = ['pastas', 'carnes', 'bebidas', 'postres'];
                const index = parseInt(texto) - 1;
                if (isNaN(index) || index < 0 || index >= categorias.length) {
                    await msg.reply('Por favor, elegí una opción válida (1-4).');
                    return;
                }
                const categoria = categorias[index];
                pedido.categoria = categoria;
                pedido.estado = 'esperando_producto';

                const listaProductos = productos[categoria]
                    .map((prod, i) => `${i + 1}. ${prod.nombre} - $${prod.precio}`)
                    .join('\n');

                await msg.reply(`📋 *${categoria.charAt(0).toUpperCase() + categoria.slice(1)}*\n${listaProductos}\n\nEscribí el número del producto que querés agregar.`);
            }
            break;

        case 'esperando_producto':
            {
                const index = parseInt(texto) - 1;
                const categoria = pedido.categoria;
                if (!categoria || !productos[categoria]) {
                    pedido.estado = 'inicio'; // Reiniciar si algo anda mal
                    await msg.reply('Ocurrió un error, por favor escribí "menu" para comenzar de nuevo.');
                    return;
                }
                const items = productos[categoria];
                if (isNaN(index) || index < 0 || index >= items.length) {
                    await msg.reply('Número inválido. Elegí una opción del menú anterior.');
                    return;
                }
                const producto = items[index];
                pedido.items.push(producto);
                pedido.total += producto.precio;
                pedido.estado = 'preguntar_mas';

                await msg.reply(`✅ Agregaste: *${producto.nombre}*\n¿Querés algo más? (sí/no)`);
            }
            break;

        case 'preguntar_mas':
            if (texto === 'sí' || texto === 'si') {
                pedido.estado = 'esperando_categoria';
                await msg.reply(`
🍽 *Club House Miraflores* 🍽

Seleccione una categoría:
1️⃣ Pastas
2️⃣ Carnes
3️⃣ Bebidas
4️⃣ Postres`);
            } else if (texto === 'no') {
                if (pedido.items.length === 0) {
                    pedido.estado = 'esperando_categoria';
                    await msg.reply('Tu pedido está vacío. Por favor, elegí algún producto primero.');
                    return;
                }
                pedido.estado = 'esperando_pago';
                await msg.reply(`💳 ¿Cómo desea pagar?
1️⃣ Al cadete
2️⃣ Por transferencia`);
            } else {
                await msg.reply('Por favor respondé "sí" o "no".');
            }
            break;

        case 'esperando_pago':
            if (texto === '1') {
                pedido.metodoPago = 'Pago al cadete';
            } else if (texto === '2') {
                pedido.metodoPago = 'Transferencia';
            } else {
                await msg.reply('Elegí "1" o "2" como método de pago.');
                return;
            }

            const cliente = usuarios[chatId];
            const lista = pedido.items
                .map((item, i) => `${i + 1}. ${item.nombre} - $${item.precio}`)
                .join('\n');

            let resumen = `🧾 *Resumen del pedido de ${cliente.nombre} (${cliente.lote})*\n\n` +
                          `*Productos:*\n${lista}\n\n` +
                          `*Método de pago:* ${pedido.metodoPago}\n` +
                          `*Total:* $${pedido.total}\n\n` +
                          `🙏 ¡Gracias por tu pedido en *Club House Miraflores*!`;

            if (pedido.metodoPago === 'Transferencia') {
                resumen += `\n\n💳 *Datos para transferir:*\nCBU: 1234567890123456789012\nAlias: club.miraflores.mp`;
            }

            await msg.reply(resumen);

            // Enviar pedido a número del negocio
            const miNumero = '5493416542022@c.us';
            await client.sendMessage(miNumero, `📬 *Nuevo pedido recibido:*\n\n${resumen}`);

            // Reiniciar pedido para el cliente
            pedidos[chatId] = { estado: 'inicio', items: [], total: 0 };
            break;

        default:
            await msg.reply('Escribí "menu" para comenzar un pedido.');
            pedido.estado = 'inicio';
            break;
    }
});

client.initialize();
