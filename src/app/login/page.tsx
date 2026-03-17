'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [shakeError, setShakeError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    console.log('[Beast] Supabase configured:', isSupabaseConfigured());
    console.log('[Beast] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    if (auth.isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const triggerError = (msg: string) => {
    setError(msg);
    setShakeError(true);
    setTimeout(() => setShakeError(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (Date.now() < lockUntil) {
      const mins = Math.ceil((lockUntil - Date.now()) / 60000);
      triggerError(`Príliš veľa pokusov. Skús znova o ${mins} min.`);
      return;
    }

    if (!email || !password) {
      triggerError('Vyplň email a heslo');
      return;
    }

    if (!isSupabaseConfigured()) {
      triggerError('Supabase nie je nakonfigurovaný. Skontroluj environment variables.');
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
          triggerError('Účet dočasne zablokovaný. Skús o 15 minút.');
        } else {
          const errMsg = typeof result.error === 'string' ? result.error : 'Neznáma chyba';
          if (errMsg.includes('Invalid login') || errMsg.includes('invalid_grant')) {
            triggerError('Nesprávny email alebo heslo');
          } else if (errMsg.includes('Email not confirmed')) {
            triggerError('Email nie je potvrdený. Skontroluj inbox.');
          } else {
            triggerError(errMsg);
          }
        }
      } else {
        console.log('[Beast] Login success, redirecting...');
        router.replace('/dashboard');
      }
    } catch (err) {
      console.error('[Beast] Login catch error:', err);
      triggerError('Chyba pripojenia k serveru');
    } finally {
      setLoading(false);
    }
  };

  // --- SVG Icons ---
  const EmailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13L2 4" />
    </svg>
  );

  const LockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );

  const Spinner = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
      <path d="M12 2a10 10 0 019.75 7.75" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at 50% 0%, rgba(245,124,0,0.08) 0%, #0A0A0A 60%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background grid pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Ambient glow orb */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(245,124,0,0.06) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        filter: 'blur(40px)',
      }} />

      {/* Logo */}
      <div style={{
        marginBottom: 48,
        textAlign: 'center',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          fontSize: 64,
          fontWeight: 900,
          color: '#F57C00',
          letterSpacing: -3,
          lineHeight: 1,
          textShadow: '0 0 40px rgba(245,124,0,0.3), 0 0 80px rgba(245,124,0,0.1)',
          userSelect: 'none',
        }}>
          BEAST
        </div>
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: 12,
          textTransform: 'uppercase' as const,
          marginTop: 8,
          fontWeight: 500,
          userSelect: 'none',
        }}>
          TRACKER
        </div>
      </div>

      {/* Form */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Email Field */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{
            position: 'absolute',
            left: 16,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 2,
          }}>
            <EmailIcon />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            style={{
              fontSize: 16,
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '16px 16px 16px 48px',
              width: '100%',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              outline: 'none',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#F57C00';
              e.target.style.boxShadow = '0 0 0 3px rgba(245,124,0,0.15), 0 0 20px rgba(245,124,0,0.08)';
              e.target.style.background = 'rgba(255,255,255,0.06)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.08)';
              e.target.style.boxShadow = 'none';
              e.target.style.background = 'rgba(255,255,255,0.04)';
            }}
          />
        </div>

        {/* Password Field */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{
            position: 'absolute',
            left: 16,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 2,
          }}>
            <LockIcon />
          </div>
          <input
            type="password"
            placeholder="Heslo"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              fontSize: 16,
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '16px 16px 16px 48px',
              width: '100%',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              outline: 'none',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#F57C00';
              e.target.style.boxShadow = '0 0 0 3px rgba(245,124,0,0.15), 0 0 20px rgba(245,124,0,0.08)';
              e.target.style.background = 'rgba(255,255,255,0.06)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.08)';
              e.target.style.boxShadow = 'none';
              e.target.style.background = 'rgba(255,255,255,0.04)';
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            color: '#EF4444',
            fontSize: 14,
            textAlign: 'center',
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.08)',
            borderRadius: 12,
            border: '1px solid rgba(239,68,68,0.15)',
            animation: shakeError ? 'shake 0.5s ease-in-out' : 'fadeIn 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading
              ? 'linear-gradient(135deg, #CC5500, #F57C00)'
              : 'linear-gradient(135deg, #F57C00, #FF9800)',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginTop: 4,
            boxShadow: loading
              ? 'none'
              : '0 4px 20px rgba(245,124,0,0.25), 0 0 0 0 rgba(245,124,0,0)',
            letterSpacing: 0.5,
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={e => {
            if (!loading) {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 8px 30px rgba(245,124,0,0.35), 0 0 0 0 rgba(245,124,0,0)';
            }
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(245,124,0,0.25), 0 0 0 0 rgba(245,124,0,0)';
          }}
          onMouseDown={e => {
            if (!loading) {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0) scale(0.98)';
            }
          }}
          onMouseUp={e => {
            if (!loading) {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }
          }}
        >
          {loading && <Spinner />}
          {loading ? 'Prihlasujem...' : 'Prihlásiť sa'}
        </button>
      </form>

      {/* Footer */}
      <div style={{
        marginTop: 40,
        color: 'rgba(255,255,255,0.2)',
        fontSize: 12,
        letterSpacing: 2,
        fontWeight: 500,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.8s ease 0.4s',
        position: 'relative',
        zIndex: 1,
        userSelect: 'none',
      }}>
        Beast Tracker v2.0
      </div>
    </div>
  );
}
