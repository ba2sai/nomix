<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Shared\Legal\LegalParameterCode as Code;
use App\Domain\Shared\Legal\VerificationStatus as Status;
use App\Infrastructure\Persistence\Legal\LegalParameterRecord;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Carga en parametros_legales todos los valores del catálogo docs/nomix/04 con su
 * estado de verificación y su fuente. Es idempotente: cada fila se identifica por
 * (codigo, vigente_desde) y se actualiza si ya existe. Se ejecuta con el rol de
 * migraciones (`artisan migrate --seed`).
 *
 * Los números van como string y los tramos usan strings decimales para que nada pase
 * por float. Una vigencia sin `desde` significa "antes de lo documentado"; sin `hasta`,
 * "vigente hoy". Si el catálogo cambia, cambia este archivo en el mismo PR (04 §0.2).
 */
final class ParametrosLegalesSeeder extends Seeder
{
    private const string CSS_LEY_51 = 'Ley 51 de 2005 (Orgánica de la CSS), reformada por la Ley 462 de 18 de marzo de 2025';

    private const string CSS_LEY_462 = 'Ley 462 de 18 de marzo de 2025 (aumento escalonado de la cuota patronal)';

    private const string CODIGO_FISCAL_700 = 'Código Fiscal, Art. 700 (tarifa publicada por la DGI)';

    private const string CODIGO_TRABAJO = 'Código de Trabajo';

    private const string PLANIFACIL = 'Observado en PlaniFácil (OBSERVED); sin fuente legal confirmada';

    public function run(): void
    {
        DB::transaction(function (): void {
            foreach ($this->catalog() as $row) {
                $record = LegalParameterRecord::query()
                    ->where('codigo', $row['codigo'])
                    ->where('vigente_desde', $row['vigente_desde'])
                    ->first() ?? new LegalParameterRecord;

                $record->fill($row)->save();
            }
        });
    }

    /**
     * @return list<array{codigo: string, rule_id: string, valor: string|null, valor_json: array<string, mixed>|null, vigente_desde: string|null, vigente_hasta: string|null, estado_verificacion: string, fuente: string}>
     */
    private function catalog(): array
    {
        return [
            // 1. Seguridad Social (CSS)
            $this->value(Code::CssObreroSalario, 'RULE-001', '0.0975', null, null, Status::ConfirmadoSecundario, self::CSS_LEY_51.'. Sin tope de cotización. Pendiente: conceptos de la base gravable.'),
            $this->value(Code::CssPatronalSalario, 'RULE-002', '0.1225', null, '2025-03-31', Status::ConfirmadoSecundario, self::CSS_LEY_51.'. Valor histórico anterior a la Ley 462; inicio no documentado.'),
            $this->value(Code::CssPatronalSalario, 'RULE-002', '0.1325', '2025-04-01', '2027-02-28', Status::ConfirmadoSecundario, self::CSS_LEY_462),
            $this->value(Code::CssPatronalSalario, 'RULE-002', '0.1425', '2027-03-01', '2029-02-28', Status::ConfirmadoSecundario, self::CSS_LEY_462),
            $this->value(Code::CssPatronalSalario, 'RULE-002', '0.1525', '2029-03-01', null, Status::ConfirmadoSecundario, self::CSS_LEY_462),
            $this->value(Code::CssObreroXiii, 'RULE-003', '0.0725', null, null, Status::Parcial, 'Una fuente secundaria más PlaniFácil. Confirmar vigencia tras la Ley 462.'),
            $this->value(Code::CssPatronalXiii, 'RULE-004', '0.1075', null, null, Status::Pendiente, 'Confirmar si la Ley 462 modificó esta cuota.'),
            $this->value(Code::SeObreroSalario, 'RULE-005', '0.0125', null, null, Status::ConfirmadoSecundario, 'Seguro Educativo obrero sobre salario bruto. No se aplica al XIII mes.'),
            $this->value(Code::SePatronalSalario, 'RULE-006', '0.0150', null, null, Status::ConfirmadoSecundario, 'Seguro Educativo patronal sobre salario bruto.'),
            $this->value(Code::RiesgoProfesionalTasaMinima, 'RULE-007', '0.0098', null, null, Status::Parcial, 'Rango aproximado según fuentes secundarias; la tasa real la asigna la CSS a cada empresa (empresas.tasa_riesgo_profesional).'),
            $this->value(Code::RiesgoProfesionalTasaMaxima, 'RULE-007', '0.0567', null, null, Status::Parcial, 'Rango aproximado según fuentes secundarias; la tasa real la asigna la CSS a cada empresa (empresas.tasa_riesgo_profesional).'),

            // 2. Impuesto sobre la Renta (ISR)
            $this->table(Code::IsrTarifaAnual, 'RULE-010', [
                // impuesto = impuesto_fijo + tasa × (renta − excedente_sobre), para renta en (excedente_sobre, hasta].
                'tramos' => [
                    ['excedente_sobre' => '0.00', 'hasta' => '11000.00', 'tasa' => '0', 'impuesto_fijo' => '0.00'],
                    ['excedente_sobre' => '11000.00', 'hasta' => '50000.00', 'tasa' => '0.15', 'impuesto_fijo' => '0.00'],
                    ['excedente_sobre' => '50000.00', 'hasta' => null, 'tasa' => '0.25', 'impuesto_fijo' => '5850.00'],
                ],
            ], null, null, Status::ConfirmadoSecundario, self::CODIGO_FISCAL_700),
            $this->value(Code::IsrProyeccionFactorAnual, 'RULE-011', '13', null, null, Status::Pendiente, 'Práctica común: renta anual = salario mensual × 13 (12 meses más XIII mes). Método exacto de retención sin confirmar.'),
            $this->value(Code::IsrDeduccionDeclaracionConjunta, 'RULE-011', '800.00', null, null, Status::Pendiente, self::PLANIFACIL.'. Deducción básica por declaración conjunta.'),
            $this->value(Code::IsrDeduccionDependiente, 'RULE-011', '250.00', null, null, Status::Pendiente, self::PLANIFACIL.'. Deducción por dependiente.'),
            $this->table(Code::IsrGastosRepresentacionTarifa, 'RULE-012', [
                'tramos' => [
                    ['excedente_sobre' => '0.00', 'hasta' => '25000.00', 'tasa' => '0.10', 'impuesto_fijo' => '0.00'],
                    ['excedente_sobre' => '25000.00', 'hasta' => null, 'tasa' => '0.15', 'impuesto_fijo' => '2500.00'],
                ],
            ], '2010-07-01', null, Status::ConfirmadoSecundario, self::CODIGO_FISCAL_700.'; Ley 8 de 2010, vigente desde julio de 2010 (se toma el día 1). Pendiente: si cotizan CSS y SE.'),

            // 3. Jornada, sobretiempo y recargos
            $this->value(Code::HoraExtraRecargoDiurno, 'RULE-020', '0.25', null, null, Status::ConfirmadoSecundario, self::CODIGO_TRABAJO.', Art. 33. Hora extra en período diurno.'),
            $this->value(Code::HoraExtraRecargoNocturno, 'RULE-020', '0.50', null, null, Status::ConfirmadoSecundario, self::CODIGO_TRABAJO.', Art. 33. Hora extra nocturna o extensión de jornada mixta iniciada de día.'),
            $this->value(Code::HoraExtraRecargoExtensionNocturna, 'RULE-020', '0.75', null, null, Status::ConfirmadoSecundario, self::CODIGO_TRABAJO.', Art. 33. Extensión de jornada nocturna o de jornada mixta iniciada de noche.'),
            $this->value(Code::HoraExtraMaximoDiario, 'RULE-020', '3', null, null, Status::ConfirmadoSecundario, self::CODIGO_TRABAJO.', Art. 33. Límite: generar alerta, no bloquear.'),
            $this->value(Code::HoraExtraMaximoSemanal, 'RULE-020', '9', null, null, Status::ConfirmadoSecundario, self::CODIGO_TRABAJO.', Art. 33. Límite: generar alerta, no bloquear.'),
            $this->value(Code::RecargoDomingoDescanso, 'RULE-021', '0.50', null, null, Status::Pendiente, self::PLANIFACIL.'. Recargo por domingo o día de descanso semanal.'),
            $this->value(Code::RecargoDiaFiesta, 'RULE-021', '1.50', null, null, Status::Pendiente, self::PLANIFACIL.'. Recargo por día de fiesta o duelo nacional.'),
            $this->value(Code::HorasMensualesJornada48, 'RULE-022', '208', null, null, Status::Pendiente, self::PLANIFACIL.'. Horas mensuales para jornada de 48 h semanales. Confirmar la fórmula legal.'),

            // 4. Décimo tercer mes
            $this->value(Code::XiiiDivisor, 'RULE-030', '12', null, null, Status::Parcial, 'Decreto de Gabinete 221 de 1971 y reformas: salarios devengados en la partida ÷ 12. Pendiente: conceptos de la base.'),

            // 5. Vacaciones
            $this->value(Code::VacacionesDiasPorPeriodo, 'RULE-040', '30', null, null, Status::ConfirmadoSecundario, self::CODIGO_TRABAJO.', Art. 54. 30 días por cada 11 meses continuos.'),
            $this->value(Code::VacacionesMesesPorPeriodo, 'RULE-040', '11', null, null, Status::ConfirmadoSecundario, self::CODIGO_TRABAJO.', Art. 54.'),
            $this->value(Code::VacacionesDiasServicioPorDia, 'RULE-040', '11', null, null, Status::ConfirmadoSecundario, self::CODIGO_TRABAJO.', Art. 54. Un día de vacaciones por cada 11 días de servicio.'),

            // 6. Terminación de la relación laboral
            $this->value(Code::PrimaAntiguedadSemanasPorAnio, 'RULE-050', '1', null, null, Status::Parcial, self::CODIGO_TRABAJO.', Art. 224. Una semana de salario por año de servicio continuo, con proporción por fracción. Pendiente: salario base.'),
            $this->table(Code::IndemnizacionEscala, 'RULE-051', [
                'tramos' => [
                    ['hasta_anios' => 10, 'semanas_por_anio' => '3.4'],
                    ['hasta_anios' => null, 'semanas_por_anio' => '1'],
                ],
            ], null, null, Status::Parcial, self::CODIGO_TRABAJO.', Art. 225, modificado por la Ley 44 de 1995. Pendiente: escalas según fecha de inicio, salario base y mínimo.'),
            $this->value(Code::PreavisoDespidoDias, 'RULE-052', '30', null, null, Status::Pendiente, self::PLANIFACIL.'. Despido sin preaviso: el empleador paga 30 días de salario.'),
            $this->value(Code::PreavisoRenunciaDias, 'RULE-052', '15', null, null, Status::Pendiente, self::PLANIFACIL.'. Preaviso del trabajador al renunciar.'),
            $this->value(Code::PreavisoRenunciaDescuentoSemanas, 'RULE-052', '1', null, null, Status::Pendiente, self::PLANIFACIL.'. Renuncia sin preaviso: se descuenta una semana de salario.'),

            // 9. Redondeo
            $this->table(Code::RedondeoPolitica, 'RULE-080', [
                'escala' => 2,
                'modo' => 'HALF_UP',
                'escala_intermedia' => 6,
            ], null, null, Status::Pendiente, 'Propuesta del catálogo: intermedios con al menos 6 decimales y redondeo HALF_UP a 2 decimales por concepto. Confirmar con el contador y con el formato del SIPE.'),
        ];
    }

    /**
     * @return array{codigo: string, rule_id: string, valor: string, valor_json: null, vigente_desde: string|null, vigente_hasta: string|null, estado_verificacion: string, fuente: string}
     */
    private function value(Code $code, string $ruleId, string $value, ?string $from, ?string $until, Status $status, string $source): array
    {
        return [
            'codigo' => $code->value,
            'rule_id' => $ruleId,
            'valor' => $value,
            'valor_json' => null,
            'vigente_desde' => $from,
            'vigente_hasta' => $until,
            'estado_verificacion' => $status->value,
            'fuente' => $source,
        ];
    }

    /**
     * @param  array<string, mixed>  $table
     * @return array{codigo: string, rule_id: string, valor: null, valor_json: array<string, mixed>, vigente_desde: string|null, vigente_hasta: string|null, estado_verificacion: string, fuente: string}
     */
    private function table(Code $code, string $ruleId, array $table, ?string $from, ?string $until, Status $status, string $source): array
    {
        return [
            'codigo' => $code->value,
            'rule_id' => $ruleId,
            'valor' => null,
            'valor_json' => $table,
            'vigente_desde' => $from,
            'vigente_hasta' => $until,
            'estado_verificacion' => $status->value,
            'fuente' => $source,
        ];
    }
}
