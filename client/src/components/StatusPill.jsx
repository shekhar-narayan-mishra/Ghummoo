import { Clock, CheckCircle2, Rocket, Check, X } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'badge-amber',
  confirmed: 'badge-green',
  in_progress: 'badge-blue',
  completed: 'badge-blue',
  cancelled: 'badge-red',
};

const STATUS_ICONS = {
  pending: Clock,
  confirmed: CheckCircle2,
  in_progress: Rocket,
  completed: Check,
  cancelled: X,
};

export default function StatusPill({ status }) {
  const Icon = STATUS_ICONS[status];
  const label = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={`badge ${STATUS_STYLES[status] || 'badge-blue'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {Icon && <Icon size={12} />}
      {label}
    </span>
  );
}
