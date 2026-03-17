'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';
import { DEFAULT_SUPPLEMENTS, SUPPLEMENT_GROUP_LABELS } from '@/lib/constants';
import { todayStr } from '@/lib/date-utils';
import type { SupplementGroup, SupplementLog, CustomSupplement } from '@/types';

const GROUP_ORDER: SupplementGroup[] = ['morning', 'pre', 'during', 'post', 'evening'];
const GROUP_ICONS: Record<SupplementGroup, string> = {
  morning: '🌅', pre: '💪', during: '⚡', post: '🥤', evening: '🌙',
};

export default function SupplementsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SupplementLog[]>([]);
  const [customs, setCustoms] = useState<CustomSupplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppGroup, setNewSuppGroup] = useState<SupplementGroup>('morning');

  useEffect(() => {
    async function load() {
      const [logsRes, customsRes] = await Promise.all([
        db.supplementLogs.getByDate(todayStr()),
        db.customSupplements.getAll(),
      ]);
      if (logsRes.data) setLogs(logsRes.data);
      if (customsRes.data) setCustoms(customsRes.data);
      setLoading(false);
    }
    load();
  }, []);

  // Get supplements for a group (custom or default)
  const getSupps = (group: SupplementGroup) => {
    const custom = customs.filter(c => c.group_key === group);
    if (custom.length > 0) return custom.map(c => ({ id: c.supplement_id, name: c.name }));
    return DEFAULT_SUPPLEMENTS[group];
  };

  const isChecked = (suppId: string) => logs.some(l => l.supplement_id === suppId);

  const toggleSupplement = useCallback(async (suppId: string) => {
    if (!user) return;
    const existing = logs.find(l => l.supplement_id === suppId);
    if (existing) {
      await db.supplementLogs.delete(existing.id);
      setLogs(prev => prev.filter(l => l.id !== existing.id));
    } else {
      const { data } = await db.supplementLogs.create({
        user_id: user.id,
        date: todayStr(),
        supplement_id: suppId,
        taken: true,
      });
      if (data) setLogs(prev => [...prev, data]);
    }
  }, [user, logs]);

  const addSupplement = useCallback(async () => {
    if (!user || !newSuppName.trim()) return;
    const id = newSuppName.toLowerCase().replace(/\s+/g, '_');
    const { data } = await db.customSupplements.create({
      user_id: user.id,
      group_key: newSuppGroup,
      supplement_id: id,
      name: newSuppName.trim(),
      sort_order: customs.filter(c => c.group_key === newSuppGroup).length,
    });
    if (data) setCustoms(prev => [...prev, data]);
    setNewSuppName('');
  }, [user, newSuppName, newSuppGroup, customs]);

  const removeSupplement = useCallback(async (id: string) => {
    await db.customSupplements.delete(id);
    setCustoms(prev => prev.filter(c => c.id !== id));
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
      <div style={{ color: 'var(--muted)' }}>Načítavam...</div>
    </div>;
  }

  const totalSupps = GROUP_ORDER.reduce((sum, g) => sum + getSupps(g).length, 0);
  const checkedCount = logs.length;

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Suplementy</h1>
        <button onClick={() => setEditing(!editing)} style={{
          background: editing ? 'var(--orange)' : 'var(--card)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '6px 12px', color: '#fff', fontSize: 12,
        }}>
          {editing ? 'Hotovo' : 'Upraviť'}
        </button>
      </div>

      {/* Progress */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 16, marginBottom: 20, textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>
          {checkedCount}/{totalSupps}
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, margin: '8px 0', overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: 'var(--green)', borderRadius: 3,
            width: `${totalSupps > 0 ? (checkedCount / totalSupps) * 100 : 0}%`,
            transition: 'width 0.3s',
          }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Dnes prijaté</div>
      </div>

      {/* Groups */}
      {GROUP_ORDER.map(group => {
        const supps = getSupps(group);
        return (
          <div key={group} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 16, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span>{GROUP_ICONS[group]}</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{SUPPLEMENT_GROUP_LABELS[group]}</span>
            </div>

            {supps.map(supp => (
              <label key={supp.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={isChecked(supp.id)}
                  onChange={() => toggleSupplement(supp.id)}
                  style={{ accentColor: 'var(--green)', width: 18, height: 18 }}
                />
                <span style={{
                  fontSize: 15, flex: 1,
                  textDecoration: isChecked(supp.id) ? 'line-through' : 'none',
                  color: isChecked(supp.id) ? 'var(--muted)' : '#fff',
                }}>
                  {supp.name}
                </span>
                {editing && customs.find(c => c.supplement_id === supp.id) && (
                  <button onClick={() => {
                    const custom = customs.find(c => c.supplement_id === supp.id);
                    if (custom) removeSupplement(custom.id);
                  }} style={{ background: 'none', padding: 2 }}>
                    <Icons.X size={14} color="var(--red)" />
                  </button>
                )}
              </label>
            ))}
          </div>
        );
      })}

      {/* Add supplement */}
      {editing && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--orange)',
          borderRadius: 16, padding: 16, marginTop: 12,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Pridať suplement</div>
          <select value={newSuppGroup} onChange={e => setNewSuppGroup(e.target.value as SupplementGroup)}
            style={{ marginBottom: 8 }}>
            {GROUP_ORDER.map(g => (
              <option key={g} value={g}>{SUPPLEMENT_GROUP_LABELS[g]}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newSuppName}
              onChange={e => setNewSuppName(e.target.value)}
              placeholder="Názov suplementu"
              style={{ flex: 1 }}
            />
            <button onClick={addSupplement} style={{
              background: 'var(--orange)', borderRadius: 12, padding: '0 16px', color: '#fff',
            }}>
              <Icons.Plus size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
