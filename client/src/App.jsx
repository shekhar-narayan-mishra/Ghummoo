import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import Footer from './components/Footer';
import Navbar from './design/Navbar';
import { DesignProvider } from './design/context';
import { CompareProvider, CompareTray } from './design/Compare';
import useAsync from './lib/useAsync';
import { getPlaces } from './lib/catalog';
import { useSavedTrips } from './lib/saved';
import { RequireRole } from './components/Guards';
import { Spinner } from './components/ui';
import FlightCursor from './components/FlightCursor';

const HomePage = lazy(() => import('./traveller/HomePage'));
const TripsPage = lazy(() => import('./traveller/TripsPage'));
const ExploreIndiaPage = lazy(() => import('./traveller/ExploreIndiaPage'));
const CityIndexPage = lazy(() => import('./traveller/CityIndexPage'));
const PlacePage = lazy(() => import('./traveller/PlacePage'));
const ComparePage = lazy(() => import('./traveller/ComparePage'));
const DecidePage = lazy(() => import('./traveller/DecidePage'));
const TripDetailPage = lazy(() => import('./pages/TripDetailPage'));
const BookPage = lazy(() => import('./pages/BookPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const MyTripsPage = lazy(() => import('./pages/MyTripsPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const PartnersPage = lazy(() => import('./pages/PartnersPage'));
const OrganiserPage = lazy(() => import('./pages/OrganiserPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const OperatorLayout = lazy(() => import('./pages/operator/OperatorLayout'));
const OperatorOverview = lazy(() => import('./pages/operator/OverviewPage'));
const OperatorProfile = lazy(() => import('./pages/operator/ProfilePage'));
const OperatorPackages = lazy(() => import('./pages/operator/PackagesPage'));
const PackageEditor = lazy(() => import('./pages/operator/PackageEditorPage'));
const PackageStudio = lazy(() => import('./pages/operator/StudioPage'));
const OperatorBookings = lazy(() => import('./pages/operator/BookingsPage'));
const DepartureManifest = lazy(() => import('./pages/operator/DeparturePage'));
const OperatorInsights = lazy(() => import('./pages/operator/InsightsPage'));
const TripGroupPage = lazy(() => import('./pages/TripGroupPage'));

const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
// V0.1 design prototype (sample data only, no booking APIs).
const V01App = lazy(() => import('./v01/V01App'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const NO_PLACES = [];

/* Traveller layout: design-system navbar (with sign-in), compare tray, saved trips and the
   place index used by search suggestions. */
function PublicLayout() {
  const places = useAsync(getPlaces, []);
  const saved = useSavedTrips();
  return (
    <DesignProvider base="" places={places.data || NO_PLACES} saved={saved}>
      <CompareProvider>
        <a href="#main" className="sr-only z-[80] rounded-full bg-ink px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3">Skip to content</a>
        <Navbar showAuth />
        <main id="main" tabIndex={-1} className="min-h-dvh outline-none">
          <Suspense fallback={<div className="pt-24"><Spinner /></div>}><Outlet /></Suspense>
        </main>
        <Footer />
        <CompareTray />
        {/* Public traveller pages only; dashboards keep the standard cursor. */}
        <FlightCursor />
      </CompareProvider>
    </DesignProvider>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="pt-32"><Spinner /></div>}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/india" element={<ExploreIndiaPage />} />
            <Route path="/cities" element={<CityIndexPage />} />
            <Route path="/places/:slug" element={<PlacePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/decide" element={<DecidePage />} />
            <Route path="/trips/:slug" element={<TripDetailPage />} />
            <Route path="/trips/:slug/book" element={<RequireRole roles={['traveler']}><BookPage /></RequireRole>} />
            <Route path="/bookings/:id" element={<RequireRole><BookingPage /></RequireRole>} />
            <Route path="/groups/:departureId" element={<RequireRole roles={['traveler']}><TripGroupPage /></RequireRole>} />
            <Route path="/me/trips" element={<RequireRole roles={['traveler']}><MyTripsPage /></RequireRole>} />
            <Route path="/destinations" element={<Navigate to="/india" replace />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/organisers/:slug" element={<OrganiserPage />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/operator" element={<RequireRole roles={['operator']}><OperatorLayout /></RequireRole>}>
            <Route index element={<OperatorOverview />} />
            <Route path="profile" element={<OperatorProfile />} />
            <Route path="packages" element={<OperatorPackages />} />
            <Route path="packages/new" element={<PackageEditor />} />
            <Route path="packages/:id" element={<PackageEditor />} />
            <Route path="studio" element={<PackageStudio />} />
            <Route path="bookings" element={<OperatorBookings />} />
            <Route path="departures/:id" element={<DepartureManifest />} />
            <Route path="insights" element={<OperatorInsights />} />
            <Route path="groups/:departureId" element={<TripGroupPage organiserView />} />
          </Route>
          <Route path="/v01/*" element={<V01App />} />
          <Route path="/admin/*" element={<RequireRole roles={['admin']}><AdminPage /></RequireRole>} />
        </Routes>
      </Suspense>
    </>
  );
}

