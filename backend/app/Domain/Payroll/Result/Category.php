<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Result;

/** Categoría de una línea; los valores coinciden con `planilla_lineas.categoria` (docs/nomix/06). */
enum Category: string
{
    case Ingreso = 'ingreso';
    case DeduccionLey = 'deduccion_ley';
    case Descuento = 'descuento';
    case CargaPatronal = 'carga_patronal';
}
