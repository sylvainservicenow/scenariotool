'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function JoinTeamPage() {
  const params = useParams();
  const code = params.code;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?redirect=/join/' + code);
      return;
    }
    const join = async () => {
      const supabase = getSupabase();
      const { data, error: err } = await supabase.rpc('join_team_by_invite', { code });
      if (err) {
        setError(err.message);
        setStatus('error');
      } else {
        setTeamName(data.team_name);
        setStatus(data.status);
      }
    };
    join();
  }, [user, authLoading, code, router]);

  if (authLoading || status === 'loading') {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <p>Joining team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'joined' && (
          <>
            <h1>Joined {teamName}</h1>
            <p>You&apos;re now a member of this team.</p>
            <Link href="/tool" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 16 }}>
              Open Tool
            </Link>
          </>
        )}
        {status === 'already_member' && (
          <>
            <h1>Already a member</h1>
            <p>You&apos;re already in {teamName}.</p>
            <Link href="/tool" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 16 }}>
              Open Tool
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>Could not join</h1>
            <div className="auth-error">{error}</div>
            <Link href="/tool" style={{ color: 'var(--bright-blue)', fontSize: 14, marginTop: 16, display: 'block' }}>
              Go to tool
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
