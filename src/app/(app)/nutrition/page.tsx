'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';
import { todayStr } from '@/lib/date-utils';
import { computeTDEE, computeMacros } from '@/lib/scoring';
import { searchFood, FOOD_DB, FOOD_CATEGORIES } from '@/lib/food-db';
import type { FoodEntry, WaterLog, NutritionSettings, UserProfile, MealType, FoodItem } from '@/types';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Raňajky',
  lunch: 'Obed',
  dinner: 'Večera',
  snack: 'Snack',
};

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

export default function NutritionPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [water, setWater] = useState<WaterLog | null>(null);
  const [settings, setSettings] = useState<NutritionSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Add food modal
  const [showAddFood, setShowAddFood] = useState(false);
  const [addMeal, setAddMeal] = useState<MealType>('lunch');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [portion, setPortion] = useState(100);

  useEffect(() => {
    async function load() {
      const [entriesRes, waterRes, settingsRes, profileRes] = await Promise.all([
        db.foodDiary.getByDate(todayStr()),
        db.waterLogs.getByDate(todayStr()),
        db.nutritionSettings.get(),
        db.profiles.getAll(),
      ]);
      if (entriesRes.data) setEntries(entriesRes.data);
      if (waterRes.data?.[0]) setWater(waterRes.data[0]);
      if (settingsRes.data) setSettings(settingsRes.data);
      if (profileRes.data?.[0]) setProfile(profileRes.data[0]);
      setLoading(false);
    }
    load();
  }, []);

  // Compute targets
  const targets = useMemo(() => {
    if (settings?.custom_calories) {
      return {
        calories: settings.custom_calories,
        protein: settings.custom_protein || 160,
        carbs: settings.custom_carbs || 250,
        fat: settings.custom_fat || 70,
      };
    }
    if (profile?.current_weight && profile.height && profile.age) {
      const tdee = computeTDEE(
        profile.current_weight, profile.height, profile.age,
        'male', settings?.activity_level || 'moderate'
      );
      return computeMacros(tdee, settings?.goal || profile.goal || 'maintain', profile.current_weight);
    }
    return { calories: 2500, protein: 180, carbs: 300, fat: 70 };
  }, [settings, profile]);

  // Today's totals
  const totals = useMemo(() => {
    return entries.reduce((acc, e) => ({
      calories: acc.calories + (e.calories * e.portion / 100),
      protein: acc.protein + (e.protein * e.portion / 100),
      carbs: acc.carbs + (e.carbs * e.portion / 100),
      fat: acc.fat + (e.fat * e.portion / 100),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [entries]);

  // Meals grouped
  const meals = useMemo(() => {
    const grouped: Record<MealType, FoodEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    entries.forEach(e => {
      if (grouped[e.meal]) grouped[e.meal].push(e);
    });
    return grouped;
  }, [entries]);

  // Add food
  const addFood = useCallback(async () => {
    if (!user || !selectedFood) return;
    const mult = portion / 100;
    const { data } = await db.foodDiary.create({
      user_id: user.id,
      date: todayStr(),
      meal: addMeal,
      food_name: selectedFood.name,
      portion,
      unit: selectedFood.unit || 'g',
      calories: selectedFood.cal,
      protein: selectedFood.p,
      carbs: selectedFood.c,
      fat: selectedFood.f,
    });
    if (data) setEntries(prev => [...prev, data]);
    setShowAddFood(false);
    setSelectedFood(null);
    setSearchQuery('');
    setPortion(100);
  }, [user, selectedFood, portion, addMeal]);

  // Delete food entry
  const deleteEntry = useCallback(async (id: string) => {
    await db.foodDiary.delete(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  // Water
  const addWater = useCallback(async (ml: number) => {
    if (!user) return;
    const newAmount = (water?.amount_ml || 0) + ml;
    const { data } = await db.waterLogs.upsert({
      user_id: user.id,
      date: todayStr(),
      amount_ml: newAmount,
    }, 'user_id,date');
    if (data) setWater(data);
  }, [user, water]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery) return FOOD_DB.slice(0, 20);
    return searchFood(searchQuery);
  }, [searchQuery]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
      <div style={{ color: 'var(--muted)' }}>Načítavam...</div>
    </div>;
  }

  const macroBar = (value: number, target: number, color: string, label: string) => {
    const pct = Math.min(100, (value / target) * 100);
    return (
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color }}>{label}</span>
          <span style={{ color: 'var(--muted)' }}>{Math.round(value)}/{target}g</span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: color, width: `${pct}%`, borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Strava</h1>

      {/* Calorie ring */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 20, marginBottom: 16, textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, fontWeight: 800 }}>
          {Math.round(totals.calories)}
          <span style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 400 }}> / {targets.calories} kcal</span>
        </div>
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, margin: '12px 0', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4, transition: 'width 0.3s',
            width: `${Math.min(100, (totals.calories / targets.calories) * 100)}%`,
            background: totals.calories > targets.calories ? 'var(--red)' : 'var(--orange)',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {macroBar(totals.protein, targets.protein, '#3B82F6', 'Proteín')}
          {macroBar(totals.carbs, targets.carbs, '#F59E0B', 'Sacharidy')}
          {macroBar(totals.fat, targets.fat, '#EC4899', 'Tuky')}
        </div>
      </div>

      {/* Water tracker */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 16, marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icons.Droplet size={20} color="var(--blue)" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{((water?.amount_ml || 0) / 1000).toFixed(1)}L</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>/ {((profile?.current_weight || 80) * 0.035).toFixed(1)}L cieľ</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[250, 500].map(ml => (
            <button key={ml} onClick={() => addWater(ml)} style={{
              background: 'var(--border)', borderRadius: 10, padding: '6px 12px',
              color: 'var(--blue)', fontSize: 13, fontWeight: 600,
            }}>
              +{ml}ml
            </button>
          ))}
        </div>
      </div>

      {/* Meals */}
      {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(meal => (
        <div key={meal} style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{MEAL_ICONS[meal]}</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{MEAL_LABELS[meal]}</span>
            </div>
            <button
              onClick={() => { setAddMeal(meal); setShowAddFood(true); }}
              style={{ background: 'var(--border)', borderRadius: 8, padding: '4px 10px', color: 'var(--orange)', fontSize: 13 }}
            >
              <Icons.Plus size={14} color="var(--orange)" />
            </button>
          </div>

          {meals[meal].length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>
              Pridaj jedlo...
            </div>
          ) : (
            meals[meal].map(entry => {
              const mult = entry.portion / 100;
              return (
                <div key={entry.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontSize: 14 }}>{entry.food_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {entry.portion}{entry.unit || 'g'} · {Math.round(entry.calories * mult)} kcal
                    </div>
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} style={{ background: 'none', padding: 4 }}>
                    <Icons.X size={14} color="var(--muted)" />
                  </button>
                </div>
              );
            })
          )}

          {meals[meal].length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--orange)', marginTop: 8, textAlign: 'right' }}>
              {Math.round(meals[meal].reduce((s, e) => s + e.calories * e.portion / 100, 0))} kcal
            </div>
          )}
        </div>
      ))}

      {/* Add Food Modal */}
      {showAddFood && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 200, display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--bg)', borderRadius: '20px 20px 0 0',
            marginTop: 'auto', maxHeight: '85dvh', overflow: 'auto',
            padding: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                Pridať do: {MEAL_LABELS[addMeal]}
              </h2>
              <button onClick={() => { setShowAddFood(false); setSelectedFood(null); }} style={{ background: 'none', color: 'var(--muted)' }}>
                <Icons.X size={24} />
              </button>
            </div>

            {!selectedFood ? (
              <>
                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <Icons.Search size={18} color="var(--muted)" className="absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Hľadaj jedlo..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    autoFocus
                    style={{ paddingLeft: 36 }}
                  />
                </div>

                {/* Results */}
                <div style={{ maxHeight: '50dvh', overflow: 'auto' }}>
                  {searchResults.map(food => (
                    <button
                      key={food.id}
                      onClick={() => { setSelectedFood(food); setPortion(food.serving || 100); }}
                      style={{
                        width: '100%', textAlign: 'left', background: 'var(--card)',
                        border: '1px solid var(--border)', borderRadius: 12,
                        padding: 12, marginBottom: 8, color: '#fff',
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{food.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {food.cal} kcal · P {food.p}g · C {food.c}g · F {food.f}g
                        <span style={{ color: 'var(--soft)' }}> (per 100{food.unit || 'g'})</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Selected food detail */}
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: 16, marginBottom: 16,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{selectedFood.name}</div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, color: 'var(--muted)' }}>Množstvo ({selectedFood.unit || 'g'})</label>
                    <input
                      type="number"
                      value={portion}
                      onChange={e => setPortion(parseFloat(e.target.value) || 0)}
                      style={{ marginTop: 4, fontSize: 20, fontWeight: 700 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{Math.round(selectedFood.cal * portion / 100)}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>kcal</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#3B82F6' }}>{Math.round(selectedFood.p * portion / 100)}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>protein</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B' }}>{Math.round(selectedFood.c * portion / 100)}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>carbs</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#EC4899' }}>{Math.round(selectedFood.f * portion / 100)}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>fat</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setSelectedFood(null)}
                    style={{
                      flex: 1, padding: 14, background: 'var(--card)',
                      border: '1px solid var(--border)', borderRadius: 12,
                      color: 'var(--soft)', fontSize: 16,
                    }}
                  >
                    Späť
                  </button>
                  <button
                    onClick={addFood}
                    style={{
                      flex: 2, padding: 14, background: 'var(--orange)',
                      borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 600,
                    }}
                  >
                    Pridať
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
