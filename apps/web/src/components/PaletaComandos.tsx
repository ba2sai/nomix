import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { Permiso } from '../lib/api';

interface Comando {
  id: string;
  etiqueta: string;
  pista: string;
  icono: string;
  /** Permiso necesario; si falta, el comando NO se lista (`ADR-018`). */
  requiere?: Permiso;
  ejecutar: (nav: ReturnType<typeof useNavigate>) => void;
}

const COMANDOS: Comando[] = [
  {
    id: 'colaboradores',
    etiqueta: 'Ir a Colaboradores',
    pista: 'Ver la lista de personal',
    icono: '👥',
    requiere: 'colaborador:leer',
    ejecutar: (nav) => {
      void nav('/colaboradores');
    },
  },
  {
    id: 'colaborador-nuevo',
    etiqueta: 'Nuevo colaborador',
    pista: 'Abrir el asistente de alta',
    icono: '➕',
    requiere: 'colaborador:escribir',
    ejecutar: (nav) => {
      void nav('/colaboradores/nuevo');
    },
  },
  {
    id: 'planillas',
    etiqueta: 'Ir a Planillas',
    pista: 'Períodos y su estado',
    icono: '🧮',
    requiere: 'planilla:leer',
    ejecutar: (nav) => {
      void nav('/planilla');
    },
  },
  {
    id: 'cambiar-empresa',
    etiqueta: 'Cambiar de empresa',
    pista: 'Elegir otro inquilino activo',
    icono: '🏢',
    ejecutar: (nav) => {
      void nav('/seleccionar-empresa');
    },
  },
];

/**
 * Paleta de comandos (Cmd+K / Ctrl+K).
 *
 * Dos decisiones que no son de estilo:
 *
 * 1. **Filtra por permiso.** Un buscador que ofrece "Aprobar planilla" a quien
 *    no puede aprobarla convierte la matriz de ADR-018 en una sorpresa: el
 *    usuario encuentra la acción, la ejecuta y recibe un 403. Lo que no se
 *    puede hacer, no se lista. La autorización real sigue siendo del servidor
 *    — esto solo evita ofrecer callejones sin salida.
 *
 * 2. **No se queda con el atajo del navegador.** Solo intercepta Cmd/Ctrl+K,
 *    que en la práctica nadie usa para otra cosa dentro de una app, y Escape
 *    siempre cierra. Nada de capturar teclas sueltas mientras se escribe en un
 *    formulario de salarios.
 */
export function PaletaComandos() {
  const [abierta, setAbierta] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { puede } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAbierta((v) => !v);
        setConsulta('');
        setCursor(0);
      }
      if (e.key === 'Escape') {
        setAbierta(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (abierta) inputRef.current?.focus();
  }, [abierta]);

  const visibles = useMemo(() => {
    const permitidos = COMANDOS.filter((c) => !c.requiere || puede(c.requiere));
    const q = consulta.trim().toLowerCase();
    if (!q) return permitidos;
    return permitidos.filter(
      (c) => c.etiqueta.toLowerCase().includes(q) || c.pista.toLowerCase().includes(q),
    );
  }, [consulta, puede]);

  // El cursor no puede quedar apuntando fuera de la lista al filtrar.
  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(visibles.length - 1, 0)));
  }, [visibles.length]);

  if (!abierta) return null;

  const ejecutar = (c: Comando) => {
    setAbierta(false);
    c.ejecutar(navigate);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (c + 1) % Math.max(visibles.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + visibles.length) % Math.max(visibles.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = visibles[cursor];
      if (c) ejecutar(c);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
      <button className="absolute inset-0 bg-slate-900/30" onClick={() => {
          setAbierta(false);
        }} tabIndex={-1} aria-label="Cerrar" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4">
          <span className="text-slate-400">⌘</span>
          <input
            ref={inputRef}
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar acción…"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-slate-400"
            aria-label="Buscar acción"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {visibles.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-400">
              Nada que coincida con “{consulta}”.
            </li>
          )}
          {visibles.map((c, i) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  ejecutar(c);
                }}
                onMouseEnter={() => {
                  setCursor(i);
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                  i === cursor ? 'bg-marca-50 text-marca-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{c.icono}</span>
                <span className="flex-1">
                  <span className="block font-medium">{c.etiqueta}</span>
                  <span className="block text-xs text-slate-400">{c.pista}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-400">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>esc cerrar</span>
        </div>
      </div>
    </div>
  );
}
