'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user, loading } = useAuth();
  return (
    <div className="landing-page">
      <div className="landing-logo">📋</div>
      <div className="landing-title">POC Scenario <span>Tool</span></div>
      <div className="landing-subtitle">Visualise scenario walkthroughs with branching paths, tool integrations, and persona mapping.</div>
      <div className="landing-actions">
        <Link href="/tool" className="landing-btn-primary">{user ? 'Open Tool' : 'View Sample Scenario'}</Link>
        {!loading && !user && <Link href="/auth/login" className="landing-btn-secondary">Sign in</Link>}
      </div>
      {!user && !loading && <div className="landing-note">Sign in to save, manage, and share scenarios with your team.</div>}
    </div>
  );
}
