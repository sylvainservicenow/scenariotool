'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (!loading && user) {
    router.replace('/tool');
    return null;
  }

  return (
    <div className="landing-page">
      <div className="landing-logo">📋</div>
      <div className="landing-title">POC Scenario <span>Tool</span></div>
      <div className="landing-subtitle">
        Visualise scenario walkthroughs with branching paths, tool integrations, and persona mapping.
      </div>
      <div className="landing-actions">
        <Link href="/tool" className="landing-btn-primary">
          View Sample Scenario
        </Link>
        <Link href="/auth/login" className="landing-btn-secondary">
          Sign in
        </Link>
      </div>
      <div className="landing-note">
        Sign in to save, manage, and share scenarios with your team.
      </div>
    </div>
  );
}
