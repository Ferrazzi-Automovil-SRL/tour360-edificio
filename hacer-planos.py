# ---------------------------------------------------------------------------
# hacer-planos.py  ·  arma los minimapas del visor a partir del render de planta
#
#   python hacer-planos.py "..\export\tour360_salida\planta-color.png"    (color)
#   python hacer-planos.py "..\export\tour360_salida\planta.png"          (blanco y negro)
#
# Toma la planta entera del piso y devuelve un PNG por unidad, recortado y con el
# fondo transparente, más un planos.json con a qué metros corresponde cada
# recorte. Ese JSON va pegado en la constante PLANOS del index.html: es lo que
# hace que los pines caigan solos en su lugar.
#
# Trabaja de dos maneras según lo que le des:
#
#   COLOR   planta-color.png, el render del 4-plano.py. Ya viene con materiales
#           reales y fondo transparente, así que sólo se recorta y se ajusta un
#           poco el contraste.
#
#   TINTA   planta.png, el render de trabajo del 1-inspeccionar.py: escala de
#           grises, fondo gris plano. Se lo convierte en un plano de tinta sobre
#           papel separando tres capas:
#             · fondo    el gris de afuera del edificio  -> transparente
#             · muros    negro y FINO (12 cm ≈ 17 px)    -> tinta
#             · muebles  negro y GRUESO (cama, mesada)   -> gris suave
#           Separar muros de muebles sin dibujar nada a mano se hace con
#           morfología: una apertura con un disco más grande que el espesor de un
#           muro se come los muros y deja los muebles. Lo que desaparece era muro.
# ---------------------------------------------------------------------------

import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

RUTA = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "planta.png")
AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = AQUI

# --- extensión en metros: del json que acompaña al png ----------------------
base = os.path.splitext(RUTA)[0] + ".json"
if not os.path.exists(base):
    base = os.path.join(os.path.dirname(RUTA), "planta.json")
if os.path.exists(base):
    with open(base, encoding="utf-8") as f:
        ext = json.load(f)["extension_m"]
    XMIN, XMAX, YMIN, YMAX = ext["xmin"], ext["xmax"], ext["ymin"], ext["ymax"]
    print(f"  medidas de {os.path.basename(base)}")
else:
    XMIN, XMAX, YMIN, YMAX = -4.668, 11.307, -0.398, 12.65
    print("  ATENCION: no encontré el json de la planta, uso las medidas viejas")

# --- qué recorta cada unidad, en metros -------------------------------------
# Un poco de aire alrededor y hasta donde llega la cámara más lejana. El recorte
# fino lo hace solo el script; esto es sólo el marco grueso.
# El muro entre las dos unidades va de x=3,56 a x=4,04 (medido sobre la planta:
# son las columnas donde la tinta es continua). Se parte al medio, así cada
# unidad muestra su propio cierre y ninguna muestra los muebles de la otra.
UNIDADES = {
    "mono": {"x": (-0.30, 3.80), "y": (-0.30, 8.75), "alto": 1200},
    "dos":  {"x": ( 3.86, 11.35), "y": (-0.30, 8.45), "alto": 1200},
}

# --- paleta del modo TINTA ---------------------------------------------------
TINTA  = (18, 22, 29)
MUEBLE = (176, 182, 192)
PAPEL  = (247, 245, 241)
SOMBRA = (214, 212, 207)

src = Image.open(RUTA)
W, H = src.size
MX = (XMAX - XMIN) / W
print(f"  planta {W}x{H}, {MX*100:.3f} cm por pixel")

alfa = None
if src.mode in ("RGBA", "LA"):
    a = np.asarray(src.convert("RGBA"))[..., 3]
    if (a < 200).mean() > 0.02:
        alfa = a
COLOR = alfa is not None
print("  modo: " + ("COLOR (fondo por alfa)" if COLOR else "TINTA (fondo por gris plano)"))

if COLOR:
    # -------- render con materiales: sólo un ajuste suave --------------------
    rgb = np.asarray(src.convert("RGB")).astype(np.float32) / 255.0
    # un toque de contraste y de saturación: el AgX sale correcto pero apagado
    rgb = np.clip((rgb - 0.5) * 1.10 + 0.5, 0, 1)
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    rgb = np.clip(lum[..., None] + (rgb - lum[..., None]) * 1.18, 0, 1)
    out = np.empty((H, W, 4), np.uint8)
    out[..., :3] = (rgb * 255).astype(np.uint8)
    out[..., 3] = alfa
else:
    # -------- render de trabajo en grises: se reconstruye el plano -----------
    g = np.asarray(src.convert("L")).astype(np.int16)

    fondo = np.abs(g - 97) <= 7
    # Ojo: la morfología de scipy trata lo de afuera del array como vacío, así que
    # una máscara que llega al borde se come el borde y desaparece. Se rellena.
    P = 12
    fondo = np.pad(fondo, P, constant_values=True)
    fondo = ndimage.binary_opening(fondo, np.ones((5, 5)))
    fondo = ndimage.binary_closing(fondo, np.ones((9, 9)))
    fondo = fondo[P:-P, P:-P]
    # sólo cuenta como fondo lo que se toca con el borde de la imagen: un gris
    # parecido adentro del depto no tiene por qué desaparecer
    etq, _ = ndimage.label(fondo)
    borde = (set(etq[0, :]) | set(etq[-1, :]) | set(etq[:, 0]) | set(etq[:, -1])) - {0}
    fondo = np.isin(etq, list(borde))
    print(f"    fondo: {100*fondo.mean():.1f}% de la imagen")

    oscuro = (g < 70) & ~fondo
    R = max(12, int(round(0.14 / MX)))
    yy, xx = np.mgrid[-R:R+1, -R:R+1]
    disco = (xx**2 + yy**2) <= R*R
    muebles = ndimage.binary_dilation(ndimage.binary_opening(oscuro, disco), np.ones((3, 3)))
    muros = oscuro & ~muebles
    print(f"    disco de {R} px  ->  muros {100*muros.mean():.2f}%   muebles {100*muebles.mean():.2f}%")

    t = np.clip((g.astype(np.float32) - 70) / 185.0, 0, 1)[..., None]
    out = np.zeros((H, W, 4), np.uint8)
    out[..., :3] = (np.array(SOMBRA, np.float32) +
                    (np.array(PAPEL, np.float32) - np.array(SOMBRA, np.float32)) * t).astype(np.uint8)
    bordes = ndimage.binary_dilation(muebles, np.ones((3, 3))) & ~muebles & ~muros & ~fondo
    out[bordes, :3] = (150, 156, 166)
    out[muebles] = (*MUEBLE, 255)
    out[muros]   = (*TINTA, 255)
    out[..., 3] = 255
    out[fondo, 3] = 0

img = Image.fromarray(out, "RGBA")

def px(x): return (x - XMIN) / (XMAX - XMIN) * W
def py(y): return (YMAX - y) / (YMAX - YMIN) * H

mapa = {}
for k, u in UNIDADES.items():
    x0, x1 = u["x"]; y0, y1 = u["y"]
    caja = (max(0, int(round(px(x0)))), max(0, int(round(py(y1)))),
            min(W, int(round(px(x1)))), min(H, int(round(py(y0)))))
    rec = img.crop(caja)
    x0 = XMIN + caja[0] * MX; x1 = XMIN + caja[2] * MX
    y1 = YMAX - caja[1] * MX; y0 = YMAX - caja[3] * MX

    # Ajuste fino: recortar hasta donde hay dibujo. El marco a mano siempre deja
    # aire de más, y en un minimapa de 120 px ese aire es media tarjeta. Como el
    # recorte cambia, hay que recalcular a qué metros corresponde: si no, los
    # pines quedan corridos.
    bb = rec.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    if bb:
        M = 8
        bb = (max(0, bb[0]-M), max(0, bb[1]-M),
              min(rec.size[0], bb[2]+M), min(rec.size[1], bb[3]+M))
        x0 = x0 + bb[0] * MX;  x1 = x0 + (bb[2] - bb[0]) * MX
        y1 = y1 - bb[1] * MX;  y0 = y1 - (bb[3] - bb[1]) * MX
        rec = rec.crop(bb)

    alto = min(u["alto"], rec.size[1])
    ancho = max(1, int(round(alto * rec.size[0] / rec.size[1])))
    if (ancho, alto) != rec.size:
        rec = rec.resize((ancho, alto), Image.LANCZOS)
    nombre = f"plano-{k}.png"
    rec.save(os.path.join(SALIDA, nombre), optimize=True)
    mapa[k] = {"archivo": nombre,
               "xmin": round(x0, 4), "xmax": round(x1, 4),
               "ymin": round(y0, 4), "ymax": round(y1, 4),
               "px": ancho, "py": alto}
    kb = os.path.getsize(os.path.join(SALIDA, nombre)) / 1024
    print(f"  {nombre}  {ancho}x{alto}  {kb:.0f} KB   "
          f"({x0:.2f} … {x1:.2f}) x ({y0:.2f} … {y1:.2f}) m")

with open(os.path.join(SALIDA, "planos.json"), "w", encoding="utf-8") as f:
    json.dump(mapa, f, indent=2, ensure_ascii=False)
print("\n  listo. Pegá el contenido de planos.json en la constante PLANOS del index.html\n")
