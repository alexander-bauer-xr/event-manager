import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { NowNextBanner } from '../components/NowNextBanner';
import { AgendaList } from '../components/AgendaList';
import { AnnouncementsPanel } from '../components/AnnouncementsPanel';
import { ChatPanel } from '../components/ChatPanel';
import { MapPanel } from '../components/MapPanel';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

type Tab = 'timeline' | 'announcements' | 'chat' | 'map';

export function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const scrollIntentRef = useRef<'up' | 'down' | null>(null);
  const touchYRef = useRef<number | null>(null);

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

    // Don't use admin name for regular event access
    // If user came from admin panel, they should use the admin route
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

  useEffect(() => {
    const compactOnThreshold = 72;
    const compactOffTopThreshold = 2;

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 1) return;
      scrollIntentRef.current = event.deltaY > 0 ? 'down' : 'up';
    };

    const onTouchStart = (event: TouchEvent) => {
      touchYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;
      if (currentY == null || touchYRef.current == null) return;
      const delta = touchYRef.current - currentY;
      if (Math.abs(delta) < 2) return;
      scrollIntentRef.current = delta > 0 ? 'down' : 'up';
      touchYRef.current = currentY;
    };

    const onScroll = () => {
      const y = window.scrollY;
      setIsHeaderCompact((prev) => {
        if (!prev && y > compactOnThreshold) return true;
        if (prev && y <= compactOffTopThreshold && scrollIntentRef.current === 'up') return false;
        return prev;
      });
    };

    onScroll();
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const copyPublicUrl = () => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const url = `${window.location.origin}${base}/e/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success(t('event.linkCopied'));
  };

  if (loading && !event) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>{t('event.loading')}</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="page-error">
        <h2>{t('event.error')}</h2>
        <p>{t(error as any)}</p>
        <Link to="/" className="btn btn-primary">
          {t('event.backToHome')}
        </Link>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className={`event-page ${isHeaderCompact ? 'header-compact' : ''}`}>
      <LanguageSwitcher />
      <header className="event-header">
        <div className="event-header-content">
          <h1 className="event-title">{event.title}</h1>
          <div className="event-header-meta">
            <div className={`connection-indicator ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? t('event.live') : t('event.offline')}
            </div>
            <button onClick={copyPublicUrl} className="btn-link">
              {t('event.copyLink')}
            </button>
            <Link to={`/e/${slug}/admin`} className="btn-link">
              {t('event.admin')}
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
          <span className="tab-label">{t('event.tabTimeline')}</span>
        </button>
        <button
          className={`tab ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          <span className="tab-icon">📢</span>
          <span className="tab-label">{t('event.tabAnnouncements')}</span>
        </button>
        <button
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="tab-icon">💬</span>
          <span className="tab-label">{t('event.tabChat')}</span>
        </button>
        <button
          className={`tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <span className="tab-icon">🗺️</span>
          <span className="tab-label">{t('event.tabMap')}</span>
        </button>
      </nav>

      <main className="event-content">
        {activeTab === 'timeline' && <AgendaList />}
        {activeTab === 'announcements' && <AnnouncementsPanel />}
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'map' && <MapPanel />}
      </main>
    </div>
  );
}
