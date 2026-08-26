import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { Boton, Campo, Tarjeta } from '../components/ui';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@nomix.pa');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Tarjeta className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl">🧾</div>
          <h1 className="mt-2 text-2xl font-bold text-marca-700">Nomix</h1>
          <p className="text-sm text-slate-500">Nómina inteligente</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Campo
            etiqueta="Correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <Campo
            etiqueta="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Boton type="submit" disabled={cargando} className="w-full">
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </Boton>
        </form>
      </Tarjeta>
    </div>
  );
}
