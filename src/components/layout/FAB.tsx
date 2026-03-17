'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';

const actions = [
  { label: 'Tréning', icon: Icons.Dumbbell, path: '/training' },
  { label: 'AI Chat', icon: Icons.Brain, path: '/ai' },
  { label: 'Jedlo', icon: Icons.Droplet, path: '/nutrition' },
  { label: 'Suplementy', icon: Icons.Pill, path: '/supplements' },
  { label: 'Merania', icon: Icons.Activity, path: '/body' },
  { label: 'Progress', icon: Icons.BarChart, path: '/progress' },
];

export default function FAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 90, backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Action items */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 20, zIndex: 95,
          display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
        }}>
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => { setOpen(false); router.push(action.path); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '10px 16px', color: '#fff',
                  animation: `slideUp 0.2s ease-out ${i * 0.05}s both`,
                }}
              >
                <span style={{ fontSize: 14 }}>{action.label}</span>
                <Icon size={20} color="var(--orange)" />
              </button>
            );
          })}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 95,
          width: 56, height: 56, borderRadius: 28,
          background: 'var(--orange)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(255, 107, 0, 0.4)',
          transition: 'transform 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <Icons.Plus size={28} />
      </button>
    </>
  );
}
