'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase-browser';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/tool';

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError(null);
    const { error: err } = await getSupabase().auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); }
    else { router.push(redirect); router.refresh(); }
  };

  return (
    <>
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="auth-field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="you@example.com"/></div>
        <div className="auth-field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your password"/></div>
        <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <div className="auth-link">Don&apos;t have an account? <Link href="/auth/signup">Create one</Link></div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-page"><div className="auth-card">
      <h1>Sign in</h1><p>Access your saved scenarios and teams.</p>
      <Suspense fallback={<div style={{padding:20,textAlign:'center',color:'var(--text-muted)'}}>Loading...</div>}><LoginForm/></Suspense>
    </div></div>
  );
}
