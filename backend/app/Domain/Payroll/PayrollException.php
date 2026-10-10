<?php

declare(strict_types=1);

namespace App\Domain\Payroll;

use App\Domain\Shared\DomainException;

final class PayrollException extends DomainException
{
    public static function negativeLine(string $concept, string $amount): self
    {
        return new self("La línea '{$concept}' tiene un monto negativo ({$amount}); el signo lo da su categoría.");
    }

    public static function lineNotRounded(string $concept, string $amount): self
    {
        return new self("La línea '{$concept}' tiene el monto {$amount}, que no cabe en 2 decimales: revisa la escala de RULE-080.");
    }

    public static function emptyWarning(): self
    {
        return new self('Un aviso de planilla necesita un código y un mensaje.');
    }

    public static function invalidWarningRule(string $ruleId): self
    {
        return new self("El aviso cita la regla '{$ruleId}', que no tiene el formato RULE-000.");
    }

    public static function frequencyMismatch(string $employee, string $period): self
    {
        return new self("El colaborador cobra con periodicidad '{$employee}', pero el período es '{$period}'.");
    }

    public static function nonPositiveSalary(): self
    {
        return new self('El salario base debe ser mayor que cero.');
    }

    /** Sin el monto: el salario base es sensible y un mensaje puede acabar en un log (AGENTS.md, regla 7). */
    public static function salaryNotRounded(): self
    {
        return new self('El salario base debe tener 2 decimales como máximo.');
    }

    public static function invalidDecimal(string $field, string $value): self
    {
        return new self("El campo '{$field}' tiene el valor '{$value}', que no es un decimal válido.");
    }

    public static function outOfRange(string $field, string $value, string $range): self
    {
        return new self("El campo '{$field}' vale {$value}, fuera del rango {$range}.");
    }

    public static function amountNotRounded(string $field, string $amount): self
    {
        return new self("El campo '{$field}' tiene el monto {$amount}, que no cabe en 2 decimales.");
    }

    /** Sin el monto: la base suele ser el salario del período (AGENTS.md, regla 7). */
    public static function invalidTaxableBase(string $ruleId): self
    {
        return new self("La base gravable de {$ruleId} debe ser cero o positiva y tener 2 decimales como máximo.");
    }

    public static function terminationBeforeHire(): self
    {
        return new self('La fecha de terminación es anterior a la de ingreso.');
    }

    public static function noveltyQuantityRequired(string $type): self
    {
        return new self("Una novedad de tipo '{$type}' necesita una cantidad (horas o días) y no un monto.");
    }

    public static function noveltyAmountRequired(string $type): self
    {
        return new self("Una novedad de tipo '{$type}' necesita un monto y no una cantidad.");
    }

    public static function emptySubtype(): self
    {
        return new self('El subtipo de una novedad no puede estar vacío; omítelo si no aplica.');
    }
}
