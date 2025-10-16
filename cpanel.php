<?php
$scriptName = isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '';
$basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
if ($basePath === '.' || $basePath === '/') {
    $basePath = '';
}

require_once __DIR__ . '/lib/library.php';

$root = realpath(__DIR__);
$musicPath = $root ? $root . DIRECTORY_SEPARATOR . 'music' : null;
$messages = [];
$errors = [];

function waveroom_sanitize_segment(string $value): string
{
    $value = trim($value);
    $value = preg_replace('/[^\p{L}\p{N}\s._-]+/u', '', $value);
    return trim($value);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $musicPath) {
    $targetArtist = waveroom_sanitize_segment($_POST['artist'] ?? '');
    $targetAlbum = waveroom_sanitize_segment($_POST['album'] ?? '');

    $targetPath = $musicPath;
    if ($targetArtist !== '') {
        $targetPath .= DIRECTORY_SEPARATOR . $targetArtist;
    }
    if ($targetAlbum !== '') {
        $targetPath .= DIRECTORY_SEPARATOR . $targetAlbum;
    }

    if (!is_dir($targetPath) && !mkdir($targetPath, 0775, true)) {
        $errors[] = 'No se pudo crear la carpeta de destino.';
    }

    $allowedAudio = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg'];
    $allowedArt = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!empty($_FILES['tracks']['name'][0] ?? null)) {
        foreach ($_FILES['tracks']['name'] as $index => $name) {
            $tmpName = $_FILES['tracks']['tmp_name'][$index];
            if (!is_uploaded_file($tmpName)) {
                continue;
            }
            $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if (!in_array($extension, $allowedAudio, true)) {
                $errors[] = sprintf('El archivo %s no es un formato de audio permitido.', $name);
                continue;
            }
            $cleanName = waveroom_sanitize_segment(pathinfo($name, PATHINFO_FILENAME));
            $destination = $targetPath . DIRECTORY_SEPARATOR . $cleanName . '.' . $extension;
            if (!move_uploaded_file($tmpName, $destination)) {
                $errors[] = sprintf('No se pudo mover el archivo %s.', $name);
            }
        }
        if (empty($errors)) {
            $messages[] = 'Tus canciones se cargaron correctamente.';
        }
    }

    if (!empty($_FILES['artwork']['name'])) {
        $artTmp = $_FILES['artwork']['tmp_name'];
        if (is_uploaded_file($artTmp)) {
            $artExt = strtolower(pathinfo($_FILES['artwork']['name'], PATHINFO_EXTENSION));
            if (in_array($artExt, $allowedArt, true)) {
                $destination = $targetPath . DIRECTORY_SEPARATOR . 'cover.' . $artExt;
                if (move_uploaded_file($artTmp, $destination)) {
                    $messages[] = 'La portada se guardó correctamente.';
                } else {
                    $errors[] = 'No se pudo guardar la portada.';
                }
            } else {
                $errors[] = 'Formato de portada no permitido.';
            }
        }
    }
}

$library = ($musicPath && is_dir($musicPath)) ? waveroom_read_library($musicPath) : ['tracks' => [], 'collections' => ['albums' => [], 'artists' => []]];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <title>WaveRoom · CPanel</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="<?= $basePath ? $basePath . '/' : '' ?>assets/css/styles.css" />
</head>
<body class="cpanel-body">
    <div class="cpanel-shell">
        <header class="cpanel-header">
            <a class="text-button" href="<?= $basePath ? $basePath . '/' : '' ?>index.php">← Volver a WaveRoom</a>
            <h1>Panel Privado</h1>
            <p class="subtitle">Organiza tus pistas antes de publicar la experiencia.</p>
        </header>

        <?php if (!empty($messages)): ?>
            <div class="cpanel-alert success">
                <ul>
                    <?php foreach ($messages as $message): ?>
                        <li><?= htmlspecialchars($message) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <?php if (!empty($errors)): ?>
            <div class="cpanel-alert error">
                <ul>
                    <?php foreach ($errors as $error): ?>
                        <li><?= htmlspecialchars($error) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <section class="cpanel-card glass-panel">
            <h2>Subir nuevo contenido</h2>
            <form class="cpanel-form" method="post" enctype="multipart/form-data">
                <div class="field-group">
                    <label for="artist">Artista</label>
                    <input type="text" id="artist" name="artist" placeholder="Ej. The Weeknd" />
                </div>
                <div class="field-group">
                    <label for="album">Álbum o carpeta</label>
                    <input type="text" id="album" name="album" placeholder="Ej. After Hours" />
                </div>
                <div class="field-group">
                    <label for="tracks">Canciones (puedes seleccionar varias)</label>
                    <input type="file" id="tracks" name="tracks[]" accept="audio/*" multiple required />
                </div>
                <div class="field-group">
                    <label for="artwork">Portada opcional</label>
                    <input type="file" id="artwork" name="artwork" accept="image/*" />
                </div>
                <button type="submit" class="primary">Guardar en mi biblioteca</button>
            </form>
            <p class="help-text">Los archivos se guardan en la carpeta <code>music/</code> de tu hosting manteniendo la estructura Artista/Álbum.</p>
        </section>

        <section class="cpanel-preview">
            <h2>Vista previa de biblioteca</h2>
            <?php if (empty($library['tracks'])): ?>
                <p class="subtitle">Aún no has agregado canciones. Sube tus MP3 o WAV para comenzar.</p>
            <?php else: ?>
                <div class="preview-grid">
                    <?php foreach ($library['tracks'] as $track): ?>
                        <article class="preview-card glass-panel">
                            <img src="<?= htmlspecialchars($track['artwork']) ?>" alt="Carátula de <?= htmlspecialchars($track['title']) ?>" />
                            <div>
                                <h3><?= htmlspecialchars($track['title']) ?></h3>
                                <p><?= htmlspecialchars($track['artist']) ?> · <?= htmlspecialchars($track['album']) ?></p>
                            </div>
                        </article>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </section>
    </div>
</body>
</html>
