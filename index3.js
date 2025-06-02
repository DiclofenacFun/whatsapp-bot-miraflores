const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth()
});

// Productos base
const productos = {
  Pastas: [
    { id: 'p1', nombre: 'Ravioles', precio: 3500 },
    { id: 'p2', nombre: 'Fideos con tuco', precio: 2500 }
  ],
  Carnes: [
    { id: 'c1', nombre: 'Milanesa con papas', precio: 4500 },
    { id: 'c2', nombre: 'Bife de chorizo', precio: 8000 }
  ]
};

const cbu = '00012345000123456789';
const alias = 'clubhouse.miraflores';

// Guardamos clientes y pedidos (memoria temporal)
const clientes = {};
const pedidos = {};

client.on('qr', qr => {
  console.log('Escanea este código QR con WhatsApp para iniciar sesión:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Cliente listo!');
});

client.on('message', async msg => {
  const chatId = msg.from;
  const texto = msg.body.trim().toLowerCase();

  if (!clientes[chatId]) {
    // Primer contacto: pedimos lote, nombre, apellido en 3 pasos simples
    clientes[chatId] = { step: 1, pedido: [], total: 0 };
    msg.reply('Bienvenido a Club House Miraflores! Para comenzar, por favor envía tu número de lote.');
    return;
  }

  const cliente = clientes[chatId];

  // Controlamos pasos para lote, nombre y apellido
  if (cliente.step === 1) {
    cliente.lote = msg.body.trim();
    cliente.step = 2;
    msg.reply('Perfecto, ahora envía tu nombre.');
    return;
  }
  if (cliente.step === 2) {
    cliente.nombre = msg.body.trim();
    cliente.step = 3;
    msg.reply('Gracias! Por último, envía tu apellido.');
    return;
  }
  if (cliente.step === 3) {
    cliente.apellido = msg.body.trim();
    cliente.step = 4;
    msg.reply(`Hola ${cliente.nombre} ${cliente.apellido}, bienvenido de nuevo!`);
    msg.reply(menuCategorias());
    return;
  }

  // Ahora que cliente ya está identificado, manejamos menú y pedidos
  if (!cliente.step) cliente.step = 4; // Por si reinicia sin completar

  if (cliente.step === 4) {
    // Elegir categoría
    if (texto === 'pastas' || texto === 'carnes') {
      cliente.categoria = texto.charAt(0).toUpperCase() + texto.slice(1);
      cliente.step = 5;
      msg.reply(menuProductos(cliente.categoria));
      return;
    }
    msg.reply('Por favor, escribe la categoría deseada: Pastas o Carnes.');
    return;
  }

  if (cliente.step === 5) {
    // Elegir producto por número o nombre (simple)
    const productosCat = productos[cliente.categoria];
    const elegido = productosCat.find((p, i) => texto === p.nombre.toLowerCase() || texto === (i + 1).toString());

    if (!elegido) {
      msg.reply('No reconozco esa opción, elige un producto válido:\n' + menuProductos(cliente.categoria));
      return;
    }

    cliente.pedido.push(elegido);
    cliente.total += elegido.precio;
    cliente.step = 6;
    msg.reply(`${elegido.nombre} agregado a tu pedido.\n¿Querés agregar algo más? Escribe "sí" para continuar o "no" para finalizar.`);
    return;
  }

  if (cliente.step === 6) {
    if (texto === 'sí' || texto === 'si') {
      cliente.step = 4;
      msg.reply(menuCategorias());
      return;
    }
    if (texto === 'no') {
      cliente.step = 7;
      let resumen = 'Resumen de tu pedido:\n';
      cliente.pedido.forEach((p, i) => {
        resumen += `${i + 1}. ${p.nombre} - $${p.precio}\n`;
      });
      resumen += `Total: $${cliente.total}\n\n¿Cómo querés pagar? Escribe "cadete" o "transferencia".`;
      msg.reply(resumen);
      return;
    }
    msg.reply('Por favor, responde "sí" para agregar más o "no" para finalizar el pedido.');
    return;
  }

  if (cliente.step === 7) {
    if (texto === 'cadete') {
      msg.reply(`Perfecto. El total a pagar es $${cliente.total}.\nMuchas gracias por tu compra!`);
      enviarPedidoACocina(cliente, chatId);
      delete clientes[chatId];
      return;
    }
    if (texto === 'transferencia') {
      msg.reply(`Perfecto. Por favor realiza la transferencia a:\nCBU: ${cbu}\nAlias: ${alias}\nTotal a pagar: $${cliente.total}\nMuchas gracias por tu compra!`);
      enviarPedidoACocina(cliente, chatId);
      delete clientes[chatId];
      return;
    }
    msg.reply('Por favor, escribe "cadete" o "transferencia" para seleccionar forma de pago.');
    return;
  }
});

// Funciones para mostrar menú
function menuCategorias() {
  return 'Elige una categoría:\n- Pastas\n- Carnes';
}

function menuProductos(categoria) {
  const prods = productos[categoria];
  let texto = `Productos en ${categoria}:\n`;
  prods.forEach((p, i) => {
    texto += `${i + 1}. ${p.nombre} - $${p.precio}\n`;
  });
  texto += '\nEscribe el nombre o número del producto para agregarlo.';
  return texto;
}

function enviarPedidoACocina(cliente, chatId) {
  let mensaje = `Nuevo pedido de ${cliente.nombre} ${cliente.apellido}\nLote: ${cliente.lote}\nTotal: $${cliente.total}\nPedido:\n`;
  cliente.pedido.forEach((p, i) => {
    mensaje += `${i + 1}. ${p.nombre} - $${p.precio}\n`;
  });

  // Enviar a tu WhatsApp (reemplaza 'TU_NUMERO' con tu número en formato internacional sin +, ej: 5493412345678)
  const tuNumero = '3416542022@c.us';
  client.sendMessage(tuNumero, mensaje);
}

client.initialize();