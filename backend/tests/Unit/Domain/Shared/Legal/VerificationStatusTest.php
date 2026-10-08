<?php

declare(strict_types=1);

use App\Domain\Shared\Legal\VerificationStatus;

mutates(VerificationStatus::class);

it('usa los estados del catálogo (docs/nomix/04 §0.1)', function (): void {
    expect(array_map(fn (VerificationStatus $status): string => $status->value, VerificationStatus::cases()))
        ->toBe(['CONFIRMADO_SECUNDARIO', 'PARCIAL', 'PENDIENTE', 'VALIDADO']);
});

it('solo permite producción a las reglas validadas', function (VerificationStatus $status, bool $expected): void {
    expect($status->allowsProduction())->toBe($expected);
})->with([
    [VerificationStatus::ConfirmadoSecundario, false],
    [VerificationStatus::Parcial, false],
    [VerificationStatus::Pendiente, false],
    [VerificationStatus::Validado, true],
]);
