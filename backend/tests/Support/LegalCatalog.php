<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Legal\VerificationStatus;
use Database\Seeders\CatalogoLegal;
use DateTimeImmutable;

/**
 * Parámetros legales del catálogo vigentes en una fecha, sin base de datos: las pruebas
 * del motor (criterio de H1: ninguna prueba depende de la BD) usan las mismas filas que
 * siembra ParametrosLegalesSeeder.
 */
final class LegalCatalog
{
    public static function forDate(string $date): LegalParameters
    {
        $day = new DateTimeImmutable($date);
        $parameters = [];

        foreach (CatalogoLegal::rows() as $row) {
            $parameter = LegalParameter::of(
                code: $row['codigo'],
                ruleId: $row['rule_id'],
                value: $row['valor'],
                table: $row['valor_json'],
                validFrom: $row['vigente_desde'] === null ? null : new DateTimeImmutable($row['vigente_desde']),
                validUntil: $row['vigente_hasta'] === null ? null : new DateTimeImmutable($row['vigente_hasta']),
                status: VerificationStatus::from($row['estado_verificacion']),
                source: $row['fuente'],
            );

            if ($parameter->appliesOn($day)) {
                $parameters[] = $parameter;
            }
        }

        return LegalParameters::on($day, $parameters);
    }
}
