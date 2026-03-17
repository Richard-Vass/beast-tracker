'use client';

import React from 'react';
import BottomNav from '@/components/layout/BottomNav';
import FAB from '@/components/layout/FAB';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 80 }}>
      {children}
      <FAB />
      <BottomNav />
    </div>
  );
}
