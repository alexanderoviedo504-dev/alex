const audio = document.getElementById('audio');
const trackListEl = document.getElementById('trackList');
const emptyStateEl = document.getElementById('emptyState');
const nowPlayingTitle = document.getElementById('nowPlaying');
const nowPlayingArtist = document.getElementById('nowPlayingArtist');
const coverImg = document.getElementById('cover');
const favoriteNowBtn = document.getElementById('favoriteNow');
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
const totalTracksEl = document.getElementById('totalTracks');
const favoriteTracksEl = document.getElementById('favoriteTracks');
const coverStripEl = document.getElementById('coverStrip');
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));

const MUSIC_PATH = '/music/';
const FAVORITES_KEY = 'waveroom:favorites';

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed);
    }
  } catch (error) {
    console.warn('No se pudieron cargar los favoritos:', error);
  }
  return new Set();
}

const state = {
  tracks: [],
  currentIndex: -1,
  isPlaying: false,
  isShuffle: false,
  isRepeat: false,
  history: [],
  favorites: loadFavorites(),
  filter: 'all',
  wasPlayingBeforeHide: false,
  shouldResumeOnFocus: false,
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
      addedAt: Number(track.addedAt || Date.now()),
      url: `${MUSIC_PATH}${encodeURIComponent(track.file)}`,
    }));

    cleanupFavorites();

    if (state.tracks.length === 0) {
      renderTracks();
      updateLibrarySummary();
      updateCoverStrip();
      updateFavoriteNowButton();
      stopPlayback();
      return;
    }

    const preservedIndex = previousId
      ? state.tracks.findIndex((track) => track.id === previousId)
      : -1;

    if (preservedIndex !== -1) {
      state.currentIndex = preservedIndex;
      renderTracks();
      updateLibrarySummary();
      updateCoverStrip();
      updateFavoriteNowButton();
      updateActiveItem();
      if (wasPlaying) {
        play();
      }
    } else {
      renderTracks();
      updateLibrarySummary();
      updateCoverStrip();
      selectTrack(0, wasPlaying);
    }
  } catch (error) {
    console.error(error);
  } finally {
    trackListEl.classList.remove('is-loading');
    toggleEmptyState(getFilteredTracks());
  }
}

function renderTracks() {
  trackListEl.innerHTML = '';

  const filteredTracks = getFilteredTracks();

  filteredTracks.forEach((track) => {
    const actualIndex = state.tracks.findIndex((item) => item.id === track.id);
    if (actualIndex === -1) {
      return;
    }
    const li = document.createElement('li');
    li.className = 'playlist__item';
    li.dataset.index = actualIndex;
    li.dataset.id = track.id;

    if (state.favorites.has(track.id)) {
      li.classList.add('is-favorite');
    }

    const cover = document.createElement('div');
    cover.className = 'playlist__cover';
    if (track.cover) {
      const img = document.createElement('img');
      img.src = track.cover;
      img.alt = `Carátula de ${track.title}`;
      cover.appendChild(img);
    } else {
      const placeholder = document.createElement('span');
      placeholder.textContent = (track.title?.[0] || '?').toUpperCase();
      cover.appendChild(placeholder);
    }

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
    favoriteBtn.className = 'favorite-toggle';
    favoriteBtn.type = 'button';
    favoriteBtn.setAttribute('aria-label', 'Alternar favorito');
    favoriteBtn.dataset.id = track.id;
    const isFavorite = state.favorites.has(track.id);
    updateFavoriteButtonAppearance(favoriteBtn, isFavorite);

    favoriteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFavorite(track.id);
    });

    li.appendChild(cover);
    li.appendChild(meta);
    li.appendChild(duration);
    li.appendChild(favoriteBtn);

    li.addEventListener('click', (event) => {
      if (event.target.closest('.favorite-toggle')) return;
      selectTrack(actualIndex);
    });

    trackListEl.appendChild(li);
  });

  updateActiveItem();
  toggleEmptyState(filteredTracks);
}

function toggleEmptyState(filteredTracks) {
  if (state.tracks.length === 0) {
    emptyStateEl.hidden = false;
    emptyStateEl.innerHTML =
      'Aún no hay canciones. Copia archivos de audio en <code>music</code> o súbelos a <code>POST /upload</code> y se mostrarán aquí automáticamente.';
    trackListEl.hidden = true;
    return;
  }

  if (filteredTracks.length === 0) {
    let message = 'No encontramos canciones con este filtro.';
    if (state.filter === 'favorites') {
      message =
        'Aún no has marcado favoritos. Toca el corazón en cualquier canción para guardarla en tu lista.';
    } else if (state.filter === 'recent') {
      message = 'Tus canciones más recientes aparecerán aquí en cuanto subas nuevos archivos.';
    }
    emptyStateEl.hidden = false;
    emptyStateEl.textContent = message;
    trackListEl.hidden = false;
    return;
  }

  emptyStateEl.hidden = true;
  trackListEl.hidden = false;
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
  updateFavoriteNowButton();
  updateMediaSession(track);
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
  const currentTrack = state.tracks[state.currentIndex];
  Array.from(trackListEl.children).forEach((item) => {
    const isCurrent = currentTrack && item.dataset.id === currentTrack.id;
    item.classList.toggle('is-active', isCurrent);
    item.classList.toggle('is-favorite', state.favorites.has(item.dataset.id));
    const favoriteButton = item.querySelector('.favorite-toggle');
    if (favoriteButton) {
      const isFavorite = state.favorites.has(item.dataset.id);
      updateFavoriteButtonAppearance(favoriteButton, isFavorite);
    }
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
      updateMediaSessionPlaybackState('playing');
    })
    .catch((error) => console.error('No se pudo reproducir el audio:', error));
}

function pause() {
  audio.pause();
  state.isPlaying = false;
  playPauseBtn.textContent = '▶';
  playPauseBtn.setAttribute('aria-label', 'Reproducir');
  updateMediaSessionPlaybackState('paused');
}

function stopPlayback() {
  pause();
  audio.removeAttribute('src');
  nowPlayingTitle.textContent = 'Selecciona un tema';
  nowPlayingArtist.innerHTML =
    'Añade archivos de audio en la carpeta <code>music</code> o súbelos a <code>POST /upload</code>';
  coverImg.removeAttribute('src');
  coverImg.classList.remove('is-visible');
  resetProgress();
  state.currentIndex = -1;
  updateFavoriteNowButton();
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
}

function seek(event) {
  if (!audio.duration) return;
  const value = Number(event.target.value);
  audio.currentTime = (value / 100) * audio.duration;
  if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    } catch (error) {
      // noop
    }
  }
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

function getFilteredTracks() {
  if (state.filter === 'favorites') {
    return state.tracks.filter((track) => state.favorites.has(track.id));
  }

  if (state.filter === 'recent') {
    return state.tracks
      .slice()
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }

  return state.tracks.slice();
}

function toggleFavorite(trackId) {
  if (!trackId) return;

  if (state.favorites.has(trackId)) {
    state.favorites.delete(trackId);
  } else {
    state.favorites.add(trackId);
  }

  persistFavorites();
  renderTracks();
  updateLibrarySummary();
  updateCoverStrip();
  updateFavoriteNowButton();
}

function updateFavoriteNowButton() {
  const track = state.tracks[state.currentIndex];
  if (!track) {
    favoriteNowBtn.disabled = true;
    favoriteNowBtn.setAttribute('aria-pressed', 'false');
    favoriteNowBtn.textContent = '♡';
    favoriteNowBtn.classList.remove('is-active');
    return;
  }

  favoriteNowBtn.disabled = false;
  const isFavorite = state.favorites.has(track.id);
  favoriteNowBtn.setAttribute('aria-pressed', String(isFavorite));
  favoriteNowBtn.textContent = isFavorite ? '♥' : '♡';
  favoriteNowBtn.classList.toggle('is-active', isFavorite);
}

function updateFavoriteButtonAppearance(button, isFavorite) {
  button.setAttribute('aria-pressed', String(isFavorite));
  button.textContent = isFavorite ? '♥' : '♡';
  button.classList.toggle('is-active', isFavorite);
}

function persistFavorites() {
  const ids = Array.from(state.favorites);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  favoriteTracksEl.textContent = formatCount(
    ids.filter((id) => state.tracks.some((track) => track.id === id)).length,
    'favorito',
    'favoritos'
  );
}

function cleanupFavorites() {
  let updated = false;
  for (const id of Array.from(state.favorites)) {
    if (!state.tracks.some((track) => track.id === id)) {
      state.favorites.delete(id);
      updated = true;
    }
  }
  if (updated) {
    persistFavorites();
  }
}

function updateLibrarySummary() {
  totalTracksEl.textContent = formatCount(state.tracks.length, 'canción', 'canciones');
  const favoriteIds = Array.from(state.favorites).filter((id) =>
    state.tracks.some((track) => track.id === id)
  );
  favoriteTracksEl.textContent = formatCount(favoriteIds.length, 'favorito', 'favoritos');
  if (!favoriteIds.length) {
    favoriteTracksEl.classList.add('is-muted');
  } else {
    favoriteTracksEl.classList.remove('is-muted');
  }
}

function updateCoverStrip() {
  if (!coverStripEl) return;
  coverStripEl.innerHTML = '';

  if (state.tracks.length === 0) {
    coverStripEl.hidden = true;
    return;
  }

  const previewTracks = state.tracks
    .slice()
    .sort((a, b) => {
      const favDiff = Number(state.favorites.has(b.id)) - Number(state.favorites.has(a.id));
      if (favDiff !== 0) return favDiff;
      return (b.addedAt || 0) - (a.addedAt || 0);
    })
    .slice(0, 6);

  if (previewTracks.length === 0) {
    coverStripEl.hidden = true;
    return;
  }

  previewTracks.forEach((track) => {
    const card = document.createElement('div');
    card.className = 'library__cover';
    if (state.favorites.has(track.id)) {
      card.classList.add('is-favorite');
    }

    if (track.cover) {
      const img = document.createElement('img');
      img.src = track.cover;
      img.alt = `Carátula de ${track.title}`;
      card.appendChild(img);
    } else {
      const badge = document.createElement('span');
      badge.textContent = (track.title?.[0] || '?').toUpperCase();
      card.appendChild(badge);
    }

    coverStripEl.appendChild(card);
  });

  coverStripEl.hidden = false;
}

function formatCount(value, singular, plural) {
  const noun = value === 1 ? singular : plural;
  return `${value} ${noun}`;
}

function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;

  try {
    const artwork = track.cover
      ? [
          {
            src: track.cover,
            sizes: '512x512',
          },
        ]
      : undefined;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || 'Artista desconocido',
      album: 'WaveRoom',
      artwork,
    });

    if (navigator.mediaSession.setPositionState && audio.duration) {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    }
  } catch (error) {
    console.warn('No se pudo actualizar Media Session:', error);
  }
}

function updateMediaSessionPlaybackState(stateName) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = stateName;
  } catch (error) {
    // noop
  }
}

function initMediaSession() {
  if (!('mediaSession' in navigator)) return;

  const handlers = {
    play,
    pause,
    previoustrack: previousTrack,
    nexttrack: () => nextTrack(true),
    seekbackward: (event) => {
      const offset = event.seekOffset || 10;
      audio.currentTime = Math.max(0, audio.currentTime - offset);
    },
    seekforward: (event) => {
      const offset = event.seekOffset || 10;
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + offset);
    },
    seekto: (event) => {
      if (typeof event.seekTime === 'number') {
        audio.currentTime = event.seekTime;
      }
    },
  };

  Object.entries(handlers).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      // Algunos navegadores no soportan todas las acciones
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
favoriteNowBtn.addEventListener('click', () => {
  const track = state.tracks[state.currentIndex];
  if (!track) return;
  toggleFavorite(track.id);
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedFilter = button.dataset.filter;
    if (!selectedFilter || selectedFilter === state.filter) return;

    state.filter = selectedFilter;
    filterButtons.forEach((btn) => {
      const isActive = btn === button;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    renderTracks();
    updateLibrarySummary();
    updateCoverStrip();
  });
});

audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('loadedmetadata', updateProgress);
audio.addEventListener('ended', handleEnded);
audio.addEventListener('play', () => {
  state.isPlaying = true;
  playPauseBtn.textContent = '❚❚';
  playPauseBtn.setAttribute('aria-label', 'Pausar');
  state.shouldResumeOnFocus = false;
  updateMediaSessionPlaybackState('playing');
});
audio.addEventListener('pause', () => {
  const autoPausedWhileHidden = document.hidden && state.wasPlayingBeforeHide;
  state.isPlaying = false;
  playPauseBtn.textContent = '▶';
  playPauseBtn.setAttribute('aria-label', 'Reproducir');
  updateMediaSessionPlaybackState('paused');
  if (autoPausedWhileHidden) {
    state.shouldResumeOnFocus = true;
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    state.wasPlayingBeforeHide = state.isPlaying;
    if (state.isPlaying) {
      audio.play().catch(() => {});
    }
  } else if (state.shouldResumeOnFocus) {
    play();
    state.shouldResumeOnFocus = false;
  }
});

window.addEventListener('DOMContentLoaded', () => {
  fetchTracks(true);
  initSSE();
  initMediaSession();
  updateLibrarySummary();
  updateCoverStrip();
  updateFavoriteNowButton();
});
