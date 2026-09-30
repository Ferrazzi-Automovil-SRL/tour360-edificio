# Recorrido 360 · FRG

Recorrido virtual 360° de las dos unidades del 5.º piso del edificio FRG
(monoambiente y dos ambientes). Se camina por cada departamento terminado antes
de que exista: las imágenes son renders de Blender a partir del modelo 3D.

**Ver el recorrido:** https://ferrazzi-automovil-srl.github.io/tour360-edificio/

Sitio estático sin librerías (HTML + CSS + JavaScript con WebGL), publicado con
GitHub Pages desde la rama principal.

## Estructura

```
├── index.html      la página
├── css/            estilos
├── js/
│   ├── config.js   datos del recorrido: marca, WhatsApp, unidades, ambientes
│   ├── planos.js   ubicación de los minimapas (archivo generado)
│   └── visor.js    el visor: WebGL, puntos de salto, plano, controles
├── img/            minimapas de cada unidad
├── panoramas/      las 11 imágenes 360 (6144 × 3072 px)
└── herramientas/   scripts de trabajo, no forman parte del sitio
```

Para editar textos, ambientes o el número de WhatsApp: `js/config.js`.
Al reemplazar panoramas, subir `VERSION` en ese mismo archivo para que los
navegadores no muestren la imagen vieja.

## Verlo en la PC

Hace falta un servidor local (abrir `index.html` con doble clic no anda):

```
python -m http.server 8000
```

y abrir http://localhost:8000. Sin Python: `node herramientas/servidor.js .`

El detalle de todo está en [herramientas/MANUAL.md](herramientas/MANUAL.md).
