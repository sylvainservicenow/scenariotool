'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase-browser';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/tool';

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError(null);
    const { error: err } = await getSupabase().auth.signUp({
      email, password, options: { data: { display_name: displayName || email.split('@')[0] } }
    });
    if (err) { setError(err.message); setLoading(false); }
    else {
      // Small delay to let session establish before redirect
      setTimeout(() => { router.push(redirect); router.refresh(); }, 300);
    }
  };

  return (
    <>
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="auth-field"><label>Display name</label><input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} autoFocus placeholder="Your name"/></div>
        <div className="auth-field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"/></div>
        <div className="auth-field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters"/></div>
        <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
      </form>
      <div className="auth-link">Already have an account? <Link href={'/auth/login' + (redirect !== '/tool' ? '?redirect=' + encodeURIComponent(redirect) : '')}>Sign in</Link></div>
    </>
  );
}

export default function SignupPage() {
  return (
    <div className="auth-page"><div className="auth-card">
      <h1>Create account</h1><p>Start saving and sharing scenarios.</p>
      <Suspense fallback={<div style={{padding:20,textAlign:'center',color:'var(--text-muted)'}}>Loading...</div>}><SignupForm/></Suspense>
    </div></div>
  );
}
