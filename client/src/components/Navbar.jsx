import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      borderBottom: '1px solid rgba(242,101,34,0.10)',
      padding: '0 32px', height: '60px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: '#F26522',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: 'white'
        }}>G</div>
        <span style={{ fontWeight: 700, fontSize: '1.15rem', color: '#F26522' }}>Ghummoo</span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', gap: 4 }}>
        <NavLink to="/guides" className="tab" style={({ isActive }) => isActive ? { color: '#F26522', background: 'rgba(242,101,34,0.10)' } : {}}>
          Discover
        </NavLink>
        {user?.role === 'traveler' && (
          <NavLink to="/bookings" className="tab" style={({ isActive }) => isActive ? { color: '#F26522', background: 'rgba(242,101,34,0.10)' } : {}}>
            My Bookings
          </NavLink>
        )}
        {user?.role === 'guide' && (
          <NavLink to="/guide/dashboard" className="tab" style={({ isActive }) => isActive ? { color: '#F26522', background: 'rgba(242,101,34,0.10)' } : {}}>
            Dashboard
          </NavLink>
        )}
        {user?.role === 'admin' && (
          <NavLink to="/admin/dashboard" className="tab" style={({ isActive }) => isActive ? { color: '#F26522', background: 'rgba(242,101,34,0.10)' } : {}}>
            Admin
          </NavLink>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {user ? (
          <>
            {/* Notification Bell */}
            <NotificationBell />

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #F26522, #FF8C55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0
              }}>{initials}</div>
              <span style={{ fontSize: '0.85rem', color: '#1A1A1A', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
