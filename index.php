<?php
require_once __DIR__ . '/lib/library.php';

$scriptName = isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '';
$basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
if ($basePath === '.' || $basePath === '/') {
    $basePath = '';
}

$root = realpath(__DIR__);
$musicPath = $root ? $root . DIRECTORY_SEPARATOR . 'music' : null;
$initialLibrary = [
    'tracks' => [],
    'collections' => [
        'albums' => [],
        'artists' => []
    ]
];

if ($musicPath && is_dir($musicPath)) {
    $initialLibrary = waveroom_read_library($musicPath);
}

$hasTracks = !empty($initialLibrary['tracks']);
$heroTrackName = $hasTracks ? $initialLibrary['tracks'][0]['title'] : 'Selecciona una canción';
$heroArtistName = $hasTracks
    ? $initialLibrary['tracks'][0]['artist'] . ' · ' . $initialLibrary['tracks'][0]['album']
    : 'Elige un track de tu biblioteca para comenzar.';
$heroTrackId = $hasTracks ? $initialLibrary['tracks'][0]['id'] : '';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <title>WaveRoom · Tu música</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="<?= $basePath ? $basePath . '/' : '' ?>assets/css/styles.css" />
</head>
<body>
    <div id="app" class="app-shell">
        <header class="app-header">
            <div class="brand">
                <span class="brand-mark"></span>
                <div class="brand-copy">
                    <p class="eyebrow">Tu sala de audio</p>
                    <h1>WaveRoom</h1>
                </div>
            </div>
            <button class="pill-button" id="openLibrary">Biblioteca</button>
        </header>
        <main class="app-main" id="scrollRegion">
            <section class="hero-card glass-panel">
                <div>
                    <p class="eyebrow">Continúa escuchando</p>
                    <h2 id="heroTrack"><?= htmlspecialchars($heroTrackName, ENT_QUOTES, 'UTF-8') ?></h2>
                    <p id="heroArtist" class="subdued"><?= htmlspecialchars($heroArtistName, ENT_QUOTES, 'UTF-8') ?></p>
                </div>
                <button class="primary" id="playHero" <?= $hasTracks ? '' : 'disabled' ?> data-track-id="<?= htmlspecialchars($heroTrackId, ENT_QUOTES, 'UTF-8') ?>">Reproducir</button>
            </section>

            <section class="filters" aria-label="Colecciones">
                <button class="chip is-active" data-filter="todos">Todos</button>
                <button class="chip" data-filter="favoritos">Favoritos</button>
                <button class="chip" data-filter="albumes">Álbumes</button>
                <button class="chip" data-filter="artistas">Artistas</button>
                <button class="chip" data-filter="recientes">Recientes</button>
            </section>

            <section class="library" aria-live="polite">
                <h2>Biblioteca</h2>
                <div class="library-groups" id="libraryGroups">
                    <div class="empty-state glass-panel">
                        <h3>Sincroniza tu música</h3>
                        <p>Sube tus MP3 o WAV al directorio <code>music</code> en tu hosting. WaveRoom los detectará automáticamente.</p>
                        <a class="pill-button" href="<?= $basePath ? $basePath . '/' : '' ?>cpanel.php">Abrir CPanel</a>
                    </div>
                </div>
            </section>

            <section class="tracks" aria-label="Lista de canciones">
                <div class="section-header">
                    <h2>Canciones</h2>
                    <button class="text-button" id="refreshLibrary">Actualizar</button>
                </div>
                <ul class="track-list" id="trackList" aria-live="polite">
                    <?php if ($hasTracks): ?>
                        <?php foreach ($initialLibrary['tracks'] as $track): ?>
                            <li>
                                <article class="track-card" role="button" tabindex="0" aria-label="Reproducir <?= htmlspecialchars($track['title'], ENT_QUOTES, 'UTF-8') ?>" data-id="<?= htmlspecialchars($track['id'], ENT_QUOTES, 'UTF-8') ?>">
                                    <img src="<?= htmlspecialchars($track['artwork'], ENT_QUOTES, 'UTF-8') ?>" alt="Carátula de <?= htmlspecialchars($track['title'], ENT_QUOTES, 'UTF-8') ?>" loading="lazy" />
                                    <div class="track-meta">
                                        <p class="title"><?= htmlspecialchars($track['title'], ENT_QUOTES, 'UTF-8') ?></p>
                                        <p class="subtitle"><?= htmlspecialchars($track['artist'] . ' · ' . $track['album'], ENT_QUOTES, 'UTF-8') ?></p>
                                    </div>
                                    <div class="track-actions">
                                        <button class="icon-button favorite-button" type="button" aria-label="Marcar como favorito">
                                            <span class="icon">♡</span>
                                        </button>
                                    </div>
                                </article>
                            </li>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </ul>
            </section>
        </main>

        <aside class="mini-player glass-panel" id="miniPlayer" hidden>
            <div class="mini-info">
                <img id="miniArtwork" alt="Carátula" />
                <div>
                    <p id="miniTitle" class="title"></p>
                    <p id="miniArtist" class="subtitle"></p>
                </div>
            </div>
            <div class="mini-actions">
                <button id="miniPlay" aria-label="Reproducir" class="icon-button">
                    <span class="icon">⏯</span>
                </button>
                <button id="miniExpand" aria-label="Mostrar en pantalla completa" class="icon-button">
                    <span class="icon">⤢</span>
                </button>
            </div>
        </aside>

        <div class="now-playing" id="nowPlaying" hidden>
            <div class="now-playing__artwork">
                <img id="fullArtwork" alt="Carátula del álbum" />
            </div>
            <div class="now-playing__meta">
                <h2 id="fullTitle"></h2>
                <p id="fullArtist"></p>
            </div>
            <div class="now-playing__controls">
                <div class="time-row">
                    <span id="elapsed">0:00</span>
                    <span id="duration">0:00</span>
                </div>
                <input type="range" id="seek" min="0" max="100" value="0" aria-label="Progreso de reproducción" />
                <div class="control-row">
                    <button id="toggleFavorite" class="icon-button" aria-label="Favorito">
                        <span class="icon">♡</span>
                    </button>
                    <button id="btnPrev" class="icon-button" aria-label="Anterior">
                        <span class="icon">⏮</span>
                    </button>
                    <button id="btnPlay" class="play-pause" aria-label="Reproducir">
                        <span class="icon">▶</span>
                    </button>
                    <button id="btnNext" class="icon-button" aria-label="Siguiente">
                        <span class="icon">⏭</span>
                    </button>
                    <button id="btnRepeat" class="icon-button" aria-label="Repetir">
                        <span class="icon">🔁</span>
                    </button>
                </div>
                <div class="control-row secondary">
                    <button id="btnShuffle" class="icon-button" aria-label="Aleatorio">
                        <span class="icon">🔀</span>
                    </button>
                    <button id="btnClose" class="icon-button" aria-label="Cerrar pantalla completa">
                        <span class="icon">✕</span>
                    </button>
                </div>
            </div>
        </div>

        <audio id="audio" preload="metadata" crossorigin="anonymous"></audio>
    </div>

    <script>
        window.APP_CONFIG = {
            basePath: <?= json_encode($basePath, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>,
            initialLibrary: <?= json_encode($initialLibrary, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>
        };
    </script>
    <script src="<?= $basePath ? $basePath . '/' : '' ?>assets/js/app.js" type="module"></script>
</body>
</html>
