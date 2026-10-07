<?php

declare(strict_types=1);

return [
    'name' => env('APP_NAME', 'Nomix'),
    'env' => env('APP_ENV', 'local'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost:8080'),
    'timezone' => 'America/Panama',
    'locale' => 'es',
    'fallback_locale' => 'en',
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',
];
