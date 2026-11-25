# Presupuesto Jujuy

Explorador del presupuesto provincial 2025–2027. La carpeta `docs/` contiene un sitio estático autocontenido que también abre localmente en el navegador. No necesita un servidor, claves ni librerías externas.

## GitHub Pages

Subí el repositorio. En **Settings → Pages → Build and deployment**, elegí **Deploy from a branch**, rama **main**, carpeta **/docs**. La publicación usa rutas relativas y conserva los filtros al compartir la URL. [Documentación oficial](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Edición

Editá `src/` y ejecutá con Node 20 o posterior:

```sh
node build.mjs
node --test
```

Versioná `docs/index.html` junto con el código fuente. Las cifras se conservan en pesos sin redondear en el origen y se muestran en millones de pesos. El CSV de la consulta conserva el valor en pesos.

## Cobertura

El conjunto local consolidado usa leyes 2025/2026 y proyecto 2027 al 24/11/2026, cortes provinciales disponibles, Cuenta de Inversión 2025 y un contraste de obra pública trazable. El ajuste anual emplea el escenario central de IPC NOA y publica el número de meses proyectados. El devengado semestral usa una aproximación con IPC promedio del semestre. En 2025 se puede consultar cierre anual en las líneas disponibles. Acceso a fuentes originales y explicaciones dentro del sitio.

El sitio consume exclusivamente cifras agregadas y enlaces a fuentes. Los archivos individuales de EPH y el gasto nacional no forman parte de la ejecución provincial que muestra este comparador.
