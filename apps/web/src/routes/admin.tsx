import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { AdminLoginForm } from '../components/admin/AdminLoginForm';
import { AdminControls } from '../components/admin/AdminControls';
import { AgendaEditor } from '../components/admin/AgendaEditor';
import { LocationsEditor } from '../components/admin/LocationsEditor';
import { TravelStructureEditor } from '../components/admin/TravelStructureEditor';
import { ChatPanel } from '../components/ChatPanel';

type AdminSection = 'controls' | 'agenda' | 'locations' | 'travel' | 'chat';

export function AdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeSection, setActiveSection] = useState<AdminSection>('controls');

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
        useStore.setState({ jwt: savedJwt, loading: true });
        const isValid = await verifyAdminToken(slug, savedJwt);

        if (isValid) {
          useStore.setState({ isAdmin: true });
        }
        useStore.setState({ loading: false });
      }

      await loadSnapshot(slug);
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
    return <div className="page-loading"><div className="spinner"></div><p>Loading...</p></div>;
  }

  if (error && !event) {
    return (
      <div className="page-error">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <h1>Admin Access Required</h1>
          <Link to={`/e/${slug}`} className="btn-link">← Back to Event</Link>
        </header>
        <main className="admin-content"><AdminLoginForm /></main>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          {event && <p className="admin-event-title">{event.title}</p>}
        </div>
        <Link to={`/e/${slug}`} className="btn btn-secondary">← Back to Event</Link>
      </header>

      <nav className="admin-nav">
        <button className={`admin-nav-btn ${activeSection === 'controls' ? 'active' : ''}`} onClick={() => setActiveSection('controls')}>Controls</button>
        <button className={`admin-nav-btn ${activeSection === 'agenda' ? 'active' : ''}`} onClick={() => setActiveSection('agenda')}>Agenda</button>
        <button className={`admin-nav-btn ${activeSection === 'locations' ? 'active' : ''}`} onClick={() => setActiveSection('locations')}>Locations</button>
        <button className={`admin-nav-btn ${activeSection === 'travel' ? 'active' : ''}`} onClick={() => setActiveSection('travel')}>Travel Structure</button>
        <button className={`admin-nav-btn ${activeSection === 'chat' ? 'active' : ''}`} onClick={() => setActiveSection('chat')}>Admin Chat</button>
      </nav>

      <main className="admin-content">
        {activeSection === 'controls' && <AdminControls />}
        {activeSection === 'agenda' && <AgendaEditor />}
        {activeSection === 'locations' && <LocationsEditor />}
        {activeSection === 'travel' && slug && <TravelStructureEditor slug={slug} />}
        {activeSection === 'chat' && <ChatPanel />}
      </main>
    </div>
  );
}
