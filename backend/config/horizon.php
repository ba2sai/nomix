<?php

declare(strict_types=1);

return [
    'name' => 'Nomix local',
    'use' => 'default',
    'prefix' => 'nomix_horizon:',
    'middleware' => ['web'],
    'environments' => [
        'local' => [
            'supervisor-local' => [
                'connection' => 'redis',
                'queue' => ['default'],
                'balance' => 'simple',
                'maxProcesses' => 1,
                'tries' => 3,
                'timeout' => 60,
                'memory' => 128,
            ],
        ],
    ],
];
