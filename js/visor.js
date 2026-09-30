/* ============================================================================
   visor.js · el visor 360 (WebGL, hotspots, plano, controles y carga)

   No hace falta tocarlo para editar el recorrido: eso está en config.js.
   Usa las constantes de config.js y planos.js, que se cargan antes.
   ============================================================================ */
"use strict";

/* ===========================================================================
2. Geometría: de metros a ángulos
===========================================================================
Rumbo (psi) = atan2(dx, dy). Es un ángulo del MUNDO, no de la foto: 0 apunta
a +Y y crece hacia +X. El acimut dentro de una foto es  psi + giro. Guardar
el estado de la cámara como rumbo del mundo —y no como ángulo de la foto—
es lo que permite que el fundido entre dos panoramas quede alineado: las dos
imágenes muestran la misma dirección real mientras se cruzan.
=========================================================================== */
const RAD = Math.PI / 180;
const listaEscenas = Object.keys(ESCENAS);

function rumbo(desde, hacia) {
  return Math.atan2(hacia[0] - desde[0], hacia[1] - desde[1]);
}
function dist2(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}
function normAng(a) {
  return (
    ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
    Math.PI
  );
}

/* Un salto se escribe de dos formas:
"dos_comedor"                        la marca va sobre la línea de viaje
{ a:"mono_estar", mirando:[2,-24] }  la marca va donde vos digas
La segunda sirve cuando la línea recta al destino atraviesa un muro y la
flecha termina apoyada contra la pared en vez de en el paso real. El rumbo
de llegada no cambia: siempre es hacia donde se camina. */
const idSalto = (s) => (typeof s === "string" ? s : s.a);
listaEscenas.forEach((k) => {
  (ESCENAS[k].saltos || []).forEach((x) => {
    const j = idSalto(x);
    const s = ESCENAS[j].saltos || (ESCENAS[j].saltos = []);
    if (!s.some((y) => idSalto(y) === k)) s.push(k);
  });
});

/* Cada escena arma su lista de marcas con rumbo y elevación ya resueltos. */
listaEscenas.forEach((k) => {
  const e = ESCENAS[k];
  e.marcas = [];

  e.saltos.forEach((sal) => {
    const j = idSalto(sal),
      o = ESCENAS[j];
    const psi = rumbo(e.pos, o.pos);
    const d = dist2(e.pos, o.pos);
    // La marca no se planta encima del destino (quedaría atrás de un muro):
    // flota sobre la línea de viaje, a una distancia caminable. La altura y la
    // distancia no son estéticas: con la cámara a 1,60 m y medio encuadre
    // vertical de 35°, el piso recién entra en cuadro más allá de los 2,3 m.
    // Más cerca o más abajo, la marca cae fuera de la pantalla.
    const dv = Math.max(2.6, Math.min(4.5, d * 0.9));
    const man =
      typeof sal === "object" && sal.mirando ? sal.mirando : null;
    e.marcas.push({
      tipo: "salto",
      a: j,
      manual: !!man,
      psi: man ? (man[0] - e.giro) * RAD : psi,
      el: man ? man[1] * RAD : Math.atan2(0.45 - ALTURA_CAMARA, dv),
      titulo: "Ir a " + o.nombre.toLowerCase(),
      rumboLlegada: psi, // se llega mirando hacia donde se caminó
    });
  });

  (e.datos || []).forEach((d) => {
    // Dos formas de decir dónde está una cosa, las dos válidas:
    //   en:[x,y,z]        un punto del plano  → el visor calcula el ángulo
    //   mirando:[az,el]   un ángulo leído del panorama, en grados
    // La primera es preferible porque no depende de la foto. La segunda sirve
    // para lo que se ve pero no se puede ubicar con confianza en la planta.
    let psi, el;
    if (d.mirando) {
      psi = (d.mirando[0] - e.giro) * RAD;
      el = d.mirando[1] * RAD;
    } else {
      psi = rumbo(e.pos, d.en);
      el = Math.atan2(
        d.en[2] - ALTURA_CAMARA,
        Math.max(0.35, dist2(e.pos, d.en)),
      );
    }
    e.marcas.push({
      tipo: "dato",
      psi: psi,
      el: el,
      manual: !!d.mirando,
      titulo: d.titulo,
      texto: d.texto,
    });
  });

  // Vista de arranque. Por defecto es el centro del panorama —el encuadre que
  // se eligió al renderizar—; 'vista' lo corre unos grados cuando lo bueno del
  // ambiente quedó a un costado. El acimut vale psi + giro: centrar es psi = -giro.
  e.rumbo0 = ((e.vista || 0) - e.giro) * RAD;
});

/* ===========================================================================
3. WebGL: un triángulo y un shader
===========================================================================
Dos texturas y DOS giros, uno por textura. Cada panorama aplica su propio
'giro' de render sobre el mismo rumbo del mundo, así el cruce está alineado.
=========================================================================== */
const cv = document.getElementById("gl");
const gl = cv.getContext("webgl", {
  antialias: false,
  alpha: false,
  preserveDrawingBuffer: false,
});

const VS = `attribute vec2 p; varying vec2 v;
void main(){ v = p; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D texA, texB;
uniform float uYawA, uYawB, uPitch, uFovA, uFovB, uAspect, uMix, uDip;
const float PI = 3.14159265359;

vec3 girar(vec3 d, float y){
float c = cos(y), s = sin(y);
return vec3(d.x*c + d.z*s, d.y, -d.x*s + d.z*c);
}
vec4 mirar(sampler2D t, vec3 d){
float u = atan(d.x, -d.z) / (2.0*PI) + 0.5;
float w = acos(clamp(d.y, -1.0, 1.0)) / PI;
return texture2D(t, vec2(u, w));
}
vec3 rayo(float fov, float cp, float sp){
float k = tan(fov * 0.5);
vec3 d = normalize(vec3(v.x * k * uAspect, v.y * k, -1.0));
return vec3(d.x, d.y*cp - d.z*sp, d.y*sp + d.z*cp);
}
void main(){
float cp = cos(uPitch), sp = sin(uPitch);
// Cada textura tiene su propio encuadre. Es lo que permite que, al pasar de un
// ambiente al otro, la imagen que dejás se AGRANDE (te acercás a lo que mirás)
// mientras la que llega se agranda también desde más chica (venías de atrás).
// Con un solo encuadre las dos escalan igual y se lee como un zoom, no como
// un paso.
vec4 a = mirar(texA, girar(rayo(uFovA, cp, sp), uYawA));
vec4 b = mirar(texB, girar(rayo(uFovB, cp, sp), uYawB));
gl_FragColor = mix(a, b, uMix) * vec4(vec3(uDip), 1.0);
}`;

function compilar(tipo, src) {
  const s = gl.createShader(tipo);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(s));
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VS));
gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(prog);
gl.useProgram(prog);
{
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}
const U = {};
[
  "texA",
  "texB",
  "uYawA",
  "uYawB",
  "uPitch",
  "uFovA",
  "uFovB",
  "uAspect",
  "uMix",
  "uDip",
].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
gl.uniform1i(U.texA, 0);
gl.uniform1i(U.texB, 1);

/* CLAMP_TO_EDGE y sin mipmaps: es lo único que WebGL 1 acepta cuando el ancho
de la imagen no es potencia de dos (2560, 3072, 6000…). Con REPEAT la textura
queda incompleta y el panorama se ve negro. */
function crearTextura(img) {
  const t = gl.createTexture();
  // Se sube por la unidad 2, nunca por la 0 ni la 1. Antes esto usaba la 0: cada
  // panorama que terminaba de bajar en segundo plano se quedaba enganchado en la
  // unidad que está en pantalla, y el visor mostraba el ambiente equivocado hasta
  // el siguiente salto. Con conexión rápida casi no se notaba; con conexión lenta
  // era el error visible.
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  return t;
}

/* ===========================================================================
4. Estado
=========================================================================== */
const FOV_BASE = 1.22,
  FOV_MIN = 0.55,
  FOV_MAX = 1.75;
// Cuánto puede alejarse el rumbo de llegada del encuadre elegido al renderizar.
// Subilo si querés que se respete siempre la dirección de la caminata; bajalo
// si preferís entrar siempre bien encuadrado.
const LLEGADA_MAX = (55 * Math.PI) / 180;
let actual = null; // id de escena
let unidad = "mono";
let psi = 0; // rumbo del mundo, radianes
let pitch = 0;
let fov = FOV_BASE;
let mezcla = 0; // 0 = textura A, 1 = textura B
let fovA = FOV_BASE,
  fovB = FOV_BASE; // encuadre de cada textura
let atenua = 1; // leve bajón de luz en el medio del cruce
let giroA = 0,
  giroB = 0; // giro de render de cada textura, radianes
let escA = null,
  escB = null; // qué escena hay en cada unidad de textura
let viaje = null; // animación en curso
let inercia = 0;
const texturas = {},
  imagenes = {};

/* ===========================================================================
5. Dibujo
=========================================================================== */
function redimensionar() {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.max(1, Math.round(r.width * dpr));
  cv.height = Math.max(1, Math.round(r.height * dpr));
  gl.viewport(0, 0, cv.width, cv.height);
}
window.addEventListener("resize", redimensionar);

/* Se reafirma el enganche en cada cuadro: es barato y deja el estado de WebGL a
prueba de cualquier otra cosa que toque una textura. */
function bindear() {
  if (escA && texturas[escA]) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texturas[escA]);
  }
  if (escB && texturas[escB]) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texturas[escB]);
  }
}
function dibujar() {
  bindear();
  gl.uniform1f(U.uYawA, -(psi + giroA));
  gl.uniform1f(U.uYawB, -(psi + giroB));
  gl.uniform1f(U.uPitch, pitch);
  gl.uniform1f(U.uFovA, viaje ? fovA : fov);
  gl.uniform1f(U.uFovB, viaje ? fovB : fov);
  gl.uniform1f(U.uAspect, cv.width / cv.height);
  gl.uniform1f(U.uMix, mezcla);
  gl.uniform1f(U.uDip, atenua);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/* ===========================================================================
6. Hotspots
=========================================================================== */
const hud = document.getElementById("hud");
let marcas = [];

const SVG_FLECHA =
  '<svg viewBox="0 0 24 24"><path d="M12 4v13M7 12l5 5 5-5"/></svg>';
const SVG_INFO =
  '<svg viewBox="0 0 24 24"><path d="M12 11v5.5M12 7.4v.3"/><circle cx="12" cy="12" r="9.2"/></svg>';

function armarMarcas() {
  marcas.forEach((m) => m.el.remove());
  marcas = ESCENAS[actual].marcas.map((m) => {
    const b = document.createElement("button");
    b.className = "hs " + (m.tipo === "salto" ? "salto" : "dato");
    b.innerHTML =
      '<span class="dot">' +
      (m.tipo === "salto" ? SVG_FLECHA : SVG_INFO) +
      '</span><span class="lbl">' +
      m.titulo +
      "</span>";
    b.setAttribute("aria-label", m.titulo);
    b.addEventListener("click", () => {
      if (m.tipo === "salto") irA(m.a, m.rumboLlegada);
      else abrirTarjeta(m);
    });
    hud.appendChild(b);
    return { el: b, m: m };
  });
  ubicarMarcas();
}

function ubicarMarcas() {
  const w = cv.clientWidth,
    h = cv.clientHeight;
  const k = Math.tan(fov / 2),
    asp = w / h;
  const cp = Math.cos(-pitch),
    sp = Math.sin(-pitch);
  const pila = { izq: 0, der: 0 };
  // La columna derecha arranca debajo de la ficha si está abierta, para que la
  // salida no quede tapada por el panel de datos.
  const fi = document.getElementById("ficha");
  const tope = { izq: h * 0.56, der: h * 0.56 };
  const tapa = [];
  if (!fi.classList.contains("off")) {
    const r = fi.getBoundingClientRect();
    tapa.push(r);
    if (window.innerWidth > 860)
      tope.der = Math.max(tope.der, r.bottom + 26);
  }
  if (tarjeta.classList.contains("on"))
    tapa.push(tarjeta.getBoundingClientRect());
  // Un hotspot debajo de un panel abierto no se puede tocar: mejor no dibujarlo.
  const tapado = (px, py) =>
    tapa.some(
      (r) =>
        px > r.left - 24 &&
        px < r.right + 24 &&
        py > r.top - 24 &&
        py < r.bottom + 24,
    );
  marcas.forEach((s) => {
    // Ángulo relativo: el giro de render se cancela solo, porque tanto la marca
    // como la cámara están expresadas en rumbo del mundo.
    const a = s.m.psi - psi,
      e = s.m.el,
      ce = Math.cos(e);
    let d = [Math.sin(a) * ce, Math.sin(e), -Math.cos(a) * ce];
    d = [d[0], d[1] * cp - d[2] * sp, d[1] * sp + d[2] * cp];

    let dentro = d[2] < -0.06,
      x = 0,
      y = 0;
    if (dentro) {
      x = d[0] / -d[2] / (k * asp);
      y = d[1] / -d[2] / k;
      dentro = Math.abs(x) <= 1.06 && Math.abs(y) <= 1.06;
    }
    if (s.m.tipo === "salto")
      s.el.dataset.listo = texturas[s.m.a] ? "1" : "0";

    if (dentro) {
      const px = (x * 0.5 + 0.5) * w,
        py = (0.5 - y * 0.5) * h;
      if (tapado(px, py)) {
        s.el.style.display = "none";
        return;
      }
      s.el.classList.remove("borde");
      s.el.removeAttribute("data-lado");
      s.el.style.display = "flex";
      s.el.style.left = px + "px";
      s.el.style.top = py + "px";
      return;
    }
    // Fuera de cuadro: los datos se esconden, pero una salida nunca se pierde.
    // Queda pegada al borde hacia el que hay que girar, así el balcón —que se
    // renderizó mirando al vacío— no parece un callejón sin salida.
    if (s.m.tipo !== "salto") {
      s.el.style.display = "none";
      return;
    }
    const lado = normAng(a) >= 0 ? "der" : "izq";
    s.el.classList.add("borde");
    s.el.dataset.lado = lado;
    s.el.style.display = "flex";
    s.el.style.left = lado === "der" ? w - 10 + "px" : "10px";
    s.el.style.top = tope[lado] + pila[lado] * 52 + "px";
    pila[lado]++;
  });
}

/* ===========================================================================
7. Plano
=========================================================================== */
let planoAct = null; // qué unidad está dibujada ahora en los planos
function ppx(P, x) {
  return ((x - P.xmin) / (P.xmax - P.xmin)) * P.px;
}
function ppy(P, y) {
  return ((P.ymax - y) / (P.ymax - P.ymin)) * P.py;
}

/* Hay un plano por unidad y se dibuja dos veces con el mismo código: chico en la
esquina y grande en la ventana ampliada. Cada plano trae su propio recorte en
metros, así que el mismo par (x, y) del modelo cae donde tiene que caer en los
dos, sin ajustar nada a mano. */
function svgPlano(P, u, grande) {
  const r = P.py * (grande ? 0.02 : 0.028);
  const fs = P.py * 0.024;
  let s = '<g class="conoG"></g>';
  UNIDADES[u].orden.forEach((k) => {
    const e = ESCENAS[k];
    const x = ppx(P, e.pos[0]),
      y = ppy(P, e.pos[1]);
    s +=
      `<g class="pinG" data-k="${k}" role="button" tabindex="0" aria-label="${e.nombre}">` +
      `<circle class="pin" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>` +
      // El rótulo va del lado que tenga lugar: si el pin está sobre el borde
      // derecho, el texto sale de la hoja.
      (grande
        ? x > P.px * 0.58
          ? `<text class="etq" text-anchor="end" x="${(x - r * 1.7).toFixed(1)}" y="${(y + fs * 0.36).toFixed(1)}" font-size="${fs.toFixed(1)}">${e.nombre}</text>`
          : `<text class="etq" x="${(x + r * 1.7).toFixed(1)}" y="${(y + fs * 0.36).toFixed(1)}" font-size="${fs.toFixed(1)}">${e.nombre}</text>`
        : "") +
      `<title>${e.nombre}</title></g>`;
  });
  return s;
}
function conectarPines(svg, alTocar) {
  svg.querySelectorAll(".pinG").forEach((g) => {
    const ir = (ev) => {
      ev.stopPropagation();
      irA(g.dataset.k);
      if (alTocar) alTocar();
    };
    g.addEventListener("click", ir);
    g.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        ir(ev);
      }
    });
  });
}
function armarPlano(u) {
  if (u === planoAct) return;
  planoAct = u;
  const P = PLANOS[u],
    nom = "Plano · " + UNIDADES[u].nombre;
  [
    ["planoImg", "planoSvg", false],
    ["pgImg", "pgSvg", true],
  ].forEach(([iid, sid, grande]) => {
    const img = document.getElementById(iid),
      svg = document.getElementById(sid);
    img.src = P.archivo;
    img.alt = nom;
    svg.setAttribute("viewBox", `0 0 ${P.px} ${P.py}`);
    svg.innerHTML = svgPlano(P, u, grande);
    conectarPines(svg, grande ? cerrarPlanoGrande : null);
  });
  document.getElementById("pgTit").textContent = UNIDADES[u].nombre;
  document.getElementById("pgSub").textContent = UNIDADES[u].resumen;
}
function pintarPlano() {
  const P = PLANOS[unidad];
  if (!P || planoAct !== unidad) return;
  const p = ESCENAS[actual].pos;
  const abre = Math.atan(
    Math.tan(fov / 2) * (cv.clientWidth / Math.max(1, cv.clientHeight)),
  );
  const R = Math.max(P.px, P.py) * 0.17;
  const cx = ppx(P, p[0]),
    cy = ppy(P, p[1]);
  const pt = (t) =>
    `${(cx + Math.sin(t) * R).toFixed(1)},${(cy - Math.cos(t) * R).toFixed(1)}`;
  const cono = `<path class="cono" d="M${cx.toFixed(1)},${cy.toFixed(1)} L${pt(psi - abre)} A${R},${R} 0 0,1 ${pt(psi + abre)} Z"/>`;
  document
    .querySelectorAll(".conoG")
    .forEach((g) => (g.innerHTML = cono));
  document.querySelectorAll(".pinG").forEach((el) => {
    const on = el.dataset.k === actual;
    el.querySelector(".pin").classList.toggle("on", on);
    const t = el.querySelector(".etq");
    if (t) t.classList.toggle("on", on);
  });
}

/* ---------- la ventana con el plano grande ---------- */
const planoGrande = document.getElementById("planoGrande");
function abrirPlanoGrande() {
  cerrarTarjeta();
  planoGrande.classList.remove("off");
}
function cerrarPlanoGrande() {
  planoGrande.classList.add("off");
}
document
  .getElementById("plano")
  .addEventListener("click", abrirPlanoGrande);
document
  .getElementById("btnPlano")
  .addEventListener("click", abrirPlanoGrande);
document
  .getElementById("pgX")
  .addEventListener("click", cerrarPlanoGrande);
planoGrande.addEventListener("click", (e) => {
  if (e.target === planoGrande) cerrarPlanoGrande();
});

/* ===========================================================================
8. Interfaz: unidades, ambientes, ficha, tarjeta
=========================================================================== */
const elUnidades = document.getElementById("unidades");
Object.keys(UNIDADES).forEach((u) => {
  const b = document.createElement("button");
  b.textContent = UNIDADES[u].nombre;
  b.dataset.u = u;
  b.addEventListener("click", () => {
    if (u === unidad) return;
    const destino = UNIDADES[u].inicio;
    irA(destino);
  });
  elUnidades.appendChild(b);
});

const elAmbientes = document.getElementById("ambientes");
function armarAmbientes() {
  elAmbientes.innerHTML = "";
  UNIDADES[unidad].orden.forEach((k) => {
    const b = document.createElement("button");
    b.className = "amb";
    b.textContent = ESCENAS[k].nombre;
    b.dataset.k = k;
    b.setAttribute("aria-current", k === actual);
    b.addEventListener("click", () => irA(k));
    elAmbientes.appendChild(b);
  });
}
function marcarInterfaz() {
  elUnidades
    .querySelectorAll("button")
    .forEach((b) =>
      b.setAttribute("aria-current", b.dataset.u === unidad),
    );
  elAmbientes
    .querySelectorAll(".amb")
    .forEach((b) =>
      b.setAttribute("aria-current", b.dataset.k === actual),
    );
}

function pintarFicha() {
  const u = UNIDADES[unidad];
  document.getElementById("fichaT").textContent = u.nombre;
  document.getElementById("fichaS").textContent = u.resumen;
  document.getElementById("fichaD").innerHTML = u.datos
    .map(
      (d) => `<div class="fila"><dt>${d[0]}</dt><dd>${d[1]}</dd></div>`,
    )
    .join("");
  document.getElementById("btnContacto").href =
    "https://wa.me/" +
    MARCA.whatsapp +
    "?text=" +
    encodeURIComponent(
      MARCA.mensaje +
        " " +
        u.nombre.toLowerCase() +
        " (" +
        MARCA.piso +
        ").",
    );
}
document
  .getElementById("btnFicha")
  .addEventListener("click", () =>
    document.getElementById("ficha").classList.toggle("off"),
  );

const tarjeta = document.getElementById("tarjeta");
function abrirTarjeta(m) {
  document.getElementById("tarjetaT").textContent = m.titulo;
  document.getElementById("tarjetaP").textContent = m.texto;
  tarjeta.classList.add("on");
}
function cerrarTarjeta() {
  tarjeta.classList.remove("on");
}
document
  .getElementById("tarjetaX")
  .addEventListener("click", cerrarTarjeta);

/* ===========================================================================
9. El viaje entre panoramas
===========================================================================
Un paso real tiene dos tiempos: primero girás la cabeza hacia donde vas, y
recién después caminás. Mezclar las dos cosas es lo que hacía que la
transición se sintiera falsa —la imagen giraba MIENTRAS se fundía, y el ojo
no puede seguir las dos cosas—. Acá van separadas:

1. GIRO   corto, sin fundido. Sólo si hay que girar más de 25°.
2. PASO   sin girar (o casi). Las dos imágenes se agrandan a la vez, con
         encuadres distintos, y se cruzan en el medio.

Lo del punto 2 es la clave y necesita los dos encuadres del shader. Cuando
caminás de A hacia B, TODO se agranda de forma continua: lo que ves desde A
se acerca, y lo de B —que venías viendo desde más lejos— también se acerca.
Si las dos imágenes usan el mismo encuadre, escalan igual y se lee como un
zoom de la pantalla. Con encuadres distintos se lee como avanzar.

El rumbo de llegada tampoco es libre: se usa el de viaje sólo si cae cerca
del encuadre con que se renderizó esa cámara. Si no, se entra por el encuadre
bueno. Caminar hacia un lado no justifica llegar mirando una pared.
=========================================================================== */
const girando = document.getElementById("girando");

function irA(k, rumboLlegada) {
  if (!ESCENAS[k] || k === actual || viaje) return;
  if (!texturas[k]) {
    // todavía no bajó: esperar mostrando el spinner
    girando.classList.add("on");
    cargarUna(k).then(() => {
      girando.classList.remove("on");
      if (ESCENAS[k]) irA(k, rumboLlegada);
    });
    return;
  }
  cerrarTarjeta();
  const desde = actual;
  // "Caminar" sólo tiene sentido entre dos puntos contiguos. Un salto del plano
  // a la otra unidad no es un paso: ahí conviene entrar con el encuadre elegido
  // al renderizar, que es el que muestra bien el ambiente.
  const salto =
    !!desde && ESCENAS[desde].saltos.some((x) => idSalto(x) === k);

  const rumboViaje = salto
    ? rumbo(ESCENAS[desde].pos, ESCENAS[k].pos)
    : null;

  // Rumbo de llegada. El de viaje sólo se respeta si no aleja demasiado del
  // encuadre con que se renderizó la cámara: más allá de LLEGADA_MAX se entra
  // mirando una pared, que es lo que se sentía como "me deja en cualquier lado".
  let psi1 = rumboLlegada;
  if (psi1 === undefined) {
    const bueno = ESCENAS[k].rumbo0;
    if (rumboViaje === null) psi1 = bueno;
    else
      psi1 =
        Math.abs(normAng(rumboViaje - bueno)) <= LLEGADA_MAX
          ? rumboViaje
          : bueno;
  }

  escB = k;
  giroB = ESCENAS[k].giro * RAD;
  bindear();

  actual = k;
  unidad = ESCENAS[k].unidad;
  armarPlano(unidad);
  armarAmbientes();
  marcarInterfaz();
  pintarFicha();

  inercia = 0;
  viaje = true;
  const pitch0 = pitch;

  // ---- tiempo 1: girar hacia donde se camina, sin fundido ----
  const psiGiro = rumboViaje !== null ? rumboViaje : psi1;
  const dGiro = normAng(psiGiro - psi);
  const DG =
    Math.abs(dGiro) < 25 * RAD
      ? 0
      : Math.min(420, 180 + (Math.abs(dGiro) / RAD) * 1.8);

  function tiempo2() {
    // ---- tiempo 2: el paso ----
    const t0 = performance.now();
    const D = salto ? 1050 : 700;
    const p0 = psi,
      dp = normAng(psi1 - psi);
    const pi0 = pitch;
    fovA = fov;
    fovB = fov * (salto ? 1.3 : 1.12);
    const fA = fov * (salto ? 0.66 : 0.86),
      fB = fov;
    (function paso() {
      const t = Math.min(1, (performance.now() - t0) / D);
      // smootherstep: arranca y termina con velocidad Y aceleración nulas, que
      // es lo que hace que no se note dónde empieza ni dónde termina
      const e = t * t * t * (t * (t * 6 - 15) + 10);
      mezcla = e;
      psi = p0 + dp * e;
      pitch = pi0 * (1 - e);
      fovA = fov + (fA - fov) * e;
      fovB =
        fov * (salto ? 1.3 : 1.12) +
        (fB - fov * (salto ? 1.3 : 1.12)) * e;
      // un bajón de luz mínimo en el medio: tapa el fantasma del cruce
      atenua = 1 - 0.06 * Math.sin(Math.PI * e);
      if (t < 1) {
        requestAnimationFrame(paso);
        return;
      }
      escA = k;
      giroA = giroB;
      mezcla = 0;
      atenua = 1;
      fov = fovA = fovB = FOV_BASE;
      psi = normAng(psi); // que no crezca indefinidamente entre saltos
      bindear();
      armarMarcas();
      viaje = null;
    })();
  }

  if (DG === 0) {
    tiempo2();
    return;
  }
  const g0 = performance.now(),
    pg = psi;
  (function girar() {
    const t = Math.min(1, (performance.now() - g0) / DG);
    const e = t * t * t * (t * (t * 6 - 15) + 10);
    psi = pg + dGiro * e;
    pitch = pitch0 * (1 - e * 0.5);
    if (t < 1) requestAnimationFrame(girar);
    else tiempo2();
  })();
}

/* ===========================================================================
10. Controles
=========================================================================== */
let arrastre = null;
cv.addEventListener("pointerdown", (e) => {
  arrastre = { x: e.clientX, y: e.clientY, psi: psi, pitch: pitch };
  inercia = 0;
  cv.setPointerCapture(e.pointerId);
  cv.classList.add("dragging");
  document.getElementById("ayuda").classList.add("off");
});
cv.addEventListener("pointermove", (e) => {
  if (!arrastre) return;
  const s = (fov / Math.max(1, cv.clientHeight)) * 1.05;
  const np = arrastre.psi - (e.clientX - arrastre.x) * s; // arrastrar a la derecha gira la vista a la izquierda
  inercia = np - psi;
  psi = np;
  pitch = Math.max(
    -1.3,
    Math.min(1.3, arrastre.pitch + (e.clientY - arrastre.y) * s),
  );
});
function soltar() {
  if (arrastre) {
    arrastre = null;
    cv.classList.remove("dragging");
  }
}
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);
cv.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (viaje) return;
    fov = Math.max(FOV_MIN, Math.min(FOV_MAX, fov + e.deltaY * 0.0016));
  },
  { passive: false },
);

cv.tabIndex = 0;
cv.addEventListener("keydown", (e) => {
  const k = {
    ArrowLeft: [-0.06, 0],
    ArrowRight: [0.06, 0],
    ArrowUp: [0, 0.045],
    ArrowDown: [0, -0.045],
  }[e.key];
  if (!k) return;
  e.preventDefault();
  psi += k[0];
  pitch = Math.max(-1.3, Math.min(1.3, pitch + k[1]));
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!planoGrande.classList.contains("off")) cerrarPlanoGrande();
    else cerrarTarjeta();
    return;
  }
  // E abre el modo edición, salvo que estés escribiendo en algún lado
  if (
    (e.key === "e" || e.key === "E") &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey
  ) {
    const t = e.target.tagName;
    if (t === "INPUT" || t === "TEXTAREA" || e.target.isContentEditable)
      return;
    modoEdicion(!editando);
  }
});

document.getElementById("btnCentrar").addEventListener("click", () => {
  if (viaje) return;
  psi = ESCENAS[actual].rumbo0;
  pitch = 0;
  fov = FOV_BASE;
});
document.getElementById("btnPantalla").addEventListener("click", () => {
  const s = document.getElementById("stage");
  if (document.fullscreenElement) document.exitFullscreen();
  else if (s.requestFullscreen) s.requestFullscreen();
});

/* ===========================================================================
10b. Modo edición  ·  tecla E
===========================================================================
Sirve para ubicar hotspots sin adivinar ángulos. Es el inverso exacto de la
cuenta que usa el visor para dibujarlos: de un píxel de la pantalla vuelve al
par (acimut, elevación) que hay que escribir en la configuración.

No cambia el archivo: te devuelve la línea para pegar en el index.html. Y no
se ve en el sitio publicado salvo que alguien apriete E a propósito.
=========================================================================== */
let editando = false;
const edSalida = document.getElementById("edSalida");
const edPanel = document.getElementById("editor");
const mira = document.getElementById("mira");

function g1(v) {
  return Math.round(v * 10) / 10;
}
function normGrados(a) {
  a = (a + 180) % 360;
  return (a < 0 ? a + 360 : a) - 180;
}

/* De un píxel de pantalla al ángulo dentro del panorama. */
function anguloEn(px, py) {
  const w = cv.clientWidth,
    h = cv.clientHeight;
  const k = Math.tan(fov / 2),
    asp = w / h;
  const x = (px / w - 0.5) * 2,
    y = (0.5 - py / h) * 2;
  let v = [x * k * asp, y * k, -1];
  const n = Math.hypot(v[0], v[1], v[2]);
  v = [v[0] / n, v[1] / n, v[2] / n];
  // el visor proyecta aplicando una rotación de -pitch; acá se deshace
  const cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  const d = [v[0], v[1] * cp - v[2] * sp, v[1] * sp + v[2] * cp];
  const el = Math.asin(Math.max(-1, Math.min(1, d[1])));
  const rel = Math.atan2(d[0], -d[2]);
  const rumboMundo = rel + psi;
  return {
    rumbo: rumboMundo,
    el: el,
    az: normGrados(rumboMundo / RAD + ESCENAS[actual].giro),
    elg: el / RAD,
  };
}

/* Si el rayo va para abajo, dónde pega en el solado. Sirve para escribir 'en'. */
function puntoEnPiso(a) {
  if (a.el > -0.1) return null;
  const t = -ALTURA_CAMARA / Math.sin(a.el);
  const hd = t * Math.cos(a.el);
  if (hd > 14) return null; // más lejos que eso ya es la calle, no el piso
  const p = ESCENAS[actual].pos;
  return [
    p[0] + Math.sin(a.rumbo) * hd,
    p[1] + Math.cos(a.rumbo) * hd,
    hd,
  ];
}

function lineaDe(a, m) {
  const t = m ? m.titulo : "…";
  let s = `escena: ${actual}   (giro ${ESCENAS[actual].giro}°)\n\n`;
  if (m && m.tipo === "salto") {
    s += `{ a:"${m.a}", mirando:[${g1(a.az)}, ${g1(a.elg)}] }`;
  } else {
    const tx = m && m.texto ? m.texto.replace(/"/g, "'") : "…";
    s += `{ mirando:[${g1(a.az)}, ${g1(a.elg)}], titulo:"${t}",\n  texto:"${tx}" }`;
  }
  const pp = puntoEnPiso(a);
  if (pp)
    s += `\n\nen el piso, a ${pp[2].toFixed(2)} m:  en:[${pp[0].toFixed(2)}, ${pp[1].toFixed(2)}, 0]`;
  return s;
}

function exportarEscena() {
  const e = ESCENAS[actual];
  const sal = e.marcas
    .filter((m) => m.tipo === "salto")
    .map((m) =>
      m.manual
        ? `{ a:"${m.a}", mirando:[${g1(normGrados(m.psi / RAD + e.giro))}, ${g1(m.el / RAD)}] }`
        : `"${m.a}"`,
    );
  const dat = e.marcas
    .filter((m) => m.tipo === "dato")
    .map(
      (m) =>
        `      { mirando:[${g1(normGrados(m.psi / RAD + e.giro))}, ${g1(m.el / RAD)}], titulo:"${m.titulo}",\n` +
        `        texto:"${(m.texto || "").replace(/"/g, "'")}" }`,
    );
  return (
    `  ${actual}: {\n` +
    `    nombre:"${e.nombre}", unidad:"${e.unidad}",\n` +
    `    pos:[${e.pos[0]}, ${e.pos[1]}], giro:${e.giro}${e.vista !== undefined ? ", vista:" + e.vista : ""},\n` +
    `    saltos:[${sal.join(", ")}],\n` +
    (dat.length
      ? `    datos:[\n${dat.join(",\n")}\n    ]\n`
      : `    datos:[]\n`) +
    `  },`
  );
}

function copiar(txt) {
  const t = document.createElement("textarea");
  t.value = txt;
  t.style.position = "fixed";
  t.style.opacity = "0";
  document.body.appendChild(t);
  t.select();
  try {
    document.execCommand("copy");
  } catch (e) {}
  if (navigator.clipboard)
    navigator.clipboard.writeText(txt).catch(() => {});
  t.remove();
}

function modoEdicion(on) {
  editando = on;
  document.body.classList.toggle("editando", on);
  edPanel.classList.toggle("off", !on);
  mira.style.display = "none";
  if (on) location.hash = "editar";
  else if (location.hash === "#editar")
    history.replaceState(null, "", location.pathname);
}
document
  .getElementById("edSalir")
  .addEventListener("click", () => modoEdicion(false));
document
  .getElementById("edCopiar")
  .addEventListener("click", () => copiar(edSalida.textContent));
document.getElementById("edEscena").addEventListener("click", () => {
  edSalida.textContent = exportarEscena();
  copiar(edSalida.textContent);
});

/* clic sobre la imagen: devuelve el ángulo de ese punto */
let hubeArrastrado = false;
cv.addEventListener("click", (e) => {
  if (!editando || hubeArrastrado) {
    hubeArrastrado = false;
    return;
  }
  const r = cv.getBoundingClientRect();
  const a = anguloEn(e.clientX - r.left, e.clientY - r.top);
  edSalida.textContent = lineaDe(a, null);
  mira.style.display = "block";
  mira.style.left = e.clientX - r.left + "px";
  mira.style.top = e.clientY - r.top + "px";
});

/* arrastrar una marca existente: se mueve en vivo y devuelve su línea nueva */
let marcaArr = null;
hud.addEventListener(
  "pointerdown",
  (e) => {
    if (!editando) return;
    const b = e.target.closest(".hs");
    if (!b) return;
    const s = marcas.find((x) => x.el === b);
    if (!s) return;
    e.preventDefault();
    e.stopPropagation();
    marcaArr = s;
    b.setPointerCapture(e.pointerId);
  },
  true,
);
hud.addEventListener(
  "pointermove",
  (e) => {
    if (!marcaArr) return;
    const r = cv.getBoundingClientRect();
    const a = anguloEn(e.clientX - r.left, e.clientY - r.top);
    marcaArr.m.psi = a.rumbo;
    marcaArr.m.el = a.el;
    marcaArr.m.manual = true;
    edSalida.textContent = lineaDe(a, marcaArr.m);
  },
  true,
);
hud.addEventListener(
  "pointerup",
  (e) => {
    if (!marcaArr) return;
    marcaArr = null;
    hubeArrastrado = true;
    setTimeout(() => {
      hubeArrastrado = false;
    }, 60);
  },
  true,
);

/* ===========================================================================
11. Bucle
=========================================================================== */
function bucle() {
  if (!arrastre && !viaje && Math.abs(inercia) > 0.00012) {
    psi += inercia;
    inercia *= 0.94;
  }
  dibujar();
  ubicarMarcas();
  pintarPlano();
  requestAnimationFrame(bucle);
}

/* ===========================================================================
11b. Escenas que no cargan
===========================================================================
Si un panorama no está —todavía no lo renderizaste, o el archivo se borró— la
escena se saca del recorrido en vez de dejar una flecha que no lleva a ningún
lado. Así se puede tener una cámara configurada de antemano: aparece sola el
día que existe el JPG.
=========================================================================== */
function descartar(k) {
  if (!ESCENAS[k]) return;
  const u = ESCENAS[k].unidad;
  console.warn(
    "falta " + CARPETA + k + ".jpg — saco esa parada del recorrido",
  );
  UNIDADES[u].orden = UNIDADES[u].orden.filter((x) => x !== k);
  if (UNIDADES[u].inicio === k) UNIDADES[u].inicio = UNIDADES[u].orden[0];
  listaEscenas.forEach((j) => {
    const e = ESCENAS[j];
    if (!e || j === k) return;
    e.saltos = (e.saltos || []).filter((x) => idSalto(x) !== k);
    e.marcas = (e.marcas || []).filter(
      (m) => !(m.tipo === "salto" && m.a === k),
    );
  });
  delete ESCENAS[k];
  const i = listaEscenas.indexOf(k);
  if (i >= 0) listaEscenas.splice(i, 1);
  if (actual === k) {
    const d = UNIDADES[u].inicio;
    if (d) irA(d);
    return;
  }
  if (actual) {
    planoAct = null;
    armarPlano(unidad);
    armarAmbientes();
    marcarInterfaz();
    armarMarcas();
  }
}

/* ===========================================================================
12. Carga
=========================================================================== */
const barraI = document.getElementById("barraI");
const cargaMsg = document.getElementById("cargaMsg");
let bajadas = 0;

function cargarUna(k) {
  if (imagenes[k]) return Promise.resolve(texturas[k]);
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      imagenes[k] = im;
      texturas[k] = crearTextura(im);
      bajadas++;
      res(texturas[k]);
    };
    im.onerror = () => {
      descartar(k);
      res(null);
    };
    im.src = url(k);
  });
}

function fallar(msg) {
  cargaMsg.innerHTML = msg;
  cargaMsg.style.color = "#ff8b8b";
  cargaMsg.style.maxWidth = "440px";
  cargaMsg.style.lineHeight = "1.8";
}

document.getElementById("cargaN").textContent = MARCA.nombre;
document.getElementById("marcaN").textContent = MARCA.nombre;
document.getElementById("marcaB").textContent = MARCA.bajada;
document.querySelector("#carga .sub").textContent = MARCA.bajada;

if (window.innerWidth <= 520) {
  document.getElementById("ayudaT").textContent =
    "Arrastrá para mirar · tocá los círculos";
}
armarPlano(unidad);
armarAmbientes();
pintarFicha();

if (!gl) {
  fallar("Este navegador no tiene WebGL disponible.");
} else {
  const primera = UNIDADES[unidad].inicio;
  cargarUna(primera).then((tex) => {
    if (!tex) {
      fallar(
        location.protocol === "file:"
          ? "Los panoramas no cargan si abrís el archivo con doble clic.<br>" +
              "Abrí una terminal en esta carpeta y corré <b>python -m http.server 8000</b>,<br>" +
              "después entrá a <b>http://localhost:8000</b>"
          : "No encontré <b>" +
              CARPETA +
              primera +
              ".jpg</b>.<br>" +
              "Copiá los siete panoramas a la carpeta <b>" +
              CARPETA +
              "</b> con esos nombres exactos.",
      );
      return;
    }
    redimensionar();
    actual = primera;
    giroA = giroB = ESCENAS[primera].giro * RAD;
    psi = ESCENAS[primera].rumbo0;
    escA = escB = primera;
    bindear();
    armarMarcas();
    armarPlano(unidad);
    armarAmbientes();
    marcarInterfaz();
    pintarFicha();
    document.getElementById("carga").classList.add("off");
    if (window.innerWidth > 980)
      document.getElementById("ficha").classList.remove("off");
    setTimeout(
      () => document.getElementById("ayuda").classList.add("off"),
      8000,
    );
    if (location.hash === "#editar") modoEdicion(true);
    bucle();

    // El resto baja en segundo plano, empezando por los vecinos de la primera.
    const resto = ESCENAS[primera].saltos
      .concat(listaEscenas.filter((k) => k !== primera))
      .filter((k, i, a) => a.indexOf(k) === i && k !== primera);
    (function siguiente(i) {
      if (i >= resto.length) return;
      cargarUna(resto[i]).then(() => {
        barraI.style.width = (100 * bajadas) / listaEscenas.length + "%";
        siguiente(i + 1);
      });
    })(0);
  });
}
