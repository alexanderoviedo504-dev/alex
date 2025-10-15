# WaveRoom – Reproductor estilo Spotify

Aplicación móvil web inspirada en Spotify con un acabado translúcido y controles listos para móviles. Coloca archivos de audio en la carpeta `music` o súbelos mediante la API integrada y la colección se actualizará al instante gracias a Server-Sent Events.

## Requisitos

- Node.js 18 o superior

## Instalación

```bash
npm install
```

## Uso

1. Copia tus archivos `.mp3`, `.m4a`, `.aac`, `.wav` u `.ogg` dentro de la carpeta `music/` en la raíz del proyecto, o súbelos con la ruta `POST /upload` (ver más abajo).
2. Inicia el servidor de desarrollo:

```bash
npm run dev
```

Esto levantará la aplicación en `http://localhost:3000` con recarga automática de la lista cuando se agreguen o eliminen archivos en `music/`.

Para un entorno de producción puedes ejecutar:

```bash
npm start
```

## Estructura de carpetas

```
.
├── app.js          # Lógica del reproductor en el navegador
├── index.html      # Interfaz móvil inspirada en Spotify
├── music/          # Carpeta donde colocar tus canciones
├── server.js       # Servidor Express + SSE + lectura de metadatos + endpoint de subida
├── styles.css      # Estilos mobile-first con paneles translúcidos
└── package.json
```

## Biblioteca, filtros y favoritos

- Biblioteca con contador de canciones, portadas recientes y filtros para mostrar todo, favoritos o lo último que subiste.
- Iconos de corazón en la lista y en la ficha «Ahora reproduciendo» para guardar canciones favoritas (persisten en `localStorage`).
- Compatibilidad con Media Session API para que la reproducción continúe cuando se apaga la pantalla y para aceptar controles del sistema (play/pause, siguiente/anterior y seek).

## Subir música por API

Además de copiar archivos a `music/`, puedes subir canciones desde cualquier cliente HTTP apuntando a `POST /upload`.

```bash
curl -F "track=@/ruta/a/cancion.mp3" http://localhost:3000/upload
```

El servidor guarda el archivo en `music/`, intenta leer sus metadatos y notifica al cliente para que la biblioteca se actualice sin recargar.

## Metadatos

Cuando es posible, el servidor lee los metadatos ID3 de cada archivo para mostrar título, artista, carátula y fecha de modificación. Si el archivo no tiene metadatos, el nombre del archivo se usa como título y se muestra un marcador genérico.
