<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Infrastructure\Persistence\Legal\LegalParameterRecord;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Carga en parametros_legales las filas de CatalogoLegal. Es idempotente: cada fila se
 * identifica por (codigo, vigente_desde) y se actualiza si ya existe. Se ejecuta con el
 * rol de migraciones (`artisan migrate --seed`).
 */
final class ParametrosLegalesSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            foreach (CatalogoLegal::rows() as $row) {
                $record = LegalParameterRecord::query()
                    ->where('codigo', $row['codigo'])
                    ->where('vigente_desde', $row['vigente_desde'])
                    ->first() ?? new LegalParameterRecord;

                $record->fill($row)->save();
            }
        });
    }
}
