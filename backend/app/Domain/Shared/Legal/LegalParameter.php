<?php

declare(strict_types=1);

namespace App\Domain\Shared\Legal;

use App\Domain\Shared\Period\CalendarDate;
use DateTimeImmutable;
use DateTimeInterface;

/**
 * Una fila de `parametros_legales`: un valor (tasa, monto, cantidad) o una tabla
 * (tramos) con su vigencia, la regla que lo respalda y su estado de verificación.
 *
 * El valor es un string decimal, nunca float. Una vigencia sin inicio o sin fin
 * es abierta por ese lado.
 */
final readonly class LegalParameter
{
    private const string DECIMAL_PATTERN = '/^-?\d+(\.\d+)?$/';

    private const string RULE_ID_PATTERN = '/^RULE-\d{3}$/';

    /**
     * @param  array<string, mixed>|null  $table
     */
    private function __construct(
        public string $code,
        public string $ruleId,
        private ?string $value,
        private ?array $table,
        public ?DateTimeImmutable $validFrom,
        public ?DateTimeImmutable $validUntil,
        public VerificationStatus $status,
        public string $source,
    ) {}

    /**
     * @param  array<string, mixed>|null  $table
     */
    public static function of(
        string $code,
        string $ruleId,
        ?string $value,
        ?array $table,
        ?DateTimeInterface $validFrom,
        ?DateTimeInterface $validUntil,
        VerificationStatus $status,
        string $source,
    ): self {
        if ($code === '') {
            throw LegalParameterException::emptyCode();
        }

        if (preg_match(self::RULE_ID_PATTERN, $ruleId) !== 1) {
            throw LegalParameterException::invalidRuleId($code, $ruleId);
        }

        if (($value === null) === ($table === null)) {
            throw LegalParameterException::valueOrTableRequired($code);
        }

        if ($value !== null && preg_match(self::DECIMAL_PATTERN, $value) !== 1) {
            throw LegalParameterException::invalidValue($code, $value);
        }

        $from = $validFrom === null ? null : CalendarDate::from($validFrom);
        $until = $validUntil === null ? null : CalendarDate::from($validUntil);

        if ($from !== null && $until !== null && $until < $from) {
            throw LegalParameterException::invalidPeriod($code);
        }

        return new self($code, $ruleId, $value, $table, $from, $until, $status, $source);
    }

    /** Vigencia inclusiva por ambos extremos. */
    public function appliesOn(DateTimeInterface $date): bool
    {
        $day = CalendarDate::from($date);

        return ($this->validFrom === null || $day >= $this->validFrom)
            && ($this->validUntil === null || $day <= $this->validUntil);
    }

    /** Valor decimal como string, p. ej. '0.132500' para 13.25%. */
    public function value(): string
    {
        if ($this->value === null) {
            throw LegalParameterException::isTable($this->code);
        }

        return $this->value;
    }

    /**
     * Tabla (tramos de ISR, escala de indemnización, política de redondeo).
     *
     * @return array<string, mixed>
     */
    public function table(): array
    {
        if ($this->table === null) {
            throw LegalParameterException::isValue($this->code);
        }

        return $this->table;
    }

    public function isTable(): bool
    {
        return $this->table !== null;
    }

    /** Mismo código, regla, valor o tabla, vigencia, estado y fuente. */
    public function equals(self $other): bool
    {
        return $this->code === $other->code
            && $this->ruleId === $other->ruleId
            && $this->value === $other->value
            && $this->table === $other->table
            && $this->validFrom?->format('Y-m-d') === $other->validFrom?->format('Y-m-d')
            && $this->validUntil?->format('Y-m-d') === $other->validUntil?->format('Y-m-d')
            && $this->status === $other->status
            && $this->source === $other->source;
    }
}
