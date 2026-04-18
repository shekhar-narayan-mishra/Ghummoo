import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { Mail, CheckCircle2, XCircle, PartyPopper, Star, ClipboardList, Award, Activity, Bell } from 'lucide-react';

dayjs.extend(relativeTime);

const TYPE_ICONS = {
  booking_requested: Mail,
  booking_confirmed: CheckCircle2,
  booking_cancelled: XCircle,
  booking_completed: PartyPopper,
  review_received: Star,
  certification_submitted: ClipboardList,
  certification_approved: Award,
  certification_rejected: XCircle,
  booking_activity: Activity,
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
          <p style={{ color: '#6B6B6B', fontSize: '0.85rem', marginTop: 4 }}>Your activity and updates</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>Mark all read</button>
      </div>

      {loading
        ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} height={72} />)
        : notifications.length === 0
          ? <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ marginBottom: 12, color: '#F26522', display: 'flex', justifyContent: 'center' }}><Bell size={48} strokeWidth={1.5} /></div>
              <div style={{ color: '#9B9B9B' }}>You're all caught up!</div>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {notifications.map(n => (
                <div key={n._id} style={{
                  display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 12, transition: 'background 0.2s',
                  background: n.isRead ? 'rgba(255,255,255,0.50)' : 'rgba(242,101,34,0.04)',
                  borderLeft: `3px solid ${n.isRead ? 'transparent' : '#F26522'}`,
                  border: '1px solid rgba(242,101,34,0.08)', marginBottom: 2,
                }}>
                  <div style={{ flexShrink: 0, marginTop: 2, color: '#F26522', display: 'flex' }}>
                    {(() => {
                      const Icon = TYPE_ICONS[n.type] || Bell;
                      return <Icon size={24} strokeWidth={1.5} />;
                    })()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', color: n.isRead ? '#6B6B6B' : '#1A1A1A', lineHeight: 1.5 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9B9B9B', marginTop: 4 }}>
                      {dayjs(n.createdAt).fromNow()}
                    </div>
                  </div>
                  {!n.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F26522', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              ))}
            </div>
      }
    </div>
  );
}
