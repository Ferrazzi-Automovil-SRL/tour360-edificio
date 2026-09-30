# Herramientas

Scripts de trabajo del recorrido. No forman parte del sitio: sirven para
probarlo en la PC y para regenerar los minimapas.

| Archivo | Qué hace |
|---|---|
| `hacer-planos.py` | Recorta la planta renderizada (`export/tour360_salida/planta-color.png`) en un minimapa por unidad (`img/plano-mono.png`, `img/plano-dos.png`) y escribe en `js/planos.js` a qué metros corresponde cada uno, para que los puntos del plano caigan en su lugar. Corre con el Python de Blender o con Python común. |
| `servidor.js` | Servidor local mínimo con Node, para ver el visor en máquinas sin Python. No guarda caché: cada cambio se ve al recargar. |
| `MANUAL.md` | Manual completo del visor: cómo editar ambientes y puntos de salto, publicar y resolver problemas. |

En la PC, además, hay tres atajos de doble clic que no se suben al repo
(`*.bat` está en `.gitignore`):

| Atajo | Qué hace |
|---|---|
| `abrir-visor.bat` | Levanta el visor con Python y abre el navegador. |
| `abrir-visor-node.bat` | Lo mismo con Node (`servidor.js`). |
| `hacer-planos.bat` | Corre `hacer-planos.py` con el Python de Blender. Va después de `tour360/4-plano.bat`. |
