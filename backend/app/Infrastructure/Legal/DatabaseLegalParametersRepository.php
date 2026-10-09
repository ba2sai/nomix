<?php

declare(strict_types=1);

namespace App\Infrastructure\Legal;

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Legal\LegalParametersRepository;
use App\Domain\Shared\Legal\VerificationStatus;
use App\Infrastructure\Persistence\Legal\LegalParameterRecord;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;

final class DatabaseLegalParametersRepository implements LegalParametersRepository
{
    public function forDate(DateTimeInterface $date): LegalParameters
    {
        $day = $date->format('Y-m-d');

        $records = LegalParameterRecord::query()
            ->where(fn (Builder $query) => $query->whereNull('vigente_desde')->orWhere('vigente_desde', '<=', $day))
            ->where(fn (Builder $query) => $query->whereNull('vigente_hasta')->orWhere('vigente_hasta', '>=', $day))
            ->orderBy('codigo')
            ->get();

        return LegalParameters::on($date, $records->map(self::toDomain(...)));
    }

    private static function toDomain(LegalParameterRecord $record): LegalParameter
    {
        return LegalParameter::of(
            code: $record->codigo,
            ruleId: $record->rule_id,
            value: $record->valor,
            table: $record->valor_json,
            validFrom: $record->vigente_desde,
            validUntil: $record->vigente_hasta,
            status: VerificationStatus::from($record->estado_verificacion),
            source: $record->fuente,
        );
    }
}
