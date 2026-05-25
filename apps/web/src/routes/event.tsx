import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { NowNextBanner } from '../components/NowNextBanner';
import { AgendaList } from '../components/AgendaList';
import { AnnouncementsPanel } from '../components/AnnouncementsPanel';
import { ChatPanel } from '../components/ChatPanel';
import { MapPanel } from '../components/MapPanel';
import { TravelHubPanel } from '../components/TravelHubPanel';

type Tab = 'timeline' | 'travel' | 'announcements' | 'chat' | 'map';

export function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('timeline');

  const event = useStore((s) => s.event);
  const connected = useStore((s) => s.connected);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const loadSnapshot = useStore((s) => s.loadSnapshot);
  const connectSocket = useStore((s) => s.connectSocket);
  const joinRoom = useStore((s) => s.joinRoom);
  const reset = useStore((s) => s.reset);

  useEffect(() => {
    if (!slug) return;

    const savedGuestName = localStorage.getItem(`guestName_${slug}`);
    const guestName = savedGuestName && savedGuestName !== 'Admin' ? savedGuestName : 'Guest';

    loadSnapshot(slug).then(() => {
      connectSocket(slug, guestName);
      joinRoom(slug, 'general');
    });

    return () => {
      reset();
    };
  }, [slug]);

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/e/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  if (loading && !event) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading event...</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="page-error">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!event || !slug) {
    return null;
  }

  return (
    <div className="event-page">
      <header className="event-header">
        <div className="event-header-content">
          <h1 className="event-title">{event.title}</h1>
          <div className="event-header-meta">
            <div className={`connection-indicator ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? 'Live' : 'Offline'}
            </div>
            <button onClick={copyPublicUrl} className="btn-link">
              Copy Link
            </button>
            <Link to={`/e/${slug}/admin`} className="btn-link">
              Admin
            </Link>
          </div>
        </div>
        <NowNextBanner />
      </header>

      <nav className="event-tabs">
        <button
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <span className="tab-icon">📅</span>
          <span className="tab-label">Timeline</span>
        </button>
        <button
          className={`tab ${activeTab === 'travel' ? 'active' : ''}`}
          onClick={() => setActiveTab('travel')}
        >
          <span className="tab-icon">🧭</span>
          <span className="tab-label">Travel Hub</span>
        </button>
        <button
          className={`tab ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          <span className="tab-icon">📢</span>
          <span className="tab-label">Announcements</span>
        </button>
        <button
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="tab-icon">💬</span>
          <span className="tab-label">Chat</span>
        </button>
        <button
          className={`tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <span className="tab-icon">🗺️</span>
          <span className="tab-label">Legacy Map</span>
        </button>
      </nav>

      <main className="event-content">
        {activeTab === 'timeline' && <AgendaList />}
        {activeTab === 'travel' && <TravelHubPanel slug={slug} />}
        {activeTab === 'announcements' && <AnnouncementsPanel />}
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'map' && <MapPanel />}
      </main>
    </div>
  );
}