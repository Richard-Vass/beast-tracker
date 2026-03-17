'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Debug: log Supabase config status
    console.log('[Beast] Supabase configured:', isSupabaseConfigured());
    console.log('[Beast] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    if (auth.isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (Date.now() < lockUntil) {
      const mins = Math.ceil((lockUntil - Date.now()) / 60000);
      setError(`Príliš veľa pokusov. Skús znova o ${mins} min.`);
      return;
    }

    if (!email || !password) {
      setError('Vyplň email a heslo');
      return;
    }

    if (!isSupabaseConfigured()) {
      setError('Supabase nie je nakonfigurovaný. Skontroluj environment variables.');
      return;
    }

    setLoading(true);

    try {
      console.log('[Beast] Signing in:', email);
      const result = await auth.signIn(email, password);

      if (result.error) {
        console.error('[Beast] Auth error:', result.error);
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 5) {
          setLockUntil(Date.now() + 15 * 60000);
          setError('Účet dočasne zablokovaný. Skús o 15 minút.');
        } else {
          // Show actual Supabase error for debugging
          const errMsg = typeof result.error === 'string' ? result.error : 'Neznáma chyba';
          if (errMsg.includes('Invalid login') || errMsg.includes('invalid_grant')) {
            setError('Nesprávny email alebo heslo');
          } else if (errMsg.includes('Email not confirmed')) {
            setError('Email nie je potvrdený. Skontroluj inbox.');
          } else {
            setError(errMsg);
          }
        }
      } else {
        console.log('[Beast] Login success, redirecting...');
        router.replace('/dashboard');
      }
    } catch (err) {
      console.error('[Beast] Login catch error:', err);
      setError('Chyba pripojenia k serveru');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      background: '#0A0A0A',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          fontSize: 48, fontWeight: 800, color: '#F57C00',
          letterSpacing: -2, lineHeight: 1,
        }}>
          BEAST
        </div>
        <div style={{
          fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: 6,
          textTransform: 'uppercase', marginTop: 4,
        }}>
          TRACKER
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          style={{
            fontSize: 16, background: '#111111', color: '#fff',
            border: '1px solid #222222', borderRadius: 12,
            padding: '14px 16px', width: '100%',
          }}
        />
        <input
          type="password"
          placeholder="Heslo"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{
            fontSize: 16, background: '#111111', color: '#fff',
            border: '1px solid #222222', borderRadius: 12,
            padding: '14px 16px', width: '100%',
          }}
        />

        {error && (
          <div style={{
            color: '#EF4444', fontSize: 14, textAlign: 'center',
            padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
            borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#F57C00', color: '#fff',
            padding: '14px 24px', borderRadius: 12,
            fontSize: 16, fontWeight: 600, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Prihlasujem...' : 'Prihlásiť sa'}
        </button>
      </form>

      <div style={{ marginTop: 24, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
        Beast Tracker v2.0
      </div>
    </div>
  );
}
