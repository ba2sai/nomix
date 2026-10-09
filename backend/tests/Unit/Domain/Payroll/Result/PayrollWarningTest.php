<?php

declare(strict_types=1);

use App\Domain\Payroll\PayrollException;
use App\Domain\Payroll\Result\PayrollWarning;

mutates(PayrollWarning::class);

it('guarda código, mensaje y regla', function (): void {
    $warning = new PayrollWarning('horas_extra_sobre_limite', 'Supera 3 horas extra diarias.', 'RULE-020');

    expect($warning->code)->toBe('horas_extra_sobre_limite')
        ->and($warning->message)->toBe('Supera 3 horas extra diarias.')
        ->and($warning->ruleId)->toBe('RULE-020')
        ->and($warning->toArray())->toBe([
            'codigo' => 'horas_extra_sobre_limite',
            'mensaje' => 'Supera 3 horas extra diarias.',
            'regla' => 'RULE-020',
        ]);
});

it('admite un aviso sin regla', function (): void {
    expect((new PayrollWarning('dato_incompleto', 'Falta la jornada.'))->ruleId)->toBeNull();
});

it('exige código y mensaje', function (string $code, string $message): void {
    expect(fn () => new PayrollWarning($code, $message))
        ->toThrow(PayrollException::class, 'Un aviso de planilla necesita un código y un mensaje.');
})->with([
    'código vacío' => ['', 'mensaje'],
    'código en blanco' => ['  ', 'mensaje'],
    'mensaje vacío' => ['codigo', ''],
    'mensaje en blanco' => ['codigo', ' '],
]);

it('exige el formato RULE-000', function (): void {
    expect(fn () => new PayrollWarning('codigo', 'mensaje', 'RULE-20'))
        ->toThrow(PayrollException::class, "El aviso cita la regla 'RULE-20', que no tiene el formato RULE-000.");
});
