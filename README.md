# WaveRoom – Reproductor estilo Spotify

Aplicación móvil web inspirada en Spotify que reproduce automáticamente tu música local. Coloca archivos de audio en la carpeta `music` y la lista se actualizará al instante gracias a Server-Sent Events.

## Requisitos

- Node.js 18 o superior

## Instalación

```bash
npm install
```

## Uso

1. Copia tus archivos `.mp3`, `.m4a`, `.aac`, `.wav` u `.ogg` dentro de la carpeta `music/` en la raíz del proyecto (el
   servidor los expone automáticamente en `http://localhost:3000/music/`).
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
├── server.js       # Servidor Express + SSE + lectura de metadatos
├── styles.css      # Estilos mobile-first
└── package.json
```

## Características destacadas

- **Biblioteca y favoritos**: cambia entre tu colección completa y tus canciones favoritas con un interruptor táctil.
- **Miniaturas y metadatos**: cada pista muestra carátula (o una inicial) junto con título, artista y duración.
- **Escucha continua**: compatibilidad con Media Session API para controlar la reproducción desde la pantalla bloqueada.
- **Actualización en vivo**: los cambios en la carpeta `music/` se reflejan al instante gracias a SSE.

## Metadatos

Cuando es posible, el servidor lee los metadatos ID3 de cada archivo para mostrar título, artista y carátula. Si el archivo no tiene metadatos, el nombre del archivo se usa como título y se muestra un marcador genérico.
