import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Phone, Compass, Briefcase } from 'lucide-react';
import { useAuth, homeFor } from '../lib/auth';
import { Button, Input, Notice, SafeImage, cx } from '../components/ui';
import Logo from '../components/Logo';
import { optionalPhoneError, PHONE_MAX_LENGTH } from '../lib/validation';

const SIDE = 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=72&auto=format&fit=crop';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [role, setRole] = useState(params.get('role') === 'operator' ? 'operator' : 'traveler');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const nextUrl = params.get('next');
  const safeNext = nextUrl && nextUrl.startsWith('/') && !nextUrl.startsWith('//') ? nextUrl : null;

  if (user) return <Navigate to={safeNext || homeFor(user)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!isLogin && form.name.trim().length < 2) errs.name = 'Please enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!isLogin && optionalPhoneError(form.phone)) errs.phone = optionalPhoneError(form.phone);
    if (isLogin ? !form.password : form.password.length < 8) errs.password = isLogin ? 'Enter your password' : 'Use at least 8 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setServerError('');
    try {
      const u = isLogin ? await login(form.email, form.password) : await register({ ...form, role });
      toast.success(isLogin ? `Welcome back, ${u.name.split(' ')[0]}` : 'Account created');
      navigate(safeNext && (u.role === 'traveler' || !safeNext.includes('/book')) ? safeNext : homeFor(u), { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl lg:grid-cols-2">
      <div className="flex items-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-2 text-[15px] text-subtle">{isLogin ? 'Log in to manage your trips or your business.' : 'Book group trips, or list your own as an organiser.'}</p>

          {!isLogin && (
            <div className="mt-6 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
              {[['traveler', Compass, 'I want to travel', 'Book group trips'], ['operator', Briefcase, 'I run trips', 'List & manage packages']].map(([v, Icon, t, d]) => (
                <button key={v} type="button" role="radio" aria-checked={role === v} onClick={() => setRole(v)}
                  className={cx('rounded-2xl border p-4 text-left transition', role === v ? 'border-brand bg-peach/40 ring-2 ring-brand/20' : 'border-line bg-white hover:border-brand-soft')}>
                  <Icon className={cx('size-5', role === v ? 'text-brand-ink' : 'text-subtle')} />
                  <p className="mt-2 text-[15px] font-extrabold">{t}</p><p className="text-[13px] text-subtle">{d}</p>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {serverError && <Notice tone="danger">{serverError}</Notice>}
            {!isLogin && <Input label={role === 'operator' ? 'Your name' : 'Full name'} icon={User} value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />}
            <Input label="Email" type="email" icon={Mail} value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
            {!isLogin && <Input label="Phone" type="tel" icon={Phone} value={form.phone} onChange={set('phone')} error={errors.phone} maxLength={PHONE_MAX_LENGTH} hint="Optional" autoComplete="tel" />}
            <Input label="Password" type="password" icon={Lock} value={form.password} onChange={set('password')} error={errors.password} autoComplete={isLogin ? 'current-password' : 'new-password'} hint={!isLogin ? 'At least 8 characters' : undefined} />
            <Button type="submit" size="lg" className="w-full" loading={busy}>{isLogin ? 'Log in' : role === 'operator' ? 'Create operator account' : 'Create account'}</Button>
          </form>
          <p className="mt-6 text-center text-[15px] text-subtle">
            {isLogin ? <>New to Ghumo AI? <Link to={`/register${params.toString() ? `?${params}` : ''}`} className="font-bold text-brand-ink hover:underline">Create an account</Link></> : <>Already have an account? <Link to={`/login${params.toString() ? `?${params}` : ''}`} className="font-bold text-brand-ink hover:underline">Log in</Link></>}
          </p>
          {isLogin && (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-white/60 p-4 text-[13px] text-subtle">
              <p className="font-bold text-ink">Exploring the demo?</p>
              <p className="mt-1">Demo traveller, operator and admin accounts are listed in the project README.</p>
            </div>
          )}
        </div>
      </div>
      <div className="relative hidden overflow-hidden p-6 lg:block">
        <div className="relative h-full overflow-hidden rounded-[32px]">
          <SafeImage src={SIDE} alt="Monastery above a Himalayan valley" eager className="absolute inset-0 size-full" sizes="50vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 p-10 text-white">
            <Logo light to="/" />
            <p className="mt-4 max-w-sm text-2xl font-extrabold leading-snug">Your next group trip, minus the chaos.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
