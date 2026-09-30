/* ============================================================================
   config.js · los datos del recorrido (marca, unidades, escenas y hotspots)

   Es lo único que se toca para editar el tour. Los planos de la esquina están
   aparte, en planos.js, porque los escribe hacer-planos.py solo.
   ============================================================================ */
"use strict";

/* ===========================================================================
1. CONFIGURACIÓN — esto es lo único que se toca para editar el recorrido
===========================================================================

Sistema de coordenadas: es el MISMO del camaras.json de Blender, en metros.
· x, y  = posición en planta
· z     = altura sobre el solado (la cámara está a 1,60 m)
· rumbo = 0 mira a +Y, 90 a -X, 180 a -Y, 270 a +X

'giro' de cada escena tiene que ser IDÉNTICO al "yaw" de esa cámara en
camaras.json. Si no coincide, el panorama se ve bien pero los hotspots
quedan corridos: son ángulos calculados, no dibujados a mano.
=========================================================================== */

const MARCA = {
  nombre: "FRG",
  bajada: "Recorrido 360",
  piso: "5.º piso",
  whatsapp: "5491100000000", // ← poné tu número real, sin + ni espacios
  mensaje:
    "Hola, vi el recorrido 360 del FRG y quiero información sobre la unidad",
};

const ALTURA_CAMARA = 1.6; // igual a "altura_camara" del camaras.json
const CARPETA = "panoramas/"; // dónde están los JPG, con la barra final

/* VERSION: subí este número cada vez que reemplaces los panoramas.
El navegador guarda las imágenes en su caché y las reconoce por la URL. Si
pisás dos_living.jpg con otra imagen, la URL no cambió, así que el navegador
sigue mostrando la que ya tenía: no vuelve a pedirla. Con esto la URL pasa a
ser "panoramas/dos_living.jpg?v=2", que para él es un archivo distinto.
(Para ver un cambio sin tocar esto, recargá con Ctrl+Shift+R.) */
const VERSION = 2;
const url = (k) => CARPETA + k + ".jpg?v=" + VERSION;

const UNIDADES = {
  mono: {
    nombre: "Monoambiente",
    resumen: MARCA.piso + " · contrafrente",
    datos: [
      ["Ambientes", "1"],
      ["Ambiente único", "3,05 × 5,60 m · 17,1 m²"],
      ["Balcón", "2,45 m de largo · 4,2 m²"],
      ["Cocina", "Integrada, 2,45 m de mesada"],
      ["Baño", "Completo · 2,00 × 3,10 m · 6,3 m²"],
      ["Piso", MARCA.piso],
    ],
    inicio: "mono_estar", // con qué imagen abre la unidad
    orden: ["mono_entrada", "mono_bano", "mono_estar", "mono_balcon"],
  },
  dos: {
    nombre: "Dos ambientes",
    resumen: MARCA.piso + " · contrafrente",
    datos: [
      ["Ambientes", "2"],
      ["Estar-comedor", "4,05 × 5,80 m · 23,5 m²"],
      ["Dormitorio", "3,00 × 4,05 m · 12,1 m²"],
      ["Balcón", "6,10 m de largo · 9,6 m²"],
      ["Cocina", "Lineal, 2,60 m de mesada"],
      ["Baño", "Completo · 2,16 × 1,49 m · 3,2 m²"],
      ["Piso", MARCA.piso],
    ],
    inicio: "dos_comedor",
    orden: [
      "dos_dormitorio",
      "dos_comedor",
      "dos_bano",
      "dos_cocina",
      "dos_living",
      "dos_balcon",
      "dos_balcon_dorm",
    ],
  },
};

const ESCENAS = {
  /* ---------------------------- MONOAMBIENTE ---------------------------- */
  mono_entrada: {
    nombre: "Entrada",
    unidad: "mono",
    pos: [3.35, 8.15],
    giro: 180,
    // 29/09: con el estar en 3,00/5,80 la recta pasa por el vano (x 2,9-3,85)
    // y el salto ya no necesita ángulo propio.
    saltos: ["mono_estar"],
    datos: [
      {
        mirando: [40, -20],
        titulo: "Cocina integrada",
        texto:
          "Mesada corrida de 2,45 m con bajo mesada y alacena en toda su extensión, más el paño de heladera y despensa sobre el otro lateral. Al quedar en el hall de acceso, no le come metros al ambiente.",
      },
      {
        mirando: [-45, -8],
        titulo: "Heladera y guardado",
        texto:
          "Nicho previsto para heladera de dos puertas, con columna de guardado al lado. Deja la mesada entera libre para trabajar.",
      },
    ],
  },
  mono_estar: {
    nombre: "Estar",
    unidad: "mono",
    // 29/09: movida de 1,90/5,90 (encima de una silla) al lugar libre más
    // cercano. Los datos van por coordenadas del mundo, no por ángulo.
    pos: [3.0, 5.8],
    giro: 148,
    vista: -40,
    saltos: ["mono_entrada", "mono_balcon"],
    datos: [
      {
        en: [1.95, 3.1, 0.55],
        titulo: "Zona de descanso",
        texto:
          "El ambiente tiene 3,05 × 5,60 m: entra cama de dos plazas contra el frente sin bloquear el paso al balcón, y del otro lado queda lugar para estar y comedor diario.",
      },
      {
        en: [3.8, 3.22, 1.2],
        titulo: "Mueble de living y TV",
        texto:
          "Mueble bajo corrido con estantes altos sobre el paramento este, con el televisor integrado. Es el único módulo fijo del ambiente: todo lo demás se acomoda como quieras.",
      },
    ],
  },
  /* El baño (23/09). La cámara está en el paso de la puerta (y 7,75-8,55):
la recta hasta la entrada pasa por el vano, así que el salto no necesita
ángulo propio. Los muros de este baño son los tres inclinados.          */
  mono_bano: {
    nombre: "Baño",
    unidad: "mono",
    pos: [1.55, 8.45],
    giro: 15,
    saltos: ["mono_entrada"],
    datos: [
      {
        en: [1.01, 10.66, 0.55],
        titulo: "Baño completo de 6,3 m²",
        texto:
          "2,00 × 3,10 m. Bañera de 1,60 m en el fondo y los artefactos en línea sobre la pared lateral, con toda la circulación libre.",
      },
      {
        en: [0.69, 8.55, 1.4],
        titulo: "Vanitory con espejo",
        texto:
          "Mueble suspendido con mesada de granito y bacha de apoyo, en el nicho junto a la puerta.",
      },
    ],
  },
  mono_balcon: {
    nombre: "Balcón",
    unidad: "mono",
    pos: [2.2, 1.0],
    giro: 180,
    saltos: ["mono_estar"],
    datos: [
      {
        mirando: [25, -30],
        titulo: "Balcón de 4,2 m²",
        texto:
          "2,45 m de largo por 1,89 de fondo máximo, con baranda metálica de barrotes verticales. Da para dos sillones y una mesa baja, con vista abierta sobre la manzana.",
      },
    ],
  },

  /* ---------------------------- DOS AMBIENTES --------------------------- */
  dos_dormitorio: {
    nombre: "Dormitorio",
    unidad: "dos",
    pos: [5.0, 4.7],
    giro: 195,
    saltos: ["dos_comedor", "dos_balcon_dorm"],
    datos: [
      {
        mirando: [-145, -8],
        titulo: "Placard de 2,80 m",
        texto:
          "Placard empotrado en todo el paramento norte del dormitorio, 2,80 m de frente con puertas corredizas. Al estar embutido no ocupa superficie del ambiente.",
      },
      {
        en: [5.3, 3.27, 0.62],
        titulo: "Dormitorio de 12,1 m²",
        texto:
          "3,00 × 4,05 m. Entra cama de dos plazas con mesas de luz a ambos lados y todavía queda circulación al pie y salida directa al balcón.",
      },
    ],
  },
  dos_comedor: {
    nombre: "Comedor",
    unidad: "dos",
    pos: [7.6, 4.9],
    giro: 273,
    // La recta a la cocina atraviesa la barra: ese salto lleva ángulo propio,
    // medido sobre el panorama. El del living ya no (29/09): la cámara del
    // living se movió de encima de la mesa ratona y la recta quedó libre.
    saltos: [
      "dos_dormitorio",
      "dos_living",
      { a: "dos_cocina", mirando: [-95, -30] },
      // La recta al baño atraviesa el muro: la marca va a la PUERTA
      // (x 6,93 · y 6,49). Calculado, no medido: rumbo -22,9° + giro 273.
      // Si cuando esté el panorama cae corrida, corregila con la tecla E.
      { a: "dos_bano", mirando: [-110, -24] },
    ],
    datos: [
      {
        mirando: [-79, -4],
        titulo: "Mesada y frente",
        texto:
          "Mesada corrida de 2,60 m con frente de azulejo tipo subway y bajo mesada en toda su extensión. Queda a la vista desde el comedor, así que el frente es parte del ambiente.",
      },
      {
        mirando: [-70, 9],
        titulo: "Alacena hasta el techo",
        texto:
          "Alacena en dos alturas que llega al cielorraso. La fila de arriba suma guardado de poco uso sin ocupar un metro de superficie.",
      },
      {
        mirando: [-49, -21],
        titulo: "Isla desayunador",
        texto:
          "La península separa la cocina del comedor sin cerrarla: mesada corrida, bajo mesada del lado de la cocina y lugar para dos banquetas del lado del estar.",
      },
      {
        en: [9.34, 5.26, 0.78],
        titulo: "Comedor para seis",
        texto:
          "El estar-comedor mide 4,05 × 5,80 m: la mesa de seis queda junto a la cocina y deja el resto del ambiente libre para el living.",
      },
    ],
  },
  /* DENTRO del pasillo de trabajo. La cocina tiene tres franjas, medidas sobre
la planta a 5 cm:  barra y 6,95-7,60 · pasillo y 7,65-8,55 (90 cm) ·
mesada con anafe y 8,60-8,85 contra el muro norte. Se entra por x 7,00-7,95.
 2-panoramas.bat "" dos_cocina                                            */
  dos_cocina: {
    nombre: "Cocina",
    unidad: "dos",
    pos: [9.85, 8.1],
    giro: 69,
    saltos: [{ a: "dos_comedor", mirando: [-40, -25] }],
    datos: [],
  },
  /* El baño (23/09). En el modelo la puerta estaba cerrada: el script la abre
90° hacia afuera (mover_objetos en camaras.json). La cámara queda entre
el vanitory y el bidet, mirando la bañera.                               */
  dos_bano: {
    nombre: "Baño",
    unidad: "dos",
    pos: [6.4, 6.66],
    giro: 90,
    // de vuelta al comedor, también por la puerta: rumbo 107,8° + giro 90
    saltos: [{ a: "dos_comedor", mirando: [-162, -24] }],
    datos: [
      {
        en: [5.06, 6.76, 0.55],
        titulo: "Baño completo",
        texto:
          "2,16 × 1,49 m. Bañera a lo largo de todo el fondo, inodoro y bidet sobre la misma pared y vanitory suspendido enfrente.",
      },
      {
        en: [5.865, 6.02, 1.45],
        titulo: "Vanitory suspendido",
        texto:
          "Mueble de 0,63 m con mesada de granito, bacha de apoyo y espejo. Al quedar suspendido deja el piso libre y el baño se ve más amplio.",
      },
    ],
  },
  dos_living: {
    nombre: "Living",
    unidad: "dos",
    pos: [8.6, 4.0],
    giro: 232, // 29/09: antes 8,70/2,90, encima de la mesa ratona
    saltos: ["dos_comedor", "dos_balcon"],
    datos: [
      {
        en: [10.18, 3.2, 0.55],
        titulo: "Estar de 22,2 m²",
        texto:
          "Un solo ambiente de 4,05 × 5,80 m, con la zona de estar sobre el balcón y el comedor del lado de la cocina. El paño vidriado ocupa todo el frente.",
      },
    ],
  },
  dos_balcon: {
    nombre: "Balcón · estar",
    unidad: "dos",
    pos: [8.6, 1.0],
    giro: 180,
    saltos: ["dos_living", "dos_balcon_dorm"],
    datos: [
      {
        mirando: [25, -31],
        titulo: "Balcón corrido de 6,10 m",
        texto:
          "9,6 m² de superficie pisable en un solo paño, con antepecho macizo revestido en listones y pasamano metálico. No es un balcón por ambiente: es uno solo que recorre todo el frente y al que se sale tanto desde el living como desde el dormitorio.",
      },
    ],
  },
  /* El otro extremo del MISMO balcón, en el tramo de adelante del dormitorio.
Con una sola cámara en x=8,60 esta mitad quedaba a 3 m y no se recorría.
 2-panoramas.bat "" dos_balcon_dorm                                     */
  dos_balcon_dorm: {
    nombre: "Balcón · dormitorio",
    unidad: "dos",
    pos: [5.82, 0.88],
    giro: 264,
    saltos: ["dos_dormitorio", "dos_balcon"],
    datos: [
      {
        mirando: [8, -16],
        titulo: "Se camina de punta a punta",
        texto:
          "Desde acá hasta el extremo del estar hay 6,10 m sin interrupción: el dormitorio y el living dan al mismo balcón, no a dos balcones chicos.",
      },
    ],
  },
};
