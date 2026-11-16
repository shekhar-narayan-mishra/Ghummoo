import { useParams } from 'react-router-dom';
import { BadgeCheck, MapPin, Phone, Mail, AtSign, Globe, Star, Compass } from 'lucide-react';
import api from '../lib/api';
import useAsync from '../lib/useAsync';
import { Badge, Button, SafeImage, Spinner, EmptyState } from '../components/ui';
import { TripCard } from '../design/Cards';
import { date } from '../lib/format';

export default function OrganiserPage() {
  const { slug } = useParams();
  const { data: op, loading, error } = useAsync(() => api.get(`/organisers/${slug}`), [slug]);
  if (loading) return <Spinner className="py-40" />;
  if (error) return <div className="mx-auto max-w-2xl px-4 py-24"><EmptyState title="Organiser not found" action={<Button to="/trips">Browse trips</Button>}>{error.message}</EmptyState></div>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="rounded-[32px] bg-sand p-6 sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {op.logoUrl ? <SafeImage src={op.logoUrl} alt="" className="size-20 rounded-3xl" /> : <div className="grid size-20 shrink-0 place-items-center rounded-3xl bg-action text-3xl font-extrabold text-white">{op.businessName[0]}</div>}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold sm:text-4xl">{op.businessName}</h1>
              {op.verified ? <Badge tone="success" icon={BadgeCheck}>Verified organiser</Badge> : <Badge>Not yet verified</Badge>}
              {op.isDemo && <Badge tone="dark">Demo</Badge>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] font-semibold text-subtle">
              {op.location && <span className="flex items-center gap-1"><MapPin className="size-4 text-brand" />{op.location}</span>}
              {op.foundedYear && <span>Running trips since {op.foundedYear}</span>}
              <span>On Ghumo since {date(op.memberSince, { month: 'short', year: 'numeric' })}</span>
              {op.rating.count > 0 && <span className="flex items-center gap-1"><Star className="size-4 fill-brand text-brand" />{op.rating.average} ({op.rating.count})</span>}
            </p>
          </div>
        </div>
        {op.description && <p className="mt-6 max-w-3xl text-[16px] leading-relaxed text-ink/85">{op.description}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          {op.contactPhone && <a href={`tel:${op.contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line hover:ring-brand-soft"><Phone className="size-4 text-brand" />{op.contactPhone}</a>}
          {op.contactEmail && <a href={`mailto:${op.contactEmail}`} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line hover:ring-brand-soft"><Mail className="size-4 text-brand" />{op.contactEmail}</a>}
          {op.instagram && <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line"><AtSign className="size-4 text-brand" />{op.instagram.replace(/^@/, '')}</span>}
          {op.website && <a href={op.website} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line hover:ring-brand-soft"><Globe className="size-4 text-brand" />Website</a>}
        </div>
      </div>
      <h2 className="mb-5 mt-12 text-2xl font-extrabold">Trips by {op.businessName}</h2>
      {op.trips.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{op.trips.map((t) => <TripCard key={t._id} trip={t} />)}</div>
        : <EmptyState icon={Compass} title="No published trips right now" />}
    </div>
  );
}
