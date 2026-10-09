<?php

declare(strict_types=1);

/*
 * `composer mutate` solo muta las clases declaradas con mutates() en tests/Unit.
 * Esta prueba impide que una clase nueva de app/Domain quede fuera sin que nadie lo note.
 */

it('declara con mutates() cada clase de Domain con código', function (): void {
    // Tipos sin código ejecutable que mutar.
    $withoutMutableCode = [
        'App\Domain\Shared\DomainException',
        'App\Domain\Shared\Period\PayFrequency',
    ];
    $root = dirname(__DIR__, 2);
    $testSources = '';
    $tests = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/tests/Unit', RecursiveDirectoryIterator::SKIP_DOTS));

    foreach ($tests as $file) {
        if ($file->getExtension() === 'php') {
            $testSources .= file_get_contents($file->getPathname());
        }
    }

    preg_match_all('/mutates\(([^)]*)\)/', $testSources, $calls);
    $declared = implode(',', $calls[1]);

    $missing = [];
    $sources = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/app/Domain', RecursiveDirectoryIterator::SKIP_DOTS));

    foreach ($sources as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }

        $relative = substr($file->getPathname(), strlen($root.'/app/'), -strlen('.php'));
        $class = 'App\\'.str_replace('/', '\\', $relative);
        $shortName = $file->getBasename('.php');

        if (! in_array($class, $withoutMutableCode, true) && preg_match('/\b'.$shortName.'::class\b/', $declared) !== 1) {
            $missing[] = $class;
        }
    }

    expect($missing)->toBe([], 'Agrega mutates(...) en tests/Unit para: '.implode(', ', $missing));
});
