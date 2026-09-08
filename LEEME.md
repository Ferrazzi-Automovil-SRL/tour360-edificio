# Recorrido 360 · FRG

Visor de las dos unidades del 5.º piso, en una sola página con selector arriba.
No usa ninguna librería: es un `index.html` con WebGL adentro. Se publica como
sitio estático (Vercel) y no necesita servidor.

```
tour360-web/
├── index.html          ← el visor entero (config + código)
├── abrir-visor.bat     ← doble clic: levanta el server y abre el navegador
├── plano-mono.png      ← minimapa del monoambiente
├── plano-dos.png       ← minimapa del dos ambientes
├── hacer-planos.py     ← genera esos dos desde planta.png
├── planos.json         ← a qué metros corresponde cada minimapa
├── vercel.json         ← caché de las imágenes al publicar
├── panoramas/          ← acá van los 7 JPG del render
└── panoramas-prueba/   ← 7 imágenes de grilla para probar sin el render
```

---

## 0. Las dos carpetas de panoramas

`export\tour360_salida\panoramas\` es **la carpeta maestra**: la escribe Blender.
`tour360-web\panoramas\` es una **copia descartable**, existe sólo para que el
navegador la sirva.

Mientras no toques la primera, la segunda se puede pisar, borrar o arruinar las
veces que quieras: se rehace copiando de nuevo. Por eso conviene copiar siempre
en ese sentido y nunca al revés. Si dudás, parado en `tour360-web`:

```
copy /Y "..\export\tour360_salida\panoramas\*.jpg" panoramas\
```

Las siete son de 2560 × 1280. Si aparece alguna de 1024 × 512 es un sobrante de
las pruebas: no la usa nadie, pero sacala para no confundirte.

---

## 1. Ponerlo a andar

**Copiá los panoramas.** De `tour360_salida\panoramas\` a la carpeta
`panoramas\`, con los nombres tal cual: `mono_entrada.jpg`, `mono_estar.jpg`,
`mono_balcon.jpg`, `dos_dormitorio.jpg`, `dos_comedor.jpg`, `dos_living.jpg`,
`dos_balcon.jpg`. Son los mismos `id` del `camaras.json`.

**Abrilo con un servidor, no con doble clic.** El navegador no deja que una
página abierta como `file://` lea imágenes para una textura de WebGL. Lo más
corto es doble clic en **`abrir-visor.bat`**.

A mano es lo mismo, pero ojo dónde estás parado:

```
cd D:\ARCHIVOS\Projects\edificio\tour360-web
python -m http.server 8000
```

`http.server` publica **la carpeta donde está parada la terminal** y busca un
`index.html` ahí adentro. Si arrancás desde `panoramas\`, no lo encuentra y en vez
del recorrido te muestra un "Directory listing for /" con los archivos sueltos.
Eso no es un error: es Python diciendo "acá no hay página". El `.bat` lo resuelve
con `cd /d "%~dp0"`, que significa "andá a la carpeta de este archivo".

**Probarlo antes del render.** Si todavía no terminó, copiá el contenido de
`panoramas-prueba\` a `panoramas\`: son siete imágenes con una grilla de rumbos.
No son bonitas, pero sirven para ver que la navegación, los hotspots, el plano y
la transición funcionan. Las líneas azules marcan el mismo rumbo real en las
siete: si durante el cruce entre dos ambientes las líneas se ven **nítidas**, el
recorrido está bien alineado; si se ven **dobles**, algún `giro` no coincide con
el `yaw` del `camaras.json`.

---

## 2. Publicar en Vercel

La forma más corta, sin instalar nada: entrás a vercel.com → **Add New… →
Project → Deploy**, y arrastrás **la carpeta entera**. Vercel detecta que es un
sitio estático, no hay que elegir framework ni build command.

Con la CLI, si preferís:

```
npm i -g vercel
vercel            (la primera vez, para previsualizar)
vercel --prod     (para el dominio definitivo)
```

Cada vez que cambies algo, repetís el `vercel --prod`. Lo que sube son archivos
sueltos: no hay compilación, así que lo que ves en `localhost:8000` es
exactamente lo que va a estar publicado.

**Peso.** Siete JPG de 2560 px pesan entre 5 y 9 MB en total. Anda bien, pero si
querés que abra rápido en celulares con datos, pasalos por
[squoosh.app](https://squoosh.app) a calidad 78–82: bajan casi a la mitad y en un
panorama no se nota. El `vercel.json` ya les pone caché de un año, así que la
segunda visita es instantánea.

---

## 3. Cómo editar el recorrido

Todo lo editable está arriba de todo del `index.html`, en el bloque
**1. CONFIGURACIÓN**. Es JavaScript pero se lee como una ficha: comas al final de
cada línea, comillas en los textos.

### El sistema de coordenadas es el mismo de Blender

Metros, y el mismo origen del `camaras.json`. `x` e `y` en planta, `z` medido
**desde el solado** (la cámara está a 1,60 m). El rumbo: `0` mira a +Y, `90` a
−X, `180` a −Y, `270` a +X.

### `giro` tiene que ser idéntico al `yaw` de esa cámara

```js
mono_estar: { nombre:"Estar", unidad:"mono",
              pos:[1.90, 5.90], giro:148, ... }
```

`pos` y `giro` son la **misma línea** del `camaras.json`. Si tocás una cámara en
Blender y volvés a renderizar, tenés que copiar el cambio acá. El panorama se va
a ver igual de bien aunque no lo hagas —pero los hotspots van a quedar corridos,
porque no están dibujados a mano: son ángulos calculados con esos números.

### El plano

Hay un plano por unidad y cambia solo: en el monoambiente ves el monoambiente, en
el dos ambientes ves el dos ambientes, con sus tres o cuatro pines y nada más. El
corte entre los dos cae en el eje del muro medianero (de x 3,56 a x 4,04 en la
planta), así que ninguna unidad muestra los muebles de la otra.

Está dos veces, dibujado por el mismo código: **chico** en la esquina y **grande**
en una ventana que se abre con la lupa del minimapa, con el ícono de plano de la
barra de arriba, o tocando el minimapa. En el grande cada pin lleva el nombre del
ambiente y se puede saltar desde ahí. Se cierra con Escape, con la X o clickeando
afuera.

#### De dónde salen los PNG

De `hacer-planos.py`, que trabaja de dos maneras según el render que le des:

**Modo TINTA** — con el `planta.png` del paso 1 (escala de grises, material
blanco, sol al cenit). Lo separa en tres capas:

| Qué | Cómo lo reconoce | Cómo queda |
|---|---|---|
| Fondo | el gris plano de afuera del edificio, pegado al borde | transparente |
| Muros | negro y **fino** (12 cm ≈ 17 px) | tinta |
| Muebles | negro y **grueso** (cama, mesada, sillón) | gris suave |

Separar muros de muebles sin dibujar nada a mano se hace con morfología: una
apertura con un disco más grande que el espesor de un muro se come los muros y
deja los muebles enteros. Lo que desaparece en esa operación **era** muro. Es la
misma idea que veníamos usando en todo el proyecto: en vez de una regla que
adivina, una medición que responde.

**Modo COLOR** — con el `planta-color.png` del **paso 4** (materiales reales,
sombras suaves, fondo transparente). Como ya viene bien, sólo recorta y le da un
toque de contraste y saturación. Es el modo bueno; el de tinta es el que sirve
mientras no tengas el render en color.

El script se da cuenta solo de cuál le tocó, mirando si la imagen trae canal alfa.

```
python hacer-planos.py "..\export\tour360_salida\planta-color.png"
```

Escribe `plano-mono.png`, `plano-dos.png` y `planos.json`. **Ese JSON hay que
pegarlo en la constante `PLANOS` del `index.html`**: guarda a qué metros
corresponde cada recorte, y es lo que hace que los pines caigan en su lugar sin
que nadie mida píxeles. El script recorta solo hasta donde hay dibujo, así que
cada vez que lo corras los números cambian un poco. Si cambiás el recorte y no
actualizás el JSON, los pines quedan corridos.

Los rangos de cada unidad, en metros, están arriba del `hacer-planos.py` en el
diccionario `UNIDADES`. Ahí se toca si querés incluir más o menos superficie.

#### El paso 4: la planta en color

`4-plano.bat`, en la carpeta `tour360\`. **Corrélo cuando termine el render de
panoramas**, porque usa todos los núcleos. Tarda unos minutos: es un solo cuadro.

Hace la planta que se le muestra a un comprador, no la de trabajo:

- materiales y texturas reales, con el piso de madera a la vista
- sol inclinado a 62° con sombras suaves, para que se lea el volumen
- fondo transparente, así el visor recorta por el alfa y no queda borde
- corte a 1,40 m sobre el solado **medido**

Ese último punto importa. El paso 1 detecta el piso con un histograma de alturas
y le dio 13,52; midiendo después con un rayo bajo cada cámara supimos que el
solado está a 14,38. Con el valor viejo el corte quedaba a 54 cm del piso en vez
de a 1,40 — por eso en el plano de trabajo no se leen los vanos de las puertas.
El paso 4 usa el `z_piso` del `camaras.json`, que es el medido.

Los parámetros del render se tocan en el `camaras.json`, en un bloque `"plano"`
(opcional, si no está usa los valores por defecto):

```json
"plano": { "resolucion": 2600, "muestras": 128, "altura_corte": 1.40,
           "sol_elevacion": 62, "sol_azimut": 35, "exposicion": 0.35 }
```

### Modo edición: ubicar hotspots sin adivinar ángulos

Apretá **E** dentro del visor (o entrá a `…/#editar`). Aparece una barra abajo y:

- **Clic en cualquier punto de la imagen** → te devuelve la línea de configuración
  con las coordenadas exactas de ese punto, lista para pegar. Si el punto está en
  el piso, te da también la versión `en:[x, y, 0]` en metros.
- **Arrastrá una marca existente** → se mueve en vivo y la barra te muestra su
  línea nueva. Así corregís uno que quedó torcido mirándolo, no calculándolo.
- **Copiar la escena entera** → te arma el bloque completo de esa escena, con
  saltos, datos y textos, para reemplazar el que está en el `index.html`.

No modifica el archivo: te da el texto y vos lo pegás. Y no se ve en el sitio
publicado salvo que alguien apriete E a propósito.

La cuenta que hace es exactamente la inversa de la que usa el visor para dibujar
los hotspots, así que la ida y la vuelta cierran al centésimo de grado. Si
arrastrás una marca y después pegás lo que te devuelve, queda clavada donde la
soltaste.

### Agregar una cámara nueva

Es la única mejora que necesita volver a Blender, y es barata: **una cámara sola
tarda unos 15 minutos**, no hay que rehacer el recorrido entero.

1. En `tour360\camaras.json`, sumá una entrada a `camaras`:

```json
{ "id": "dos_cocina", "x": 7.85, "y": 6.25, "yaw": 306, "fijar": true }
```

2. Renderizá **sólo esa**:

```
2-panoramas.bat "" dos_cocina
```

3. Copiá el JPG a `tour360-web\panoramas\` y agregá la escena en `ESCENAS` con
   el mismo `id`, el mismo `pos` y el mismo `giro` que el `yaw`.

Para elegir el punto no hace falta ojo: el lugar con más espacio libre de una
zona se puede **medir** sobre la planta con una transformada de distancia, que
para cada píxel de piso devuelve a qué distancia está el obstáculo más cercano.
En la cocina del dos ambientes el máximo da 0,68 m en (7,85 · 6,25), entre la
mesa del comedor y la mesada: por eso la cámara va ahí y no en el medio del paso.

**Una escena puede estar configurada antes de existir el JPG.** Si el panorama
falta, el visor saca esa parada del recorrido sola —y también las flechas que
llevaban a ella— en vez de dejar un salto roto. Aparece el día que copiás la
imagen. `dos_cocina` ya está configurada así: cuando la renderices y la copies,
se suma sin tocar nada.

### Un salto también puede llevar ángulo propio

```js
saltos:["dos_comedor"]                          // sobre la línea de viaje
saltos:[{ a:"mono_estar", mirando:[2, -24] }]   // donde vos digas
```

La segunda forma es para cuando la línea recta al destino atraviesa un muro y la
flecha termina apoyada contra la pared en vez de en el paso real —pasaba en la
entrada del monoambiente, donde el estar queda detrás de la cocina—. El rumbo de
llegada no cambia: siempre se llega mirando hacia donde se camina.

### Con qué imagen abre cada unidad, y hacia dónde mira

```js
inicio: "mono_estar",     // en UNIDADES
vista: -40,               // en la escena, grados
```

`inicio` es la escena con la que arranca esa unidad: conviene la más luminosa,
porque es la primera impresión. `vista` corre el encuadre de arranque unos grados
respecto del centro del panorama, para cuando lo lindo del ambiente quedó a un
costado (en el estar del mono, sin ese `-40` se abría mirando una pared pelada).
Positivo gira a la derecha de la foto.

### Mover o agregar un punto de información

```js
datos:[
  { en:[9.71, 7.40, 1.15], titulo:"Cocina de 2,85 m",
    texto:"Mesada corrida sobre el paramento norte…" }
]
```

`en` es un punto del **mundo**, no un ángulo: dónde está la cosa de la que
hablás. El visor calcula solo hacia dónde y cuánto para arriba o para abajo hay
que mirarla desde esa cámara. Para sacar las coordenadas, mirá el `plano.jpg` o
el `planta.png` del paso 1 y leé la posición como si fuera un plano acotado.

Un punto a menos de 1 m de la cámara queda casi encima tuyo y se ve mal; entre
1,5 m y 5 m es donde mejor cae.

Cuando algo se ve clarísimo en el panorama pero no lo podés ubicar con confianza
en la planta, hay una segunda forma:

```js
{ mirando:[38, 2], titulo:"Cocina integrada", texto:"…" }
```

`mirando` son dos grados leídos directamente de la foto: el acimut —0 es el
centro de la imagen, positivo hacia la derecha— y cuánto para arriba o para
abajo. Es exacto por construcción, pero sólo vale para esa foto: si volvés a
renderizar esa cámara con otro `giro`, hay que recalcularlo. Por eso `en` es
mejor cuando podés usarlo.

### Conectar dos ambientes

```js
saltos:["dos_comedor","dos_balcon"]
```

Con ponerlo de un lado alcanza: el visor agrega la vuelta sola. La flecha en el
piso no se planta encima del destino (quedaría atrás de un muro): se apoya sobre
la línea de viaje, a 2,6–4,5 m. Y se llega **mirando hacia donde caminaste**, que
es lo que hace que parezca un paso y no un corte.

Si un salto queda fuera de cuadro —el balcón se renderizó mirando al vacío, por
ejemplo— la flecha se pega al borde de la pantalla del lado hacia el que hay que
girar. Nunca se pierde una salida.

### Los datos de la unidad y el WhatsApp

En `MARCA` va el número (`5491100000000`, sin `+` ni espacios) y el texto del
mensaje. En `UNIDADES` van las filas del panel de la derecha: agregás o sacás
pares `["etiqueta", "valor"]` y listo.

> **Ojo con las medidas.** Las que dejé salen de medir el modelo 3D, no la
> documentación de obra. Antes de mandarle esto a un comprador, contrastalas con
> los planos del proyecto. El panel ya lleva abajo la aclaración de que son
> medidas de proyecto y las imágenes no son contractuales, que es lo que se usa
> en venta de pozo, pero eso no reemplaza revisar los números.

---

## 4. Por qué la transición se siente como caminar

Esto es lo único no obvio del visor, y es lo que separa un slideshow de un
recorrido. Son tres decisiones encadenadas.

### Primero: dos tiempos, no uno

Un paso real tiene dos momentos. Primero girás la cabeza hacia donde vas, y
recién después caminás. La primera versión los mezclaba —la imagen giraba
mientras se fundía— y el ojo no puede seguir las dos cosas a la vez: se leía
como un truco. Ahora van separados:

1. **Giro**, corto y sin fundido. Sólo si hay que girar más de 25°; la duración
   es proporcional al ángulo, hasta 420 ms.
2. **Paso**, sin girar. Ahí ocurre el cruce.

### Segundo: cada imagen con su propio encuadre

Cuando caminás de A hacia B, **todo se agranda de forma continua**: lo que ves
desde A se acerca, y lo de B —que venías viendo desde más lejos— también. Si las
dos imágenes usan el mismo encuadre escalan igual y se lee como un zoom de la
pantalla, no como avanzar.

Por eso el shader tiene `uFovA` y `uFovB`: durante el paso, A va de 100% a 66% de
apertura y B de 130% a 100%. Las dos se agrandan, a distinto ritmo, y el cruce
queda escondido adentro de ese movimiento. Se completa con un bajón de luz del
6% en el medio, que tapa el fantasma del fundido.

### Tercero: el rumbo de llegada no es libre

Llegar mirando hacia donde caminaste suena bien y funciona… hasta que la línea
de viaje termina contra una pared, y entonces "te deja en cualquier lado". El
visor usa el rumbo de viaje **sólo si cae a menos de 55° del encuadre con que se
renderizó esa cámara**; si no, entra por el encuadre bueno. Ese umbral es
`LLEGADA_MAX`, arriba de la sección 4 del `index.html`: subilo si querés que se
respete siempre la caminata, bajalo si preferís entrar siempre bien encuadrado.

### Y abajo de todo, lo que hace que nada de esto se note

Un visor 360 común guarda hacia dónde mirás como un ángulo **de la foto**. El
problema aparece al cambiar de foto: cada panorama se renderizó con su propio
`giro`, así que el mismo ángulo de foto apunta a lugares distintos del mundo, y
el fundido cruza dos imágenes desalineadas. Se ve como un corte.

Acá el estado de la cámara es el **rumbo del mundo** (`psi`), no el ángulo de la
foto. El acimut dentro de cada imagen sale de una cuenta:

```
acimut = rumbo + giro_de_esa_foto
```

El shader recibe **dos** giros, uno por textura, y durante el cruce cada imagen
aplica el suyo sobre el mismo rumbo. Las dos muestran la misma dirección real
mientras se cruzan: la pared de la izquierda sigue siendo la pared de la
izquierda. Sobre eso van las otras dos cosas que pasan a la vez: la vista gira
hasta la dirección en la que caminás, y el encuadre se cierra durante el cruce y
se vuelve a abrir al llegar —que es el acercarse a la puerta y que el ambiente
nuevo se despliegue alrededor.

Como los hotspots también están en rumbo del mundo, la resta `rumbo_del_hotspot −
rumbo_de_la_cámara` cancela el `giro` sola. Por eso no hay que ajustar ángulos a
mano en ningún lado.

---

## 5. Errores que ya nos pasaron

| Qué se ve | Qué pasó |
|---|---|
| Pantalla de carga con mensaje rojo | Abriste el `index.html` con doble clic. Hace falta `python -m http.server 8000` |
| El panorama se ve **negro** | Textura no potencia de dos con `REPEAT`. Ya está resuelto con `CLAMP_TO_EDGE`, pero si tocás `crearTextura` no lo saques |
| Los hotspots quedan corridos | El `giro` de esa escena no coincide con el `yaw` del `camaras.json` |
| Al cruzar dos ambientes se ve todo doble | Mismo problema: los dos giros mal. Se comprueba con `panoramas-prueba` |
| Una flecha no aparece en ningún lado | Está a menos de 2,3 m y abajo: con la cámara a 1,60 m el piso recién entra en cuadro más lejos. Alejá el destino o subí la marca |
| Falta un ambiente | El JPG no está en `panoramas/` o el nombre no es igual al `id`. El visor lo descarta a propósito, mirá la consola del navegador |
| Un hotspot desaparece y vuelve | Está tapado por la ficha o por la tarjeta abierta: el visor los esconde a propósito, porque abajo de un panel no se pueden tocar |
| "Directory listing for /" en vez del visor | La terminal está parada una carpeta adentro. Usá `abrir-visor.bat` |
| Los pines del minimapa quedan corridos | Regeneraste los planos y no pegaste el `planos.json` nuevo en `PLANOS` |
| La planta sale toda violeta | Blender no encontró las texturas: el FBX guarda rutas absolutas. Los scripts las re-apuntan solos, pero la carpeta de texturas tiene que estar al lado del FBX |
| La planta en color sale negra | Quedó una losa arriba tapando el sol. El corte de cámara esconde de la *vista*, no del *render*: hay que `hide_render` |
| Se ve el panorama de OTRO ambiente | Ya resuelto: las texturas se suben por la unidad 2. Si tocás `crearTextura` y volvés a usar la unidad 0, cada imagen que termina de bajar en segundo plano pisa la que está en pantalla |
| Anda en la compu y no en el celular | Casi siempre es memoria: siete texturas de 2560 px. Bajá a 2048 px o comprimí más |

---

## 6. Lo que se puede sumar después

Sin rehacer nada, porque la estructura ya lo contempla:

- **Más ambientes.** Renderás otra cámara, la agregás al `camaras.json` y a
  `ESCENAS` con su `pos` y su `giro`. Nada más.
- **Más unidades.** Otra entrada en `UNIDADES` y su lista de escenas. El
  selector de arriba se arma solo.
- **Día y noche.** Renderás cada cámara dos veces cambiando el sol, guardás
  `mono_estar_noche.jpg`, y sumás un botón que cambia el sufijo de la ruta.
- **Sonido ambiente**, **música**, o un **autorrecorrido** que gire despacio y
  salte solo cada N segundos: es llamar a `irA()` con un temporizador.

---

## 7. Cómo está hecho

### Los lenguajes, y por qué cada uno

| Dónde | Lenguaje | Por qué ese |
|---|---|---|
| Los scripts de Blender (`1-` a `4-`) | **Python** con `bpy` | Blender expone todo su modelo de datos como librería de Python. Se maneja sin abrir la interfaz, y eso permite guionar el proceso entero |
| `hacer-planos.py` | **Python** con NumPy, SciPy, Pillow | Tratar la planta como una matriz de números, no como un dibujo |
| El visor | **JavaScript** | Es lo que corre el navegador, sin compilar nada |
| El corazón del visor | **GLSL** | El shader: corre en la placa de video, una vez por cada píxel de pantalla |
| La interfaz | **HTML + CSS** | |
| La configuración | **JSON** | Datos, no código: lo toca cualquiera sin romper la lógica |
| Los lanzadores | **Batch (.bat)** | Que en Windows sea doble clic |

No hay ninguna librería de terceros en el visor. Ni Three.js, ni Pannellum, ni
Marzipano. El archivo que abre el navegador es uno solo y no depende de nada.

### La arquitectura: dos mundos que se hablan por un archivo

```
    MUNDO 1 — caro, offline, una sola vez
    ┌──────────────────────────────────────────┐
    │  SketchUp -> FBX -> Blender (Cycles)     │
    │  472 MB de modelo, 2,1M triangulos       │
    └────────────────┬─────────────────────────┘
                     │  escribe los JPG equirectangulares
                     v
              camaras.json      <- EL CONTRATO
              (x, y, yaw de cada camara)
                     │
                     v
    ┌──────────────────────────────────────────┐
    │  MUNDO 2 — barato, en vivo, en cualquier │
    │  celular.  index.html + los JPG = 2 MB   │
    └──────────────────────────────────────────┘
```

**Al navegador no viaja nada de 3D.** El modelo pesa 472 MB; el recorrido entero
pesa 2. Esa es la razón de ser de todo el enfoque, y es la misma que usa Kuula.

El `camaras.json` es el contrato entre los dos mundos: Blender lo lee para saber
dónde parar la cámara, y el visor usa esos mismos números para calcular dónde va
cada hotspot. **Si los dos lados no dicen lo mismo, todo se corre.** Por eso el
`giro` de cada escena tiene que ser idéntico al `yaw` de esa cámara.

### La idea central: la proyección equirectangular

Una foto 360 no tiene nada de mágico. Es **una imagen 2:1 donde el eje x es el
ángulo horizontal (0 a 360°) y el eje y es el vertical (del cenit al nadir)**. Es
el mismo truco que un planisferio: aplastar una esfera sobre un rectángulo, con
la misma distorsión creciente hacia los polos. Por eso el piso y el techo salen
estirados en los bordes de arriba y de abajo de la imagen.

Y todo el visor es una sola función:

> **"hacia dónde estoy mirando" -> "qué píxel de esa imagen va acá"**

Eso lo hace el shader en GLSL, para cada uno de los ~2 millones de píxeles de la
pantalla, 60 veces por segundo. Son tres líneas:

```glsl
float u = atan(d.x, -d.z) / (2.0*PI) + 0.5;   // ángulo horizontal -> columna
float w = acos(clamp(d.y, -1.0, 1.0)) / PI;   // ángulo vertical   -> fila
return texture2D(t, vec2(u, w));
```

Un triángulo que cubre la pantalla, y esa cuenta. Nada más.

### El método: medir en vez de deducir

Si te llevás una sola cosa del proyecto, que sea esta. Cada vez que se intentó
una regla ingeniosa para adivinar algo, se perdió tiempo. Cada vez que se
escribió algo que devolviera un número, salió a la primera.

| El problema | La regla que fallaba | La medición que lo resolvió |
|---|---|---|
| ¿A qué altura está el solado? | Histograma de alturas: daba 13,52 | Un rayo hacia abajo bajo cada cámara: **14,38** |
| ¿Cuál era el placard verde? | Cinco heurísticas por área y verticalidad, que además blanquearon maderas reales | `3-materiales.py`: un abanico de rayos que devuelve nombres. Era `Color_F05`, 30,8% del panorama |
| ¿Qué es muro y qué es mueble en la planta? | — | Apertura morfológica con un disco más grande que un muro: lo que desaparece **era** muro |
| ¿Dónde parar la cámara de la cocina? | A ojo sobre el plano | Transformada de distancia sobre el piso libre: máximo despeje **0,68 m en (7,85 · 6,25)** |
| ¿Dónde va este hotspot? | Ángulos estimados mirando la foto | El modo edición: la inversa exacta de la proyección |
| ¿Dónde corto el plano entre las dos unidades? | Al ojo | Las columnas donde la tinta es continua: de x 3,56 a 4,04 |

El corolario es la segunda regla: **lo que se puede calcular, nunca se dibuja a
mano.** Ninguno de los hotspots tiene coordenadas de pantalla escritas. Todos son
ángulos derivados de las coordenadas del modelo. Por eso mover una cámara en
Blender y actualizar dos números reacomoda todas sus marcas de golpe.

Y una tercera, que salió de los rayos: **un rayo contesta la pregunta que le
hiciste, no la que quisiste hacer.** El `solado_bajo` tomaba el primer impacto
hacia abajo y midió la losa del 6.º piso, así que una cámara terminó adentro del
techo renderizando un piso vacío. La corrección fue juntar *todos* los impactos y
quedarse con el más cercano al piso de referencia.

---

## 8. Calidad de render: qué se puede mejorar y con qué

### Lo que hace que se vea "de computadora", en orden de impacto

**1. La resolución, y por lejos.** Los panoramas son de 2560 px de ancho para
360°. Cuando el visor muestra un encuadre de ~98° horizontales, toma unos **700
píxeles de la imagen y los estira sobre 1900 de pantalla**: casi 3×. Esa es la
blandura. Un tour de calidad comercial usa 6000 a 8000 px de ancho.

**2. La luz es artificial.** El bloque `relleno` del `camaras.json` son cuatro
paneles puestos adentro de los ambientes para poder ver algo rápido. Aplanan
todo: sin dirección de luz no hay contraste ni sombras de contacto. Un interior
bien iluminado se hace con **sol entrando por las ventanas reales, cielo, y luces
portal en los vanos** — que no iluminan, sólo le indican al muestreador por dónde
entra la luz— y nada adentro. **Cuesta cero.**

**3. Todas las aristas son matemáticamente filosas.** Ningún borde real lo es:
todos tienen un chanfle de uno o dos milímetros que produce una línea de brillo.
El ojo lo lee al instante aunque no sepa por qué. Un nodo *Bevel* en el shader,
aplicado global, es el cambio más barato con más impacto en realismo que existe.
**Cuesta cero.**

**4. Los materiales vienen planos de SketchUp:** sólo color y textura, sin
rugosidad, sin reflexión, sin normal map. Por eso el piso de madera se lee como
papel pintado y el vidrio no refleja. Asignar rugosidad y especular por familia
de material es **gratis**.

**5. Recién ahí, las muestras.** 96 en un interior es poco: la luz indirecta
queda sub-muestreada y el denoiser la empasta. 250–350 sería lo correcto. **Esto
sí cuesta tiempo.**

Tres de las cinco no cuestan un minuto extra de render.

### La tanda nocturna recomendada

| | Ahora | Propuesta |
|---|---|---|
| Resolución | 2560 × 1280 | **4096 × 2048** |
| Muestras | 96 | **220** |
| Luz | 4 paneles de relleno | sol + cielo + portales en los vanos |
| Aristas | filosas | bevel global |
| Materiales | planos | rugosidad y especular por familia |
| Por panorama | 14 min | **~70 min** |
| Las 8 cámaras | 1 h 40 | **~9 h** |

A 6144 px son unas 20 horas: un fin de semana.

### Qué placa comprar

Primero lo incómodo: **una GPU no arregla lo feo, arregla lo lento.** Si comprás
una placa y no tocás la luz, las aristas y los materiales, vas a tener las mismas
imágenes planas, sólo que en un minuto en vez de en catorce.

Dicho eso, la velocidad *indirectamente* mejora mucho la calidad, y esta es la
razón real para comprarla: hoy probar un cambio de iluminación cuesta 14 minutos,
así que probás dos o tres. Con GPU cuesta 40 segundos y probás treinta. **Ahí es
donde aparece la calidad.**

El log de Blender ya avisa que hoy no hay ninguna:

```
WARNING CUEW initialization failed: Error opening the library
WARNING HIPEW initialization failed: Error opening HIP dynamic library
```

CUEW es el cargador de CUDA (NVIDIA) y HIPEW el de HIP (AMD). Fallaron los dos,
así que Cycles cayó a CPU: 6 de 8 núcleos, 1 h 40 la tanda.

El procesador rinde en el orden de 150–250 puntos de Blender Open Data. Contra
eso:

| Placa | VRAM | Puntaje | Contra la CPU | Los 14 min pasan a |
|---|---|---|---|---|
| RTX 3060 | 12 GB | 2.293 | ~10–15× | ~1 min |
| RTX 5070 Ti | 16 GB | 7.602 | ~30–50× | ~25 s |
| RTX 5080 | 16 GB | 9.145 | ~40–60× | ~20 s |
| RTX 4090 (usada) | 24 GB | 11.684 | ~50–75× | ~15 s |
| RTX 5090 | 32 GB | 15.042 | ~60–100× | ~12 s |

Dos criterios, y son distintos entre sí:

**NVIDIA, no AMD.** No por marca: Cycles tiene un backend llamado **OptiX** que
usa los núcleos RT de las placas RTX y es mucho más rápido que el camino
genérico. AMD anda, pero no compite en Cycles.

**La VRAM no acelera nada: pone el techo.** Define qué escena entra en memoria.
Si no entra, no rinde: se cae. Este modelo tiene 2,1 millones de triángulos y 463
texturas — es mediano tirando a chico, y **con 12 GB alcanza hoy**. Conviene ir a
**16 GB** por una razón concreta: el día que quieras renderizar la torre completa
con contexto real, o sumar vegetación, 12 se queda corto y la placa no se amplía.

**Recomendación para este proyecto: una RTX 5070 Ti de 16 GB.** Es el punto donde
el render deja de ser un trámite nocturno y pasa a ser interactivo, con margen
para dos o tres proyectos más grandes. Si el presupuesto no da, **una RTX 3060 de
12 GB usada** ya cambia la forma de trabajar: pasar de 14 minutos a uno es la
diferencia entre iterar y no iterar.

Dos detalles prácticos: revisá la fuente de la PC antes de comprar, y una vez
instalada hay que activarla en *Preferencias → System → Cycles Render Devices →
OptiX*, y cambiar en los scripts `sc.cycles.device = "CPU"` por `"GPU"`.

Datos de benchmark tomados de [VerdictBits, Best GPU for Blender
2026](https://verdictbits.com/reviews/best-gpu-for-blender-2026/) y [Fox Render
Farm](https://www.foxrenderfarm.com/news/the-best-gpu-for-blender/); conviene
volver a chequearlos antes de comprar, que los precios y los modelos se mueven.

---

## 9. Tocarlo vos, sin preguntar

Todo lo editable del visor está en el `index.html`, en el bloque **1. CONFIGURACIÓN**,
que son las primeras 150 líneas. De ahí para abajo es maquinaria y no hace falta
entrarle.

### El mapa del archivo

| Sección | Qué hay ahí | ¿Se toca? |
|---|---|---|
| 1. CONFIGURACIÓN | `MARCA`, `PLANOS`, `UNIDADES`, `ESCENAS` | **Sí, todo el tiempo** |
| 2. Geometría | pasa metros a ángulos | no |
| 3. WebGL | el shader | no |
| 4–7 | estado, dibujo, hotspots, plano | no |
| 8. Interfaz | ficha, tarjeta, botones | rara vez |
| 9. El viaje | la transición entre panoramas | rara vez |
| 10–12 | controles, modo edición, carga | no |
| El `<style>` de arriba | colores y tipografías | sí, para la identidad |

### Las ocho cosas que vas a querer hacer

**Mover un hotspot.** No lo calcules: apretá **E**, arrastralo hasta donde va,
copiá la línea que te da la barra de abajo y pegala reemplazando la vieja.

**Cambiar un texto.** Buscá el título entre comillas y editá el `texto:` de al
lado. Cuidado con las comillas dobles adentro del texto: usá comillas simples.

**Agregar un punto de información.** Apretá E, clic donde va, copiá la línea y
pegala dentro del `datos:[ ]` de esa escena, separada por coma:

```js
datos:[
  { mirando:[40, -20], titulo:"Cocina integrada", texto:"…" },
  { mirando:[-45, -8], titulo:"Heladera y guardado", texto:"…" }
]
```

**Conectar dos ambientes.** Agregá el id del destino al `saltos:[ ]`. Con
ponerlo de un lado alcanza, la vuelta la agrega el visor:

```js
saltos:["dos_comedor"]                            // la flecha va sola
saltos:[{ a:"dos_cocina", mirando:[-95, -30] }]   // la flecha donde vos digas
```

**Cambiar con qué imagen abre una unidad.** `inicio:` dentro de `UNIDADES`.

**Cambiar hacia dónde mira al entrar.** `vista:` dentro de la escena, en grados.
Positivo gira a la derecha. Sin `vista`, entra por el centro del panorama.

**Cambiar los datos de la ficha.** En `UNIDADES`, la lista `datos` son pares
`["etiqueta", "valor"]`. Agregás, sacás y reordenás libremente.

**Cambiar el número de WhatsApp o la marca.** Arriba de todo, en `MARCA`.

### Las cuatro reglas de sintaxis que rompen todo

Es JavaScript, y es quisquilloso con cuatro cosas nada más:

1. **Cada elemento de una lista lleva coma, menos el último.** Es el error número
   uno. Si agregás un hotspot al final, poné coma en el que era el último.
2. **Los textos van entre comillas dobles.** Si adentro necesitás comillas, usá
   simples: `texto:"el placard de 2,80 m 'a medida'"`.
3. **Cada `{` tiene su `}` y cada `[` su `]`.** El editor te los pinta de a pares
   cuando ponés el cursor al lado.
4. **Los números van sin comillas y con punto decimal**, no coma: `pos:[9.85, 8.10]`.

### Cómo darte cuenta de que rompiste algo

Si la página queda en negro o en la pantalla de carga, apretá **F12** y andá a
**Console**. El error dice el número de línea:

| Lo que dice | Lo que pasó |
|---|---|
| `Unexpected token '}'` | Te falta una coma, o te sobra |
| `Unexpected string` | Falta una coma entre dos elementos |
| `... is not defined` | Un id de escena mal escrito en `saltos` |
| `Unexpected end of input` | Falta cerrar una llave o un corchete |

Y el visor avisa solo de lo que no es error de sintaxis: si falta un JPG, lo dice
en la consola y saca esa parada del recorrido.

### La forma de trabajar que no falla

**Un cambio, guardar, Ctrl+F5, mirar.** Sin excepciones. Si hacés cinco cambios
y algo se rompe, no sabés cuál fue; si hacés uno, lo sabés siempre.

Antes de una sesión larga, copiá el `index.html` a `index-anda.html`. No es
paranoia: es la diferencia entre perder dos minutos y perder una tarde. Cuando el
cambio nuevo funciona, pisás la copia.

### Lo único que no se toca sin pensarlo

`giro` tiene que ser **idéntico** al `yaw` de esa cámara en el `camaras.json`, y
`pos` idéntico a su `x` e `y`. Esos tres números son el contrato entre Blender y
el visor. Si no coinciden, el panorama se sigue viendo igual de bien —y por eso
no te das cuenta— pero **todos los hotspots de esa escena quedan corridos**,
porque son ángulos calculados a partir de ellos.

---

## 10. El paso 5: los panoramas definitivos

`5-alta-calidad.bat`, en la carpeta `tour360\`. Es el hermano lento del paso 2:
mismo modelo, mismas cámaras, mismo `camaras.json`. Se corre cuando el recorrido
ya está cerrado y no vas a mover más ninguna cámara.

```
5-alta-calidad.bat                     todas las que falten
5-alta-calidad.bat "" dos_cocina       sólo esa
5-alta-calidad.bat "" --rehacer        rehacer todas desde cero
```

**Si un JPG ya existe, saltea esa cámara.** Una tanda a 6144 px puede tardar toda
la noche; si se corta, volvés a correrlo y sigue donde iba.

### Qué hace distinto, en orden de cuánto se nota

**1. Resolución: 6144 contra 2560.** Es la razón número uno por la que un
panorama se ve blando. Al mirar un encuadre de 100°, de una imagen de 2560 px se
usan unos 700 estirados sobre 1900 de pantalla: casi 3×.

**2. Luz de verdad.** Se apagan los cuatro paneles de relleno y se ilumina sólo
con sol y cielo entrando por las aberturas reales. Un panel adentro del ambiente
aplana todo: sin dirección no hay contraste ni sombra de contacto.

**3. Portales.** Sin ellos, iluminar sólo por ventanas es carísimo en muestras:
el muestreador tira rayos al azar y casi ninguno encuentra la abertura. Un portal
es un rectángulo invisible parado en la ventana que le dice "la luz entra por
acá". No ilumina: guía. Se colocan solos, sobre los objetos que usan los
materiales listados en `materiales_vidrio`.

**4. Bisel.** Ninguna arista real es matemáticamente filosa: todas tienen un
chanfle de uno o dos milímetros que produce una línea de brillo. El ojo lo lee al
instante aunque no sepa por qué. Es lo más barato que existe en relación
calidad/esfuerzo.

**5. Materiales por familia.** SketchUp exporta color y textura, sin rugosidad:
todo termina con el mismo acabado de papel. El script asigna rugosidad según el
**nombre** del material —madera, azulejo, metal, tela—. Es una heurística, pero
sobre el nombre, que lo puso una persona: mucho más confiable que adivinar
mirando el color.

**6. Muestreo.** Adaptativo, más rebotes, denoiser con pases de albedo y normal,
cáusticas apagadas y un clamp de indirecta que mata los puntos blancos.

### Luminarias: la luz que sí tiene que estar prendida

`relleno` y `luminarias` son dos cosas distintas y conviene no mezclarlas.

**`relleno`** es una trampa: paneles grandes puestos en el medio del ambiente
para que no quede oscuro. Aplanan todo, y por eso el paso 5 los apaga.

**`luminarias`** son artefactos que existen en la realidad —el colgante sobre la
barra, el plafón de la cocina— y están encendidos en los dos pasos. No es
trampa: un pasillo de cocina sin ventana está oscuro incluso a mediodía, y una
foto de esa cocina con la luz apagada es una foto mal sacada, no una foto
honesta.

```json
"luminarias": [
  { "nombre":"cocina_plafon", "x":9.00, "y":8.05, "z":2.32,
    "tamano":1.30, "potencia":75, "color":[1.0, 0.82, 0.66] }
]
```

`z` va sobre el solado. El `color` cálido (2700 K aproximado) es lo que hace que
se lea como luz artificial y no como un agujero blanco en el techo.

### Los parámetros

Bloque `"calidad"` del `camaras.json`. El paso 2 lo ignora, así que podés seguir
haciendo pruebas rápidas sin tocar nada:

```json
"calidad": {
  "resolucion": 6144,
  "muestras": 400,
  "bisel": 0.0018,
  "portales": true,
  "usar_relleno": false,
  "exposicion": -0.4,
  "clamp_indirecto": 8.0,
  "contraste": "AgX - Medium High Contrast"
}
```

| Si ves… | Tocá |
|---|---|
| Manchas o ruido en las sombras | `muestras` a 600, o `umbral_adaptativo` a 0,002 |
| Puntos blancos sueltos | `clamp_indirecto` a 5 |
| Todo muy oscuro | `exposicion` a 0,2 — y revisá que los portales se hayan colocado |
| Todo lavado | `exposicion` a −0,8 |
| Los bordes siguen filosos | `bisel` a 0,003 |
| Tarda demasiado | `resolucion` a 4096: son 2,25× menos píxeles |

**La primera vez, corré una sola cámara.** `5-alta-calidad.bat "" dos_comedor`,
mirá el resultado, ajustá exposición y muestras, y recién ahí largá la tanda
entera. Una noche perdida por una exposición mal puesta duele.


---

## 11. Publicar el recorrido en Zonaprop

Zonaprop acepta recorridos 360 pegando **el link** en el paso multimedia del
publicador — pero sólo de una **lista blanca de proveedores autorizados**. Hoy
esa lista tiene alrededor de cien entradas: están Kuula, Matterport, EyeSpy360,
Floorfy, Roundme, Klapty, 3DVista, Spinattic y varios más.

**Una URL de Vercel no está en la lista, así que pegada tal cual no entra.**

Lo interesante es que buena parte de la lista **no son plataformas: son estudios
e inmobiliarias con dominio propio** —`martintejeda.com.ar`, `germansalas`,
`studio360.com.ar`, `tudepto360`, `zorrillabienesraices`, `escobarinmobiliaria
tour360`—. Es decir que Zonaprop habilita dominios particulares a pedido, y el
propio artículo lo dice al final: *"Si tu proveedor no se encuentra en este
listado, comunicate con tu ejecutivo comercial o con atención al cliente para
poder habilitarlo"*.

El camino, entonces, es:

1. Publicar el recorrido en **un dominio propio** (por ejemplo
   `recorridos.tudominio.com.ar`), no en el `*.vercel.app` que te da Vercel por
   defecto. Un dominio se apunta a Vercel en cinco minutos.
2. Pedirle al ejecutivo comercial de Zonaprop que habilite ese dominio.
3. Mientras tanto, si necesitás publicar ya, subir los siete JPG a **Kuula**
   —que sí está en la lista y tiene plan gratis— y usar ese link. El recorrido
   propio queda igual para el sitio, el WhatsApp y las redes.

Referencia: [Zonaprop · ¿Cuáles son los proveedores de recorrido
360°?](https://help.zonaprop.com.ar/s/article/Cu%C3%A1les-son-los-proveedores-de-recorrido-360)
