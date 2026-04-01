'use client';

import { useEffect, useState, useRef } from 'react';
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
  const attempted = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Not logged in - redirect to signup with return URL
    if (!user) {
      router.replace('/auth/signup?redirect=/join/' + code);
      return;
    }

    // Prevent double-firing
    if (attempted.current) return;
    attempted.current = true;

    // Wait a moment for the session token to stabilize after redirect
    const timer = setTimeout(async () => {
      const tryJoin = async (retries) => {
        try {
          const supabase = getSupabase();

          // Verify we have a valid session before calling RPC
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            if (retries > 0) {
              console.log('No session yet, retrying in 1s...');
              await new Promise(r => setTimeout(r, 1000));
              return tryJoin(retries - 1);
            }
            setError('Session not ready. Please try refreshing the page.');
            setStatus('error');
            return;
          }

          const { data, error: err } = await supabase.rpc('join_team_by_invite', { code });
          if (err) {
            // Retry on lock/token errors
            if (retries > 0 && (err.message.includes('lock') || err.message.includes('token') || err.message.includes('JWT'))) {
              console.log('Token error, retrying in 1s...', err.message);
              await new Promise(r => setTimeout(r, 1000));
              return tryJoin(retries - 1);
            }
            setError(err.message);
            setStatus('error');
          } else {
            setTeamName(data.team_name);
            setStatus(data.status);
          }
        } catch (e) {
          if (retries > 0) {
            console.log('Exception, retrying...', e.message);
            await new Promise(r => setTimeout(r, 1000));
            return tryJoin(retries - 1);
          }
          setError(e.message);
          setStatus('error');
        }
      };

      await tryJoin(3);
    }, 500); // Initial 500ms delay to let session settle

    return () => clearTimeout(timer);
  }, [user, authLoading, code, router]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <h1>Joining team...</h1>
            <p>Please wait</p>
          </>
        )}
        {status === 'joined' && (
          <>
            <h1 style={{ color: 'var(--sn-green)' }}>Joined {teamName}</h1>
            <p>You are now a member of this team.</p>
            <Link href="/tool" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 16 }}>
              Open Tool
            </Link>
          </>
        )}
        {status === 'already_member' && (
          <>
            <h1>Already a member</h1>
            <p>You are already in {teamName}.</p>
            <Link href="/tool" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 16 }}>
              Open Tool
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>Could not join</h1>
            <div className="auth-error">{error}</div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="auth-submit" style={{ width: 'auto', padding: '10px 20px' }}
                onClick={() => { attempted.current = false; setStatus('loading'); setError(null); }}>
                Try again
              </button>
              <Link href="/tool" style={{ color: 'var(--bright-blue)', fontSize: 14, display: 'flex', alignItems: 'center' }}>
                Go to tool
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
