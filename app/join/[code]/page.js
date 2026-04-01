'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase-browser';
import Link from 'next/link';

async function attemptJoin(code, maxRetries = 4) {
  const sb = getSupabase();

  for (let i = 0; i < maxRetries; i++) {
    // Ensure we have a valid session
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw new Error('Not authenticated. Please sign in and try again.');
    }

    try {
      const { data, error } = await sb.rpc('join_team_by_invite', { code });
      if (error) {
        // Retryable errors
        if (i < maxRetries - 1 && (error.message.includes('lock') || error.message.includes('token') || error.message.includes('JWT'))) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        throw error;
      }
      return data;
    } catch (e) {
      if (i < maxRetries - 1 && (e.message?.includes('lock') || e.message?.includes('token'))) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Failed after retries. Please refresh and try again.');
}

export default function JoinTeamPage() {
  const params = useParams();
  const code = params.code;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('checking'); // checking | joining | joined | already_member | error
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Not logged in - send to signup with redirect back here
      router.replace('/auth/signup?redirect=' + encodeURIComponent('/join/' + code));
      return;
    }

    if (started.current) return;
    started.current = true;

    setStatus('joining');

    // Delay to let session fully stabilize after redirect
    const timer = setTimeout(async () => {
      try {
        const result = await attemptJoin(code);
        setTeamName(result.team_name);
        setStatus(result.status);
      } catch (e) {
        setError(e.message || 'Unknown error');
        setStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [user, authLoading, code, router]);

  const handleRetry = () => {
    started.current = false;
    setStatus('checking');
    setError(null);
    // Re-trigger by toggling state
    setTimeout(() => {
      started.current = false;
      setStatus('joining');
      attemptJoin(code).then(result => {
        setTeamName(result.team_name);
        setStatus(result.status);
      }).catch(e => {
        setError(e.message);
        setStatus('error');
      });
    }, 500);
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {(status === 'checking' || status === 'joining') && (
          <><h1>Joining team...</h1><p>Please wait</p></>
        )}
        {status === 'joined' && (
          <>
            <h1 style={{ color: 'var(--sn-green)' }}>Joined {teamName}!</h1>
            <p>You are now a member of this team.</p>
            <Link href="/tool" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 16 }}>Open Tool</Link>
          </>
        )}
        {status === 'already_member' && (
          <>
            <h1>Already a member</h1>
            <p>You are already in {teamName}.</p>
            <Link href="/tool" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 16 }}>Open Tool</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>Could not join</h1>
            <div className="auth-error">{error}</div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleRetry}>
                Try again
              </button>
              <Link href="/tool" style={{ color: 'var(--bright-blue)', fontSize: 14, display: 'flex', alignItems: 'center' }}>Go to tool</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
