import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, LayoutDashboard, LogOut, Menu, Search, Sparkles } from 'lucide-react';
import Logo from '../components/Logo';
import { Button, cx } from '../components/ui';
import { useAuth, homeFor } from '../lib/auth';
import { Dialog, Drawer } from './Dialog';
import SearchBox from './SearchBox';
import { usePaths } from './context';
import { getMyGroups } from '../lib/groups';

/* Navbar: sticky and always usable, with search one tap away. `showAuth` adds sign-in and
   account links (live app); the prototype leaves them out. */
export default function Navbar({ showAuth = false }) {
  const paths = usePaths();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const { pathname } = useLocation();
  const nav = [
    { to: paths.india(), label: 'Explore India' },
    { to: paths.trips(), label: 'Trips' },
    { to: paths.decide, label: 'Help me decide', icon: Sparkles },
  ];

  // Close overlays when the route changes (state adjusted during render, no effect needed).
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) { setSeenPath(pathname); setMenu(false); setSearch(false); }
  // Unread trip-group messages for travellers (muted groups excluded), refreshed on navigation.
  const [unread, setUnread] = useState(0);
  const traveller = showAuth && user?.role === 'traveler';
  useEffect(() => {
    if (!traveller) return undefined;
    let live = true;
    const load = () => getMyGroups().then((d) => { if (live) setUnread(d.unreadTotal); }).catch(() => {});
    load();
    const id = setInterval(load, 60000);
    window.addEventListener('ghumo:groups-read', load);
    return () => { live = false; clearInterval(id); window.removeEventListener('ghumo:groups-read', load); };
  }, [traveller, pathname]);
  const badge = traveller && unread > 0 ? <span className="ml-1 rounded-full bg-action px-1.5 py-0.5 text-[11px] font-extrabold text-white" aria-label={`${unread} unread trip group messages`}>{unread}</span> : null;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const account = showAuth && user;
  const accountLabel = user?.role === 'operator' ? 'Dashboard' : user?.role === 'admin' ? 'Admin' : 'My trips';
  const AccountIcon = user?.role === 'operator' ? Briefcase : LayoutDashboard;
  const signOut = async () => { await logout(); navigate(paths.home); };

  return (
    <header className={cx('sticky top-0 z-50 transition-colors duration-300', scrolled ? 'glass !border-x-0 !border-t-0 border-b !border-b-line/70' : 'bg-ivory')}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo to={paths.home} />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-bold transition', isActive ? 'bg-peach text-brand-ink' : 'text-ink/80 hover:bg-sand hover:text-ink')}>
              {n.icon && <n.icon className="size-4 text-brand" aria-hidden />}{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => setSearch(true)} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-3 text-sm font-bold text-subtle ring-1 ring-line hover:ring-brand-soft sm:px-4" aria-label="Search destinations, cities and trips">
            <Search className="size-4 text-brand" aria-hidden /><span className="hidden sm:inline">Search</span>
          </button>
          {showAuth && (
            <span className="hidden items-center gap-1.5 lg:flex">
              {account ? (
                <>
                  <Button size="sm" variant="soft" to={homeFor(user)}><AccountIcon className="size-4" />{accountLabel}{badge}</Button>
                  <button type="button" onClick={signOut} className="grid size-9 place-items-center rounded-full text-subtle hover:bg-sand" aria-label="Log out" title="Log out"><LogOut className="size-[18px]" /></button>
                </>
              ) : (
                <>
                  <Link to="/login" className="rounded-full px-3 py-2 text-[15px] font-bold text-ink hover:bg-sand">Log in</Link>
                  <Button size="sm" variant="dark" to="/partners">For organisers</Button>
                </>
              )}
            </span>
          )}
          {!showAuth && <span className="hidden lg:block"><Button size="sm" variant="dark" to="/partners">For organisers</Button></span>}
          <button type="button" onClick={() => setMenu(true)} className="relative grid size-10 place-items-center rounded-full hover:bg-sand md:hidden" aria-label={unread && traveller ? `Open menu, ${unread} unread trip group messages` : 'Open menu'} aria-expanded={menu}>
            <Menu className="size-6" />
            {badge && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-brand" aria-hidden />}
          </button>
        </div>
      </div>

      <Dialog open={search} onClose={() => setSearch(false)} title="Search Ghumo" description="Find a destination, a city, an experience or a trip.">
        <SearchBox size="md" autoFocus onDone={() => setSearch(false)} />
        <p className="mt-4 text-xs text-subtle">Tip: pick a suggestion, or press Enter to search all trips.</p>
      </Dialog>

      <Drawer open={menu} onClose={() => setMenu(false)} title="Menu">
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('flex items-center gap-2 rounded-2xl px-4 py-3.5 text-[17px] font-extrabold', isActive ? 'bg-peach text-brand-ink' : 'hover:bg-sand')}>
              {n.icon && <n.icon className="size-5 text-brand" aria-hidden />}{n.label}
            </NavLink>
          ))}
          <NavLink to={paths.cities} className="rounded-2xl px-4 py-3.5 text-[17px] font-extrabold hover:bg-sand">Cities</NavLink>
          {account && <NavLink to={homeFor(user)} className="rounded-2xl px-4 py-3.5 text-[17px] font-extrabold hover:bg-sand">{accountLabel}{badge}</NavLink>}
        </nav>
        <div className="mt-6 grid gap-2 border-t border-line pt-6">
          {showAuth && !user && <Button to="/login">Log in</Button>}
          {showAuth && !user && <Button variant="secondary" to="/register">Create an account</Button>}
          {account && <Button variant="secondary" onClick={signOut}>Log out</Button>}
          <Button variant="dark" to="/partners">For organisers</Button>
        </div>
      </Drawer>
    </header>
  );
}
