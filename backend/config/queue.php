<?php

declare(strict_types=1);

return [
    'default' => 'redis',
    'connections' => [
        'redis' => [
            'driver' => 'redis',
            'connection' => 'default',
            'queue' => 'default',
            'retry_after' => 90,
            'block_for' => 5,
            'after_commit' => true,
        ],
    ],
    // Horizon registra fallos en Redis; la persistencia SQL se incorpora en NMX-002.
    'failed' => ['driver' => 'null'],
];
