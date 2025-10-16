<?php

declare(strict_types=1);

function waveroom_humanize(string $value): string
{
    $value = preg_replace('/[_-]+/', ' ', $value);
    $value = preg_replace('/\s+/', ' ', $value);
    $value = trim($value);
    if ($value === '') {
        return '';
    }
    $lower = mb_strtolower($value, 'UTF-8');
    return mb_convert_case($lower, MB_CASE_TITLE, 'UTF-8');
}

function waveroom_find_artwork(string $directory, string $baseName, array $artExtensions): ?string
{
    foreach ($artExtensions as $ext) {
        $candidate = $directory . DIRECTORY_SEPARATOR . $baseName . '.' . $ext;
        if (is_file($candidate)) {
            return $candidate;
        }
    }

    $fallbacks = ['cover', 'folder', 'front', 'artwork'];
    foreach ($fallbacks as $name) {
        foreach ($artExtensions as $ext) {
            $candidate = $directory . DIRECTORY_SEPARATOR . $name . '.' . $ext;
            if (is_file($candidate)) {
                return $candidate;
            }
        }
    }

    return null;
}

function waveroom_read_library(string $musicPath): array
{
    $audioExtensions = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg'];
    $artExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($musicPath, FilesystemIterator::SKIP_DOTS | FilesystemIterator::FOLLOW_SYMLINKS)
    );

    $tracks = [];
    $albums = [];
    $artists = [];

    foreach ($iterator as $file) {
        if (!$file->isFile()) {
            continue;
        }

        $extension = strtolower($file->getExtension());
        if (!in_array($extension, $audioExtensions, true)) {
            continue;
        }

        $relativePath = substr($file->getPathname(), strlen($musicPath) + 1);
        $relativePath = str_replace('\\', '/', $relativePath);

        $dirRelative = substr($file->getPath(), strlen($musicPath));
        $dirRelative = $dirRelative ? trim(str_replace('\\', '/', $dirRelative), '/') : '';
        $segments = $dirRelative === '' ? [] : explode('/', $dirRelative);

        $title = waveroom_humanize(pathinfo($file->getFilename(), PATHINFO_FILENAME));
        $artist = 'Artista Desconocido';
        $album = 'Colección';

        if (count($segments) >= 2) {
            $artist = waveroom_humanize($segments[0]);
            $album = waveroom_humanize($segments[1]);
        } elseif (count($segments) === 1) {
            $artist = waveroom_humanize($segments[0]);
            $album = 'Singles';
        }

        $artworkFile = waveroom_find_artwork($file->getPath(), pathinfo($file->getFilename(), PATHINFO_FILENAME), $artExtensions);
        $artworkPath = $artworkFile
            ? 'music/' . str_replace('\\', '/', substr($artworkFile, strlen($musicPath) + 1))
            : 'assets/img/default-cover.svg';

        $trackId = sha1($relativePath);
        $tracks[] = [
            'id' => $trackId,
            'title' => $title,
            'artist' => $artist,
            'album' => $album,
            'src' => 'music/' . $relativePath,
            'artwork' => $artworkPath,
            'updatedAt' => $file->getMTime(),
            'filesize' => $file->getSize()
        ];

        $albumKey = $artist . '|' . $album;
        if (!isset($albums[$albumKey])) {
            $albums[$albumKey] = [
                'id' => sha1($albumKey),
                'name' => $album,
                'artist' => $artist,
                'artwork' => $artworkPath,
                'trackIds' => []
            ];
        }
        $albums[$albumKey]['trackIds'][] = $trackId;

        if (!isset($artists[$artist])) {
            $artists[$artist] = [
                'id' => sha1('artist:' . $artist),
                'name' => $artist,
                'artwork' => $artworkPath,
                'trackIds' => []
            ];
        }
        $artists[$artist]['trackIds'][] = $trackId;
    }

    usort($tracks, static function ($a, $b) {
        return strcmp($a['title'], $b['title']);
    });

    $albumList = array_values(array_map(static function ($album) {
        $album['trackCount'] = count($album['trackIds']);
        return $album;
    }, $albums));

    usort($albumList, static function ($a, $b) {
        return strcmp($a['name'], $b['name']);
    });

    $artistList = array_values(array_map(static function ($artist) {
        $artist['trackCount'] = count($artist['trackIds']);
        return $artist;
    }, $artists));

    usort($artistList, static function ($a, $b) {
        return strcmp($a['name'], $b['name']);
    });

    return [
        'tracks' => $tracks,
        'collections' => [
            'albums' => $albumList,
            'artists' => $artistList
        ]
    ];
}
