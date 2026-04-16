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
      background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '0 32px', height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 900, color: 'white'
        }}>G</div>
        <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f9fafb' }}>Ghummoo</span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', gap: 4 }}>
        <NavLink to="/guides" className="tab" style={({ isActive }) => isActive ? { color: '#818cf8', background: 'rgba(99,102,241,0.12)' } : {}}>
          Discover
        </NavLink>
        {user?.role === 'traveler' && (
          <NavLink to="/bookings" className="tab" style={({ isActive }) => isActive ? { color: '#818cf8', background: 'rgba(99,102,241,0.12)' } : {}}>
            My Bookings
          </NavLink>
        )}
        {user?.role === 'guide' && (
          <NavLink to="/guide/dashboard" className="tab" style={({ isActive }) => isActive ? { color: '#818cf8', background: 'rgba(99,102,241,0.12)' } : {}}>
            Dashboard
          </NavLink>
        )}
        {user?.role === 'admin' && (
          <NavLink to="/admin/dashboard" className="tab" style={({ isActive }) => isActive ? { color: '#818cf8', background: 'rgba(99,102,241,0.12)' } : {}}>
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
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0
              }}>{initials}</div>
              <span style={{ fontSize: '0.85rem', color: '#d1d5db', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
