const basePath = (window.APP_CONFIG && window.APP_CONFIG.basePath) || '';
const initialLibrary = (window.APP_CONFIG && window.APP_CONFIG.initialLibrary) || null;
const withBase = (path) => {
    if (!path) return path;
    if (!basePath) return path;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return `${basePath}${path}`;
    return `${basePath}/${path}`;
};

const audio = document.getElementById('audio');
const trackList = document.getElementById('trackList');
const heroTrack = document.getElementById('heroTrack');
const heroArtist = document.getElementById('heroArtist');
const playHero = document.getElementById('playHero');
const libraryGroups = document.getElementById('libraryGroups');
const miniPlayer = document.getElementById('miniPlayer');
const miniArtwork = document.getElementById('miniArtwork');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const miniPlay = document.getElementById('miniPlay');
const miniExpand = document.getElementById('miniExpand');
const nowPlaying = document.getElementById('nowPlaying');
const fullArtwork = document.getElementById('fullArtwork');
const fullTitle = document.getElementById('fullTitle');
const fullArtist = document.getElementById('fullArtist');
const elapsed = document.getElementById('elapsed');
const durationEl = document.getElementById('duration');
const seek = document.getElementById('seek');
const btnPlay = document.getElementById('btnPlay');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnRepeat = document.getElementById('btnRepeat');
const btnShuffle = document.getElementById('btnShuffle');
const btnClose = document.getElementById('btnClose');
const toggleFavorite = document.getElementById('toggleFavorite');
const refreshLibrary = document.getElementById('refreshLibrary');
const openLibrary = document.getElementById('openLibrary');
const scrollRegion = document.getElementById('scrollRegion');

const chips = Array.from(document.querySelectorAll('.chip'));

const FAVORITES_KEY = 'waveroom:favorites:v3';
const LAST_TRACK_KEY = 'waveroom:lastTrack:v3';

const state = {
    tracks: [],
    collections: { albums: [], artists: [] },
    queue: [],
    currentIndex: -1,
    currentTrackId: null,
    favorites: new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')),
    repeat: 'off', // off | all | one
    shuffle: false,
    filter: 'todos'
};

let isInitialLoad = true;

function msToTime(ms) {
    if (!Number.isFinite(ms)) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function chooseArtwork(track) {
    const src = track && track.artwork ? withBase(track.artwork) : withBase('assets/img/default-cover.svg');
    return src;
}

function detectArtworkType(url) {
    const extension = (url.split('?')[0].split('.').pop() || '').toLowerCase();
    switch (extension) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'webp':
            return 'image/webp';
        case 'gif':
            return 'image/gif';
        case 'svg':
            return 'image/svg+xml';
        default:
            return 'image/png';
    }
}

function applyLibrary(payload, { fromInitial = false } = {}) {
    state.tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
    state.collections = payload.collections || { albums: [], artists: [] };
    buildQueue();
    renderLibrary();
    renderTracks();
    const restored = hydrateLastTrack();
    if (!restored) {
        if (state.queue.length > 0) {
            primeHeroWithTrack(state.queue[0]);
        } else {
            resetHero();
        }
    }
    if (!fromInitial) {
        highlightActiveTrack();
    }
}

async function loadLibrary(options = {}) {
    const { forceRemote = false } = options;
    if (isInitialLoad && initialLibrary && !forceRemote) {
        applyLibrary(initialLibrary, { fromInitial: true });
        isInitialLoad = false;
        return;
    }

    const response = await fetch(withBase(`api/tracks.php?ts=${Date.now()}`), { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('No se pudo cargar la biblioteca.');
    }
    const payload = await response.json();
    applyLibrary(payload);
    isInitialLoad = false;
}

function hydrateLastTrack() {
    const storedId = localStorage.getItem(LAST_TRACK_KEY);
    if (!storedId) return false;
    const index = state.queue.findIndex((track) => track.id === storedId);
    if (index !== -1) {
        state.currentIndex = index;
        updateNowPlaying(state.queue[index], { autoPlay: false, openOverlay: false });
        return true;
    }
    return false;
}

function buildQueue() {
    const tracks = [...state.tracks];
    if (state.filter === 'recientes') {
        tracks.sort((a, b) => b.updatedAt - a.updatedAt);
    } else if (state.filter === 'albumes') {
        tracks.sort((a, b) => a.album.localeCompare(b.album) || a.title.localeCompare(b.title));
    } else if (state.filter === 'artistas') {
        tracks.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
    } else {
        tracks.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (state.filter === 'favoritos') {
        state.queue = tracks.filter((track) => state.favorites.has(track.id));
    } else {
        state.queue = tracks;
    }
}

function renderLibrary() {
    libraryGroups.innerHTML = '';

    const hasAlbums = state.collections.albums && state.collections.albums.length > 0;
    const hasArtists = state.collections.artists && state.collections.artists.length > 0;

    if (!hasAlbums && !hasArtists) {
        const empty = document.createElement('div');
        empty.className = 'empty-state glass-panel';
        empty.innerHTML = `
            <h3>Sincroniza tu música</h3>
            <p>Sube tus MP3 o WAV al directorio <code>music</code> y recarga esta vista para escuchar.</p>
            <a class="pill-button" href="${withBase('cpanel.php')}">Abrir CPanel</a>
        `;
        libraryGroups.appendChild(empty);
        return;
    }

    if (hasAlbums) {
        const albumsSection = document.createElement('div');
        albumsSection.className = 'library-scroller glass-panel';
        const title = document.createElement('div');
        title.className = 'library-scroller__header';
        title.innerHTML = '<h3>Álbumes</h3>';
        albumsSection.appendChild(title);
        const row = document.createElement('div');
        row.className = 'library-scroller__row';
        state.collections.albums.forEach((album) => {
            const card = document.createElement('button');
            card.className = 'collection-card';
            card.innerHTML = `
                <img src="${chooseArtwork(album)}" alt="Carátula del álbum ${album.name}" loading="lazy" />
                <span class="collection-card__title">${album.name}</span>
                <span class="collection-card__subtitle">${album.artist} · ${album.trackCount} canciones</span>
            `;
            card.addEventListener('click', () => {
                state.filter = 'albumes';
                chips.forEach((chip) => chip.classList.toggle('is-active', chip.dataset.filter === 'albumes'));
                renderTracks({ focusAlbum: album.name });
            });
            row.appendChild(card);
        });
        albumsSection.appendChild(row);
        libraryGroups.appendChild(albumsSection);
    }

    if (hasArtists) {
        const artistsSection = document.createElement('div');
        artistsSection.className = 'library-scroller glass-panel';
        const title = document.createElement('div');
        title.className = 'library-scroller__header';
        title.innerHTML = '<h3>Artistas</h3>';
        artistsSection.appendChild(title);
        const row = document.createElement('div');
        row.className = 'library-scroller__row';
        state.collections.artists.forEach((artist) => {
            const card = document.createElement('button');
            card.className = 'collection-card';
            card.innerHTML = `
                <img src="${chooseArtwork(artist)}" alt="Retrato de ${artist.name}" loading="lazy" />
                <span class="collection-card__title">${artist.name}</span>
                <span class="collection-card__subtitle">${artist.trackCount} canciones</span>
            `;
            card.addEventListener('click', () => {
                state.filter = 'artistas';
                chips.forEach((chip) => chip.classList.toggle('is-active', chip.dataset.filter === 'artistas'));
                renderTracks({ focusArtist: artist.name });
            });
            row.appendChild(card);
        });
        artistsSection.appendChild(row);
        libraryGroups.appendChild(artistsSection);
    }
}

function renderTracks(options = {}) {
    buildQueue();
    alignCurrentIndex();
    trackList.innerHTML = '';

    const focusAlbum = options.focusAlbum || null;
    const focusArtist = options.focusArtist || null;

    const items = state.queue.filter((track) => {
        if (focusAlbum) return track.album === focusAlbum;
        if (focusArtist) return track.artist === focusArtist;
        return true;
    });

    if (items.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty-row';
        empty.textContent = 'No hay canciones para mostrar en este filtro.';
        trackList.appendChild(empty);
        return;
    }

    items.forEach((track) => {
        const isFav = state.favorites.has(track.id);
        const li = document.createElement('li');
        const card = document.createElement('article');
        card.className = `track-card${state.currentTrackId === track.id ? ' is-current' : ''}`;
        card.dataset.id = track.id;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.innerHTML = `
            <img src="${chooseArtwork(track)}" alt="Carátula de ${track.title}" loading="lazy" />
            <div class="track-meta">
                <p class="title">${track.title}</p>
                <p class="subtitle">${track.artist} · ${track.album}</p>
            </div>
            <div class="track-actions">
                <button class="icon-button favorite-button ${isFav ? 'is-active' : ''}" type="button" aria-label="Marcar como favorito">
                    <span class="icon">${isFav ? '♥' : '♡'}</span>
                </button>
            </div>
        `;

        card.addEventListener('click', (event) => {
            if (event.target.closest('.favorite-button')) return;
            playTrackById(track.id);
        });

        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                playTrackById(track.id);
            }
        });

        const favoriteButton = card.querySelector('.favorite-button');
        favoriteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleFavoriteForTrack(track.id, favoriteButton);
        });

        li.appendChild(card);
        trackList.appendChild(li);
    });

    highlightActiveTrack();
}

function alignCurrentIndex() {
    const targetId = state.currentTrackId || localStorage.getItem(LAST_TRACK_KEY);
    if (!targetId) return;
    const idx = state.queue.findIndex((track) => track.id === targetId);
    if (idx !== -1) {
        state.currentIndex = idx;
    } else if (state.queue.length > 0) {
        state.currentIndex = Math.min(state.currentIndex, state.queue.length - 1);
    } else {
        state.currentIndex = -1;
    }
}

function getTrackById(trackId) {
    return state.tracks.find((track) => track.id === trackId) || null;
}

function getCurrentTrack() {
    if (!state.currentTrackId) return null;
    return state.queue.find((track) => track.id === state.currentTrackId) || getTrackById(state.currentTrackId);
}

function toggleFavoriteForTrack(trackId, buttonEl) {
    if (state.favorites.has(trackId)) {
        state.favorites.delete(trackId);
    } else {
        state.favorites.add(trackId);
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(state.favorites)));
    if (buttonEl) {
        const isFav = state.favorites.has(trackId);
        buttonEl.classList.toggle('is-active', isFav);
        buttonEl.innerHTML = `<span class="icon">${isFav ? '♥' : '♡'}</span>`;
    }
    if (state.filter === 'favoritos') {
        renderTracks();
    }
    syncFavoriteButton();
}

function primeHeroWithTrack(track) {
    if (!track) return;
    heroTrack.textContent = track.title;
    heroArtist.textContent = `${track.artist} · ${track.album}`;
    playHero.disabled = false;
    playHero.dataset.trackId = track.id;
}

function resetHero() {
    heroTrack.textContent = 'Selecciona una canción';
    heroArtist.textContent = 'Elige un track de tu biblioteca para comenzar.';
    playHero.disabled = true;
    delete playHero.dataset.trackId;
}

function highlightActiveTrack() {
    const cards = trackList.querySelectorAll('.track-card');
    cards.forEach((card) => {
        card.classList.toggle('is-current', card.dataset.id === state.currentTrackId);
    });
}

function playTrackById(trackId, { autoOpen = true } = {}) {
    const index = state.queue.findIndex((track) => track.id === trackId);
    if (index === -1) {
        const fallback = getTrackById(trackId);
        if (fallback) {
            if (state.filter !== 'todos') {
                state.filter = 'todos';
                chips.forEach((chip) => chip.classList.toggle('is-active', chip.dataset.filter === 'todos'));
                renderTracks();
            }
            const refreshedIndex = state.queue.findIndex((track) => track.id === trackId);
            if (refreshedIndex !== -1) {
                state.currentIndex = refreshedIndex;
                updateNowPlaying(state.queue[refreshedIndex], { autoPlay: true, openOverlay: autoOpen });
            } else {
                updateNowPlaying(fallback, { autoPlay: true, openOverlay: autoOpen });
            }
        }
        return;
    }
    state.currentIndex = index;
    updateNowPlaying(state.queue[index], { autoPlay: true, openOverlay: autoOpen });
}

function updateNowPlaying(track, { autoPlay = true, openOverlay = true } = {}) {
    if (!track) return;

    state.currentTrackId = track.id;
    localStorage.setItem(LAST_TRACK_KEY, track.id);

    heroTrack.textContent = track.title;
    heroArtist.textContent = `${track.artist} · ${track.album}`;
    playHero.disabled = false;
    playHero.dataset.trackId = track.id;

    const artworkSrc = chooseArtwork(track);
    miniArtwork.src = artworkSrc;
    fullArtwork.src = artworkSrc;
    miniTitle.textContent = track.title;
    miniArtist.textContent = track.artist;
    fullTitle.textContent = track.title;
    fullArtist.textContent = track.artist;

    seek.value = 0;
    elapsed.textContent = '0:00';
    durationEl.textContent = '0:00';

    audio.src = withBase(track.src);
    audio.load();

    if (autoPlay) {
        audio.play().catch(() => {
            // Autoplay bloqueado, mantener mini-player visible
        });
    }

    if (openOverlay) {
        showNowPlaying();
    } else {
        revealMiniPlayer();
    }

    updateMediaSession(track);
    syncFavoriteButton();
    highlightActiveTrack();
}

function showNowPlaying() {
    nowPlaying.hidden = false;
    revealMiniPlayer();
}

function hideNowPlaying() {
    nowPlaying.hidden = true;
}

function revealMiniPlayer() {
    miniPlayer.hidden = false;
}

function formatRepeatIcon() {
    if (state.repeat === 'one') return '🔂';
    if (state.repeat === 'all') return '🔁';
    return '↻';
}

function syncFavoriteButton() {
    const current = getCurrentTrack();
    if (!current) {
        toggleFavorite.classList.remove('is-active');
        toggleFavorite.innerHTML = '<span class="icon">♡</span>';
        return;
    }
    const isFav = state.favorites.has(current.id);
    toggleFavorite.classList.toggle('is-active', isFav);
    toggleFavorite.innerHTML = `<span class="icon">${isFav ? '♥' : '♡'}</span>`;

    const trackCard = trackList.querySelector(`.track-card[data-id="${current.id}"] .favorite-button`);
    if (trackCard) {
        trackCard.classList.toggle('is-active', isFav);
        trackCard.innerHTML = `<span class="icon">${isFav ? '♥' : '♡'}</span>`;
    }
}

function nextTrack({ manual = false } = {}) {
    if (state.queue.length === 0) {
        return;
    }
    if (state.repeat === 'one' && !manual) {
        audio.currentTime = 0;
        audio.play();
        return;
    }

    let nextIndex;
    if (state.shuffle) {
        const pool = state.queue.filter((_, idx) => idx !== state.currentIndex);
        if (pool.length === 0) {
            nextIndex = state.currentIndex;
        } else {
            const randomTrack = pool[Math.floor(Math.random() * pool.length)];
            nextIndex = state.queue.findIndex((item) => item.id === randomTrack.id);
        }
    } else {
        nextIndex = state.currentIndex + 1;
    }

    if (nextIndex >= state.queue.length) {
        if (state.repeat === 'all') {
            nextIndex = 0;
        } else {
            audio.pause();
            return;
        }
    }

    state.currentIndex = nextIndex;
    const nextTrackItem = state.queue[state.currentIndex];
    if (nextTrackItem) {
        updateNowPlaying(nextTrackItem, { autoPlay: true, openOverlay: false });
    }
}

function previousTrack() {
    if (state.queue.length === 0) {
        return;
    }
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    let prevIndex = state.currentIndex - 1;
    if (prevIndex < 0) {
        prevIndex = state.repeat === 'all' ? state.queue.length - 1 : 0;
    }
    state.currentIndex = prevIndex;
    const prevTrackItem = state.queue[state.currentIndex];
    if (prevTrackItem) {
        updateNowPlaying(prevTrackItem, { autoPlay: true, openOverlay: false });
    }
}

function updateMediaSession(track) {
    if (!('mediaSession' in navigator) || !track) {
        return;
    }

    let artworkUrl = chooseArtwork(track);
    try {
        artworkUrl = new URL(artworkUrl, window.location.href).toString();
    } catch (error) {
        // ignore
    }

    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [
            { src: artworkUrl, sizes: '300x300', type: detectArtworkType(artworkUrl) }
        ]
    });

    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', previousTrack);
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack({ manual: true }));
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in audio) {
            audio.fastSeek(details.seekTime);
        } else {
            audio.currentTime = details.seekTime;
        }
    });
}

function updatePlaybackUI() {
    const isPlaying = !audio.paused;
    btnPlay.innerHTML = `<span class="icon">${isPlaying ? '⏸' : '▶'}</span>`;
    miniPlay.innerHTML = `<span class="icon">${isPlaying ? '⏸' : '▶'}</span>`;
}

audio.addEventListener('play', updatePlaybackUI);
audio.addEventListener('pause', updatePlaybackUI);
audio.addEventListener('timeupdate', () => {
    const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    seek.value = progress || 0;
    elapsed.textContent = msToTime(audio.currentTime * 1000);
    durationEl.textContent = msToTime(audio.duration * 1000 || 0);
});

audio.addEventListener('ended', () => {
    nextTrack();
});

audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = msToTime(audio.duration * 1000);
});

seek.addEventListener('input', (event) => {
    if (!audio.duration) return;
    const pct = event.target.value / 100;
    audio.currentTime = audio.duration * pct;
});

btnPlay.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
});

miniPlay.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
});

miniExpand.addEventListener('click', showNowPlaying);
btnClose.addEventListener('click', hideNowPlaying);
playHero.addEventListener('click', () => {
    const targetId = playHero.dataset.trackId;
    if (targetId) {
        playTrackById(targetId);
        return;
    }
    const current = getCurrentTrack();
    if (current) {
        showNowPlaying();
        audio.play().catch(() => {});
    } else if (state.queue[0]) {
        state.currentIndex = 0;
        updateNowPlaying(state.queue[0], { autoPlay: true, openOverlay: true });
    } else if (state.tracks[0]) {
        updateNowPlaying(state.tracks[0], { autoPlay: true, openOverlay: true });
    }
});

btnNext.addEventListener('click', () => nextTrack({ manual: true }));
btnPrev.addEventListener('click', previousTrack);

btnRepeat.addEventListener('click', () => {
    if (state.repeat === 'off') {
        state.repeat = 'all';
    } else if (state.repeat === 'all') {
        state.repeat = 'one';
    } else {
        state.repeat = 'off';
    }
    btnRepeat.classList.toggle('is-active', state.repeat !== 'off');
    btnRepeat.innerHTML = `<span class="icon">${formatRepeatIcon()}</span>`;
});

btnShuffle.addEventListener('click', () => {
    state.shuffle = !state.shuffle;
    btnShuffle.classList.toggle('is-active', state.shuffle);
});

btnShuffle.classList.toggle('is-active', state.shuffle);
btnRepeat.innerHTML = `<span class="icon">${formatRepeatIcon()}</span>`;

chips.forEach((chip) => {
    chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        state.filter = chip.dataset.filter;
        renderTracks();
    });
});

toggleFavorite.addEventListener('click', () => {
    const current = getCurrentTrack();
    if (!current) return;
    toggleFavoriteForTrack(current.id);
});

refreshLibrary.addEventListener('click', () => {
    loadLibrary({ forceRemote: true }).catch((error) => {
        console.error(error);
    });
});

openLibrary.addEventListener('click', () => {
    const librarySection = document.querySelector('.library');
    if (librarySection) {
        librarySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

miniPlayer.addEventListener('click', (event) => {
    if (event.target === miniPlay || miniPlay.contains(event.target)) return;
    if (event.target === miniExpand || miniExpand.contains(event.target)) return;
    showNowPlaying();
});

if ('mediaSession' in navigator) {
    document.addEventListener('visibilitychange', () => {
        const current = getCurrentTrack();
        if (!document.hidden && current) {
            updateMediaSession(current);
        }
    });
}

window.addEventListener('pageshow', () => {
    const current = getCurrentTrack();
    if (current) {
        updateMediaSession(current);
    }
});

loadLibrary().catch((error) => {
    console.error(error);
    trackList.innerHTML = `<li class="empty-row">${error.message}</li>`;
});
