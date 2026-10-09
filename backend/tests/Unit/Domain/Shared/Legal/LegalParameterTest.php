<?php

declare(strict_types=1);

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\LegalParameterException;
use App\Domain\Shared\Legal\VerificationStatus;

mutates(LegalParameter::class, LegalParameterException::class);

/**
 * @param  array<string, mixed>|null  $table
 */
function legalParameter(
    string $code = 'CSS_PATRONAL_SALARIO',
    string $ruleId = 'RULE-002',
    ?string $value = '0.132500',
    ?array $table = null,
    ?string $from = '2025-04-01',
    ?string $until = '2027-02-28',
    VerificationStatus $status = VerificationStatus::ConfirmadoSecundario,
    string $source = 'Ley 462 de 2025',
): LegalParameter {
    return LegalParameter::of(
        code: $code,
        ruleId: $ruleId,
        value: $value,
        table: $table,
        validFrom: $from === null ? null : new DateTimeImmutable($from),
        validUntil: $until === null ? null : new DateTimeImmutable($until),
        status: $status,
        source: $source,
    );
}

describe('construcción', function (): void {
    it('conserva sus datos y normaliza las fechas a medianoche UTC', function (): void {
        $parameter = LegalParameter::of(
            code: 'CSS_PATRONAL_SALARIO',
            ruleId: 'RULE-002',
            value: '0.132500',
            table: null,
            validFrom: new DateTimeImmutable('2025-04-01 23:30:00', new DateTimeZone('America/Panama')),
            validUntil: new DateTimeImmutable('2027-02-28 01:00:00', new DateTimeZone('America/Panama')),
            status: VerificationStatus::ConfirmadoSecundario,
            source: 'Ley 462 de 2025',
        );

        expect($parameter->code)->toBe('CSS_PATRONAL_SALARIO')
            ->and($parameter->ruleId)->toBe('RULE-002')
            ->and($parameter->value())->toBe('0.132500')
            ->and($parameter->isTable())->toBeFalse()
            ->and($parameter->validFrom?->format('Y-m-d H:i:s e'))->toBe('2025-04-01 00:00:00 UTC')
            ->and($parameter->validUntil?->format('Y-m-d H:i:s e'))->toBe('2027-02-28 00:00:00 UTC')
            ->and($parameter->status)->toBe(VerificationStatus::ConfirmadoSecundario)
            ->and($parameter->source)->toBe('Ley 462 de 2025');
    });

    it('admite vigencias abiertas por ambos lados', function (): void {
        $parameter = legalParameter(from: null, until: null);

        expect($parameter->validFrom)->toBeNull()
            ->and($parameter->validUntil)->toBeNull();
    });

    it('admite una vigencia de un solo día', function (): void {
        expect(legalParameter(from: '2026-01-01', until: '2026-01-01'))->toBeInstanceOf(LegalParameter::class);
    });

    it('guarda tablas', function (): void {
        $table = ['tramos' => [['hasta' => '11000.00', 'tasa' => '0']]];
        $parameter = legalParameter(code: 'ISR_TARIFA_ANUAL', ruleId: 'RULE-010', value: null, table: $table);

        expect($parameter->isTable())->toBeTrue()
            ->and($parameter->table())->toBe($table);
    });
});

describe('validación', function (): void {
    it('rechaza un código vacío', function (): void {
        expect(fn () => legalParameter(code: ''))
            ->toThrow(LegalParameterException::class, 'El código del parámetro legal no puede estar vacío.');
    });

    it('rechaza una regla con formato incorrecto', function (string $ruleId): void {
        expect(fn () => legalParameter(ruleId: $ruleId))
            ->toThrow(LegalParameterException::class, "El parámetro legal 'CSS_PATRONAL_SALARIO' cita la regla '{$ruleId}', que no tiene el formato RULE-000.");
    })->with(['RULE-2', 'RULE-0002', 'rule-002', 'RULE 002', '', 'RULE-002 ']);

    it('acepta reglas RULE-000', function (): void {
        expect(legalParameter(ruleId: 'RULE-080')->ruleId)->toBe('RULE-080');
    });

    it('exige un valor o una tabla, pero no ambos', function (?string $value, ?array $table): void {
        expect(fn () => legalParameter(value: $value, table: $table))
            ->toThrow(LegalParameterException::class, "El parámetro legal 'CSS_PATRONAL_SALARIO' debe tener un valor o una tabla, pero no ambos.");
    })->with([
        'ninguno' => [null, null],
        'ambos' => ['0.1325', ['x' => 1]],
    ]);

    it('rechaza valores que no son decimales simples', function (string $value): void {
        expect(fn () => legalParameter(value: $value))
            ->toThrow(LegalParameterException::class, "El parámetro legal 'CSS_PATRONAL_SALARIO' tiene el valor '{$value}', que no es un decimal como '0.132500'.");
    })->with(['1e3', '13,25', '', 'abc', '.5', '1.', ' 1']);

    it('acepta enteros y negativos como valor', function (string $value): void {
        expect(legalParameter(value: $value)->value())->toBe($value);
    })->with(['13', '-1', '0', '0.0975']);

    it('rechaza una vigencia que termina antes de empezar', function (): void {
        expect(fn () => legalParameter(from: '2026-01-02', until: '2026-01-01'))
            ->toThrow(LegalParameterException::class, "El parámetro legal 'CSS_PATRONAL_SALARIO' termina antes de empezar.");
    });
});

describe('vigencia', function (): void {
    it('incluye ambos extremos y excluye los días vecinos', function (string $date, bool $expected): void {
        expect(legalParameter()->appliesOn(new DateTimeImmutable($date)))->toBe($expected);
    })->with([
        'día anterior' => ['2025-03-31', false],
        'inicio' => ['2025-04-01', true],
        'inicio con hora' => ['2025-04-01 18:00:00', true],
        'fin' => ['2027-02-28', true],
        'día siguiente' => ['2027-03-01', false],
    ]);

    it('sin inicio aplica a cualquier fecha hasta el fin', function (string $date, bool $expected): void {
        expect(legalParameter(from: null, until: '2025-03-31')->appliesOn(new DateTimeImmutable($date)))->toBe($expected);
    })->with([
        ['1990-01-01', true],
        ['2025-03-31', true],
        ['2025-04-01', false],
    ]);

    it('sin fin aplica desde el inicio en adelante', function (string $date, bool $expected): void {
        expect(legalParameter(from: '2029-03-01', until: null)->appliesOn(new DateTimeImmutable($date)))->toBe($expected);
    })->with([
        ['2029-02-28', false],
        ['2029-03-01', true],
        ['2099-12-31', true],
    ]);
});

describe('acceso al contenido', function (): void {
    it('no entrega una tabla como valor', function (): void {
        $parameter = legalParameter(code: 'ISR_TARIFA_ANUAL', ruleId: 'RULE-010', value: null, table: ['tramos' => []]);

        expect(fn () => $parameter->value())
            ->toThrow(LegalParameterException::class, "El parámetro legal 'ISR_TARIFA_ANUAL' es una tabla; usa table() en lugar de value().");
    });

    it('no entrega un valor como tabla', function (): void {
        expect(fn () => legalParameter()->table())
            ->toThrow(LegalParameterException::class, "El parámetro legal 'CSS_PATRONAL_SALARIO' es un valor simple; usa value() en lugar de table().");
    });
});
