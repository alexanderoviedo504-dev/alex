# WaveRoom – Streaming móvil con biblioteca y carga directa

Aplicación web móvil con estética glassmórfica inspirada en Spotify/Apple Music. Cuenta con controles táctiles, favoritos persistentes, filtrado de biblioteca y un panel "Sube tu música" que envía archivos al servidor sin salir de la interfaz. Cada vez que se añade o elimina una pista en la carpeta `music/`, la lista se actualiza automáticamente mediante Server-Sent Events (SSE). Si tu hosting es estático, la app detecta la ausencia del backend y recurre a un manifest `music/library.json` para listar y reproducir tus canciones en modo lectura.

## Características destacadas

- **Interfaz pulida** con fondos degradados, fichas translúcidas y animaciones suaves pensadas para pantallas móviles.
- **Biblioteca dinámica** con contador de canciones, mosaico de carátulas recientes y filtros para todo, favoritos o últimas subidas.
- **Favoritos persistentes** tanto en la ficha "Ahora reproduciendo" como en la lista, guardados en `localStorage`.
- **Panel de subida integrado** que acepta `MP3`, `M4A`, `AAC`, `WAV` u `OGG` por drag & drop o selector de archivos y muestra el estado de cada carga.
- **Reproducción continua en segundo plano** gracias a la Media Session API, con soporte para los botones físicos del dispositivo.

## Requisitos

- Node.js 18 o superior

## Instalación

```bash
npm install
```

## Uso

1. Copia tus archivos `.mp3`, `.m4a`, `.aac`, `.wav` u `.ogg` dentro de la carpeta `music/` en la raíz del proyecto **o** súbelos con el panel "Sube tu música" (usa el botón o arrastra los archivos) o mediante la ruta `POST /upload` descrita más adelante.
2. Inicia el servidor de desarrollo:

```bash
npm run dev
```

Esto levantará la aplicación en `http://localhost:3000` con recarga automática de la lista cuando se agreguen o eliminen archivos en `music/`.

Para un entorno de producción puedes ejecutar:

```bash
npm start
```

El servidor tomará el puerto definido en `process.env.PORT` (por defecto `3000`).

## Estructura de carpetas

```
.
├── app.js          # Lógica del reproductor en el navegador
├── index.html      # Interfaz móvil con paneles translúcidos y cargador integrado
├── music/          # Carpeta donde colocar tus canciones
├── server.js       # Servidor Express + SSE + lectura de metadatos + endpoint de subida
├── styles.css      # Estilos mobile-first con estética glassmórfica
└── package.json
```

## Biblioteca, filtros y favoritos

- Biblioteca con contador de canciones, portadas recientes y filtros para mostrar todo, favoritos o lo último que subiste.
- Iconos de corazón en la lista y en la ficha «Ahora reproduciendo» para guardar canciones favoritas (persisten en `localStorage`).
- Compatibilidad con Media Session API para que la reproducción continúe cuando se apaga la pantalla y para aceptar controles del sistema (play/pause, siguiente/anterior y seek).

## Subir música desde la interfaz

La tarjeta "Sube tu música" permite arrastrar o seleccionar múltiples archivos compatibles. Cada carga se envía a `POST /upload`, se guarda en `music/` y se añade a la lista en cuanto el servidor confirma la operación. El panel muestra el progreso de cada archivo (subiendo, completado o error) y se restablece automáticamente después de unos segundos.

Si el host no admite arrastrar y soltar, el botón "Elegir archivos" abre el selector del sistema. Cuando la aplicación detecta que el backend no está disponible (por ejemplo, al publicar en un hosting puramente estático) la tarjeta queda en modo solo lectura y muestra instrucciones para actualizar el manifest manualmente.

## Subir música por API

Además de copiar archivos a `music/`, puedes subir canciones desde cualquier cliente HTTP apuntando a `POST /upload` (esta es la ruta que se usa desde el panel dentro de la app).

```bash
curl -F "track=@/ruta/a/cancion.mp3" http://localhost:3000/upload
```

El servidor guarda el archivo en `music/`, intenta leer sus metadatos y notifica al cliente para que la biblioteca se actualice sin recargar.

## Hosting sin Node (manifest estático)

Si tu proveedor solo permite archivos estáticos (por ejemplo cPanel compartido), WaveRoom funciona en modo lectura generando un manifest `music/library.json` que describe tus canciones:

1. En tu máquina local coloca los MP3 en `music/` y ejecuta:

   ```bash
   npm run build:library
   ```

   Esto crea `music/library.json` con títulos, artistas, duración, carátulas embebidas y la ruta base `./`.
2. Sube **todos** los archivos de la carpeta `music/` (canciones + `library.json`) junto con `index.html`, `app.js`, `styles.css` y el resto del proyecto a tu hosting.
3. Accede a la web publicada. Si el backend no está disponible, el cliente leerá automáticamente `music/library.json` y mostrará la biblioteca en modo solo lectura. El botón "↻" vuelve a descargar el manifest cuando actualices la carpeta.

Ejemplo: si publicas el proyecto en `http://bc3projects.com/1/`, coloca tus canciones y `library.json` dentro de `http://bc3projects.com/1/music/`. Todas las pistas con extensión permitida podrán reproducirse directamente desde ese dominio.

> Nota: en modo estático no es posible subir archivos desde la interfaz ni mediante `POST /upload`. Para añadir nuevas canciones vuelve a ejecutar `npm run build:library` con tu colección actualizada y sube los archivos resultantes.

## Despliegue en tu hosting

- **Con backend Node** (modo completo):
  1. Sube el proyecto y la carpeta `music/` a un servidor con Node.js.
  2. Ejecuta `npm install` y luego `npm start` (o configura un proceso permanente con PM2/Systemd). Define `PORT` si tu proveedor lo requiere.
  3. Apunta tu dominio o proxy inverso al proceso Node y permite el acceso a `/tracks`, `/music`, `/upload` y `/events` sin cachear.
  4. Asigna permisos de escritura a `music/` para que `POST /upload` pueda guardar los MP3. Esta es la ruta que usa el panel "Sube tu música".
- **Sin backend (modo manifest)**: sigue los pasos del apartado anterior "Hosting sin Node". La app seguirá reproduciendo la biblioteca, pero la subida quedará deshabilitada.

En ambos casos, el reproductor mantiene los favoritos en el dispositivo y continúa la reproducción aunque bloquees la pantalla gracias a la Media Session API.

## Metadatos

Cuando es posible, el servidor lee los metadatos ID3 de cada archivo para mostrar título, artista, carátula y fecha de modificación. Si el archivo no tiene metadatos, el nombre del archivo se usa como título y se muestra un marcador genérico.
