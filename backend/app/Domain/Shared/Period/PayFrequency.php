<?php

declare(strict_types=1);

namespace App\Domain\Shared\Period;

/** Periodicidad de pago; los valores coinciden con `periodicidad_pago` (docs/nomix/06). */
enum PayFrequency: string
{
    case Quincenal = 'quincenal';
    case Bisemanal = 'bisemanal';
    case Mensual = 'mensual';
}
