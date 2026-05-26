import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [slug, setSlug] = useState('');
  const [guestName, setGuestName] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim() || !guestName.trim()) return;

    localStorage.setItem(`guestName_${slug}`, guestName);
    navigate(`/e/${slug}`);
  };

  const handleAdminLink = () => {
    if (!slug.trim()) return;
    navigate(`/e/${slug}/admin`);
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        <h1 className="landing-title">{t('landing.title')}</h1>
        <LanguageSwitcher />
        <p className="landing-subtitle">{t('landing.subtitle')}</p>

        <form onSubmit={handleJoin} className="landing-form">
          <div className="form-group">
            <label htmlFor="slug">{t('landing.eventCodeLabel')}</label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t('landing.eventCodePlaceholder')}
              className="form-input"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="guestName">{t('landing.nameLabel')}</label>
            <input
              id="guestName"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t('landing.namePlaceholder')}
              className="form-input"
              autoComplete="name"
            />
          </div>

          <button type="submit" disabled={!slug.trim() || !guestName.trim()} className="btn btn-primary btn-large">
            {t('landing.joinButton')}
          </button>
        </form>

        <div className="landing-admin-link">
          <button onClick={handleAdminLink} disabled={!slug.trim()} className="btn-link">
            {t('landing.adminLink')} →
          </button>
        </div>
      </div>
    </div>
  );
}
