import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ColaboradorDetalle as ColaboradorDetalleDto } from '../lib/api';
import { Boton, Campo, Selector, Tarjeta } from '../components/ui';
import { useAuth } from '../lib/auth';
import { ConceptosColaboradorPanel } from './ConceptosColaboradorPanel';
import { DocumentosColaboradorPanel } from './DocumentosColaboradorPanel';

type Datos = Record<string, string | boolean>;

const PESTANAS = [
  { id: 'datos', etiqueta: 'Datos' },
  { id: 'conceptos', etiqueta: 'Conceptos fijos' },
  { id: 'documentos', etiqueta: 'Documentos' },
] as const;
type PestanaId = (typeof PESTANAS)[number]['id'];

/**
 * Ficha del colaborador — antes solo existía el alta (`ColaboradorWizard`):
 * una vez creado, no había forma de corregir un dato mal tecleado ni de
 * revisar sus documentos. Esta pantalla cierra ese hueco con tres pestañas
 * sobre `/colaboradores/:id`.
 *
 * Cada pestaña decide por sí misma qué mostrar cuando el rol no escribe
 * (`ADR-018`): la de Datos se convierte en ficha de solo lectura en vez de
 * un formulario con inputs deshabilitados por todas partes, y las de
 * Conceptos/Documentos simplemente ocultan los controles de alta y borrado.
 */
export function ColaboradorDetalle() {
  const { id } = useParams<{ id: string }>();
  const { puede } = useAuth();
  const [pestana, setPestana] = useState<PestanaId>('datos');
  const soloLectura = !puede('colaborador:escribir');

  const { data, isLoading, error } = useQuery({
    queryKey: ['colaborador', id],
    // `enabled` no estrecha el tipo de `id` para `queryFn`: react-query no
    // ejecuta la consulta mientras `enabled` sea falso, así que en la práctica
    // nunca corre con `id` vacío, pero TypeScript no puede saberlo.
    queryFn: () => api.colaborador(id ?? ''),
    enabled: Boolean(id),
  });

  // Ruta mal formada (sin :id) — React Router no debería dejar llegar aquí,
  // pero useParams no lo garantiza en el tipo.
  if (!id) return <p className="text-red-600">Falta el identificador del colaborador.</p>;

  return (
    <div>
      <Link to="/colaboradores" className="mb-4 inline-block text-sm text-marca-600 hover:underline">
        ← Volver a colaboradores
      </Link>

      {isLoading && <p className="text-slate-500">Cargando…</p>}
      {error && <p className="text-red-600">{error.message}</p>}

      {data && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {data.nombres} {data.apellidos}
              </h1>
              <p className="text-sm text-slate-500">
                {data.codEmpleado} · {data.cargo ?? 'Sin cargo asignado'}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                data.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {data.status}
            </span>
          </div>

          {soloLectura && (
            <p className="mb-4 rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-500">
              Estás viendo esta ficha en modo lectura. Tu rol no edita colaboradores.
            </p>
          )}

          <div role="tablist" aria-label="Secciones de la ficha" className="mb-6 flex flex-wrap gap-2">
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={pestana === p.id}
                onClick={() => {
                  setPestana(p.id);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  pestana === p.id
                    ? 'bg-marca-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>

          {pestana === 'datos' && <DatosTab colaborador={data} soloLectura={soloLectura} />}
          {pestana === 'conceptos' && (
            <ConceptosColaboradorPanel colaboradorId={id} soloLectura={soloLectura} />
          )}
          {pestana === 'documentos' && (
            <DocumentosColaboradorPanel colaboradorId={id} soloLectura={soloLectura} />
          )}
        </>
      )}
    </div>
  );
}

function construirDatos(c: ColaboradorDetalleDto): Datos {
  return {
    codEmpleado: c.codEmpleado,
    tipoDocumento: c.tipoDocumento,
    nombres: c.nombres,
    apellidos: c.apellidos,
    identificacion: c.identificacion,
    estadoCivil: c.estadoCivil ?? '',
    telefono: c.telefono ?? '',
    correo: c.correo ?? '',
    cargo: c.cargo ?? '',
    tipoContrato: c.tipoContrato,
    tipoPlanilla: c.tipoPlanilla,
    fechaIngreso: c.fechaIngreso,
    pProbatorio: c.pProbatorio,
    esTecnico: c.esTecnico,
    salarioMensual: c.salarioMensual,
    formaPago: c.formaPago ?? '',
    idBanco: c.idBanco ?? '',
    tipoCuenta: c.tipoCuenta ?? '',
    cuentaBancaria: c.cuentaBancaria ?? '',
    declaraRenta: c.declaraRenta,
    gastoRep: c.gastoRep ?? '',
    montoAguinaldo: c.montoAguinaldo ?? '',
  };
}

function DatosTab({
  colaborador,
  soloLectura,
}: {
  colaborador: ColaboradorDetalleDto;
  soloLectura: boolean;
}) {
  if (soloLectura) return <FichaSoloLectura colaborador={colaborador} />;
  return <FormularioEdicion colaborador={colaborador} />;
}

/**
 * Formulario editable. Reusa los mismos campos del wizard de alta
 * (`ColaboradorWizard`), pero como un formulario único con secciones en vez
 * de pasos: aquí no se está dando de alta, se está corrigiendo un dato
 * puntual, y obligar a recorrer 5 pasos para cambiar un teléfono sería
 * repetir el problema de UX que este proyecto existe para resolver.
 */
function FormularioEdicion({ colaborador }: { colaborador: ColaboradorDetalleDto }) {
  const qc = useQueryClient();
  const [d, setD] = useState<Datos>(() => construirDatos(colaborador));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);

  // Se re-siembra solo al cambiar de colaborador (dependencia intencional:
  // solo `colaborador.id`), no en cada refetch: así un guardado exitoso no le
  // "borra" al usuario ediciones que haya seguido escribiendo mientras la
  // mutación estaba en vuelo.
  useEffect(() => {
    setD(construirDatos(colaborador));
    setGuardadoOk(false);
  }, [colaborador.id]);

  const set = (k: string) => (e: { target: { value: string } }) => {
    setD((prev) => ({ ...prev, [k]: e.target.value }));
    setGuardadoOk(false);
  };
  const setBool = (k: string) => (e: { target: { checked: boolean } }) => {
    setD((prev) => ({ ...prev, [k]: e.target.checked }));
    setGuardadoOk(false);
  };

  async function guardar() {
    setError(null);
    setGuardando(true);
    setGuardadoOk(false);
    try {
      // Mismo criterio que el wizard: los strings vacíos de campos opcionales
      // no se envían. Consecuencia declarada: hoy no hay forma de VACIAR un
      // campo opcional ya cargado desde esta pantalla, solo de reemplazarlo.
      const dto: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(d)) {
        if (v !== '') dto[k] = v;
      }
      await api.actualizarColaborador(colaborador.id, dto);
      await qc.invalidateQueries({ queryKey: ['colaborador', colaborador.id] });
      await qc.invalidateQueries({ queryKey: ['colaboradores'] });
      setGuardadoOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Tarjeta>
        <h3 className="mb-4 font-semibold text-slate-800">Datos personales</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Código de empleado *" value={str(d.codEmpleado)} onChange={set('codEmpleado')} />
          <Selector etiqueta="Tipo de documento" value={str(d.tipoDocumento)} onChange={set('tipoDocumento')}>
            <option value="cedula">Cédula</option>
            <option value="pasaporte">Pasaporte</option>
          </Selector>
          <Campo etiqueta="Nombres *" value={str(d.nombres)} onChange={set('nombres')} />
          <Campo etiqueta="Apellidos *" value={str(d.apellidos)} onChange={set('apellidos')} />
          <Campo
            etiqueta="Identificación *"
            value={str(d.identificacion)}
            onChange={set('identificacion')}
            placeholder="8-848-1493"
          />
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
      </Tarjeta>

      <Tarjeta>
        <h3 className="mb-4 font-semibold text-slate-800">Contrato y cargo</h3>
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
          <Campo
            etiqueta="Fecha de ingreso *"
            type="date"
            value={str(d.fechaIngreso)}
            onChange={set('fechaIngreso')}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={bool(d.pProbatorio)} onChange={setBool('pProbatorio')} />
            Período probatorio
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={bool(d.esTecnico)} onChange={setBool('esTecnico')} />
            Trabajador técnico (preaviso 2 meses)
          </label>
        </div>
      </Tarjeta>

      <Tarjeta>
        <h3 className="mb-4 font-semibold text-slate-800">Salario y banco</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Salario mensual *"
            value={str(d.salarioMensual)}
            onChange={set('salarioMensual')}
            placeholder="850.00"
          />
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
      </Tarjeta>

      <Tarjeta>
        <h3 className="mb-4 font-semibold text-slate-800">Retenciones</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={bool(d.declaraRenta)} onChange={setBool('declaraRenta')} />
            Declara Impuesto Sobre la Renta
          </label>
          <Campo
            etiqueta="Gastos de representación"
            value={str(d.gastoRep)}
            onChange={set('gastoRep')}
            placeholder="0.00"
          />
          <Campo
            etiqueta="Aguinaldo acostumbrado"
            value={str(d.montoAguinaldo)}
            onChange={set('montoAguinaldo')}
            placeholder="0.00"
          />
          <p className="text-xs text-slate-400 sm:col-span-2">
            El aguinaldo solo se usa si la empresa lo tiene pactado. Compite con la 3.ª partida del
            XIII Mes y se paga el mayor de los dos (Decreto 19 de 1973, Art. 3.º).
          </p>
        </div>
      </Tarjeta>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {guardadoOk && !error && <p className="text-sm text-green-600">Cambios guardados.</p>}

      <div className="flex justify-end">
        <Boton
          onClick={() => {
            void guardar();
          }}
          disabled={guardando}
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Boton>
      </div>
    </div>
  );
}

/**
 * Vista de solo lectura para roles que no editan (`contador_auditor`, por
 * ejemplo). Deliberadamente NO es el formulario con `disabled` en cada
 * input: eso se ve como una pantalla rota. Es una ficha de datos, como la que
 * un auditor esperaría poder imprimir.
 */
function FichaSoloLectura({ colaborador: c }: { colaborador: ColaboradorDetalleDto }) {
  return (
    <div className="space-y-6">
      <Tarjeta>
        <h3 className="mb-4 font-semibold text-slate-800">Datos personales</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Dato etiqueta="Código de empleado" valor={c.codEmpleado} />
          <Dato etiqueta="Tipo de documento" valor={c.tipoDocumento === 'cedula' ? 'Cédula' : 'Pasaporte'} />
          <Dato etiqueta="Nombres" valor={c.nombres} />
          <Dato etiqueta="Apellidos" valor={c.apellidos} />
          <Dato etiqueta="Identificación" valor={c.identificacion} />
          <Dato etiqueta="Estado civil" valor={c.estadoCivil ?? '—'} />
          <Dato etiqueta="Teléfono" valor={c.telefono ?? '—'} />
          <Dato etiqueta="Correo" valor={c.correo ?? '—'} />
        </div>
      </Tarjeta>

      <Tarjeta>
        <h3 className="mb-4 font-semibold text-slate-800">Contrato y cargo</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Dato etiqueta="Cargo" valor={c.cargo ?? '—'} />
          <Dato etiqueta="Tipo de contrato" valor={c.tipoContrato} />
          <Dato etiqueta="Tipo de planilla" valor={c.tipoPlanilla} />
          <Dato etiqueta="Fecha de ingreso" valor={c.fechaIngreso} />
          <Dato etiqueta="Período probatorio" valor={c.pProbatorio ? 'Sí' : 'No'} />
          <Dato etiqueta="Trabajador técnico" valor={c.esTecnico ? 'Sí' : 'No'} />
        </div>
      </Tarjeta>

      <Tarjeta>
        <h3 className="mb-4 font-semibold text-slate-800">Salario y banco</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Dato etiqueta="Salario mensual" valor={`B/. ${Number(c.salarioMensual).toFixed(2)}`} />
          <Dato etiqueta="Forma de pago" valor={c.formaPago ?? '—'} />
          <Dato etiqueta="Banco" valor={c.idBanco ?? '—'} />
          <Dato etiqueta="Tipo de cuenta" valor={c.tipoCuenta ?? '—'} />
          <Dato etiqueta="Cuenta bancaria" valor={c.cuentaBancaria ?? '—'} />
        </div>
      </Tarjeta>

      <Tarjeta>
        <h3 className="mb-4 font-semibold text-slate-800">Retenciones</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Dato etiqueta="Declara ISR" valor={c.declaraRenta ? 'Sí' : 'No'} />
          <Dato
            etiqueta="Gastos de representación"
            valor={c.gastoRep ? `B/. ${Number(c.gastoRep).toFixed(2)}` : '—'}
          />
          <Dato
            etiqueta="Aguinaldo acostumbrado"
            valor={c.montoAguinaldo ? `B/. ${Number(c.montoAguinaldo).toFixed(2)}` : '—'}
          />
        </div>
      </Tarjeta>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{etiqueta}</div>
      <div className="text-sm text-slate-800">{valor}</div>
    </div>
  );
}

function str(v: string | boolean | undefined): string {
  return typeof v === 'string' ? v : '';
}
function bool(v: string | boolean | undefined): boolean {
  return v === true;
}
