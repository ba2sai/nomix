<?php

declare(strict_types=1);

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\LegalParameterCode;
use App\Domain\Shared\Legal\LegalParameterException;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Legal\LegalParametersRepository;
use App\Domain\Shared\Legal\VerificationStatus;
use App\Infrastructure\Persistence\Legal\LegalParameterRecord;
use Database\Seeders\ParametrosLegalesSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;

/*
 * Corre contra PostgreSQL real con el rol de aplicación; cada prueba se revierte.
 * La tabla la crea `migrate --seed` (make setup); el seeder se repite aquí por si la
 * BD está vacía, y de paso demuestra que es idempotente.
 */

uses(DatabaseTransactions::class);

beforeEach(function (): void {
    $this->app->make(ParametrosLegalesSeeder::class)->run();
    $this->repository = $this->app->make(LegalParametersRepository::class);
});

function forDate(string $date): LegalParameters
{
    return test()->repository->forDate(new DateTimeImmutable($date));
}

describe('criterios de aceptación de NMX-006', function (): void {
    it('devuelve la cuota patronal CSS vigente en cada fecha (RULE-002)', function (string $date, string $expected): void {
        expect(forDate($date)->value(LegalParameterCode::CssPatronalSalario))->toBe($expected);
    })->with([
        'histórico, último día' => ['2025-03-31', '0.122500'],
        'primer día de la Ley 462' => ['2025-04-01', '0.132500'],
        'octubre de 2026' => ['2026-10-15', '0.132500'],
        'último día del primer tramo' => ['2027-02-28', '0.132500'],
        'marzo de 2027' => ['2027-03-01', '0.142500'],
        'marzo de 2029' => ['2029-03-01', '0.152500'],
    ]);

    it('rechaza en la BD dos vigencias cruzadas para el mismo código', function (): void {
        expect(fn () => LegalParameterRecord::query()->create([
            'codigo' => 'CSS_PATRONAL_SALARIO',
            'rule_id' => 'RULE-002',
            'valor' => '0.140000',
            'vigente_desde' => '2026-01-01',
            'vigente_hasta' => '2026-12-31',
            'estado_verificacion' => 'PENDIENTE',
            'fuente' => 'prueba',
        ]))->toThrow(QueryException::class, 'parametros_legales_vigencia_sin_cruce');
    });

    it('rechaza en la BD una vigencia abierta que cruza la última', function (): void {
        expect(fn () => LegalParameterRecord::query()->create([
            'codigo' => 'CSS_PATRONAL_SALARIO',
            'rule_id' => 'RULE-002',
            'valor' => '0.160000',
            'vigente_desde' => '2030-01-01',
            'vigente_hasta' => null,
            'estado_verificacion' => 'PENDIENTE',
            'fuente' => 'prueba',
        ]))->toThrow(QueryException::class, 'parametros_legales_vigencia_sin_cruce');
    });

    it('lanza una excepción clara al pedir un parámetro sin vigencia para la fecha', function (): void {
        expect(fn () => forDate('2000-01-01')->table(LegalParameterCode::IsrGastosRepresentacionTarifa))
            ->toThrow(LegalParameterException::class, "No hay un valor vigente del parámetro legal 'ISR_GASTOS_REPRESENTACION_TARIFA' para el 2000-01-01. Registra su vigencia en parametros_legales (ver docs/nomix/04).");
    });
});

describe('seeder del catálogo', function (): void {
    it('siembra todos los códigos con vigencia hoy', function (): void {
        $parameters = forDate('2026-10-15');
        $missing = array_filter(LegalParameterCode::cases(), fn (LegalParameterCode $code): bool => ! $parameters->has($code));

        expect($missing)->toBe([]);
    });

    it('es idempotente', function (): void {
        $before = LegalParameterRecord::query()->count();

        $this->app->make(ParametrosLegalesSeeder::class)->run();

        expect(LegalParameterRecord::query()->count())->toBe($before)
            ->and($before)->toBeGreaterThanOrEqual(count(LegalParameterCode::cases()));
    });

    it('guarda rule_id, estado y fuente de cada parámetro', function (): void {
        $parameter = forDate('2026-10-15')->get(LegalParameterCode::CssPatronalSalario);

        expect($parameter->ruleId)->toBe('RULE-002')
            ->and($parameter->status)->toBe(VerificationStatus::ConfirmadoSecundario)
            ->and($parameter->validFrom?->format('Y-m-d'))->toBe('2025-04-01')
            ->and($parameter->validUntil?->format('Y-m-d'))->toBe('2027-02-28')
            ->and($parameter->source)->toContain('Ley 462');
    });

    it('entrega los valores como strings decimales, nunca float', function (): void {
        foreach (forDate('2026-10-15')->all() as $parameter) {
            if (! $parameter->isTable()) {
                expect($parameter->value())->toMatch('/^-?\d+(\.\d+)?$/');
            }
        }
    });

    // jsonb no conserva el orden de las claves: las tablas se leen por clave, nunca por posición.
    it('guarda las tablas con números como strings', function (): void {
        $parameters = forDate('2026-10-15');
        $isr = $parameters->table(LegalParameterCode::IsrTarifaAnual);

        expect($isr['tramos'])->toHaveCount(3)
            ->and($isr['tramos'][2])->toEqual(['excedente_sobre' => '50000.00', 'hasta' => null, 'tasa' => '0.25', 'impuesto_fijo' => '5850.00'])
            ->and($parameters->table(LegalParameterCode::RedondeoPolitica))->toEqual(['escala' => 2, 'modo' => 'HALF_UP', 'escala_intermedia' => 6]);
    });

    it('marca como PENDIENTE lo que el catálogo no confirma', function (): void {
        $parameters = forDate('2026-10-15');

        expect($parameters->get(LegalParameterCode::IsrDeduccionDependiente)->status)->toBe(VerificationStatus::Pendiente)
            ->and($parameters->get(LegalParameterCode::RedondeoPolitica)->status)->toBe(VerificationStatus::Pendiente)
            ->and(array_filter($parameters->all(), fn (LegalParameter $parameter): bool => $parameter->status->allowsProduction()))->toBe([]);
    });
});

describe('restricciones de la tabla', function (): void {
    it('rechaza un estado de verificación desconocido', function (): void {
        expect(fn () => LegalParameterRecord::query()->create([
            'codigo' => 'PRUEBA_ESTADO',
            'rule_id' => 'RULE-999',
            'valor' => '1',
            'estado_verificacion' => 'VERIFICADO',
            'fuente' => 'prueba',
        ]))->toThrow(QueryException::class, 'parametros_legales_estado_verificacion_check');
    });

    it('rechaza una fila con valor y tabla a la vez', function (): void {
        expect(fn () => LegalParameterRecord::query()->create([
            'codigo' => 'PRUEBA_VALOR',
            'rule_id' => 'RULE-999',
            'valor' => '1',
            'valor_json' => ['x' => 1],
            'estado_verificacion' => 'PENDIENTE',
            'fuente' => 'prueba',
        ]))->toThrow(QueryException::class, 'parametros_legales_valor_o_tabla_check');
    });

    it('rechaza una regla con formato incorrecto', function (): void {
        expect(fn () => LegalParameterRecord::query()->create([
            'codigo' => 'PRUEBA_REGLA',
            'rule_id' => 'RULE-9',
            'valor' => '1',
            'estado_verificacion' => 'PENDIENTE',
            'fuente' => 'prueba',
        ]))->toThrow(QueryException::class, 'parametros_legales_rule_id_check');
    });
});
