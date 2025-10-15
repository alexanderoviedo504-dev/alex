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

const clients = new Set();
let watcher;

fs.mkdirSync(MUSIC_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, MUSIC_DIR);
  },
  filename: (_req, file, cb) => {
    const sanitized = sanitizeFileName(file.originalname);
    const ext = path.extname(sanitized).toLowerCase();
    const base = path.basename(sanitized, ext);
    const timestamp = Date.now();
    cb(null, `${base}-${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isSupportedAudio(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Usa archivos MP3, WAV, M4A u OGG.'));
    }
  },
});

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
    res.status(400).json({ error: 'No se recibió ningún archivo' });
    return;
  }

  broadcastRefresh();
  res.status(201).json({
    message: 'Canción subida correctamente',
    file: req.file.filename,
    path: `/music/${encodeURIComponent(req.file.filename)}`,
  });
});

app.get('/tracks', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const files = await fs.promises.readdir(MUSIC_DIR);
    const audioFiles = files.filter((file) => isSupportedAudio(file));

    const metadata = await Promise.all(
      audioFiles.map(async (file) => {
        const filePath = path.join(MUSIC_DIR, file);
        try {
          const [parsed, stats] = await Promise.all([
            parseFile(filePath, { duration: true }),
            fs.promises.stat(filePath),
          ]);
          const picture = parsed.common.picture?.[0];
          const cover = picture ? toDataUrl(picture) : null;

          return {
            id: file,
            file,
            title: parsed.common.title || beautifyFileName(file),
            artist: parsed.common.artist || parsed.common.album || 'Artista desconocido',
            duration: parsed.format.duration || null,
            cover,
            addedAt: stats.mtimeMs,
          };
        } catch (error) {
          console.warn(`No se pudo leer metadatos de ${file}:`, error.message);
          const stats = await fs.promises.stat(filePath);
          return {
            id: file,
            file,
            title: beautifyFileName(file),
            artist: 'Artista desconocido',
            duration: null,
            cover: null,
            addedAt: stats.mtimeMs,
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

function sanitizeFileName(file) {
  return file
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function beautifyFileName(file) {
  return file
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

app.use((error, _req, res, _next) => {
  if (error) {
    console.error('Error en la carga:', error.message);
    res.status(400).json({ error: error.message || 'No se pudo subir el archivo' });
  }
});

startWatcher();

app.listen(PORT, () => {
  console.log(`Servidor WaveRoom escuchando en http://localhost:${PORT}`);
});
