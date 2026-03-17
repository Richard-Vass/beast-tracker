'use client';

import React from 'react';
import { Icons } from '@/components/Icons';

export default function ReportsPage() {
  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Reporty</h1>
      <div style={{ padding: 40, color: 'var(--muted)' }}>
        <Icons.BarChart size={48} color="var(--muted)" />
        <div style={{ marginTop: 16, fontSize: 16 }}>Týždenné reporty budú čoskoro dostupné</div>
      </div>
    </div>
  );
}
