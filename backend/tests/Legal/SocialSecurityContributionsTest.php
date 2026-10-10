<?php

declare(strict_types=1);

/*
 * NMX-011 — Casos del catálogo (docs/nomix/04 §1) para las cuotas sobre salario de CSS,
 * Seguro Educativo y Riesgos Profesionales: RULE-001, 002, 005, 006 y 007.
 *
 * Derivados directamente del catálogo antes de implementar las reglas (AGENTS.md, flujo 6),
 * porque no había otro agente disponible para prepararlos. Las tasas salen de LegalCatalog,
 * con las mismas filas que siembra parametros_legales; nunca de este archivo.
 *
 * El "bruto" de los casos es la base gravable que recibe la regla. Qué conceptos la forman
 * sigue pendiente en RULE-001 y lo resuelve el calculador (NMX-016), no estas reglas.
 */

use App\Domain\Payroll\Input\EmployerSnapshot;
use App\Domain\Payroll\Result\Concept;
use App\Domain\Payroll\Result\LineItem;
use App\Domain\Payroll\Rules\CssEmployeeRule;
use App\Domain\Payroll\Rules\CssEmployerRule;
use App\Domain\Payroll\Rules\EducationInsuranceEmployeeRule;
use App\Domain\Payroll\Rules\EducationInsuranceEmployerRule;
use App\Domain\Payroll\Rules\OccupationalRiskRule;
use App\Domain\Shared\Money\Money;
use Tests\Support\LegalCatalog;

describe('RULE-001 — cuota obrera CSS sobre salario (9.75%)', function (): void {
    it('aplica la tasa del catálogo al bruto quincenal', function (string $base, string $unrounded, string $expected): void {
        $line = (new CssEmployeeRule)->calculate(Money::of($base), LegalCatalog::forDate('2026-10-15'));

        expect($line->concept)->toBe(Concept::CssObrero)
            ->and($line->trace->ruleId)->toBe('RULE-001')
            ->and($line->trace->unroundedResult->isEqualTo(Money::of($unrounded)))->toBeTrue()
            ->and($line->amount->toString())->toBe($expected);
    })->with([
        'bruto 500.00' => ['500.00', '48.75', '48.75'],
        'bruto 1,234.56 (120.3696, redondeo según RULE-080)' => ['1234.56', '120.3696', '120.37'],
    ]);
});

describe('RULE-002 — cuota patronal CSS sobre salario, según el mes de cuota', function (): void {
    it('usa la tasa vigente en el mes de la cuota', function (string $quotaMonth, string $expected): void {
        $line = (new CssEmployerRule)->calculate(Money::of('500.00'), LegalCatalog::forDate($quotaMonth));

        expect($line->concept)->toBe(Concept::CssPatronal)
            ->and($line->trace->ruleId)->toBe('RULE-002')
            ->and($line->amount->toString())->toBe($expected);
    })->with([
        'cuota de octubre de 2026 (13.25%)' => ['2026-10-15', '66.25'],
        'cuota de marzo de 2027 (14.25%)' => ['2027-03-15', '71.25'],
        'cuota de marzo de 2025, recálculo histórico (12.25%)' => ['2025-03-15', '61.25'],
        'último día del tramo histórico' => ['2025-03-31', '61.25'],
        'primer día del tramo de 13.25%' => ['2025-04-01', '66.25'],
        'último día del tramo de 13.25%' => ['2027-02-28', '66.25'],
        'primer día del tramo de 14.25%' => ['2027-03-01', '71.25'],
        'último día del tramo de 14.25%' => ['2029-02-28', '71.25'],
        'primer día del tramo de 15.25%' => ['2029-03-01', '76.25'],
    ]);
});

describe('RULE-005 — Seguro Educativo obrero (1.25%)', function (): void {
    it('aplica la tasa del catálogo al bruto', function (): void {
        $line = (new EducationInsuranceEmployeeRule)->calculate(Money::of('500.00'), LegalCatalog::forDate('2026-10-15'));

        expect($line->concept)->toBe(Concept::SeObrero)
            ->and($line->trace->ruleId)->toBe('RULE-005')
            ->and($line->amount->toString())->toBe('6.25');
    });

    it('no se aplica al XIII mes: XIII mes 500.00 → 0.00')
        ->todo(note: 'El XIII mes se calcula en NMX-050 (RULE-030) y no debe generar la línea de RULE-005.');
});

describe('RULE-006 — Seguro Educativo patronal (1.50%)', function (): void {
    it('aplica la tasa del catálogo al bruto', function (): void {
        $line = (new EducationInsuranceEmployerRule)->calculate(Money::of('500.00'), LegalCatalog::forDate('2026-10-15'));

        expect($line->concept)->toBe(Concept::SePatronal)
            ->and($line->trace->ruleId)->toBe('RULE-006')
            ->and($line->amount->toString())->toBe('7.50');
    });
});

describe('RULE-007 — Riesgos Profesionales, tasa propia de la empresa', function (): void {
    it('aplica la tasa de la empresa al bruto', function (): void {
        $line = (new OccupationalRiskRule)->calculate(Money::of('500.00'), new EmployerSnapshot('0.021000'), LegalCatalog::forDate('2026-10-15'));

        expect($line->concept)->toBe(Concept::RiesgoProfesional)
            ->and($line->trace->ruleId)->toBe('RULE-007')
            ->and($line->amount->toString())->toBe('10.50');
    });
});

describe('estado de verificación (04 §0.1)', function (): void {
    it('ninguna cuota habilita producción mientras el catálogo no esté VALIDADO', function (LineItem $line, string $parameter): void {
        expect($line->trace->allowsProduction())->toBeFalse()
            ->and(array_map(static fn ($used): string => $used->code, $line->trace->parameters()))->toContain($parameter)
            ->and($line->trace->pendingParameterCodes())->toContain('REDONDEO_POLITICA');
    })->with([
        'RULE-001' => [fn (): LineItem => (new CssEmployeeRule)->calculate(Money::of('500.00'), LegalCatalog::forDate('2026-10-15')), 'CSS_OBRERO_SALARIO'],
        'RULE-002' => [fn (): LineItem => (new CssEmployerRule)->calculate(Money::of('500.00'), LegalCatalog::forDate('2026-10-15')), 'CSS_PATRONAL_SALARIO'],
        'RULE-005' => [fn (): LineItem => (new EducationInsuranceEmployeeRule)->calculate(Money::of('500.00'), LegalCatalog::forDate('2026-10-15')), 'SE_OBRERO_SALARIO'],
        'RULE-006' => [fn (): LineItem => (new EducationInsuranceEmployerRule)->calculate(Money::of('500.00'), LegalCatalog::forDate('2026-10-15')), 'SE_PATRONAL_SALARIO'],
        'RULE-007' => [fn (): LineItem => (new OccupationalRiskRule)->calculate(Money::of('500.00'), new EmployerSnapshot('0.021000'), LegalCatalog::forDate('2026-10-15')), 'RIESGO_PROFESIONAL_TASA_MINIMA'],
    ]);
});
