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
      background: 'rgba(8,8,8,0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingTop: 6,
      paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
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
              border: 'none',
              padding: '6px 16px',
              color: isActive ? '#F57C00' : 'rgba(255,255,255,0.3)',
              transition: 'color 0.2s',
              minWidth: 52,
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {isActive && (
              <div style={{
                position: 'absolute', top: -1, width: 20, height: 2,
                background: '#F57C00', borderRadius: 1,
                boxShadow: '0 0 8px rgba(245,124,0,0.5)',
              }} />
            )}
            <Icon size={20} color={isActive ? '#F57C00' : 'rgba(255,255,255,0.3)'} />
            <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: 0.3 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
