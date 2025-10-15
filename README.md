# WaveRoom – Reproductor estilo Spotify

Aplicación móvil web inspirada en Spotify que reproduce automáticamente tu música local, con biblioteca filtrable, favoritos y controles optimizados para pantallas táctiles. Coloca archivos de audio en la carpeta `music` y la lista se actualizará al instante gracias a Server-Sent Events, o súbelos desde otro dispositivo usando la API incluida.

## Características

- Diseño tipo app móvil con panel de “Ahora reproduciendo” translúcido y lista de canciones con miniaturas.
- Biblioteca separada por pestañas entre toda tu música y favoritos persistentes en `localStorage`.
- Reproducción en segundo plano con controles del sistema gracias a la Media Session API.
- Actualización automática cuando cambian los archivos del directorio `music` o se suben mediante la ruta `POST /upload`.

## Requisitos

- Node.js 18 o superior

## Instalación

```bash
npm install
```

## Uso

1. Copia tus archivos `.mp3`, `.m4a`, `.aac`, `.wav` u `.ogg` dentro de la carpeta `music/` en la raíz del proyecto.
2. Inicia el servidor de desarrollo:

```bash
npm run dev
```

Esto levantará la aplicación en `http://localhost:3000` con recarga automática de la lista cuando se agreguen o eliminen archivos en `music/`.
3. Opcionalmente, sube canciones desde otra máquina con una petición `POST /upload` multi-parte:

```bash
curl -F "tracks=@/ruta/a/tu-cancion.mp3" http://localhost:3000/upload
```

Los archivos se guardarán en `music/` y el cliente se actualizará sin recargar.

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

## Metadatos

Cuando es posible, el servidor lee los metadatos ID3 de cada archivo para mostrar título, artista y carátula. Si el archivo no tiene metadatos, el nombre del archivo se usa como título y se muestra un marcador genérico.
