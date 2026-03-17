'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/supabase';

const ALLOWED_EMAILS = [
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL || 'richard.vass@vassco.sk',
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const router = useRouter();

  useEffect(() => {
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

    setLoading(true);

    try {
      const result = await auth.signIn(email, password);

      if (result.error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 5) {
          setLockUntil(Date.now() + 15 * 60000);
          setError('Účet dočasne zablokovaný. Skús o 15 minút.');
        } else {
          setError('Nesprávny email alebo heslo');
        }
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('Chyba pripojenia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      background: 'var(--bg)',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          fontSize: 48, fontWeight: 800, color: 'var(--orange)',
          letterSpacing: -2, lineHeight: 1,
        }}>
          BEAST
        </div>
        <div style={{
          fontSize: 14, color: 'var(--muted)', letterSpacing: 6,
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
          style={{ fontSize: 16 }}
        />
        <input
          type="password"
          placeholder="Heslo"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{ fontSize: 16 }}
        />

        {error && (
          <div style={{
            color: 'var(--red)', fontSize: 14, textAlign: 'center',
            padding: '8px 12px', background: 'rgba(239,68,68,0.1)',
            borderRadius: 8,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'var(--orange)', color: '#fff',
            padding: '14px 24px', borderRadius: 12,
            fontSize: 16, fontWeight: 600,
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Prihlasujem...' : 'Prihlásiť sa'}
        </button>
      </form>

      <div style={{ marginTop: 24, color: 'var(--muted)', fontSize: 12 }}>
        Beast Tracker v2.0 — gymapp.sk
      </div>
    </div>
  );
}
