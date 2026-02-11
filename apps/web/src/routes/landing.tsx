import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();
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
        <h1 className="landing-title">Pop-up Event Hub</h1>
        <p className="landing-subtitle">Join a live event with realtime updates, chat, and navigation</p>

        <form onSubmit={handleJoin} className="landing-form">
          <div className="form-group">
            <label htmlFor="slug">Event Code</label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Enter event code"
              className="form-input"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="guestName">Your Name</label>
            <input
              id="guestName"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name"
              className="form-input"
              autoComplete="name"
            />
          </div>

          <button type="submit" disabled={!slug.trim() || !guestName.trim()} className="btn btn-primary btn-large">
            Join Event
          </button>
        </form>

        <div className="landing-admin-link">
          <button onClick={handleAdminLink} disabled={!slug.trim()} className="btn-link">
            Admin Login →
          </button>
        </div>
      </div>
    </div>
  );
}
