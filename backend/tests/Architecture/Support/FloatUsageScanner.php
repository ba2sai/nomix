<?php

declare(strict_types=1);

namespace Tests\Architecture\Support;

use PhpToken;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Detecta usos de float en código PHP: tipo `float`, casts `(float)`/`(double)`,
 * literales decimales y floatval()/doubleval(). Comentarios y cadenas se ignoran.
 */
final class FloatUsageScanner
{
    private const array FORBIDDEN_NAMES = ['float', 'floatval', 'doubleval'];

    /**
     * @return list<string> Una entrada "línea N: token" por cada uso encontrado.
     */
    public static function scanSource(string $source): array
    {
        $findings = [];

        foreach (PhpToken::tokenize($source) as $token) {
            $isForbidden = match ($token->id) {
                T_DOUBLE_CAST, T_DNUMBER => true,
                T_STRING, T_NAME_FULLY_QUALIFIED => in_array(strtolower(ltrim($token->text, '\\')), self::FORBIDDEN_NAMES, true),
                default => false,
            };

            if ($isForbidden) {
                $findings[] = 'línea '.$token->line.': '.$token->text;
            }
        }

        return $findings;
    }

    /**
     * @return array<string, list<string>> Hallazgos indexados por ruta de archivo.
     */
    public static function scanDirectory(string $directory): array
    {
        $findings = [];
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS));

        foreach ($files as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $fileFindings = self::scanSource((string) file_get_contents($file->getPathname()));

                if ($fileFindings !== []) {
                    $findings[$file->getPathname()] = $fileFindings;
                }
            }
        }

        return $findings;
    }
}
