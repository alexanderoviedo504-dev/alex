# WaveRoom – Streaming móvil con biblioteca y carga directa

Aplicación web móvil con estética glassmórfica inspirada en Spotify/Apple Music. Cuenta con controles táctiles, favoritos persistentes, filtrado de biblioteca y un panel "Sube tu música" que envía archivos al servidor sin salir de la interfaz. Cada vez que se añade o elimina una pista en la carpeta `music/`, la lista se actualiza automáticamente mediante Server-Sent Events (SSE).

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

Si el host no admite arrastrar y soltar, el botón "Elegir archivos" abre el selector del sistema.

## Subir música por API

Además de copiar archivos a `music/`, puedes subir canciones desde cualquier cliente HTTP apuntando a `POST /upload`.

```bash
curl -F "track=@/ruta/a/cancion.mp3" http://localhost:3000/upload
```

El servidor guarda el archivo en `music/`, intenta leer sus metadatos y notifica al cliente para que la biblioteca se actualice sin recargar.

## Despliegue en tu hosting

1. **Sube el proyecto completo** (incluida la carpeta vacía `music/`) a tu servidor con soporte Node.js.
2. Ejecuta `npm install` y luego `npm start` (o configura un proceso permanente con PM2/Systemd). Define la variable de entorno `PORT` si tu proveedor exige un puerto específico.
3. Asegúrate de que la ruta pública apunte al mismo dominio/base donde corre Node. El cliente calcula automáticamente las rutas relativas (`/tracks`, `/music`, `/upload` y `/events`).
4. Concede permisos de escritura a la carpeta `music/` para que el endpoint `POST /upload` pueda guardar los MP3.
5. Si usas un proxy inverso (Nginx, Apache, cPanel), reenvía los métodos `GET` y `POST` hacia `/tracks`, `/music`, `/upload` y `/events` sin cachear respuestas para que SSE funcione correctamente.
6. En entornos con sistemas de archivos remotos o montados en red, `fs.watch` puede no dispararse. En ese caso, el botón "↻" de la lista y el panel de subida permiten refrescar manualmente la biblioteca.

Con este despliegue podrás reproducir tu biblioteca directamente desde tu hosting y seguir añadiendo canciones desde cualquier navegador conectado.

## Metadatos

Cuando es posible, el servidor lee los metadatos ID3 de cada archivo para mostrar título, artista, carátula y fecha de modificación. Si el archivo no tiene metadatos, el nombre del archivo se usa como título y se muestra un marcador genérico.
