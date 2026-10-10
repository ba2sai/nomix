<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Legal\VerificationStatus;
use App\Domain\Shared\Rules\RoundingRule;
use DateTimeImmutable;

/**
 * Parámetros legales a medida para pruebas de dominio, sin base de datos. Para los
 * valores reales del catálogo, usa LegalCatalog.
 */
final class Parameters
{
    /**
     * @param  array<string, mixed>|null  $table
     */
    public static function make(
        string $code,
        ?string $value = '0.100000',
        VerificationStatus $status = VerificationStatus::ConfirmadoSecundario,
        ?array $table = null,
        string $ruleId = 'RULE-999',
    ): LegalParameter {
        return LegalParameter::of($code, $ruleId, $value, $table, null, null, $status, 'Parámetro de prueba');
    }

    /**
     * @param  array<string, mixed>  $table
     */
    public static function roundingTable(array $table, VerificationStatus $status = VerificationStatus::Pendiente): LegalParameters
    {
        return LegalParameters::on(new DateTimeImmutable('2026-10-15'), [
            self::make('REDONDEO_POLITICA', null, $status, $table, 'RULE-080'),
        ]);
    }

    /** Política de redondeo a medida; por omisión, la propuesta de RULE-080. */
    public static function rounding(
        int $scale = 2,
        string $mode = 'HALF_UP',
        int $intermediateScale = 6,
        VerificationStatus $status = VerificationStatus::Pendiente,
    ): RoundingRule {
        return RoundingRule::from(self::roundingTable(
            ['escala' => $scale, 'modo' => $mode, 'escala_intermedia' => $intermediateScale],
            $status,
        ));
    }
}
