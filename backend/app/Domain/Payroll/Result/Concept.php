<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Result;

/**
 * Concepto de una línea de planilla; los valores son los de `planilla_lineas.concepto`
 * (docs/nomix/06). Cada concepto pertenece a una sola categoría. Se agregan casos a
 * medida que los tickets del motor los calculan (XIII mes, vacaciones y liquidación en H5).
 */
enum Concept: string
{
    case Salario = 'salario';
    case HoraExtra = 'hora_extra';
    case RecargoDescanso = 'recargo_descanso';
    case RecargoDiaFiesta = 'recargo_dia_fiesta';
    case GastosRepresentacion = 'gastos_representacion';
    case Bono = 'bono';
    case Comision = 'comision';
    case OtroIngreso = 'otro_ingreso';

    case CssObrero = 'css_obrero';
    case SeObrero = 'se_obrero';
    case Isr = 'isr';
    case IsrGastosRepresentacion = 'isr_gastos_representacion';

    case Descuento = 'descuento';
    case OtroDescuento = 'otro_descuento';

    case CssPatronal = 'css_patronal';
    case SePatronal = 'se_patronal';
    case RiesgoProfesional = 'riesgo_profesional';

    public function category(): Category
    {
        return match ($this) {
            self::Salario, self::HoraExtra, self::RecargoDescanso, self::RecargoDiaFiesta,
            self::GastosRepresentacion, self::Bono, self::Comision, self::OtroIngreso => Category::Ingreso,
            self::CssObrero, self::SeObrero, self::Isr, self::IsrGastosRepresentacion => Category::DeduccionLey,
            self::Descuento, self::OtroDescuento => Category::Descuento,
            self::CssPatronal, self::SePatronal, self::RiesgoProfesional => Category::CargaPatronal,
        };
    }
}
