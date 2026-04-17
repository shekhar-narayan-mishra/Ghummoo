import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { CardSkeleton } from '../components/LoadingSkeleton';

dayjs.extend(relativeTime);

const TYPE_ICONS = {
  booking_requested: '📩',
  booking_confirmed: '✅',
  booking_cancelled: '❌',
  booking_completed: '🎉',
  review_received: '⭐',
  certification_submitted: '📋',
  certification_approved: '🥇',
  certification_rejected: '❌',
  booking_activity: '📊',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { markAllRead } = useNotifications();

  useEffect(() => {
    api.get('/notifications')
      .then(res => setNotifications(Array.isArray(res) ? res : []))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    toast.success('All notifications marked as read');
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>Your activity and updates</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>Mark all read</button>
      </div>

      {loading
        ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} height={72} />)
        : notifications.length === 0
          ? <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔔</div>
              <div style={{ color: 'var(--text-muted)' }}>You're all caught up!</div>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {notifications.map(n => (
                <div key={n._id} style={{
                  display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 12, transition: 'background 0.2s',
                  background: n.isRead ? 'var(--bg-card)' : 'rgba(99,102,241,0.06)',
                  borderLeft: `3px solid ${n.isRead ? 'transparent' : '#6366f1'}`,
                  border: '1px solid var(--border)', marginBottom: 2,
                }}>
                  <div style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }}>
                    {TYPE_ICONS[n.type] || '🔔'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', color: n.isRead ? 'var(--text-secondary)' : 'var(--text-primary)', lineHeight: 1.5 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {dayjs(n.createdAt).fromNow()}
                    </div>
                  </div>
                  {!n.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              ))}
            </div>
      }
    </div>
  );
}
