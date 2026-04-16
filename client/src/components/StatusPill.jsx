import dayjs from 'dayjs';

const STATUS_STYLES = {
  pending: 'badge-amber',
  confirmed: 'badge-green',
  in_progress: 'badge-blue',
  completed: 'badge badge-blue',
  cancelled: 'badge-red',
};

const STATUS_LABELS = {
  pending: '⏳ Pending',
  confirmed: '✅ Confirmed',
  in_progress: '🚀 In Progress',
  completed: '✔ Completed',
  cancelled: '✗ Cancelled',
};

export default function StatusPill({ status }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] || 'badge-blue'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
