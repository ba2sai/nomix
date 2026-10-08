<?php

declare(strict_types=1);

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\LegalParameterCode;
use App\Domain\Shared\Legal\LegalParameterException;
use App\Domain\Shared\Legal\LegalParameters;
use App\Domain\Shared\Legal\VerificationStatus;

mutates(LegalParameters::class);

function cssPatronal(string $value = '0.132500', ?string $from = '2025-04-01', ?string $until = '2027-02-28'): LegalParameter
{
    return LegalParameter::of(
        code: 'CSS_PATRONAL_SALARIO',
        ruleId: 'RULE-002',
        value: $value,
        table: null,
        validFrom: $from === null ? null : new DateTimeImmutable($from),
        validUntil: $until === null ? null : new DateTimeImmutable($until),
        status: VerificationStatus::ConfirmadoSecundario,
        source: 'Ley 462 de 2025',
    );
}

function redondeo(): LegalParameter
{
    return LegalParameter::of(
        code: 'REDONDEO_POLITICA',
        ruleId: 'RULE-080',
        value: null,
        table: ['escala' => 2, 'modo' => 'HALF_UP', 'escala_intermedia' => 6],
        validFrom: null,
        validUntil: null,
        status: VerificationStatus::Pendiente,
        source: 'Propuesta del catálogo',
    );
}

it('normaliza la fecha y expone los parámetros por código o enum', function (): void {
    $parameters = LegalParameters::on(
        new DateTimeImmutable('2026-10-15 22:00:00', new DateTimeZone('America/Panama')),
        [cssPatronal(), redondeo()],
    );

    expect($parameters->date->format('Y-m-d H:i:s e'))->toBe('2026-10-15 00:00:00 UTC')
        ->and($parameters->has(LegalParameterCode::CssPatronalSalario))->toBeTrue()
        ->and($parameters->has('CSS_PATRONAL_SALARIO'))->toBeTrue()
        ->and($parameters->has(LegalParameterCode::SeObreroSalario))->toBeFalse()
        ->and($parameters->has('OTRO'))->toBeFalse()
        ->and($parameters->value(LegalParameterCode::CssPatronalSalario))->toBe('0.132500')
        ->and($parameters->value('CSS_PATRONAL_SALARIO'))->toBe('0.132500')
        ->and($parameters->get('CSS_PATRONAL_SALARIO')->ruleId)->toBe('RULE-002')
        ->and($parameters->table(LegalParameterCode::RedondeoPolitica))->toBe(['escala' => 2, 'modo' => 'HALF_UP', 'escala_intermedia' => 6]);
});

it('acepta cualquier iterable de parámetros', function (): void {
    $generator = (function (): Generator {
        yield cssPatronal();
    })();

    expect(LegalParameters::on(new DateTimeImmutable('2026-01-01'), $generator)->has('CSS_PATRONAL_SALARIO'))->toBeTrue();
});

it('lista todos los parámetros ordenados por código', function (): void {
    $parameters = LegalParameters::on(new DateTimeImmutable('2026-10-15'), [redondeo(), cssPatronal()]);

    expect(array_map(fn (LegalParameter $parameter): string => $parameter->code, $parameters->all()))
        ->toBe(['CSS_PATRONAL_SALARIO', 'REDONDEO_POLITICA'])
        ->and(LegalParameters::on(new DateTimeImmutable('2026-10-15'), [])->all())->toBe([]);
});

it('lanza una excepción clara cuando falta un parámetro para la fecha', function (): void {
    $parameters = LegalParameters::on(new DateTimeImmutable('2024-01-01'), []);

    expect(fn () => $parameters->get(LegalParameterCode::CssPatronalSalario))
        ->toThrow(LegalParameterException::class, "No hay un valor vigente del parámetro legal 'CSS_PATRONAL_SALARIO' para el 2024-01-01. Registra su vigencia en parametros_legales (ver docs/nomix/04).")
        ->and(fn () => $parameters->value('SE_OBRERO_SALARIO'))
        ->toThrow(LegalParameterException::class, "No hay un valor vigente del parámetro legal 'SE_OBRERO_SALARIO' para el 2024-01-01.")
        ->and(fn () => $parameters->table('REDONDEO_POLITICA'))
        ->toThrow(LegalParameterException::class, "'REDONDEO_POLITICA' para el 2024-01-01");
});

it('rechaza parámetros que no están vigentes en la fecha', function (): void {
    expect(fn () => LegalParameters::on(new DateTimeImmutable('2027-03-01'), [cssPatronal()]))
        ->toThrow(LegalParameterException::class, "El parámetro legal 'CSS_PATRONAL_SALARIO' no está vigente el 2027-03-01 (vigencia 2025-04-01 – 2027-02-28).")
        ->and(fn () => LegalParameters::on(new DateTimeImmutable('2025-04-01'), [cssPatronal('0.122500', null, '2025-03-31')]))
        ->toThrow(LegalParameterException::class, '(vigencia sin inicio – 2025-03-31)')
        ->and(fn () => LegalParameters::on(new DateTimeImmutable('2029-02-28'), [cssPatronal('0.152500', '2029-03-01', null)]))
        ->toThrow(LegalParameterException::class, '(vigencia 2029-03-01 – abierta)');
});

it('rechaza dos parámetros con el mismo código', function (): void {
    expect(fn () => LegalParameters::on(new DateTimeImmutable('2026-01-01'), [cssPatronal(), cssPatronal('0.140000')]))
        ->toThrow(LegalParameterException::class, "El parámetro legal 'CSS_PATRONAL_SALARIO' aparece más de una vez para la misma fecha.");
});
