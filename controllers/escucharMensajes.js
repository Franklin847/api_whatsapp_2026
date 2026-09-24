function escucharMensajes(client) {
    // ---------------------------------------------------------
    // Debug de mensajes que llegan al numero registrado
    // ---------------------------------------------------------

    // Recibimos mensajes de las personas que nos escriben
    client.on("message", message => {
        // Imprimimos el mensaje que nos llega
        console.log(message);
        console.log("Mensaje Recibido: " + message.body + " - del numero: " + message.from);
        // var numero_persona_escribe = message.from;
        // client.sendMessage(numero_persona_escribe, 'HOLA');
    });

    // ---------------------------------------------------------
    // Debug de mensajes que llegan al numero registrado
    // ---------------------------------------------------------
}

module.exports = { escucharMensajes }
