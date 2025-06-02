const { Client, LocalAuth, Buttons } = require('whatsapp-web.js');
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth()
});

let clientes = {};

// Cargar base de clientes desde archivo JSON
function cargarClientes() {
    try {
        clientes = JSON.parse(fs.readFileSync('clientes.json'));
    } catch (e) {
        clientes = {};
    }
}

// Guardar base de clientes a archivo JSON
function guardarClientes() {
    fs.writeFileSync('clientes.json', JSON.stringify(clientes, null, 2));
}

cargarClientes();

client.on('qr', (qr) => {
    console.log('Escanea este código QR con WhatsApp para iniciar sesión:');
    console.log(qr);
});

client.on('ready', () => {
    console.log('Client listo!');
});

client.on('message', async msg => {
    const chat = await msg.getChat();
    const numero = msg.from; // ID del usuario (número + @c.us)
    
    // Inicializar cliente en base si no existe
    if (!clientes[numero]) {
        clientes[numero] = {
            lote: null,
            nombre: null,
            apellido: null,
            pedidos: [],
            pedidoActual: {
                estado: 'pidiendo_lote',
                categoria: null,
                items: [],
                metodoPago: null
            }
        };
    }

    const cliente = clientes[numero];
    const pedido = cliente.pedidoActual;
    const texto = msg.body.trim().toLowerCase();

    // Función para mostrar menú de categorías
    function mostrarMenuCategorias() {
        return `*Club House Miraflores* 🍽️

Por favor, elegí una categoría:

1️⃣ Pastas  
2️⃣ Carnes  
3️⃣ Ensaladas  
4️⃣ Postres  
5️⃣ Finalizar pedido
`;
    }

    // Productos por categoría (podés agregar o modificar acá)
    const productos = {
        pastas: [
            { nombre: 'Ravioles con salsa', precio: 500 },
            { nombre: 'Fettuccine alfredo', precio: 600 }
        ],
        carnes: [
            { nombre: 'Bife de chorizo', precio: 900 },
            { nombre: 'Pollo a la parrilla', precio: 700 }
        ],
        ensaladas: [
            { nombre: 'Ensalada César', precio: 400 },
            { nombre: 'Ensalada mixta', precio: 350 }
        ],
        postres: [
            { nombre: 'Flan con dulce de leche', precio: 300 },
            { nombre: 'Helado artesanal', precio: 350 }
        ]
    };

    // Guardar clientes luego de cambios
    function guardarYResponder(respuesta) {
        guardarClientes();
        return msg.reply(respuesta);
    }

    // Estado inicial: pedir lote
    if (pedido.estado === 'pidiendo_lote') {
        cliente.lote = msg.body.trim();
        pedido.estado = 'pidiendo_nombre';
        guardarClientes();
        return msg.reply('Gracias. Ahora escribí tu *nombre*');
    }

    // Pedir nombre
    if (pedido.estado === 'pidiendo_nombre') {
        cliente.nombre = msg.body.trim();
        pedido.estado = 'pidiendo_apellido';
        guardarClientes();
        return msg.reply('Perfecto. Ahora escribí tu *apellido*');
    }

    // Pedir apellido
    if (pedido.estado === 'pidiendo_apellido') {
        cliente.apellido = msg.body.trim();
        pedido.estado = 'inicio';
        guardarClientes();
        return msg.reply(`Hola *${cliente.nombre} ${cliente.apellido}*, bienvenido a *Club House Miraflores*.\n\nEscribí "menu" para ver las opciones de comida.`);
    }

    // Inicio normal - espera "menu"
    if (pedido.estado === 'inicio') {
        if (texto === 'menu') {
            pedido.estado = 'esperando_categoria';
            guardarClientes();
            return msg.reply(mostrarMenuCategorias());
        } else {
            return msg.reply(`Hola *${cliente.nombre}*, para comenzar a pedir escribí *menu*.`);
        }
    }

    // Elegir categoría
    if (pedido.estado === 'esperando_categoria') {
        if (['1', '1️⃣'].includes(texto)) {
            pedido.categoria = 'pastas';
        } else if (['2', '2️⃣'].includes(texto)) {
            pedido.categoria = 'carnes';
        } else if (['3', '3️⃣'].includes(texto)) {
            pedido.categoria = 'ensaladas';
        } else if (['4', '4️⃣'].includes(texto)) {
            pedido.categoria = 'postres';
        } else if (['5', '5️⃣'].includes(texto)) {
            if (pedido.items.length === 0) {
                return msg.reply('No has elegido ningún producto aún. Por favor, selecciona al menos uno.');
            } else {
                pedido.estado = 'esperando_pago';
                guardarClientes();

                let resumenPedido = `*Resumen de tu pedido:*\n\n` +
                    pedido.items.map((item, i) => `${i + 1}. ${item.nombre} - $${item.precio}`).join('\n');

                resumenPedido += `\n\n¿Cómo deseas pagar?\n1️⃣ Pago al cadete\n2️⃣ Transferencia bancaria`;

                return msg.reply(resumenPedido);
            }
        } else {
            return msg.reply('Por favor, elegí una opción válida del menú.');
        }

        // Mostrar productos de la categoría elegida
        const listaProductos = productos[pedido.categoria];
        let textoProductos = `*${pedido.categoria.charAt(0).toUpperCase() + pedido.categoria.slice(1)}*:\n\n`;
        listaProductos.forEach((p, i) => {
            textoProductos += `${i + 1}. ${p.nombre} - $${p.precio}\n`;
        });
        textoProductos += `\nEscribí el número del producto para agregarlo a tu pedido, o "menu" para volver al menú principal.`;

        pedido.estado = 'esperando_producto';
        guardarClientes();
        return msg.reply(textoProductos);
    }

    // Elegir producto
    if (pedido.estado === 'esperando_producto') {
        if (texto === 'menu') {
            pedido.estado = 'esperando_categoria';
            guardarClientes();
            return msg.reply(mostrarMenuCategorias());
        }

        const listaProductos = productos[pedido.categoria];
        const numeroProd = parseInt(texto);
        if (!numeroProd || numeroProd < 1 || numeroProd > listaProductos.length) {
            return msg.reply('Por favor, escribí un número válido del producto o "menu" para volver.');
        }

        const productoElegido = listaProductos[numeroProd - 1];
        pedido.items.push(productoElegido);

        pedido.estado = 'esperando_categoria';
        guardarClientes();
        return msg.reply(`${productoElegido.nombre} agregado a tu pedido.\n\n¿Querés seguir pidiendo? Escribí "menu" para continuar o "5" para finalizar pedido.`);
    }

    // Elegir método de pago y enviar resumen final
    if (pedido.estado === 'esperando_pago') {
        if (texto === '1' || texto === '1️⃣') {
            pedido.metodoPago = 'Pago al cadete';
        } else if (texto === '2' || texto === '2️⃣') {
            pedido.metodoPago = 'Transferencia bancaria';
        } else {
            return msg.reply('Por favor, elegí "1" o "2" para el método de pago.');
        }

        // Calcular total
        const total = pedido.items.reduce((sum, item) => sum + item.precio, 0);

        // Datos bancarios para transferencia (cambiá por los tuyos)
        const cbu = '0123456789012345678901';
        const alias = 'clubhouse.miraflores';

        // Armar resumen base
        let resumen = `📦 *Pedido finalizado* 📦

*Cliente:* ${cliente.nombre} ${cliente.apellido}  
*Número de lote:* ${cliente.lote}  

*Productos:*
${pedido.items.map((item, i) => `${i + 1}. ${item.nombre} - $${item.precio}`).join('\n')}

*Total:* $${total}

*Método de pago:* ${pedido.metodoPago}
`;

        // Si es transferencia, agregar datos de pago
        if (pedido.metodoPago === 'Transferencia bancaria') {
            resumen += `\nPor favor realiza el depósito a:\nCBU: ${cbu}\nAlias: ${alias}\n`;
        }

        resumen += `\n¡Muchas gracias por tu compra en *Club House Miraflores*! 😊`;

        // Guardar pedido en historial cliente
        cliente.pedidos.push({
            fecha: new Date().toISOString(),
            items: pedido.items,
            metodoPago: pedido.metodoPago,
            total: total
        });

        // Reset pedido actual
        cliente.pedidoActual = {
            estado: 'inicio',
            categoria: null,
            items: [],
            metodoPago: null
        };

        guardarClientes();

        // Enviar resumen al cliente
        await msg.reply(resumen);

        // Enviar resumen a tu WhatsApp para cocina
        const miNumero = '5493416542022@c.us'; // Cambiar por tu número real con código de país
        await client.sendMessage(miNumero, `Nuevo pedido de ${cliente.nombre} ${cliente.apellido} (${cliente.lote}):\n\n${resumen}`);

        return;
    }

    // Si no se entiende nada, guiar
    return msg.reply('Por favor escribí "menu" para comenzar a pedir.');
});

client.initialize();
