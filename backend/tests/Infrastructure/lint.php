<?php

declare(strict_types=1);

// Comprobaciones de arranque. Pint/PHPStan/Pest se incorporan en NMX-002.
$root = dirname(__DIR__, 2);
$paths = ['app', 'bootstrap', 'config', 'database', 'public', 'routes', 'tests'];
$files = [$root.'/artisan'];
foreach ($paths as $path) {
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/'.$path));
    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getExtension() === 'php' && !str_contains($file->getPathname(), '/bootstrap/cache/')) {
            $files[] = $file->getPathname();
        }
    }
}
foreach ($files as $file) {
    exec(escapeshellarg(PHP_BINARY).' -l '.escapeshellarg($file).' 2>&1', $output, $status);
    if ($status !== 0 || !str_contains(file_get_contents($file), 'declare(strict_types=1);')) {
        fwrite(STDERR, 'PHP invalido o sin strict_types: '.$file.PHP_EOL);
        exit(1);
    }
    $output = [];
}
echo 'PHP: sintaxis y strict_types correctos ('.count($files).' archivos).'.PHP_EOL;
