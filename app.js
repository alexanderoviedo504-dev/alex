const audio = document.getElementById('audio');
const trackListEl = document.getElementById('trackList');
const emptyStateEl = document.getElementById('emptyState');
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
const libraryGrid = document.getElementById('libraryGrid');
const libraryEmpty = document.getElementById('libraryEmpty');
const filterAllBtn = document.getElementById('filterAll');
const filterFavoritesBtn = document.getElementById('filterFavorites');
const countAll = document.getElementById('countAll');
const countFavorites = document.getElementById('countFavorites');

const MUSIC_PATH = '/music/';
const FAVORITES_KEY = 'waveroom:favorites';

const state = {
  tracks: [],
  currentIndex: -1,
  isPlaying: false,
  isShuffle: false,
  isRepeat: false,
  history: [],
  favorites: loadFavorites(),
  libraryFilter: 'all',
};

async function fetchTracks(showLoader = false) {
  if (showLoader) {
    trackListEl.classList.add('is-loading');
  }

  try {
    const response = await fetch('/tracks');
    if (!response.ok) {
      throw new Error('No se pudo obtener la música');
    }

    const data = await response.json();
    const previousId =
      state.currentIndex >= 0 ? state.tracks[state.currentIndex]?.id : null;
    const wasPlaying = state.isPlaying;

    state.tracks = data.map((track) => ({
      ...track,
      url: `${MUSIC_PATH}${encodeURIComponent(track.file)}`,
    }));

    const validIds = new Set(state.tracks.map((track) => track.id));
    const filteredFavorites = Array.from(state.favorites).filter((id) => validIds.has(id));
    if (filteredFavorites.length !== state.favorites.size) {
      state.favorites = new Set(filteredFavorites);
      saveFavorites();
    }

    if (state.tracks.length === 0) {
      renderTracks();
      renderLibrary();
      updateCounts();
      stopPlayback();
      return;
    }

    const preservedIndex = previousId
      ? state.tracks.findIndex((track) => track.id === previousId)
      : -1;

    if (preservedIndex !== -1) {
      state.currentIndex = preservedIndex;
      renderTracks();
      renderLibrary();
      updateCounts();
      updateActiveItem();
      if (wasPlaying) {
        play();
      }
    } else {
      renderTracks();
      renderLibrary();
      updateCounts();
      selectTrack(0, wasPlaying);
    }
  } catch (error) {
    console.error(error);
  } finally {
    trackListEl.classList.remove('is-loading');
    toggleEmptyState();
  }
}

function renderTracks() {
  trackListEl.innerHTML = '';

  state.tracks.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = 'playlist__item';
    li.dataset.index = index;

    if (index === state.currentIndex) {
      li.classList.add('is-active');
    }

    if (state.favorites.has(track.id)) {
      li.classList.add('is-favorite');
    }

    const artwork = document.createElement('div');
    artwork.className = 'playlist__artwork';
    const fallbackInitial = getTrackInitial(track);

    if (track.cover) {
      artwork.style.setProperty('--thumb-image', `url("${track.cover}")`);
    } else {
      artwork.classList.add('is-placeholder');
      artwork.textContent = fallbackInitial;
    }

    const indexEl = document.createElement('span');
    indexEl.className = 'playlist__index';
    indexEl.textContent = String(index + 1).padStart(2, '0');

    const meta = document.createElement('div');
    meta.className = 'playlist__meta';

    const title = document.createElement('p');
    title.className = 'playlist__title';
    title.textContent = track.title;

    const artist = document.createElement('p');
    artist.className = 'playlist__artist';
    artist.textContent = track.artist || 'Artista desconocido';

    meta.appendChild(title);
    meta.appendChild(artist);

    const duration = document.createElement('span');
    duration.className = 'playlist__duration';
    duration.textContent = formatDuration(track.duration);

    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'playlist__favorite';
    favoriteBtn.type = 'button';
    const isFavorite = state.favorites.has(track.id);
    favoriteBtn.setAttribute('aria-pressed', isFavorite.toString());
    favoriteBtn.setAttribute('aria-label', isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos');
    favoriteBtn.innerHTML = isFavorite ? '♥' : '♡';
    favoriteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFavorite(track.id);
    });

    li.appendChild(artwork);
    li.appendChild(indexEl);
    li.appendChild(meta);
    li.appendChild(duration);
    li.appendChild(favoriteBtn);

    li.addEventListener('click', () => selectTrack(index));

    trackListEl.appendChild(li);
  });
}

function toggleEmptyState() {
  const shouldShow = state.tracks.length === 0;
  emptyStateEl.hidden = !shouldShow;
  trackListEl.hidden = shouldShow;
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
  updateMediaSession(track);
  updateActiveItem();
  resetProgress();

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
  Array.from(trackListEl.children).forEach((item, idx) => {
    item.classList.toggle('is-active', idx === state.currentIndex);
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
  nowPlayingArtist.innerHTML = 'Añade archivos de audio en la carpeta <code>music</code>';
  coverImg.removeAttribute('src');
  coverImg.classList.remove('is-visible');
  resetProgress();
  state.currentIndex = -1;
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
  syncMediaSessionPosition();
}

function seek(event) {
  if (!audio.duration) return;
  const value = Number(event.target.value);
  audio.currentTime = (value / 100) * audio.duration;
}

function resetProgress() {
  progressInput.value = 0;
  progressTrack.style.transform = 'scaleX(0)';
  currentTimeLabel.textContent = '0:00';
  durationLabel.textContent = '0:00';
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

function renderLibrary() {
  libraryGrid.innerHTML = '';

  const filteredTracks = state.libraryFilter === 'favorites'
    ? state.tracks.filter((track) => state.favorites.has(track.id))
    : state.tracks;

  const hasTracks = state.tracks.length > 0;
  const hasFilteredTracks = filteredTracks.length > 0;

  if (!hasTracks) {
    libraryGrid.hidden = true;
    libraryEmpty.hidden = false;
    libraryEmpty.textContent =
      'Aún no hay canciones que mostrar aquí. Agrega música a la carpeta music o súbela mediante POST /upload.';
    return;
  }

  if (!hasFilteredTracks) {
    libraryGrid.hidden = true;
    libraryEmpty.hidden = false;
    libraryEmpty.textContent =
      state.libraryFilter === 'favorites'
        ? 'Marca el corazón de tus canciones para verlas aquí.'
        : 'Aún no hay canciones disponibles.';
    return;
  }

  libraryGrid.hidden = false;
  libraryEmpty.hidden = true;

  filteredTracks.forEach((track) => {
    const card = document.createElement('button');
    card.className = 'library-card';
    card.type = 'button';
    card.setAttribute('role', 'listitem');

    const cover = document.createElement('div');
    cover.className = 'library-card__artwork';
    const fallbackInitial = getTrackInitial(track);

    if (track.cover) {
      cover.style.setProperty('--thumb-image', `url("${track.cover}")`);
    } else {
      cover.classList.add('is-placeholder');
      cover.textContent = fallbackInitial;
    }

    const info = document.createElement('div');
    info.className = 'library-card__info';

    const title = document.createElement('p');
    title.className = 'library-card__title';
    title.textContent = track.title;

    const artist = document.createElement('p');
    artist.className = 'library-card__artist';
    artist.textContent = track.artist || 'Artista desconocido';

    info.appendChild(title);
    info.appendChild(artist);

    card.appendChild(cover);
    card.appendChild(info);

    card.addEventListener('click', () => {
      const index = state.tracks.findIndex((item) => item.id === track.id);
      if (index !== -1) {
        selectTrack(index);
      }
    });

    libraryGrid.appendChild(card);
  });
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  saveFavorites();
  renderTracks();
  renderLibrary();
  updateCounts();
  updateActiveItem();
}

function loadFavorites() {
  if (typeof localStorage === 'undefined') {
    return new Set();
  }
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return new Set(parsed);
    }
  } catch (error) {
    console.warn('No se pudo cargar favoritos', error);
  }
  return new Set();
}

function saveFavorites() {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(state.favorites)));
  } catch (error) {
    console.warn('No se pudo guardar favoritos', error);
  }
}

function updateCounts() {
  countAll.textContent = state.tracks.length.toString();
  countFavorites.textContent = state.favorites.size.toString();
}

function updateFiltersUI() {
  const isFavorites = state.libraryFilter === 'favorites';
  filterAllBtn.classList.toggle('is-active', !isFavorites);
  filterFavoritesBtn.classList.toggle('is-active', isFavorites);
  filterAllBtn.setAttribute('aria-selected', (!isFavorites).toString());
  filterFavoritesBtn.setAttribute('aria-selected', isFavorites.toString());
}

function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || 'Artista desconocido',
      album: 'WaveRoom',
      artwork: getMediaSessionArtwork(track),
    });
  } catch (error) {
    console.warn('No se pudo actualizar la metadata de reproducción', error);
  }
  updatePlaybackState();
  syncMediaSessionPosition();
}

function updatePlaybackState() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
  } catch (error) {
    console.warn('No se pudo actualizar el estado de reproducción', error);
  }
}

function syncMediaSessionPosition() {
  if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') {
    return;
  }

  try {
    navigator.mediaSession.setPositionState({
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      playbackRate: audio.playbackRate,
      position: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    });
  } catch (error) {
    // Algunos navegadores no permiten esta operación cuando no hay datos cargados.
  }
}

function getTrackInitial(track) {
  const source = track?.title || track?.artist || track?.file || '♪';
  return source.trim().charAt(0).toUpperCase();
}

function getMediaSessionArtwork(track) {
  if (!track.cover) return [];

  const match = track.cover.match(/^data:(.*?);/);
  const type = match ? match[1] : 'image/png';

  return [
    { src: track.cover, sizes: '256x256', type },
    { src: track.cover, sizes: '512x512', type },
  ];
}

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;

  const actions = [
    ['play', play],
    ['pause', pause],
    ['previoustrack', previousTrack],
    ['nexttrack', () => nextTrack(true)],
  ];

  actions.forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      // Algunos navegadores no soportan todas las acciones, se ignoran silenciosamente.
    }
  });
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

playPauseBtn.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', () => nextTrack(true));
prevBtn.addEventListener('click', previousTrack);
shuffleBtn.addEventListener('click', toggleShuffle);
repeatBtn.addEventListener('click', toggleRepeat);
progressInput.addEventListener('input', seek);
volumeInput.addEventListener('input', (event) => {
  audio.volume = Number(event.target.value);
});
refreshBtn.addEventListener('click', () => fetchTracks(true));
filterAllBtn.addEventListener('click', () => {
  state.libraryFilter = 'all';
  updateFiltersUI();
  renderLibrary();
});
filterFavoritesBtn.addEventListener('click', () => {
  state.libraryFilter = 'favorites';
  updateFiltersUI();
  renderLibrary();
});

audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('loadedmetadata', updateProgress);
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

window.addEventListener('DOMContentLoaded', () => {
  fetchTracks(true);
  initSSE();
  updateFiltersUI();
  renderLibrary();
  setupMediaSession();
});
