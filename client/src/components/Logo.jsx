import { Link } from 'react-router-dom';
import { cx } from './ui';

export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cx('size-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#F26A2E" />
      <path d="M9 22c2.5-6 5.5-2 8-6s3-6 6-6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="0.1 4.2" />
      <circle cx="9" cy="22" r="2.6" fill="#fff" />
      <circle cx="23" cy="10" r="2.6" fill="#FFE5D2" />
    </svg>
  );
}

export default function Logo({ to = '/', light, className }) {
  return (
    <Link to={to} className={cx('group inline-flex items-center gap-2', className)} aria-label="Ghumo AI home">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className={cx('flex items-start text-[22px] font-extrabold leading-none tracking-[-0.04em]', light ? 'text-white' : 'text-ink')}>
        ghumo
        <span className="ml-1 mt-[1px] rounded-md bg-peach px-1 py-[3px] text-[10px] font-extrabold tracking-wider text-brand-ink">AI</span>
      </span>
    </Link>
  );
}
