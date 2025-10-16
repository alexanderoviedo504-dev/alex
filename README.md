# Clon Netflix Estático

Este proyecto es una plantilla ligera de una página estilo Netflix que puedes alojar en cualquier hosting estático. Permite mostrar un catálogo de películas y reproducir tus propios videos alojados en el mismo servidor.

## Estructura del proyecto

```
.
├── assets/
│   └── images/        # Imágenes como miniaturas o logotipos
├── data/
│   └── videos.json    # Catálogo de películas/series
├── media/
│   └── README.md      # Instrucciones para tus archivos de video
├── scripts/
│   └── main.js        # Lógica para cargar y mostrar el catálogo
├── styles.css         # Estilos principales
└── index.html         # Página principal
```

## Cómo agregar tus videos

1. Sube tus archivos `.mp4` (o cualquier formato compatible con tu navegador) a la carpeta `media/`.
2. Edita `data/videos.json` y agrega/actualiza las entradas del catálogo con la ruta relativa del video y de la imagen miniatura.
3. Opcional: agrega imágenes de portada en `assets/images/`.

Cada entrada en `data/videos.json` tiene esta forma:

```json
{
  "id": "un-identificador-unico",
  "title": "Título de la película",
  "description": "Descripción breve",
  "category": "Acción",
  "thumbnail": "assets/images/mi-miniatura.jpg",
  "video": "media/mi-video.mp4",
  "year": 2024,
  "duration": "1h 52m"
}
```

## Personalización rápida

- Cambia el logotipo editando la etiqueta `<span class="logo">MyFlix</span>` en `index.html`.
- Ajusta colores y tipografías desde `styles.css`.
- Agrega o elimina secciones modificando la constante `featuredVideoId` o las categorías en `main.js`.

## Ejecución local

Abre `index.html` directamente en tu navegador o sirve el proyecto con cualquier servidor estático (por ejemplo `python -m http.server`).

## Licencia

Uso libre para proyectos personales.
