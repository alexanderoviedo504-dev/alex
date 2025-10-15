# WaveRoom PHP – Tu sala musical estilo Apple/Spotify

WaveRoom es un reproductor *mobile-first* con estética glassmórfica inspirado en Apple Music y Spotify. Está construido con PHP puro y archivos estáticos para que puedas subirlo a tu hosting (incluido cPanel) sin depender de Node.js. La interfaz está pensada para móviles: al tocar una canción se abre una vista de "pantalla completa" con carátula grande, controles translúcidos, favorito, repetición, shuffle y barra de progreso.

## Qué incluye

- **Biblioteca automática**: cada archivo de la carpeta `music/` se indexa al momento. Se reconocen estructuras `Artista/Álbum/Canción.mp3` para generar secciones de artistas y álbumes.
- **Diseño minimalista**: paneles de cristal, tipografía Inter y miniaturas cuadradas para cada pista.
- **Vista completa estilo Spotify**: al reproducir una canción aparece un panel a pantalla completa con controles grandes, artwork y progreso.
- **Favoritos persistentes**: los corazones se guardan en `localStorage` y se sincronizan en la lista, mini-player y pantalla completa.
- **Controles avanzados**: repetir (off, lista o canción), aleatorio, siguiente/anterior sin perder el estado al volver a la biblioteca y Media Session API para seguir sonando con la pantalla bloqueada.
- **CPanel privado**: `cpanel.php` te permite subir canciones y portadas directamente desde el navegador, crear carpetas de artista/álbum y previsualizar cómo quedarán las miniaturas antes de publicar.

## Requisitos

- PHP 8.1 o superior con extensiones estándar habilitadas.
- Permisos de lectura (y escritura si usarás el cPanel) en la carpeta `music/`.

## Instalación

1. Copia todo el repositorio a tu hosting. Si usas cPanel basta con subir los archivos al directorio público (por ejemplo `public_html/tu-app`).
2. Asegúrate de crear la carpeta `music/` en la raíz del proyecto y darle permisos de escritura si vas a utilizar el cPanel incorporado.
3. Opcional: protege `cpanel.php` con autenticación HTTP básica desde tu hosting si quieres mantenerlo privado.

## Uso diario

- **Agregar música manualmente**: sube tus archivos `.mp3`, `.m4a`, `.aac`, `.wav`, `.flac` u `.ogg` dentro de `music/`. Puedes organizarte por carpetas (`music/Artista/Álbum/tema.mp3`). Si en la misma carpeta incluyes `cover.jpg` (o `.png/.webp`) se utilizará como miniatura.
- **Agregar música desde el CPanel**: visita `cpanel.php`, escribe el artista y álbum, selecciona varias canciones y (opcionalmente) una portada. El formulario guardará los archivos en `music/` respetando la jerarquía indicada y mostrará una cuadrícula de vista previa.
- **Reproducir**: abre `index.php` desde tu móvil. La biblioteca mostrará filtros (Todos, Favoritos, Álbumes, Artistas, Recientes). Al tocar cualquier canción se abrirá la vista completa con controles.

## Estructura principal

```
.
├── index.php             # Interfaz principal del reproductor
├── cpanel.php            # Panel privado para subir y previsualizar música
├── api/
│   └── tracks.php        # Devuelve la biblioteca como JSON
├── lib/
│   └── library.php       # Funciones compartidas para indexar la carpeta music/
├── assets/
│   ├── css/styles.css    # Estilos glassmórficos mobile-first
│   ├── js/app.js         # Lógica del reproductor y favoritos
│   └── img/default-cover.svg
└── music/                # Tu biblioteca de canciones (añade tus archivos aquí)
```

## Funciones clave del reproductor

- Mini-player translúcido que permanece visible mientras navegas por la biblioteca.
- Pantalla "Ahora reproduciendo" con carátula grande, tiempos transcurrido/restante y controles táctiles.
- Navegación fluida: puedes cerrar la vista completa y seguir explorando sin detener la canción.
- Corrección de títulos: los nombres de archivo se transforman automáticamente a formato "Título Capitalizado" sin extensiones.
- Continúa sonando con la pantalla bloqueada gracias a la integración con Media Session API.

## Personalización

Puedes editar `assets/css/styles.css` para ajustar colores o radios y modificar `assets/js/app.js` si quieres ampliar la lógica (por ejemplo añadir colas personalizadas). Los archivos PHP solo dependen de la librería estándar, por lo que funcionarán en la mayoría de hostings compartidos.

## Consejos de seguridad

- Protege `cpanel.php` mediante autenticación básica o IP permitida si tu hosting es público.
- Realiza copias de seguridad periódicas de la carpeta `music/`.
- Mantén PHP actualizado para evitar vulnerabilidades.

¡Listo! Sube tus pistas, disfruta del diseño minimalista y lleva tu experiencia musical estilo Apple/Spotify a tu propio hosting.
