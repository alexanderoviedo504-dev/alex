const audio = document.getElementById('audio');
const libraryListEl = document.getElementById('libraryList');
const favoritesListEl = document.getElementById('favoritesList');
const libraryEmptyEl = document.getElementById('libraryEmpty');
const favoritesEmptyEl = document.getElementById('favoritesEmpty');
const nowPlayingTitle = document.getElementById('nowPlaying');
const nowPlayingArtist = document.getElementById('nowPlayingArtist');
const coverImg = document.getElementById('cover');
const progressInput = document.getElementById('progress');
const progressTrack = document.querySelector('.progress__track');
const currentTimeLabel = document.getElementById('currentTime');
const durationLabel = document.getElementById('duration');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const volumeInput = document.getElementById('volume');
const refreshBtn = document.getElementById('refreshBtn');
const tabButtons = document.querySelectorAll('.tab');
const libraryPanels = document.querySelectorAll('.library__panel');

const MUSIC_PATH = '/music/';
const FAVORITES_KEY = 'waveroom:favorites';

const state = {
  tracks: [],
  currentIndex: -1,
  isPlaying: false,
  isShuffle: false,
  isRepeat: false,
  history: [],
  favorites: new Set(loadFavorites()),
};

async function fetchTracks(showLoader = false) {
  const loaders = [libraryListEl, favoritesListEl];

  if (showLoader) {
    loaders.forEach((el) => el.classList.add('is-loading'));
  }

  try {
    const response = await fetch('/tracks');
    if (!response.ok) {
      throw new Error('No se pudo obtener la música');
    }

    const data = await response.json();
    const previousId = state.currentIndex >= 0 ? state.tracks[state.currentIndex]?.id : null;
    const wasPlaying = state.isPlaying;

    state.tracks = data.map((track) => ({
      ...track,
      url: `${MUSIC_PATH}${encodeURIComponent(track.file)}`,
    }));

    const availableIds = new Set(state.tracks.map((track) => track.id));
    const sanitizedFavorites = [...state.favorites].filter((id) => availableIds.has(id));
    state.favorites = new Set(sanitizedFavorites);
    saveFavorites();

    if (state.tracks.length === 0) {
      stopPlayback();
      renderLibrary();
      renderFavorites();
      updateEmptyStates();
      return;
    }

    const preservedIndex = previousId
      ? state.tracks.findIndex((track) => track.id === previousId)
      : -1;

    renderLibrary();
    renderFavorites();
    updateEmptyStates();

    if (preservedIndex !== -1) {
      state.currentIndex = preservedIndex;
      updateActiveItem();
      if (wasPlaying) {
        play();
      }
    } else {
      selectTrack(0, wasPlaying);
    }
  } catch (error) {
    console.error(error);
  } finally {
    loaders.forEach((el) => el.classList.remove('is-loading'));
  }
}

function renderLibrary() {
  libraryListEl.innerHTML = '';
  state.tracks.forEach((track, index) => {
    libraryListEl.appendChild(buildTrackItem(track, index));
  });
  updateFavoriteButtons();
}

function renderFavorites() {
  favoritesListEl.innerHTML = '';
  const indexMap = new Map(state.tracks.map((track, index) => [track.id, index]));
  [...state.favorites]
    .map((id) => state.tracks[indexMap.get(id)])
    .filter(Boolean)
    .forEach((track) => {
      favoritesListEl.appendChild(buildTrackItem(track, indexMap.get(track.id)));
    });
  updateFavoriteButtons();
}

function buildTrackItem(track, index) {
  const li = document.createElement('li');
  li.className = 'track';
  li.dataset.index = String(index);
  li.dataset.id = track.id;

  if (index === state.currentIndex) {
    li.classList.add('is-active');
  }

  const thumb = document.createElement('div');
  thumb.className = 'track__thumb';
  if (track.cover) {
    const img = document.createElement('img');
    img.src = track.cover;
    img.alt = `Carátula de ${track.title}`;
    thumb.appendChild(img);
  } else {
    const fallback = document.createElement('span');
    fallback.textContent = (track.title || '?').charAt(0).toUpperCase() || '♪';
    thumb.appendChild(fallback);
  }

  const meta = document.createElement('div');
  meta.className = 'track__meta';

  const title = document.createElement('p');
  title.className = 'track__title';
  title.textContent = track.title;

  const artist = document.createElement('p');
  artist.className = 'track__artist';
  artist.textContent = track.artist || 'Artista desconocido';

  meta.appendChild(title);
  meta.appendChild(artist);

  const actions = document.createElement('div');
  actions.className = 'track__actions';

  const duration = document.createElement('span');
  duration.className = 'track__duration';
  duration.textContent = formatDuration(track.duration);

  const favoriteBtn = document.createElement('button');
  favoriteBtn.className = 'track__favorite';
  favoriteBtn.type = 'button';
  favoriteBtn.dataset.id = track.id;
  favoriteBtn.setAttribute('aria-label', 'Agregar a favoritos');
  favoriteBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleFavorite(track.id);
  });

  actions.appendChild(duration);
  actions.appendChild(favoriteBtn);

  li.appendChild(thumb);
  li.appendChild(meta);
  li.appendChild(actions);

  li.addEventListener('click', () => selectTrack(index));

  return li;
}

function updateEmptyStates() {
  const hasTracks = state.tracks.length > 0;
  libraryEmptyEl.hidden = hasTracks;
  libraryListEl.hidden = !hasTracks;

  const hasFavorites = favoritesListEl.children.length > 0;
  favoritesEmptyEl.hidden = hasFavorites;
  favoritesListEl.hidden = !hasFavorites;
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  saveFavorites();
  renderFavorites();
  updateFavoriteButtons();
  updateActiveItem();
  updateEmptyStates();
}

function updateFavoriteButtons() {
  document.querySelectorAll('.track__favorite').forEach((button) => {
    const trackId = button.dataset.id;
    const isFavorite = state.favorites.has(trackId);
    button.setAttribute('aria-pressed', isFavorite.toString());
    button.textContent = isFavorite ? '♥' : '♡';
    button.setAttribute(
      'aria-label',
      isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'
    );
  });
}

function selectTrack(index, autoplay = true) {
  if (index < 0 || index >= state.tracks.length) {
    return;
  }

  const track = state.tracks[index];
  state.currentIndex = index;
  audio.src = track.url;
  nowPlayingTitle.textContent = track.title;
  nowPlayingArtist.textContent = track.artist || 'Artista desconocido';

  updateCover(track.cover);
  updateActiveItem();
  resetProgress();
  updateMediaSession(track);

  if (autoplay) {
    play();
  }
}

function updateCover(cover) {
  if (cover) {
    coverImg.src = cover;
    coverImg.classList.add('is-visible');
  } else {
    coverImg.removeAttribute('src');
    coverImg.classList.remove('is-visible');
  }
}

function updateActiveItem() {
  document.querySelectorAll('.track').forEach((item) => {
    const index = Number(item.dataset.index);
    item.classList.toggle('is-active', index === state.currentIndex);
  });
}

function play() {
  if (!audio.src) {
    selectTrack(0);
    return;
  }

  audio
    .play()
    .then(() => {
      state.isPlaying = true;
      playPauseBtn.textContent = '❚❚';
      playPauseBtn.setAttribute('aria-label', 'Pausar');
      updatePlaybackState();
    })
    .catch((error) => console.error('No se pudo reproducir el audio:', error));
}

function pause() {
  audio.pause();
  state.isPlaying = false;
  playPauseBtn.textContent = '▶';
  playPauseBtn.setAttribute('aria-label', 'Reproducir');
  updatePlaybackState();
}

function stopPlayback() {
  pause();
  audio.removeAttribute('src');
  nowPlayingTitle.textContent = 'Selecciona un tema';
  nowPlayingArtist.innerHTML =
    'Añade archivos de audio en la carpeta <code>music</code> o usa <code>POST /upload</code>';
  coverImg.removeAttribute('src');
  coverImg.classList.remove('is-visible');
  resetProgress();
  state.currentIndex = -1;
  updateActiveItem();
}

function togglePlay() {
  if (state.isPlaying) {
    pause();
  } else {
    play();
  }
}

function nextTrack(manual = false) {
  if (state.tracks.length === 0) return;

  if (state.isShuffle) {
    playRandomTrack();
    return;
  }

  let nextIndex = state.currentIndex + 1;

  if (nextIndex >= state.tracks.length) {
    if (state.isRepeat || manual) {
      nextIndex = 0;
    } else {
      stopPlayback();
      return;
    }
  }

  selectTrack(nextIndex);
}

function previousTrack() {
  if (state.tracks.length === 0) return;

  if (audio.currentTime > 5) {
    audio.currentTime = 0;
    return;
  }

  if (state.isShuffle && state.history.length > 0) {
    const previousIndex = state.history.pop();
    if (typeof previousIndex === 'number') {
      selectTrack(previousIndex);
      return;
    }
  }

  const prevIndex = state.currentIndex - 1;

  if (prevIndex < 0) {
    selectTrack(state.tracks.length - 1);
  } else {
    selectTrack(prevIndex);
  }
}

function playRandomTrack() {
  if (state.tracks.length <= 1) {
    selectTrack(state.currentIndex);
    return;
  }

  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * state.tracks.length);
  } while (randomIndex === state.currentIndex);

  state.history.push(state.currentIndex);
  state.history = state.history.slice(-25);

  selectTrack(randomIndex);
}

function toggleShuffle() {
  state.isShuffle = !state.isShuffle;
  shuffleBtn.setAttribute('aria-pressed', state.isShuffle.toString());
  shuffleBtn.classList.toggle('is-active', state.isShuffle);
  if (!state.isShuffle) {
    state.history = [];
  }
}

function toggleRepeat() {
  state.isRepeat = !state.isRepeat;
  repeatBtn.setAttribute('aria-pressed', state.isRepeat.toString());
  repeatBtn.classList.toggle('is-active', state.isRepeat);
}

function updateProgress() {
  if (!audio.duration) return;
  const value = (audio.currentTime / audio.duration) * 100;
  progressInput.value = value;
  progressTrack.style.transform = `scaleX(${value / 100})`;
  currentTimeLabel.textContent = formatDuration(audio.currentTime);
  durationLabel.textContent = formatDuration(audio.duration);
  updatePositionState();
}

function seek(event) {
  if (!audio.duration) return;
  const value = Number(event.target.value);
  audio.currentTime = (value / 100) * audio.duration;
  updatePositionState();
}

function resetProgress() {
  progressInput.value = 0;
  progressTrack.style.transform = 'scaleX(0)';
  currentTimeLabel.textContent = '0:00';
  durationLabel.textContent = '0:00';
  updatePositionState();
}

function formatDuration(value) {
  if (!value || Number.isNaN(value)) return '--:--';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function handleEnded() {
  if (state.isRepeat) {
    audio.currentTime = 0;
    play();
  } else {
    nextTrack();
  }
}

function initSSE() {
  try {
    const events = new EventSource('/events');
    events.addEventListener('refresh', () => fetchTracks());
    events.onerror = () => {
      events.close();
      setTimeout(initSSE, 4000);
    };
  } catch (error) {
    console.error('SSE no disponible', error);
  }
}

function setupTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.tab;
      tabButtons.forEach((btn) => {
        const isActive = btn === button;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive.toString());
      });
      libraryPanels.forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.panel === target);
      });
    });
  });
}

function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;

  const artwork = track.cover
    ? [{ src: track.cover, sizes: '512x512', type: getCoverType(track.cover) }]
    : [{ src: createFallbackArtwork(track), sizes: '512x512', type: 'image/svg+xml' }];

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist || 'Artista desconocido',
    album: 'WaveRoom',
    artwork,
  });
  updatePlaybackState();
  updatePositionState();
}

function updatePlaybackState() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
}

function updatePositionState() {
  if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
  if (!audio.duration || Number.isNaN(audio.duration)) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: audio.currentTime,
    });
  } catch (error) {
    console.debug('No se pudo actualizar la posición del Media Session', error);
  }
}

function setupMediaSessionHandlers() {
  if (!('mediaSession' in navigator)) return;

  const handlers = {
    play,
    pause,
    previoustrack: previousTrack,
    nexttrack: () => nextTrack(true),
    stop: pause,
    seekto: (details) => {
      if (typeof details.seekTime === 'number') {
        if (details.fastSeek && typeof audio.fastSeek === 'function') {
          audio.fastSeek(details.seekTime);
        } else {
          audio.currentTime = details.seekTime;
        }
        updateProgress();
      }
    },
    seekforward: (details) => {
      const offset = details.seekOffset || 10;
      audio.currentTime = Math.min(audio.currentTime + offset, audio.duration || audio.currentTime);
      updateProgress();
    },
    seekbackward: (details) => {
      const offset = details.seekOffset || 10;
      audio.currentTime = Math.max(audio.currentTime - offset, 0);
      updateProgress();
    },
  };

  Object.entries(handlers).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      console.debug(`Acción de Media Session no disponible: ${action}`, error);
    }
  });
}

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn('No se pudieron leer los favoritos guardados:', error);
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
  } catch (error) {
    console.warn('No se pudieron guardar los favoritos:', error);
  }
}

function getCoverType(dataUrl) {
  const match = /^data:(.*?);/.exec(dataUrl);
  return match ? match[1] : 'image/png';
}

const artworkCache = new Map();
function createFallbackArtwork(track) {
  if (artworkCache.has(track.id)) {
    return artworkCache.get(track.id);
  }

  const initial = (track.title || '?').charAt(0).toUpperCase() || '♪';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n  <defs>\n    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">\n      <stop offset="0%" stop-color="#1ed760" stop-opacity="0.8"/>\n      <stop offset="100%" stop-color="#0b1217" stop-opacity="1"/>\n    </linearGradient>\n  </defs>\n  <rect width="512" height="512" fill="url(#g)" rx="64"/>\n  <text x="50%" y="55%" text-anchor="middle" fill="#ffffff" font-family="'Manrope', 'Segoe UI', sans-serif" font-size="280" font-weight="700">${initial}</text>\n</svg>`;
  let dataUrl;
  try {
    dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  } catch (error) {
    dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  artworkCache.set(track.id, dataUrl);
  return dataUrl;
}

function loadVolumePreference() {
  const stored = localStorage.getItem('waveroom:volume');
  if (!stored) return;
  const value = Number(stored);
  if (!Number.isNaN(value)) {
    audio.volume = value;
    volumeInput.value = value;
  }
}

function persistVolume(value) {
  try {
    localStorage.setItem('waveroom:volume', String(value));
  } catch (error) {
    console.warn('No se pudo guardar el volumen:', error);
  }
}

playPauseBtn.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', () => nextTrack(true));
prevBtn.addEventListener('click', previousTrack);
shuffleBtn.addEventListener('click', toggleShuffle);
repeatBtn.addEventListener('click', toggleRepeat);
progressInput.addEventListener('input', seek);
volumeInput.addEventListener('input', (event) => {
  const value = Number(event.target.value);
  audio.volume = value;
  persistVolume(value);
});
refreshBtn.addEventListener('click', () => fetchTracks(true));

audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('loadedmetadata', () => {
  updateProgress();
  updatePositionState();
});
audio.addEventListener('ended', handleEnded);
audio.addEventListener('play', () => {
  state.isPlaying = true;
  playPauseBtn.textContent = '❚❚';
  playPauseBtn.setAttribute('aria-label', 'Pausar');
  updatePlaybackState();
});
audio.addEventListener('pause', () => {
  state.isPlaying = false;
  playPauseBtn.textContent = '▶';
  playPauseBtn.setAttribute('aria-label', 'Reproducir');
  updatePlaybackState();
});
audio.addEventListener('seeked', updatePositionState);

audio.setAttribute('controlsList', 'nodownload noplaybackrate');

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.isPlaying) {
    updatePositionState();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupMediaSessionHandlers();
  loadVolumePreference();
  fetchTracks(true);
  initSSE();
});
