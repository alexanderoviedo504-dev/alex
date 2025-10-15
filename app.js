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

const MUSIC_PATH = '/music/';

const state = {
  tracks: [],
  currentIndex: -1,
  isPlaying: false,
  isShuffle: false,
  isRepeat: false,
  history: [],
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

    if (state.tracks.length === 0) {
      renderTracks();
      stopPlayback();
      return;
    }

    const preservedIndex = previousId
      ? state.tracks.findIndex((track) => track.id === previousId)
      : -1;

    if (preservedIndex !== -1) {
      state.currentIndex = preservedIndex;
      renderTracks();
      updateActiveItem();
      if (wasPlaying) {
        play();
      }
    } else {
      renderTracks();
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

    li.appendChild(indexEl);
    li.appendChild(meta);
    li.appendChild(duration);

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
    })
    .catch((error) => console.error('No se pudo reproducir el audio:', error));
}

function pause() {
  audio.pause();
  state.isPlaying = false;
  playPauseBtn.textContent = '▶';
  playPauseBtn.setAttribute('aria-label', 'Reproducir');
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

audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('loadedmetadata', updateProgress);
audio.addEventListener('ended', handleEnded);
audio.addEventListener('play', () => {
  state.isPlaying = true;
  playPauseBtn.textContent = '❚❚';
  playPauseBtn.setAttribute('aria-label', 'Pausar');
});
audio.addEventListener('pause', () => {
  state.isPlaying = false;
  playPauseBtn.textContent = '▶';
  playPauseBtn.setAttribute('aria-label', 'Reproducir');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.isPlaying) {
    audio.volume = Math.min(audio.volume, 0.6);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  fetchTracks(true);
  initSSE();
});
