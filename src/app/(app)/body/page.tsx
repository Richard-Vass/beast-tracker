'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';
import { todayStr, formatDate, daysAgo } from '@/lib/date-utils';
import type { BodyMeasurement } from '@/types';

const FIELDS = [
  { key: 'weight', label: 'Váha', unit: 'kg' },
  { key: 'body_fat', label: 'Tuk', unit: '%' },
  { key: 'chest', label: 'Hrudník', unit: 'cm' },
  { key: 'waist', label: 'Pás', unit: 'cm' },
  { key: 'hips', label: 'Boky', unit: 'cm' },
  { key: 'biceps', label: 'Biceps', unit: 'cm' },
  { key: 'thigh', label: 'Stehno', unit: 'cm' },
  { key: 'calf', label: 'Lýtko', unit: 'cm' },
  { key: 'neck', label: 'Krk', unit: 'cm' },
  { key: 'shoulders', label: 'Ramená', unit: 'cm' },
];

export default function BodyPage() {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await db.bodyMeasurements.getByDateRange(daysAgo(365), todayStr());
      if (data) setMeasurements(data);
      setLoading(false);
    }
    load();
  }, []);

  const save = useCallback(async () => {
    if (!user || saving) return;
    setSaving(true);
    const data: Record<string, number | null> = {};
    FIELDS.forEach(f => {
      data[f.key] = form[f.key] ? parseFloat(form[f.key]) : null;
    });
    const { data: saved } = await db.bodyMeasurements.create({
      user_id: user.id,
      date: todayStr(),
      ...data,
    });
    if (saved) setMeasurements(prev => [saved, ...prev]);
    setShowAdd(false);
    setForm({});
    setSaving(false);
  }, [user, form, saving]);

  const latest = measurements[0];
  const previous = measurements[1];

  const getDiff = (key: string) => {
    if (!latest || !previous) return null;
    const curr = (latest as unknown as Record<string, unknown>)[key] as number | null;
    const prev = (previous as unknown as Record<string, unknown>)[key] as number | null;
    if (curr == null || prev == null) return null;
    return curr - prev;
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
      <div style={{ color: 'var(--muted)' }}>Načítavam...</div>
    </div>;
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Merania tela</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: 'var(--orange)', borderRadius: 10, padding: '8px 14px',
          color: '#fff', fontSize: 13, fontWeight: 600,
        }}>
          <Icons.Plus size={16} /> Nové
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--orange)',
          borderRadius: 20, padding: 20, marginBottom: 20,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Nové meranie</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FIELDS.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, color: 'var(--muted)' }}>{f.label} ({f.unit})</label>
                <input
                  type="number"
                  step="0.1"
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder="—"
                  style={{ marginTop: 2, fontSize: 16, fontWeight: 600 }}
                />
              </div>
            ))}
          </div>
          <button onClick={save} disabled={saving} style={{
            width: '100%', marginTop: 16, padding: 14,
            background: 'var(--orange)', borderRadius: 12,
            color: '#fff', fontSize: 16, fontWeight: 600,
          }}>
            {saving ? 'Ukladám...' : 'Uložiť'}
          </button>
        </div>
      )}

      {/* Current measurements */}
      {latest && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 20, marginBottom: 20,
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Posledné meranie · {formatDate(latest.date)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {FIELDS.map(f => {
              const val = (latest as unknown as Record<string, unknown>)[f.key] as number | null;
              if (val == null) return null;
              const diff = getDiff(f.key);
              return (
                <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{f.label}</span>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{val}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}> {f.unit}</span>
                    {diff !== null && diff !== 0 && (
                      <span style={{
                        fontSize: 11, marginLeft: 4,
                        color: (f.key === 'waist' || f.key === 'body_fat')
                          ? (diff < 0 ? 'var(--green)' : 'var(--red)')
                          : (diff > 0 ? 'var(--green)' : 'var(--red)'),
                      }}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>
        História ({measurements.length} meraní)
      </div>
      {measurements.map(m => (
        <div key={m.id} style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 12, marginBottom: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 14 }}>{formatDate(m.date)}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {m.weight ? `${m.weight}kg` : ''} {m.body_fat ? `${m.body_fat}%` : ''}
          </div>
        </div>
      ))}

      {measurements.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          Zatiaľ žiadne merania
        </div>
      )}
    </div>
  );
}
