const statusEl = document.querySelector('[data-status]');
const trackListEl = document.querySelector('[data-track-list]');
const playerEl = document.querySelector('[data-player]');
const audioEl = document.querySelector('[data-audio]');
const playButton = document.querySelector('[data-play]');
const nextButton = document.querySelector('[data-next]');
const prevButton = document.querySelector('[data-prev]');
const currentTitleEl = document.querySelector('[data-current-title]');
const currentArtistEl = document.querySelector('[data-current-artist]');
const currentCoverEl = document.querySelector('[data-current-cover]');
const currentTimeEl = document.querySelector('[data-current-time]');
const durationEl = document.querySelector('[data-duration]');
const progressEl = document.querySelector('[data-progress]');

let tracks = [];
let currentIndex = -1;
let isPlaying = false;

const MANIFEST_PATHS = [
  'music/library.json',
  'music/manifest.json',
  'music/tracks.json',
  'music/index.json'
];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];

async function loadTracks() {
  const manifestTracks = await loadFromManifest();
  if (manifestTracks.length) {
    return manifestTracks;
  }

  const directoryTracks = await loadFromDirectoryListing();
  if (directoryTracks.length) {
    return directoryTracks;
  }

  return [];
}

async function loadFromManifest() {
  for (const path of MANIFEST_PATHS) {
    try {
      const response = await fetch(path, { cache: 'no-cache' });
      if (!response.ok) continue;
      const data = await response.json();
      if (!Array.isArray(data)) continue;
      return data
        .map((item) => normalizeTrack(item))
        .filter((track) => Boolean(track));
    } catch (error) {
      // ignore and try next option
    }
  }
  return [];
}

async function loadFromDirectoryListing() {
  try {
    const response = await fetch('music/', { headers: { Accept: 'text/html' } });
    if (!response.ok) return [];
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a[href]'));

    const files = links
      .map((link) => decodeURIComponent(link.getAttribute('href') || ''))
      .map((href) => href.replace(/^\.\/?/, ''))
      .filter((href) => AUDIO_EXTENSIONS.some((ext) => href.toLowerCase().endsWith(ext)))
      .map((href) => (href.startsWith('music/') ? href : `music/${href}`));

    const uniqueFiles = [...new Set(files)];

    return uniqueFiles.map((src) =>
      normalizeTrack({
        src,
        title: src.split('/').pop()
      })
    );
  } catch (error) {
    return [];
  }
}

function normalizeTrack(raw) {
  if (!raw) return null;
  const rawSrc = raw.src || raw.url || raw.file;
  if (!rawSrc) return null;
  const src = rawSrc.match(/^https?:/i) || rawSrc.startsWith('/') ? rawSrc : `music/${rawSrc.replace(/^\.\/?/, '')}`;
  const title = raw.title || extractTitleFromPath(src);
  const artist = raw.artist || '';
  const cover = raw.cover || '';
  return { src, title, artist, cover };
}

function extractTitleFromPath(path) {
  const filename = path.split('/').pop() || '';
  return filename.replace(/[_-]+/g, ' ').replace(/\.[^.]+$/, '').trim();
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const rounded = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = `${rounded % 60}`.padStart(2, '0');
  return `${mins}:${secs}`;
}

function renderTracks(trackItems) {
  trackListEl.innerHTML = '';

  trackItems.forEach((track, index) => {
    const button = document.createElement('button');
    button.className = 'track-card';
    button.type = 'button';
    button.setAttribute('role', 'listitem');
    button.dataset.index = String(index);

    const cover = document.createElement('div');
    cover.className = 'track-cover';
    if (track.cover) {
      const img = document.createElement('img');
      img.src = track.cover;
      img.alt = '';
      img.loading = 'lazy';
      cover.appendChild(img);
    } else {
      cover.textContent = track.title.charAt(0).toUpperCase();
    }

    const info = document.createElement('div');
    info.className = 'track-info';

    const title = document.createElement('p');
    title.className = 'track-title';
    title.textContent = track.title;

    const artist = document.createElement('p');
    artist.className = 'track-artist';
    artist.textContent = track.artist || 'Autor desconocido';

    info.append(title, artist);

    const duration = document.createElement('span');
    duration.className = 'track-duration';
    duration.textContent = '—';

    button.append(cover, info, duration);
    button.addEventListener('click', () => playTrack(index));
    trackListEl.appendChild(button);
  });
}

function updatePlayer(track) {
  currentTitleEl.textContent = track.title;
  currentArtistEl.textContent = track.artist || 'Autor desconocido';

  currentCoverEl.innerHTML = '';
  if (track.cover) {
    const img = document.createElement('img');
    img.src = track.cover;
    img.alt = '';
    currentCoverEl.appendChild(img);
  } else {
    currentCoverEl.textContent = track.title.charAt(0).toUpperCase();
  }

  playerEl.hidden = false;
}

function highlightCurrentTrack() {
  const buttons = trackListEl.querySelectorAll('.track-card');
  buttons.forEach((btn) => {
    const isCurrent = Number(btn.dataset.index) === currentIndex;
    btn.setAttribute('aria-current', isCurrent ? 'true' : 'false');
  });
}

async function playTrack(index) {
  if (!tracks[index]) return;
  currentIndex = index;
  const track = tracks[index];
  audioEl.src = track.src;
  await audioEl.play().catch(() => {});
  isPlaying = !audioEl.paused;
  updatePlayer(track);
  updatePlayButton();
  highlightCurrentTrack();
}

function togglePlay() {
  if (currentIndex === -1 && tracks.length) {
    playTrack(0);
    return;
  }

  if (audioEl.paused) {
    audioEl.play().catch(() => {});
    isPlaying = true;
  } else {
    audioEl.pause();
    isPlaying = false;
  }
  updatePlayButton();
}

function updatePlayButton() {
  playButton.textContent = audioEl.paused ? '►' : '❚❚';
  playButton.setAttribute('aria-label', audioEl.paused ? 'Reproducir' : 'Pausar');
}

function playNext() {
  if (!tracks.length) return;
  const nextIndex = currentIndex + 1 < tracks.length ? currentIndex + 1 : 0;
  playTrack(nextIndex);
}

function playPrevious() {
  if (!tracks.length) return;
  const prevIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : tracks.length - 1;
  playTrack(prevIndex);
}

function updateProgress() {
  const current = audioEl.currentTime || 0;
  const duration = audioEl.duration || 0;
  currentTimeEl.textContent = formatTime(current);
  durationEl.textContent = duration ? formatTime(duration) : '0:00';
  const percentage = duration ? (current / duration) * 100 : 0;
  progressEl.style.width = `${percentage}%`;

  const buttons = trackListEl.querySelectorAll('.track-card');
  if (currentIndex >= 0 && buttons[currentIndex]) {
    const durationLabel = buttons[currentIndex].querySelector('.track-duration');
    if (durationLabel && duration) {
      durationLabel.textContent = formatTime(duration);
    }
  }
}

function showError(message) {
  statusEl.textContent = message;
  trackListEl.innerHTML = '';
}

(async function init() {
  try {
    tracks = await loadTracks();
    if (!tracks.length) {
      showError('No se encontraron canciones en /music.');
      return;
    }
    statusEl.textContent = `${tracks.length} canción${tracks.length === 1 ? '' : 'es'} disponibles.`;
    renderTracks(tracks);
  } catch (error) {
    showError('Ocurrió un problema al cargar el catálogo.');
  }
})();

audioEl.addEventListener('timeupdate', updateProgress);
audioEl.addEventListener('loadedmetadata', updateProgress);
audioEl.addEventListener('play', () => {
  isPlaying = true;
  updatePlayButton();
});
audioEl.addEventListener('pause', () => {
  isPlaying = false;
  updatePlayButton();
});
audioEl.addEventListener('ended', playNext);

playButton.addEventListener('click', togglePlay);
nextButton.addEventListener('click', playNext);
prevButton.addEventListener('click', playPrevious);

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && document.activeElement === document.body) {
    event.preventDefault();
    togglePlay();
  }
});
