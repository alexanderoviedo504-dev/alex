# WaveRoom – Reproductor estilo Spotify transparente

Aplicación móvil web inspirada en Spotify y Apple Music con acabados translúcidos. Reproduce automáticamente tu música, muestra carátulas miniatura, permite marcar favoritos y mantiene la reproducción incluso con la pantalla bloqueada gracias a la Media Session API.

## Requisitos

- Node.js 18 o superior

## Instalación

```bash
npm install
```

## Uso

1. Copia tus archivos `.mp3`, `.m4a`, `.aac`, `.wav` u `.ogg` dentro de la carpeta `music/` en la raíz del proyecto o súbelos mediante el endpoint `POST /upload` descrito más abajo.
2. Inicia el servidor de desarrollo:

```bash
npm run dev
```

Esto levantará la aplicación en `http://localhost:3000` con recarga automática de la lista cuando se agreguen, eliminen o suban nuevos archivos en `music/`.

Para un entorno de producción puedes ejecutar:

```bash
npm start
```

## Estructura de carpetas

```
.
├── app.js          # Lógica del reproductor en el navegador
├── index.html      # Interfaz móvil inspirada en Spotify/Apple Music
├── music/          # Carpeta donde colocar tus canciones o se guardan las subidas
├── server.js       # Servidor Express + SSE + lectura de metadatos y subida
├── styles.css      # Estilos mobile-first
└── package.json
```

## Biblioteca, favoritos y reproducción en segundo plano

- Biblioteca con fichas translúcidas y miniaturas que se actualiza en tiempo real.
- Lista de canciones con botón de favorito persistente (localStorage) para tus pistas preferidas.
- Metadata sincronizada con Media Session API para mostrar controles y carátulas en la pantalla bloqueada y mantener la reproducción.

## Carga de música

### Carpeta compartida

Simplemente copia tus archivos dentro de `music/`. El servidor vigila la carpeta y la interfaz se refresca sola.

### Endpoint `POST /upload`

También puedes cargar pistas desde otro dispositivo o un script:

```bash
curl -F "track=@/ruta/a/tu-cancion.mp3" http://localhost:3000/upload
```

- El archivo se guarda en `music/` con un nombre sanitizado para evitar colisiones.
- Se admiten archivos `.mp3`, `.m4a`, `.aac`, `.wav` u `.ogg` de hasta 50 MB.
- Cada subida notifica a los clientes conectados mediante SSE para actualizar la biblioteca sin recargar la página.

## Metadatos

Cuando es posible, el servidor lee los metadatos ID3 de cada archivo para mostrar título, artista y carátula. Si el archivo no contiene metadatos, se muestra un marcador genérico basado en el nombre del archivo.
