<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Input;

/** Jornada del colaborador; los valores coinciden con `colaboradores.jornada` (docs/nomix/06). */
enum WorkShift: string
{
    case Diurna = 'diurna';
    case Nocturna = 'nocturna';
    case Mixta = 'mixta';
}
