<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../lib/library.php';

$root = realpath(__DIR__ . '/..');
$musicPath = $root ? $root . DIRECTORY_SEPARATOR . 'music' : null;

if (!$musicPath || !is_dir($musicPath)) {
    echo json_encode([
        'generatedAt' => gmdate('c'),
        'tracks' => [],
        'collections' => [
            'albums' => [],
            'artists' => []
        ]
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$library = waveroom_read_library($musicPath);

echo json_encode([
    'generatedAt' => gmdate('c'),
    'tracks' => $library['tracks'],
    'collections' => $library['collections']
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
