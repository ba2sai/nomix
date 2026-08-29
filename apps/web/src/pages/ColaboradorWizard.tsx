import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Boton, Campo, Selector, Tarjeta } from '../components/ui';

type Datos = Record<string, string | boolean>;

const PASOS = [
  '1. Datos personales',
  '2. Contrato y cargo',
  '3. Salario y banco',
  '4. Horario',
  '5. Retenciones',
];

export function ColaboradorWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [paso, setPaso] = useState(0);
  const [d, setD] = useState<Datos>({
    tipoDocumento: 'cedula',
    tipoContrato: 'indefinido',
    tipoPlanilla: 'quincenal',
    formaPago: 'ach',
    tipoCuenta: 'ahorro',
    declaraRenta: false,
    pProbatorio: false,
    esTecnico: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const set = (k: string) => (e: { target: { value: string } }) =>
    setD((prev) => ({ ...prev, [k]: e.target.value }));
  const setBool = (k: string) => (e: { target: { checked: boolean } }) =>
    setD((prev) => ({ ...prev, [k]: e.target.checked }));

  async function guardar() {
    setError(null);
    setGuardando(true);
    try {
      // Limpia strings vacíos (campos opcionales) antes de enviar.
      const dto: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(d)) {
        if (v !== '' && v !== undefined) dto[k] = v;
      }
      await api.crearColaborador(dto);
      await qc.invalidateQueries({ queryKey: ['colaboradores'] });
      navigate('/colaboradores');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Nuevo colaborador</h1>
      <p className="mb-6 text-sm text-slate-500">Completa la ficha paso a paso</p>

      {/* Stepper */}
      <ol className="mb-6 flex flex-wrap gap-2">
        {PASOS.map((p, i) => (
          <li
            key={p}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium ${
              i === paso
                ? 'bg-marca-600 text-white'
                : i < paso
                  ? 'bg-marca-50 text-marca-700'
                  : 'bg-slate-100 text-slate-400'
            }`}
          >
            {p}
          </li>
        ))}
      </ol>

      <Tarjeta>
        {paso === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Código de empleado *" value={str(d.codEmpleado)} onChange={set('codEmpleado')} />
            <Selector etiqueta="Tipo de documento" value={str(d.tipoDocumento)} onChange={set('tipoDocumento')}>
              <option value="cedula">Cédula</option>
              <option value="pasaporte">Pasaporte</option>
            </Selector>
            <Campo etiqueta="Nombres *" value={str(d.nombres)} onChange={set('nombres')} />
            <Campo etiqueta="Apellidos *" value={str(d.apellidos)} onChange={set('apellidos')} />
            <Campo etiqueta="Identificación *" value={str(d.identificacion)} onChange={set('identificacion')} placeholder="8-848-1493" />
            <Selector etiqueta="Estado civil" value={str(d.estadoCivil)} onChange={set('estadoCivil')}>
              <option value="">—</option>
              <option value="soltero">Soltero(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="unido">Unido(a)</option>
              <option value="viudo">Viudo(a)</option>
              <option value="divorciado">Divorciado(a)</option>
            </Selector>
            <Campo etiqueta="Teléfono" value={str(d.telefono)} onChange={set('telefono')} />
            <Campo etiqueta="Correo" type="email" value={str(d.correo)} onChange={set('correo')} />
          </div>
        )}

        {paso === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Cargo" value={str(d.cargo)} onChange={set('cargo')} />
            <Selector etiqueta="Tipo de contrato" value={str(d.tipoContrato)} onChange={set('tipoContrato')}>
              <option value="indefinido">Indefinido</option>
              <option value="definido">Definido</option>
              <option value="obra">Obra determinada</option>
              <option value="servicios">Servicios profesionales</option>
            </Selector>
            <Selector etiqueta="Tipo de planilla" value={str(d.tipoPlanilla)} onChange={set('tipoPlanilla')}>
              <option value="quincenal">Quincenal</option>
              <option value="bisemanal">Bisemanal</option>
              <option value="mensual_1ra_qna">Mensual 1ra Qna</option>
              <option value="mensual_2da_qna">Mensual 2da Qna</option>
            </Selector>
            <Campo etiqueta="Fecha de ingreso *" type="date" value={str(d.fechaIngreso)} onChange={set('fechaIngreso')} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={bool(d.pProbatorio)} onChange={setBool('pProbatorio')} />
              Período probatorio
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={bool(d.esTecnico)} onChange={setBool('esTecnico')} />
              Trabajador técnico (preaviso 2 meses)
            </label>
          </div>
        )}

        {paso === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Salario mensual *" value={str(d.salarioMensual)} onChange={set('salarioMensual')} placeholder="850.00" />
            <Selector etiqueta="Forma de pago" value={str(d.formaPago)} onChange={set('formaPago')}>
              <option value="ach">Depósito / ACH</option>
              <option value="cheque">Cheque</option>
              <option value="efectivo">Efectivo</option>
            </Selector>
            <Campo etiqueta="Banco" value={str(d.idBanco)} onChange={set('idBanco')} />
            <Selector etiqueta="Tipo de cuenta" value={str(d.tipoCuenta)} onChange={set('tipoCuenta')}>
              <option value="ahorro">Ahorro</option>
              <option value="corriente">Corriente</option>
            </Selector>
            <Campo etiqueta="Cuenta bancaria (se cifra)" value={str(d.cuentaBancaria)} onChange={set('cuentaBancaria')} />
          </div>
        )}

        {paso === 3 && (
          <div className="text-sm text-slate-500">
            El módulo de horarios y marcaciones se agrega en una etapa posterior. Puedes continuar.
          </div>
        )}

        {paso === 4 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={bool(d.declaraRenta)} onChange={setBool('declaraRenta')} />
              Declara Impuesto Sobre la Renta
            </label>
            <Campo etiqueta="Gastos de representación" value={str(d.gastoRep)} onChange={set('gastoRep')} placeholder="0.00" />
            {/* Decreto 19 de 1973 Art. 3o: si la empresa paga aguinaldo pactado o
                acostumbrado, la 3a partida del XIII se compara contra el y se
                paga la suma mas favorable al trabajador. */}
            <Campo
              etiqueta="Aguinaldo acostumbrado"
              value={str(d.montoAguinaldo)}
              onChange={set('montoAguinaldo')}
              placeholder="0.00"
            />
            <p className="text-xs text-slate-400 sm:col-span-2">
              El aguinaldo solo se usa si la empresa lo tiene pactado. Compite con la 3.ª partida
              del XIII Mes y se paga el mayor de los dos (Decreto 19 de 1973, Art. 3.º).
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-between">
          <Boton
            variante="secundario"
            disabled={paso === 0}
            onClick={() => setPaso((p) => p - 1)}
          >
            Atrás
          </Boton>
          {paso < PASOS.length - 1 ? (
            <Boton onClick={() => setPaso((p) => p + 1)}>Siguiente</Boton>
          ) : (
            <Boton onClick={() => void guardar()} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar colaborador'}
            </Boton>
          )}
        </div>
      </Tarjeta>
    </div>
  );
}

function str(v: string | boolean | undefined): string {
  return typeof v === 'string' ? v : '';
}
function bool(v: string | boolean | undefined): boolean {
  return v === true;
}
