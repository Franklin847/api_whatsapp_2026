// Rquisitos chatbot
const fs = require("fs");
const qr = require('qr-image')
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, LegacySessionAuth, Buttons, List, MessageMedia, MessageTypes } = require("whatsapp-web.js");

// Importaciones de otros modulos
const { generarImagen } = require('./controllers/guardarImgSession')
const { generarNombreArchivo } = require('./controllers/generarNombreArchivos')
const { escucharMensajes } = require("./controllers/escucharMensajes");

// Uso de servidor express
const express = require("express");
const app = express();

// --------------------------------------------------------
// Prevencion de Caidas del Servidor
// --------------------------------------------------------
process.on('uncaughtException', async function (err) {
    console.error('Se capturó un error inesperado (uncaughtException):', err);
    if (String(err).includes('detached Frame') || String(err).includes('Target closed') || String(err).includes('Protocol error')) {
        console.log('Reiniciando cliente de WhatsApp por error crítico (uncaughtException)...');
        sesion_activa = 'N';
        try { await client.destroy(); } catch (e) { }
        client.initialize();
    }
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Promesa no manejada (unhandledRejection):', promise, 'razón:', reason);
    if (String(reason).includes('detached Frame') || String(reason).includes('Target closed') || String(reason).includes('Protocol error')) {
        console.log('Reiniciando cliente de WhatsApp por error crítico (unhandledRejection)...');
        sesion_activa = 'N';
        try { await client.destroy(); } catch (e) { }
        client.initialize();
    }
});

// --------------------------------------------------------
// Metodos de whatsapp para iniciar el servidor
// --------------------------------------------------------

var sesion_activa = 'N';

// Uso de valores guardados
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client-one", qrTimeoutMs: 0
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process', // Reduce drásticamente el consumo de RAM, ideal para VPS
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process' // Evita que Chromium cree demasiados subprocesos
        ]
    }
});

//Inicializa el cliente whatsapp
client.initialize();

// Genera el codigo QR y lo guarda como svg en mediaSend con la funcion generarImagen()
client.on('qr', qr => generarImagen(qr, () => {
    qrcode.generate(qr, { small: true });
}))

// Cuando el servicio de whatsapp inicia nos da un mensaje en consola y ejecuta la funcion excuchar mensajes para que nos muestre en consola esos mensajes
client.on("ready", () => {
    console.log("El cliente Whatsapp esta listo!");
    sesion_activa = 'S';
    escucharMensajes(client);
});

// Se activa cuando nuestra sesion ya no esta activa o cerramos whatsapp web en nuestro telefono
client.on('disconnected', async (msg) => {
    console.error('DESCONECTADO: ' + msg)
    sesion_activa = 'N';

    // Cierra completamente el navegador anterior antes de abrir uno nuevo
    try {
        await client.destroy();
        console.log('Cliente anterior destruido para liberar memoria.');
    } catch (e) {
        console.log('Error al destruir cliente:', e);
    }

    //Inicializa el cliente whatsapp nuevamente
    client.initialize();
})

// --------------------------------------------------------
// Fin Metodos de whatsapp para iniciar el servidor
// --------------------------------------------------------



// --------------------------------------------------------
// Metodos de express para levantar el servidor 
// --------------------------------------------------------



// limite de envio de archivos por metodo post
app.use(express.json({ limit: '50mb' }));

// Mensaje de bienvenida express 
app.get('/', (req, res) => {
    res.send("Bienvenido a express Adrian");
});

// Mostramos la imagen del codigo QR por un metodo get que almacenamos anteriormente en mediaSend
app.get('/qr', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.sendFile('./mediaSend/qr-code.svg', { root: __dirname });
});

// Mostramos la imagen del codigo QR por un metodo get que almacenamos anteriormente en mediaSend
app.get('/qr_logueado', (req, res) => {
    res.setHeader('Content-Type', 'image/jpg');
    res.sendFile('./mediaSend/whatsapp_listo.jpg', { root: __dirname });
});

// Verifica la sesion si esta activa o inactiva
app.get('/verificar_sesion', (req, res) => {

    if (sesion_activa == 'S') {
        res.json(
            {
                status: true,
                data: sesion_activa,
                mensaje: 'SESION ACTIVA'
            }
        )
    } else {
        res.json(
            {
                status: false,
                data: sesion_activa,
                mensaje: 'SESION INACTIVA'
            }
        )
    }

});

// Ruta para cerrar sesión, destruir la instancia y limpiar caché/archivos de sesión
app.get('/cerrar_sesion', async (req, res) => {
    try {
        console.log('Cerrando sesión y destruyendo cliente...');

        // Destruir el cliente para cerrar los navegadores de chromium
        try {
            await client.destroy();
            sesion_activa = 'N';
        } catch (e) {
            console.log('El cliente ya estaba destruido o hubo un error menor:', e);
        }

        // Eliminar las carpetas de sesión y caché
        const pathAuth = './.wwebjs_auth';
        const pathCache = './.wwebjs_cache';

        if (fs.existsSync(pathAuth)) {
            fs.rmSync(pathAuth, { recursive: true, force: true });
            console.log('Carpeta .wwebjs_auth eliminada.');
        }

        if (fs.existsSync(pathCache)) {
            fs.rmSync(pathCache, { recursive: true, force: true });
            console.log('Carpeta .wwebjs_cache eliminada.');
        }

        // Inicializamos de nuevo el cliente para que quede listo para generar un nuevo QR
        console.log('Reiniciando cliente para nueva sesión...');
        client.initialize();

        res.json({
            status: true,
            mensaje: 'Sesión cerrada, instancias destruidas y carpetas borradas. El cliente se ha reiniciado y está listo para un nuevo QR.'
        });

    } catch (error) {
        console.error('Error al intentar cerrar la sesión:', error);
        res.json({
            status: false,
            mensaje: 'Error al cerrar la sesión o borrar las carpetas.',
            error: error.toString()
        });
    }
});

// metodo post para enviar un mensjae con un archivo
app.post('/enviar_mensaje', async (req, res) => {
    numero_recibe = req.body['numero_recibe'];
    mensaje_recibe = req.body['mensaje'];
    archivo = req.body['archivo'];


    //------------------PARAMETROS--------------------------
    /*
    {
        "numero_recibe": 998612034,    // Numero al que vamos a enviar el mensaje sin el 0
        "mensaje": "Tu mensaje personalizado",      // Mensaje personalizado
        "archivo": "archivo_base64_pdf"         // Archivo PDF transformado en base 64
    }
    */
    //------------------FIN_PARAMETROS----------------------


    try {

        if (sesion_activa == 'S') {

            //---------------------------------------------------------
            // ENVIO DE MENSAJES AUTOMATICOS
            //---------------------------------------------------------

            // Numero al que quieres enviar el sms
            const number = "+593" + numero_recibe;

            // Tu mensaje.
            const text = mensaje_recibe;

            // Getting chatId from the number.
            // we have to delete "+" from the beginning and add "@c.us" at the end of the number.
            const chatId = number.substring(1) + "@c.us";


            await client.sendMessage(chatId, text);

            var nombre_archivo = '';

            // Sending files if exists
            if (archivo) {
                // base64Data = archivo.replace(/^data:image\/png;base64,/, "");
                // binaryData = Buffer.from(base64Data, 'base64').toString('binary');
                nombre_archivo = 'archivos/recibos/' + generarNombreArchivo(20) + '.pdf';

                try {
                    fs.writeFileSync(nombre_archivo, archivo, "base64");
                    const media = MessageMedia.fromFilePath(nombre_archivo);
                    await client.sendMessage(chatId, media);
                } catch (err) {
                    console.log("Error al procesar el archivo:", err);
                }
            }


            //---------------------------------------------------------
            // ENVIO DE MENSAJES AUTOMATICOS
            //---------------------------------------------------------
            res.json(
                {
                    status: true,
                    data: req.body.mensaje,
                    mensaje: 'MENSAJE ENVIADO',
                    nombre_archivo: nombre_archivo
                }
            )  // <==== req.body will be a parsed JSON object

        } else {
            res.json(
                {
                    status: false,
                    data: sesion_activa,
                    mensaje: 'SESION INACTIVA'
                }
            )
        }

    } catch (error) {
        console.error(error);
        if (String(error).includes('detached Frame') || String(error).includes('Target closed') || String(error).includes('Protocol error')) {
            console.log('Reiniciando cliente de WhatsApp por error de frame en enviar_mensaje...');
            sesion_activa = 'N';
            try { await client.destroy(); } catch (e) { }
            client.initialize();
        }
        res.json(
            {
                status: false,
                data: error.toString(),
                mensaje: 'MENSAJE NO ENVIADO',
            }
        )  // <==== req.body will be a parsed JSON object
    }


})

// metodo post para enviar un mensjae con un archivo
app.post('/enviar_imagenes', async (req, res) => {
    numero_recibe = req.body['numero_recibe'];
    mensaje_recibe = req.body['mensaje'];
    imagenBase64 = req.body['imagen'];
    //imagenBase64 = 'data:image/jpeg;base64,' + req.body['imagen'];


    //------------------PARAMETROS--------------------------
    /*
    {
        "numero_recibe": 998612034,    // Numero al que vamos a enviar el mensaje sin el 0
        "mensaje": "Tu mensaje personalizado",      // Mensaje personalizado
        "imagen": "imagen_base64"         // Imagen base 64
    }
    */
    //------------------FIN_PARAMETROS----------------------


    try {

        if (sesion_activa == 'S') {



            // res.json({ requestBody: req.body })  // <==== req.body will be a parsed JSON object
            // SI Existen coincidencias del token lo dejamos enviar.
            //---------------------------------------------------------
            // ENVIO DE MENSAJES AUTOMATICOS
            //---------------------------------------------------------

            // Numero al que quieres enviar el sms
            const number = "+593" + numero_recibe;

            // Tu mensaje.
            const text = mensaje_recibe;

            // Getting chatId from the number.
            // we have to delete "+" from the beginning and add "@c.us" at the end of the number.
            const chatId = number.substring(1) + "@c.us";


            await client.sendMessage(chatId, text);
            const media = new MessageMedia('image/png', imagenBase64);
            await client.sendMessage(chatId, media);



            //---------------------------------------------------------
            // ENVIO DE MENSAJES AUTOMATICOS
            //---------------------------------------------------------
            res.json(
                {
                    status: true,
                    data: req.body.mensaje,
                    mensaje: 'MENSAJE ENVIADO',
                    nombre_archivo: 'IMAGEN'
                }
            )  // <==== req.body will be a parsed JSON object

        } else {
            res.json(
                {
                    status: false,
                    data: sesion_activa,
                    mensaje: 'SESION INACTIVA'
                }
            )
        }

    } catch (error) {
        console.error(error);
        if (String(error).includes('detached Frame') || String(error).includes('Target closed') || String(error).includes('Protocol error')) {
            console.log('Reiniciando cliente de WhatsApp por error de frame en enviar_imagenes...');
            sesion_activa = 'N';
            try { await client.destroy(); } catch (e) { }
            client.initialize();
        }
        res.json(
            {
                status: false,
                data: error.toString(),
                mensaje: 'MENSAJE NO ENVIADO',
            }
        )  // <==== req.body will be a parsed JSON object
    }


})




// 5. Enviar Documentos
app.post('/enviar_documentos', async (req, res) => {
    numero_recibe = req.body['numero_recibe'];
    mensaje_recibe = req.body['mensaje'];
    imagenBase64 = req.body['imagen']; // 'imagen' era el nombre del campo pdf en el original

    try {
        if (sesion_activa == 'S') {
            const number = "+593" + numero_recibe;
            const text = mensaje_recibe;
            const chatId = number.substring(1) + "@c.us";

            if (text) {
                await client.sendMessage(chatId, text);
            }

            if (imagenBase64) {
                // Volvemos a la forma original que tenías en la otra API:
                let media = new MessageMedia('application/pdf', imagenBase64.replace(/^data:.*?;base64,/, ""), 'documento.pdf');
                await client.sendMessage(chatId, media, { sendSeen: false });
            }

            res.json(
                {
                    status: true,
                    data: text,
                    mensaje: 'DOCUMENTO ENVIADO',
                    nombre_archivo: 'DOCUMENTO'
                }
            );

        } else {
            res.json(
                {
                    status: false,
                    data: sesion_activa,
                    mensaje: 'SESION INACTIVA'
                }
            );
        }

    } catch (error) {
        console.error(error);
        if (String(error).includes('detached Frame') || String(error).includes('Target closed') || String(error).includes('Protocol error')) {
            console.log('Reiniciando cliente de WhatsApp por error de frame en enviar_documentos...');
            sesion_activa = 'N';
            try { await client.destroy(); } catch (e) { }
            client.initialize();
        }
        res.json(
            {
                status: false,
                data: error.toString(),
                mensaje: 'DOCUMENTO NO ENVIADO',
            }
        );
    }
});

// Configuramos el puerto que queremos que escuche nuestro servidor express
app.listen(process.env.PUERTO_EXPRESS, '0.0.0.0', () => {
    console.log("Servidor express listo, escuchando el puerto " + process.env.PUERTO_EXPRESS);
})


// --------------------------------------------------------
// Fin Metodos de express para levantar el servidor
// --------------------------------------------------------








