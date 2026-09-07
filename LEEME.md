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
recorrido.

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
| Falta un ambiente | El JPG no está en `panoramas/` o el nombre no es igual al `id` |
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
