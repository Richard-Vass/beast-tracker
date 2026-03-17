'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';
import { SCHEDULE_PRESETS, DAYS_SK, WORKOUT_LABELS } from '@/lib/constants';
import type { UserProfile, UserSchedule, ScheduleMode, WorkoutType } from '@/types';

type View = 'main' | 'edit-profile' | 'schedule' | 'settings';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<View>('main');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schedule, setSchedule] = useState<UserSchedule | null>(null);
  const [editForm, setEditForm] = useState({ name: '', age: '', height: '', weight: '', goal: 'maintain', experience: 'intermediate' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [pRes, sRes] = await Promise.all([
        db.profiles.getAll(),
        db.schedule.get(),
      ]);
      if (pRes.data?.[0]) {
        setProfile(pRes.data[0]);
        setEditForm({
          name: pRes.data[0].name || '',
          age: String(pRes.data[0].age || ''),
          height: String(pRes.data[0].height || ''),
          weight: String(pRes.data[0].current_weight || ''),
          goal: pRes.data[0].goal || 'maintain',
          experience: pRes.data[0].experience || 'intermediate',
        });
      }
      if (sRes.data) setSchedule(sRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const saveProfile = useCallback(async () => {
    if (!profile || saving) return;
    setSaving(true);
    await db.profiles.update(profile.id, {
      name: editForm.name,
      age: parseInt(editForm.age) || null,
      height: parseFloat(editForm.height) || null,
      current_weight: parseFloat(editForm.weight) || null,
      goal: editForm.goal as UserProfile['goal'],
      experience: editForm.experience as UserProfile['experience'],
    });
    setProfile(p => p ? { ...p, ...editForm, age: parseInt(editForm.age) || null, height: parseFloat(editForm.height) || null, current_weight: parseFloat(editForm.weight) || null } as UserProfile : null);
    setSaving(false);
    setView('main');
  }, [profile, editForm, saving]);

  const updateScheduleMode = useCallback(async (mode: ScheduleMode) => {
    if (!user) return;
    const preset = SCHEDULE_PRESETS[mode];
    if (!preset) return;
    const data = { user_id: user.id, mode, schedule: preset.schedule };
    await db.schedule.upsert(data);
    setSchedule(prev => prev ? { ...prev, ...data } : data as UserSchedule);
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
      <div style={{ color: 'var(--muted)' }}>Načítavam...</div>
    </div>;
  }

  // ─── Edit Profile ──────────────────────────────────────────
  if (view === 'edit-profile') {
    return (
      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView('main')} style={{ background: 'none', color: 'var(--muted)' }}>
            <Icons.ChevronLeft size={24} />
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Profil</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'name', label: 'Meno', type: 'text' },
            { key: 'age', label: 'Vek', type: 'number' },
            { key: 'height', label: 'Výška (cm)', type: 'number' },
            { key: 'weight', label: 'Váha (kg)', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>{f.label}</label>
              <input
                type={f.type}
                value={(editForm as Record<string, string>)[f.key]}
                onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}

          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Cieľ</label>
            <select value={editForm.goal} onChange={e => setEditForm(p => ({ ...p, goal: e.target.value }))}>
              <option value="gain">Nárast svalov</option>
              <option value="loss">Strata tuku</option>
              <option value="maintain">Udržanie</option>
              <option value="recomp">Recomposition</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Skúsenosti</label>
            <select value={editForm.experience} onChange={e => setEditForm(p => ({ ...p, experience: e.target.value }))}>
              <option value="beginner">Začiatočník</option>
              <option value="intermediate">Stredne pokročilý</option>
              <option value="advanced">Pokročilý</option>
            </select>
          </div>

          <button onClick={saveProfile} disabled={saving} style={{
            padding: 14, background: 'var(--orange)', borderRadius: 12,
            color: '#fff', fontSize: 16, fontWeight: 600, marginTop: 8,
          }}>
            {saving ? 'Ukladám...' : 'Uložiť'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Schedule ──────────────────────────────────────────────
  if (view === 'schedule') {
    return (
      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView('main')} style={{ background: 'none', color: 'var(--muted)' }}>
            <Icons.ChevronLeft size={24} />
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Rozvrh</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {Object.entries(SCHEDULE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => updateScheduleMode(key as ScheduleMode)}
              style={{
                background: schedule?.mode === key ? 'var(--orange)' + '22' : 'var(--card)',
                border: `1px solid ${schedule?.mode === key ? 'var(--orange)' : 'var(--border)'}`,
                borderRadius: 16, padding: 16, color: '#fff', textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600 }}>{preset.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {preset.schedule.map((d, i) => `${DAYS_SK[i]}: ${d.t}`).join(' · ')}
              </div>
            </button>
          ))}
        </div>

        {/* Current schedule */}
        {schedule && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Aktuálny rozvrh</div>
            {schedule.schedule.map((day, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 14 }}>{DAYS_SK[i]}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: WORKOUT_LABELS[day.t as WorkoutType] ? 'var(--orange)' : 'var(--muted)' }}>
                  {WORKOUT_LABELS[day.t as WorkoutType] || day.t}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Main Profile ──────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Profil</h1>

      {/* User card */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            background: 'var(--orange)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700,
          }}>
            {(profile?.name || 'B')[0]}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{profile?.name || 'Beast'}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.email}</div>
          </div>
        </div>

        {profile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
            {[
              { label: 'Váha', value: profile.current_weight ? `${profile.current_weight} kg` : '—' },
              { label: 'Výška', value: profile.height ? `${profile.height} cm` : '—' },
              { label: 'Cieľ', value: profile.goal === 'gain' ? 'Bulk' : profile.goal === 'loss' ? 'Cut' : 'Maintain' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Menu items */}
      {[
        { label: 'Upraviť profil', icon: Icons.Edit, action: () => setView('edit-profile') },
        { label: 'Tréningový rozvrh', icon: Icons.Calendar, action: () => setView('schedule') },
        { label: 'Suplementy', icon: Icons.Pill, action: () => router.push('/supplements') },
        { label: 'Merania tela', icon: Icons.Activity, action: () => router.push('/body') },
        { label: 'Progress fotky', icon: Icons.Camera, action: () => router.push('/progress') },
        { label: 'AI Tréner', icon: Icons.Brain, action: () => router.push('/ai') },
      ].map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={item.action}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 16, marginBottom: 8, color: '#fff',
            }}
          >
            <Icon size={20} color="var(--orange)" />
            <span style={{ fontSize: 15, flex: 1, textAlign: 'left' }}>{item.label}</span>
            <Icons.ChevronRight size={16} color="var(--muted)" />
          </button>
        );
      })}

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 16, marginTop: 20, color: 'var(--red)',
        }}
      >
        <Icons.LogOut size={20} color="var(--red)" />
        <span style={{ fontSize: 15 }}>Odhlásiť sa</span>
      </button>

      <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--muted)', fontSize: 12 }}>
        Beast Tracker v2.0
      </div>
    </div>
  );
}
