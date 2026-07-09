import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../lib/auth';

/** Protege rotas. Sem sessão -> /entrar. Papel insuficiente -> aviso. */
export default function RequireAuth({ role, children }: { role?: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="px-5 md:px-10 py-32 text-center text-fog">Carregando…</div>;
  }

  if (!user) {
    return <Navigate to="/entrar" state={{ from: location.pathname }} replace />;
  }

  if (role && user.role !== role) {
    return (
      <div className="px-5 md:px-10 py-32 text-center">
        <p className="font-mono text-xs text-ember tracking-widest mb-3">ACESSO RESTRITO</p>
        <h1 className="font-display text-3xl md:text-5xl font-semibold">Esta área é de {role === 'admin' ? 'administradores' : 'vendedores'}</h1>
        <p className="mt-4 text-fog">Sua conta é <span className="text-mist">{user.role}</span>.</p>
      </div>
    );
  }

  return <>{children}</>;
}
