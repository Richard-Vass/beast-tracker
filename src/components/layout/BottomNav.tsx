'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';

const tabs = [
  { path: '/dashboard', label: 'Domov', icon: Icons.Home },
  { path: '/training', label: 'Tréning', icon: Icons.Dumbbell },
  { path: '/nutrition', label: 'Strava', icon: Icons.Droplet },
  { path: '/diary', label: 'Denník', icon: Icons.Book },
  { path: '/profile', label: 'Profil', icon: Icons.User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(10, 10, 10, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      zIndex: 100,
    }}>
      {tabs.map(tab => {
        const isActive = pathname.startsWith(tab.path);
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            onClick={() => router.push(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              background: 'none',
              padding: '4px 12px',
              color: isActive ? 'var(--orange)' : 'var(--muted)',
              transition: 'color 0.2s',
              minWidth: 56,
            }}
          >
            <Icon size={22} color={isActive ? 'var(--orange)' : 'rgba(255,255,255,0.5)'} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
