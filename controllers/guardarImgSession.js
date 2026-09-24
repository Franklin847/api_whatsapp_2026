const qr = require('qr-image');
const dotenv = require("dotenv");
dotenv.config();

const generarImagen = (base64, cb = () => { }) => {
    let qr_svg = qr.image(base64, { type: 'svg', margin: 4 });
    qr_svg.pipe(require('fs').createWriteStream('./mediaSend/qr-code.svg'));
    console.log('⚡ Recuerda que el QR se actualiza cada minuto ⚡');
    console.log('⚡ Actualiza F5 el navegador para mantener el mejor QR⚡');
    console.log('⚡ Para escanear el QR ingresa a http://localhost:' + process.env.PUERTO_EXPRESS + '/qr ⚡');
    cb()
}


module.exports = { generarImagen }

