import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { AdminLoginForm } from '../components/admin/AdminLoginForm';
import { AdminControls } from '../components/admin/AdminControls';
import { AgendaEditor } from '../components/admin/AgendaEditor';
import { LocationsEditor } from '../components/admin/LocationsEditor';
import { ChatPanel } from '../components/ChatPanel';

export function AdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<'controls' | 'agenda' | 'locations' | 'chat'>('controls');

  const event = useStore((s) => s.event);
  const isAdmin = useStore((s) => s.isAdmin);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const loadSnapshot = useStore((s) => s.loadSnapshot);
  const connectSocket = useStore((s) => s.connectSocket);
  const joinRoom = useStore((s) => s.joinRoom);
  const verifyAdminToken = useStore((s) => s.verifyAdminToken);
  const reset = useStore((s) => s.reset);

  useEffect(() => {
    if (!slug) return;

    const initAdmin = async () => {
      const savedJwt = localStorage.getItem(`adminJwt_${slug}`);

      if (savedJwt) {
        // Verify the JWT is still valid before trusting it
        useStore.setState({ jwt: savedJwt, loading: true });
        const isValid = await verifyAdminToken(slug, savedJwt);

        if (isValid) {
          useStore.setState({ isAdmin: true });
        }
        useStore.setState({ loading: false });
      }

      await loadSnapshot(slug);

      // Use saved guest name if available (from regular event access),
      // otherwise default to 'Admin' for admin-only sessions
      const savedGuestName = localStorage.getItem(`guestName_${slug}`);
      const guestName = savedGuestName && savedGuestName !== 'Admin' ? savedGuestName : 'Admin';

      connectSocket(slug, guestName);
      joinRoom(slug, 'general');
    };

    initAdmin();

    return () => {
      reset();
    };
  }, [slug]);

  if (loading && !event) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>{t('admin.loading')}</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="page-error">
        <h2>{t('admin.error')}</h2>
        <p>{t(error as any)}</p>
        <Link to="/" className="btn btn-primary">
          {t('admin.backToHome')}
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <h1>{t('admin.accessRequired')}</h1>
          <Link to={`/e/${slug}`} className="btn-link">
            ← {t('admin.backToEvent')}
          </Link>
        </header>
        <main className="admin-content">
          <AdminLoginForm />
        </main>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>{t('admin.dashboard')}</h1>
          {event && <p className="admin-event-title">{event.title}</p>}
        </div>
        <Link to={`/e/${slug}`} className="btn btn-secondary">
          ← {t('admin.backToEvent')}
        </Link>
      </header>

      <nav className="admin-nav">
        <button
          className={`admin-nav-btn ${activeSection === 'controls' ? 'active' : ''}`}
          onClick={() => setActiveSection('controls')}
        >
          {t('admin.navControls')}
        </button>
        <button
          className={`admin-nav-btn ${activeSection === 'agenda' ? 'active' : ''}`}
          onClick={() => setActiveSection('agenda')}
        >
          {t('admin.navAgenda')}
        </button>
        <button
          className={`admin-nav-btn ${activeSection === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveSection('locations')}
        >
          {t('admin.navLocations')}
        </button>
        <button
          className={`admin-nav-btn ${activeSection === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveSection('chat')}
        >
          {t('admin.navChat')}
        </button>
      </nav>

      <main className="admin-content">
        {activeSection === 'controls' && <AdminControls />}
        {activeSection === 'agenda' && <AgendaEditor />}
        {activeSection === 'locations' && <LocationsEditor />}
        {activeSection === 'chat' && <ChatPanel />}
      </main>
    </div>
  );
}
