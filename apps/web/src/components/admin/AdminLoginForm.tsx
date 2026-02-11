import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';

export function AdminLoginForm() {
  const { slug } = useParams<{ slug: string }>();
  const [token, setToken] = useState('');
  const adminLoginAction = useStore((s) => s.adminLoginAction);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !token.trim()) return;

    try {
      await adminLoginAction(slug, token);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="admin-login-form">
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="token">Admin Token</label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter your admin token"
            className="form-input"
            autoComplete="off"
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={loading || !token.trim()} className="btn btn-primary">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
