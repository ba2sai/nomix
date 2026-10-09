<?php

declare(strict_types=1);

use Tests\Architecture\Support\FloatUsageScanner;

// Regla de dependencias de docs/nomix/05 §2.1: Http → Application → Domain e Infrastructure → Domain.

arch('todo el backend declara strict_types')
    ->expect('App')
    ->toUseStrictTypes();

arch('Domain no depende de Laravel ni de otras capas')
    ->expect('App\Domain')
    ->not->toUse([
        'Illuminate',
        'Laravel',
        'Carbon',
        'App\Application',
        'App\Infrastructure',
        'App\Http',
    ]);

arch('Domain no usa helpers globales del framework ni la fecha del sistema')
    ->expect('App\Domain')
    ->not->toUse([
        'app', 'config', 'env', 'request', 'response', 'now', 'today', 'logger', 'cache', 'dd', 'dump',
        'time', 'date', 'microtime', 'hrtime', 'mktime', 'strtotime', 'date_create', 'date_create_immutable',
    ]);

arch('Application no depende de Http')
    ->expect('App\Application')
    ->not->toUse('App\Http');

arch('Http no accede directamente a Infrastructure')
    ->expect('App\Http')
    ->not->toUse('App\Infrastructure');

arch('Domain no contiene código de depuración')
    ->expect('App\Domain')
    ->not->toUse(['var_dump', 'print_r', 'var_export', 'die', 'exit']);

it('Domain no usa float', function (): void {
    $findings = FloatUsageScanner::scanDirectory(dirname(__DIR__, 2).'/app/Domain');

    expect($findings)->toBe([], 'Usa Money (brick/math) en lugar de float: '.json_encode($findings, JSON_UNESCAPED_UNICODE));
});
