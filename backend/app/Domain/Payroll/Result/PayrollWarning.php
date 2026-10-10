<?php

declare(strict_types=1);

namespace App\Domain\Payroll\Result;

use App\Domain\Payroll\PayrollException;

/**
 * Aviso que no bloquea el cálculo (p. ej. horas extra sobre el límite de RULE-020 o un
 * salario bajo el mínimo de RULE-060): se muestra a quien revisa la planilla.
 */
final readonly class PayrollWarning
{
    private const string RULE_ID_PATTERN = '/^RULE-\d{3}$/';

    public function __construct(public string $code, public string $message, public ?string $ruleId = null)
    {
        if (trim($code) === '' || trim($message) === '') {
            throw PayrollException::emptyWarning();
        }

        if ($ruleId !== null && preg_match(self::RULE_ID_PATTERN, $ruleId) !== 1) {
            throw PayrollException::invalidWarningRule($ruleId);
        }
    }

    /**
     * @return array{codigo: string, mensaje: string, regla: string|null}
     */
    public function toArray(): array
    {
        return ['codigo' => $this->code, 'mensaje' => $this->message, 'regla' => $this->ruleId];
    }
}
