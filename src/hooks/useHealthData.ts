'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/supabase';
import { todayStr, daysAgo } from '@/lib/date-utils';
import type { HealthLog } from '@/types';

interface UseHealthDataOptions {
  userId?: string;
  days?: number; // how many days of history to load
}

export function useHealthData({ userId, days = 7 }: UseHealthDataOptions = {}) {
  const [today, setToday] = useState<HealthLog | null>(null);
  const [history, setHistory] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const [todayRes, historyRes] = await Promise.all([
        db.healthLogs.getByDate(todayStr()),
        db.healthLogs.getByDateRange(daysAgo(days), todayStr()),
      ]);

      if (todayRes.data?.[0]) {
        setToday(todayRes.data[0]);
        setLastSync(todayRes.data[0].created_at);
      }
      if (historyRes.data) {
        setHistory(historyRes.data);
      }
    } catch (err) {
      console.error('[Beast] Health data load error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for health data from iOS WebView bridge
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHealthData = (event: CustomEvent) => {
      console.log('[Beast] Received health data from iOS:', event.detail);
      // iOS app dispatches: window.dispatchEvent(new CustomEvent('healthDataFromWatch', { detail: data }))
      const data = event.detail;
      if (data && userId) {
        // Post to API
        fetch('/api/health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, data }),
        }).then(() => {
          load(); // Reload data
        }).catch(err => {
          console.error('[Beast] Health sync error:', err);
        });
      }
    };

    window.addEventListener('healthDataFromWatch', handleHealthData as EventListener);
    return () => window.removeEventListener('healthDataFromWatch', handleHealthData as EventListener);
  }, [userId, load]);

  // Compute trends from history
  const trends = {
    weight: computeTrend(history, 'weight'),
    sleep: computeTrend(history, 'sleep_hours'),
    hrv: computeTrend(history, 'hrv'),
    rhr: computeTrend(history, 'rhr'),
    steps: computeAverage(history, 'steps'),
  };

  return { today, history, loading, lastSync, trends, reload: load };
}

function computeTrend(logs: HealthLog[], field: keyof HealthLog): { current: number | null; previous: number | null; direction: 'up' | 'down' | 'same' } {
  const values = logs
    .map(l => l[field] as number | null)
    .filter((v): v is number => v != null);

  if (values.length < 2) return { current: values[0] || null, previous: null, direction: 'same' };

  const current = values[0];
  const previous = values[1];
  return {
    current,
    previous,
    direction: current > previous ? 'up' : current < previous ? 'down' : 'same',
  };
}

function computeAverage(logs: HealthLog[], field: keyof HealthLog): number | null {
  const values = logs
    .map(l => l[field] as number | null)
    .filter((v): v is number => v != null);

  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
