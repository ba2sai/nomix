<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Input;

/** Tipo de novedad; los valores coinciden con `novedades.tipo` (docs/nomix/06). */
enum NoveltyType: string
{
    case HoraExtra = 'hora_extra';
    case Ausencia = 'ausencia';
    case Tardanza = 'tardanza';
    case Incapacidad = 'incapacidad';
    case Bono = 'bono';
    case Comision = 'comision';
    case OtroIngreso = 'otro_ingreso';
    case OtroDescuento = 'otro_descuento';

    /** Las novedades de tiempo llevan cantidad (horas o días); las de dinero llevan monto. */
    public function measuresTime(): bool
    {
        return match ($this) {
            self::HoraExtra, self::Ausencia, self::Tardanza, self::Incapacidad => true,
            self::Bono, self::Comision, self::OtroIngreso, self::OtroDescuento => false,
        };
    }
}
