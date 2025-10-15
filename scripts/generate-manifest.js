import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFile } from 'music-metadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const musicDir = path.join(projectRoot, 'music');
const outputPath = path.join(musicDir, 'library.json');

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.wav', '.ogg']);

async function main() {
  await fs.mkdir(musicDir, { recursive: true });
  const files = await fs.readdir(musicDir);

  const audioFiles = files.filter((file) => SUPPORTED_EXTENSIONS.has(path.extname(file).toLowerCase()));

  if (!audioFiles.length) {
    await writeManifest([]);
    console.log('No se encontraron archivos de audio en music/. Se creó un manifest vacío.');
    return;
  }

  const entries = await Promise.all(
    audioFiles.map(async (file) => {
      const filePath = path.join(musicDir, file);
      const stats = await fs.stat(filePath);
      const baseEntry = {
        id: file,
        file,
        title: beautifyFileName(file),
        artist: 'Artista desconocido',
        duration: null,
        cover: null,
        addedAt: stats.mtimeMs,
      };

      try {
        const metadata = await parseFile(filePath, { duration: true });
        const title = metadata.common.title?.trim();
        const artist = metadata.common.artist?.trim() || metadata.common.album?.trim();
        const picture = metadata.common.picture?.[0];

        return {
          ...baseEntry,
          title: title || baseEntry.title,
          artist: artist || baseEntry.artist,
          duration: metadata.format.duration || baseEntry.duration,
          cover: picture ? toDataUrl(picture) : null,
        };
      } catch (error) {
        console.warn(`No se pudieron leer metadatos de ${file}:`, error.message);
        return baseEntry;
      }
    })
  );

  entries.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));

  await writeManifest(entries);
  console.log(`Manifest generado con ${entries.length} pistas en music/library.json.`);
}

async function writeManifest(tracks) {
  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl: './',
    tracks,
  };

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
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

main().catch((error) => {
  console.error('No se pudo generar el manifest:', error);
  process.exitCode = 1;
});
