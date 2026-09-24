## INSTALACION
```
npm install

npm run build

npm run dev

npm start
```
## ARCHIVOS
```
tmp/
   archivos/
   qr/
```

## DOCUMENTACION
```
https://github.com/leifermendez/api-whatsapp-ts.git

npm install

npm run build

npm run dev



edite el archivo: node_modules/whatsapp-web.js/src/util/Injected.js

//window.Store.MediaPrep = window.mR.findModule('MediaPrep')[0];

window.Store.MediaPrep = window.mR.findModule('prepRawMedia')[0];

```