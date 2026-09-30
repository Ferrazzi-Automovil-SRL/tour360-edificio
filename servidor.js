/* ---------------------------------------------------------------------------
   servidor.js · sirve esta carpeta por HTTP, con Node en vez de Python
   
   Lo usa abrir-visor-node.bat. Existe porque la máquina donde está la copia de
   trabajo no tiene Python instalado y el abrir-visor.bat de siempre no arranca.
   Node alcanza y sobra: el visor son archivos estáticos.
   
       node servidor.js .          -> http://localhost:8000
       node servidor.js . 8080     -> otro puerto
   
   Manda Cache-Control: no-store, así que mientras probás NO hace falta subir
   la constante VERSION del index.html ni hacer Ctrl+Shift+R. Para la web
   publicada sí hace falta: eso lo sirve Vercel, no esto.
   --------------------------------------------------------------------------- */
const http = require("http"), fs = require("fs"), path = require("path");

const RAIZ   = path.resolve(process.argv[2] || ".");
const PUERTO = +(process.argv[3] || 8000);

const TIPOS = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css",
  ".json":"application/json", ".png":"image/png", ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg", ".svg":"image/svg+xml", ".ico":"image/x-icon",
  ".webp":"image/webp", ".woff2":"font/woff2", ".txt":"text/plain; charset=utf-8",
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(RAIZ, p);
  // no salir de la carpeta servida
  if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end("403"); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end("404  " + p); }
    res.writeHead(200, {
      "Content-Type": TIPOS[path.extname(f).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(d);
  });
}).listen(PUERTO, () => {
  console.log("");
  console.log("  sirviendo  " + RAIZ);
  console.log("  abrí       http://localhost:" + PUERTO);
  console.log("");
  console.log("  (Ctrl+C para cortar)");
  console.log("");
});
