import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBell() {
  const { unreadCount } = useNotifications();

  return (
    <Link
      to="/notifications"
      title="Notifications"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', color: '#6B6B6B' }}
    >
      {/* Bell SVG icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'color 0.2s', color: unreadCount > 0 ? '#F26522' : '#6B6B6B' }}
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {/* Badge */}
      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            background: '#F26522',
            color: 'white',
            borderRadius: '999px',
            fontSize: '0.62rem',
            fontWeight: 700,
            padding: '1px 5px',
            minWidth: 16,
            textAlign: 'center',
            lineHeight: '1.4',
            border: '1.5px solid white',
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
