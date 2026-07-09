import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import SiteFooter from './SiteFooter';
import { useAuth, type Role } from '../lib/auth';

const ROLE_LABEL: Record<Role, string> = {
  buyer: 'MINHA CONTA',
  seller: 'PAINEL DO VENDEDOR',
  admin: 'PAINEL ADMIN',
};

/** Casca comum dos dashboards: cabeçalho com papel, identidade e sair. */
export default function DashboardShell({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-10 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="font-mono text-xs text-volt tracking-widest mb-2">{user ? ROLE_LABEL[user.role] : ''}</p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold">{title}</h1>
            {subtitle && <p className="mt-2 text-fog">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-mist">{user?.fullName}</p>
              <p className="text-xs text-fog">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-full border border-line px-4 py-2 text-sm hover:border-ember hover:text-ember transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
        <div className="mt-8">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
