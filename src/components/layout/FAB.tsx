'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';

const actions = [
  { label: 'Tréning', icon: Icons.Dumbbell, path: '/training', color: '#F57C00' },
  { label: 'AI Chat', icon: Icons.Brain, path: '/ai', color: '#A855F7' },
  { label: 'Jedlo', icon: Icons.Droplet, path: '/nutrition', color: '#10B981' },
  { label: 'Suplementy', icon: Icons.Pill, path: '/supplements', color: '#10B981' },
  { label: 'Merania', icon: Icons.Activity, path: '/body', color: '#3B82F6' },
  { label: 'Progress', icon: Icons.BarChart, path: '/progress', color: '#F59E0B' },
];

export default function FAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 90, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}
        />
      )}

      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 18, zIndex: 95,
          display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
        }}>
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => { setOpen(false); router.push(action.path); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: '10px 16px', color: '#fff',
                  cursor: 'pointer', backdropFilter: 'blur(12px)',
                  animation: `slideUp 0.15s ease-out ${i * 0.03}s both`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>{action.label}</span>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${action.color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={14} color={action.color} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 76, right: 18, zIndex: 95,
          width: 52, height: 52, borderRadius: 16,
          background: 'linear-gradient(135deg, #F57C00, #E65100)',
          color: '#fff', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(245,124,0,0.35)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <Icons.Plus size={24} />
      </button>
    </>
  );
}
