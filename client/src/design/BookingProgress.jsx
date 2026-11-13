import { Check, Circle, X } from 'lucide-react';
import { cx } from '../components/ui';

/* Every booking state in plain words: where the request is, what happens next, and who acts.
   Mirrors the server's state machine: requested → confirmed | rejected; requested|confirmed
   → cancelled. Payment is always offline, with the organiser. */
// eslint-disable-next-line react-refresh/only-export-components
export const NEXT_STEP = {
  requested: 'Waiting for the organiser to confirm. Your seats are held and nothing has been charged.',
  confirmed: 'Confirmed. The organiser shares payment details directly, and trip updates appear on the booking page.',
  rejected: 'Declined by the organiser. Your seats were released and there is nothing to pay.',
  cancelled: 'Cancelled. Your seats were released.',
};

const STEPS = [
  { key: 'requested', label: 'Request sent', hint: 'Seats held for you' },
  { key: 'confirmed', label: 'Organiser confirms', hint: 'They contact you to confirm' },
  { key: 'paid', label: 'Pay the organiser', hint: 'Directly, outside Ghumo' },
  { key: 'travel', label: 'Travel together', hint: 'Updates on your trip board' },
];

// eslint-disable-next-line react-refresh/only-export-components
export function bookingStepIndex(status) {
  return status === 'confirmed' ? 1 : 0;
}

export default function BookingProgress({ booking, className }) {
  const ended = booking.status === 'rejected' || booking.status === 'cancelled';
  const current = bookingStepIndex(booking.status);
  return (
    <section aria-labelledby="progress-h" className={cx('rounded-3xl border border-line bg-white p-5 sm:p-6', className)}>
      <h2 id="progress-h" className="text-lg font-extrabold">Booking progress</h2>
      <p className="mt-1 text-[15px] text-subtle">{NEXT_STEP[booking.status]}</p>
      {!ended && (
        <ol className="mt-5 grid gap-3 sm:grid-cols-4">
          {STEPS.map((s, i) => {
            const done = i <= current;
            return (
              <li key={s.key} aria-current={i === current ? 'step' : undefined} className={cx('flex gap-3 rounded-2xl p-3 sm:flex-col sm:gap-2', i === current ? 'bg-peach/60' : 'bg-sand/60')}>
                <span className={cx('grid size-8 shrink-0 place-items-center rounded-full', done ? 'bg-brand text-white' : 'bg-white text-subtle ring-1 ring-line')}>
                  {done ? <Check className="size-4" aria-hidden /> : <Circle className="size-3" aria-hidden />}
                </span>
                <span>
                  <span className="block text-sm font-extrabold">{s.label}<span className="sr-only">{done ? ' (done)' : ' (not yet)'}</span></span>
                  <span className="block text-xs text-subtle">{s.hint}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {ended && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-sand p-3 text-sm font-bold"><X className="size-4 text-danger" aria-hidden />This booking is closed. You can request another departure any time.</p>
      )}
    </section>
  );
}
