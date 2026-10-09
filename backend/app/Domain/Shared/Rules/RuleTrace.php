<?php

declare(strict_types=1);

namespace App\Domain\Shared\Rules;

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\VerificationStatus;
use App\Domain\Shared\Money\Money;

/**
 * Traza de un cálculo (docs/nomix/05 §2.2): regla, fórmula legible, entradas, resultado
 * sin redondear y resultado redondeado. Alimenta el Inspection Drawer y se guarda en
 * planilla_lineas.traza.
 *
 * - calculated(): un cálculo legal; siempre cita su RULE-xxx y redondea según RULE-080.
 * - entered(): un monto que no sale de una regla (p. ej. un bono registrado como novedad).
 */
final readonly class RuleTrace
{
    private const string RULE_ID_PATTERN = '/^RULE-\d{3}$/';

    /**
     * @param  list<TraceInput>  $inputs
     */
    private function __construct(
        public ?string $ruleId,
        public string $formula,
        private array $inputs,
        public Money $unroundedResult,
        public Money $result,
        public ?RoundingRule $rounding,
    ) {}

    /**
     * @param  list<TraceInput>  $inputs
     */
    public static function calculated(string $ruleId, string $formula, array $inputs, Money $unroundedResult, RoundingRule $rounding): self
    {
        if (preg_match(self::RULE_ID_PATTERN, $ruleId) !== 1) {
            throw RuleTraceException::invalidRuleId($ruleId);
        }

        return new self($ruleId, self::checkFormula($formula), $inputs, $unroundedResult, $rounding->round($unroundedResult), $rounding);
    }

    /**
     * @param  list<TraceInput>  $inputs
     */
    public static function entered(string $description, array $inputs, Money $amount): self
    {
        if (! $amount->fitsScale(2)) {
            throw RuleTraceException::enteredAmountNotRounded($amount->toDecimalString());
        }

        return new self(null, self::checkFormula($description), $inputs, $amount, $amount, null);
    }

    /**
     * @return list<TraceInput>
     */
    public function inputs(): array
    {
        return $this->inputs;
    }

    /**
     * Parámetros legales usados, incluido el de redondeo, sin repetir códigos.
     *
     * @return list<LegalParameter>
     */
    public function parameters(): array
    {
        $parameters = [];

        foreach ($this->inputs as $input) {
            if ($input->parameter !== null) {
                $parameters[$input->parameter->code] = $input->parameter;
            }
        }

        if ($this->rounding !== null) {
            $parameters[$this->rounding->parameter->code] = $this->rounding->parameter;
        }

        return array_values($parameters);
    }

    /**
     * Códigos de los parámetros PENDIENTE (AGENTS.md, regla 4), ordenados.
     *
     * @return list<string>
     */
    public function pendingParameterCodes(): array
    {
        $codes = [];

        foreach ($this->parameters() as $parameter) {
            if ($parameter->status === VerificationStatus::Pendiente) {
                $codes[] = $parameter->code;
            }
        }

        sort($codes);

        return $codes;
    }

    /** Solo si todos los parámetros usados están VALIDADO (docs/nomix/04 §0.1). */
    public function allowsProduction(): bool
    {
        foreach ($this->parameters() as $parameter) {
            if (! $parameter->status->allowsProduction()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Forma serializable para planilla_lineas.traza. Las entradas sensibles salen sin valor.
     *
     * @return array{regla: string|null, formula: string, entradas: list<array<string, mixed>>, resultado_sin_redondear: string, resultado: string, redondeo: array{regla: string, escala: int, modo: string}|null, parametros_pendientes: list<string>}
     */
    public function toArray(): array
    {
        return [
            'regla' => $this->ruleId,
            'formula' => $this->formula,
            'entradas' => array_map(static fn (TraceInput $input): array => $input->toArray(), $this->inputs),
            'resultado_sin_redondear' => $this->unroundedResult->toDecimalString(),
            'resultado' => $this->result->toDecimalString(),
            'redondeo' => $this->rounding === null ? null : [
                'regla' => RoundingRule::RULE_ID,
                'escala' => $this->rounding->policy->scale,
                'modo' => $this->rounding->policy->mode->value,
            ],
            'parametros_pendientes' => $this->pendingParameterCodes(),
        ];
    }

    private static function checkFormula(string $formula): string
    {
        if (trim($formula) === '') {
            throw RuleTraceException::emptyFormula();
        }

        return $formula;
    }
}
