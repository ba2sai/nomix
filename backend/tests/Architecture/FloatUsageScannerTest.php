<?php

declare(strict_types=1);

use Tests\Architecture\Support\FloatUsageScanner;

it('detecta cada forma de usar float', function (string $source): void {
    expect(FloatUsageScanner::scanSource("<?php\n".$source))->not->toBe([]);
})->with([
    'tipo de parámetro' => 'function f(float $x) {}',
    'tipo de retorno' => 'function f(): float {}',
    'tipo anulable' => 'function f(?float $x) {}',
    'tipo unión' => 'function f(int|float $x) {}',
    'propiedad' => 'class A { private float $x; }',
    'cast float' => '$x = (float) $y;',
    'cast double' => '$x = (double) $y;',
    'literal decimal' => '$x = 0.1;',
    'literal exponencial' => '$x = 1e3;',
    'floatval' => '$x = floatval($y);',
    'floatval calificado' => '$x = \floatval($y);',
    'doubleval' => '$x = doubleval($y);',
]);

it('no marca código sin float', function (string $source): void {
    expect(FloatUsageScanner::scanSource("<?php\n".$source))->toBe([]);
})->with([
    'enteros' => '$x = 10 + 2;',
    'cadena decimal' => '$x = "0.10";',
    'comentario' => '// float (float) 0.1',
    'docblock' => '/** @param float $x */ function f(string $x) {}',
    'nombre que contiene float' => 'function floatingPoint(int $x) {}',
    'método llamado float' => '$money->toFloatString();',
]);
