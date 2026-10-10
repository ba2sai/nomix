<?php

declare(strict_types=1);

namespace App\Domain\Shared\Rules;

use App\Domain\Shared\Legal\LegalParameter;
use App\Domain\Shared\Legal\VerificationStatus;
use App\Domain\Shared\Money\Money;
use JsonSerializable;

/**
 * Traza de un cálculo (docs/nomix/05 §2.2): regla, fórmula legible, entradas, resultado
 * sin redondear y resultado redondeado. Alimenta el Inspection Drawer y se guarda en
 * planilla_lineas.traza.
 *
 * - calculated(): un cálculo legal; siempre cita su RULE-xxx y redondea según RULE-080.
 * - entered(): un monto que no sale de una regla (p. ej. un bono registrado como novedad).
 *
 * json_encode(), print_r() y var_dump() usan la misma forma que toArray(), así que las
 * entradas sensibles nunca salen en claro.
 */
final readonly class RuleTrace implements JsonSerializable
{
    private const string RULE_ID_PATTERN = '/^RULE-\d{3}$/';

    /** @var list<LegalParameter> */
    private array $parameters;

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
    ) {
        $this->parameters = self::distinctParameters($inputs, $rounding);
    }

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
        return $this->parameters;
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

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    /**
     * @return array<string, mixed>
     */
    public function __debugInfo(): array
    {
        return $this->toArray();
    }

    /**
     * Un código solo puede aparecer repetido si es el mismo parámetro. Dos versiones
     * distintas (p. ej. una PENDIENTE y otra VALIDADO) se rechazan: quedarse con una
     * ocultaría la otra de pendingParameterCodes() y allowsProduction().
     *
     * @param  list<TraceInput>  $inputs
     * @return list<LegalParameter>
     */
    private static function distinctParameters(array $inputs, ?RoundingRule $rounding): array
    {
        $used = [];

        foreach ($inputs as $input) {
            if ($input->parameter !== null) {
                $used[] = $input->parameter;
            }
        }

        if ($rounding !== null) {
            $used[] = $rounding->parameter;
        }

        $parameters = [];

        foreach ($used as $parameter) {
            $known = $parameters[$parameter->code] ?? null;

            if ($known !== null && ! $known->equals($parameter)) {
                throw RuleTraceException::conflictingParameter($parameter->code);
            }

            $parameters[$parameter->code] = $parameter;
        }

        return array_values($parameters);
    }

    private static function checkFormula(string $formula): string
    {
        if (trim($formula) === '') {
            throw RuleTraceException::emptyFormula();
        }

        return $formula;
    }
}
