<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Legal;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Fila de parametros_legales. `valor` se deja sin cast: PDO lo entrega como string
 * decimal y el cast `decimal` de Eloquent pasa por number_format(float).
 *
 * @property string $id
 * @property string $codigo
 * @property string $rule_id
 * @property string|null $valor
 * @property array<string, mixed>|null $valor_json
 * @property CarbonImmutable|null $vigente_desde
 * @property CarbonImmutable|null $vigente_hasta
 * @property string $estado_verificacion
 * @property string $fuente
 */
final class LegalParameterRecord extends Model
{
    use HasUuids;

    protected $table = 'parametros_legales';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'valor_json' => 'array',
            'vigente_desde' => 'immutable_date',
            'vigente_hasta' => 'immutable_date',
        ];
    }
}
