import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseFile } from 'music-metadata';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MUSIC_DIR = path.join(__dirname, 'music');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, MUSIC_DIR);
  },
  filename: (_req, file, cb) => {
    const { name, ext } = path.parse(file.originalname);
    const safeName = `${slugify(name)}${ext.toLowerCase()}`;
    cb(null, ensureUniqueFilename(safeName));
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (isSupportedAudio(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no soportado'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

const clients = new Set();
let watcher;

fs.mkdirSync(MUSIC_DIR, { recursive: true });

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/styles.css', (_req, res) => {
  res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/app.js', (_req, res) => {
  res.sendFile(path.join(__dirname, 'app.js'));
});

app.use('/music', express.static(MUSIC_DIR));

app.post('/upload', upload.single('track'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  broadcastRefresh();

  res.status(201).json({
    message: 'Archivo cargado correctamente',
    file: req.file.filename,
    path: `/music/${encodeURIComponent(req.file.filename)}`,
  });
});

app.use((err, _req, res, _next) => {
  if (!err) {
    return;
  }

  if (res.headersSent) {
    return;
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  if (err.message === 'Formato de archivo no soportado') {
    return res.status(415).json({ error: err.message });
  }

  console.error('Error inesperado en el servidor:', err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

app.get('/tracks', async (_req, res) => {
  try {
    const files = await fs.promises.readdir(MUSIC_DIR);
    const audioFiles = files.filter((file) => isSupportedAudio(file));

    const metadata = await Promise.all(
      audioFiles.map(async (file) => {
        const filePath = path.join(MUSIC_DIR, file);
        try {
          const parsed = await parseFile(filePath, { duration: true });
          const picture = parsed.common.picture?.[0];
          const cover = picture ? toDataUrl(picture) : null;

          return {
            id: file,
            file,
            title: parsed.common.title || beautifyFileName(file),
            artist: parsed.common.artist || parsed.common.album || 'Artista desconocido',
            duration: parsed.format.duration || null,
            cover,
          };
        } catch (error) {
          console.warn(`No se pudo leer metadatos de ${file}:`, error.message);
          return {
            id: file,
            file,
            title: beautifyFileName(file),
            artist: 'Artista desconocido',
            duration: null,
            cover: null,
          };
        }
      })
    );

    res.json(metadata.sort((a, b) => a.title.localeCompare(b.title)));
  } catch (error) {
    console.error('Error al leer la carpeta de música:', error);
    res.status(500).json({ error: 'No se pudo obtener la música' });
  }
});

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');

  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
});

function isSupportedAudio(file) {
  return /\.(mp3|m4a|aac|wav|ogg)$/i.test(file);
}

function ensureUniqueFilename(filename) {
  const fullPath = path.join(MUSIC_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    return filename;
  }

  const { name, ext } = path.parse(filename);
  let counter = 1;
  let newName = `${name}-${counter}${ext}`;

  while (fs.existsSync(path.join(MUSIC_DIR, newName))) {
    counter += 1;
    newName = `${name}-${counter}${ext}`;
  }

  return newName;
}

function beautifyFileName(file) {
  return file
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  const normalized = value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .replace(/-+/g, '-');

  if (!normalized) {
    return `track-${Date.now()}`;
  }

  return normalized.slice(0, 120);
}

function toDataUrl(picture) {
  const base64 = picture.data.toString('base64');
  return `data:${picture.format};base64,${base64}`;
}

function broadcastRefresh() {
  for (const client of clients) {
    client.write('event: refresh\n');
    client.write('data: update\n\n');
  }
}

function startWatcher() {
  if (watcher) return;

  try {
    watcher = fs.watch(MUSIC_DIR, { persistent: false }, debounce(broadcastRefresh, 250));
  } catch (error) {
    console.warn('No se pudo iniciar la vigilancia de la carpeta de música:', error);
  }
}

function debounce(fn, delay) {
  let timeout;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, delay);
  };
}

startWatcher();

app.listen(PORT, () => {
  console.log(`Servidor WaveRoom escuchando en http://localhost:${PORT}`);
});
