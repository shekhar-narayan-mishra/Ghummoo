import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LogOut, ExternalLink } from 'lucide-react';
import Logo from './Logo';
import { cx } from './ui';
import { useAuth } from '../lib/auth';

// Shared layout for operator and admin areas. `nav` = [{ to, label, icon, end }]
export default function DashboardShell({ nav, title, children, banner }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await logout(); navigate('/'); };
  const link = ({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition', isActive ? 'bg-white text-ink shadow-soft ring-1 ring-line' : 'text-subtle hover:bg-white/70 hover:text-ink');

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-sand/70 px-4 py-6 lg:flex">
        <div className="px-2"><Logo /></div>
        <p className="mt-6 px-3 text-[11px] font-extrabold uppercase tracking-widest text-subtle">{title}</p>
        <nav className="mt-2 flex flex-col gap-1" aria-label={title}>
          {nav.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}><n.icon className="size-[18px]" aria-hidden />{n.label}</NavLink>)}
        </nav>
        <div className="mt-auto space-y-1 border-t border-line pt-4">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-subtle hover:bg-white/70 hover:text-ink"><ExternalLink className="size-4" />View marketplace</Link>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-peach text-sm font-extrabold text-brand-ink">{user?.name?.[0]}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user?.name}</p><p className="truncate text-xs text-subtle">{user?.email}</p></div>
            <button type="button" onClick={onLogout} className="grid size-8 place-items-center rounded-full text-subtle hover:bg-white hover:text-ink" aria-label="Log out"><LogOut className="size-4" /></button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar + scrollable tab nav */}
      <div className="sticky top-0 z-40 border-b border-line bg-ivory/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          <button type="button" onClick={onLogout} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-subtle hover:bg-sand"><LogOut className="size-4" />Log out</button>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2" aria-label={title}>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold', isActive ? 'bg-ink text-white' : 'bg-white text-subtle ring-1 ring-line')}>
              <n.icon className="size-4" aria-hidden />{n.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="min-w-0">
        {banner}
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
