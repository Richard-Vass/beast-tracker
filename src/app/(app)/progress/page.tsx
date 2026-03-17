'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/supabase';
import { Icons } from '@/components/Icons';
import { daysAgo, formatDate, todayStr } from '@/lib/date-utils';
import { computePRs, computeVolume, estimate1RM } from '@/lib/analytics';
import type { WorkoutSet } from '@/types';

type View = 'prs' | 'charts' | 'photos';

export default function ProgressPage() {
  const [view, setView] = useState<View>('prs');
  const [allSets, setAllSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await db.workoutSets.getAll('order=created_at.desc&limit=5000');
      if (data) setAllSets(data);
      setLoading(false);
    }
    load();
  }, []);

  const prs = useMemo(() => computePRs(allSets), [allSets]);
  const prList = useMemo(() => Array.from(prs.values()).sort((a, b) => b.estimated1RM - a.estimated1RM), [prs]);

  // Weekly volumes
  const weeklyVolumes = useMemo(() => {
    const weeks: Record<string, number> = {};
    allSets.forEach(s => {
      if (!s.done || !s.weight || !s.reps) return;
      const week = s.created_at?.slice(0, 10) || '';
      if (!weeks[week]) weeks[week] = 0;
      weeks[week] += s.weight * s.reps;
    });
    return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).slice(-20);
  }, [allSets]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
      <div style={{ color: 'var(--muted)' }}>Načítavam...</div>
    </div>;
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Progress</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([
          { key: 'prs', label: 'PRs', icon: Icons.Trophy },
          { key: 'charts', label: 'Grafy', icon: Icons.BarChart },
        ] as { key: View; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[]).map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setView(tab.key)} style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              background: view === tab.key ? 'var(--orange)' : 'var(--card)',
              border: `1px solid ${view === tab.key ? 'var(--orange)' : 'var(--border)'}`,
              color: '#fff', fontSize: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* PRs view */}
      {view === 'prs' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Personal Records ({prList.length})
          </div>
          {prList.map((pr, i) => (
            <div key={pr.exerciseId} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 14, marginBottom: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: i < 3 ? 'var(--orange)' : 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{pr.exerciseName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {pr.weight}kg × {pr.reps} · {formatDate(pr.date)}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--orange)' }}>{pr.estimated1RM}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>e1RM kg</div>
              </div>
            </div>
          ))}
          {prList.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              <Icons.Trophy size={40} color="var(--muted)" />
              <div style={{ marginTop: 12 }}>Začni trénovať pre osobné rekordy!</div>
            </div>
          )}
        </div>
      )}

      {/* Charts view */}
      {view === 'charts' && (
        <div>
          {/* Simple bar chart for weekly volume */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Týždenný objem</div>
            {weeklyVolumes.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                {weeklyVolumes.map(([date, vol], i) => {
                  const maxVol = Math.max(...weeklyVolumes.map(([, v]) => v));
                  const height = maxVol > 0 ? (vol / maxVol) * 100 : 0;
                  return (
                    <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '100%', height: `${height}%`, minHeight: 2,
                        background: 'var(--orange)', borderRadius: '4px 4px 0 0',
                        opacity: 0.6 + (i / weeklyVolumes.length) * 0.4,
                      }} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>
                Nedostatok dát
              </div>
            )}
          </div>

          {/* Total stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 16, textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {Math.round(allSets.reduce((s, set) => s + (set.done && set.weight && set.reps ? set.weight * set.reps : 0), 0) / 1000)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Celkový objem (t)</div>
            </div>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 16, textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{allSets.filter(s => s.done).length}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Celkovo setov</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
