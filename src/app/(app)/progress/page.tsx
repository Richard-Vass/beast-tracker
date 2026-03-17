'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db } from '@/lib/supabase';
import { Icons } from '@/components/Icons';
import { daysAgo, formatDate, todayStr } from '@/lib/date-utils';
import { computePRs, computeVolume, estimate1RM } from '@/lib/analytics';
import type { WorkoutSet, ProgressPhoto } from '@/types';

type View = 'prs' | 'charts' | 'photos';

// ─── Image compression helper ────────────────────────────────
function compressImage(file: File, maxWidth = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject('Canvas not supported'); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject('Failed to load image');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
}

export default function ProgressPage() {
  const [view, setView] = useState<View>('prs');
  const [allSets, setAllSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Photos state ────────────────────────────────────────────
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadDate, setUploadDate] = useState(todayStr());
  const [uploadWeight, setUploadWeight] = useState('');
  const [uploadBodyFat, setUploadBodyFat] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<ProgressPhoto | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<ProgressPhoto[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // ─── Load photos ────────────────────────────────────────────
  const loadPhotos = useCallback(async () => {
    setPhotosLoading(true);
    const { data } = await db.progressPhotos.getAll('order=date.desc');
    if (data) setPhotos(data);
    setPhotosLoading(false);
  }, []);

  useEffect(() => {
    async function load() {
      const { data } = await db.workoutSets.getAll('order=created_at.desc&limit=5000');
      if (data) setAllSets(data);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (view === 'photos' && photos.length === 0) loadPhotos();
  }, [view, photos.length, loadPhotos]);

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
          { key: 'photos', label: 'Fotky', icon: Icons.Camera },
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

      {/* Photos view */}
      {view === 'photos' && (
        <div>
          {/* Action bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => {
              setShowUpload(true);
              setUploadPreview(null);
              setUploadDate(todayStr());
              setUploadWeight('');
              setUploadBodyFat('');
              setUploadNotes('');
            }} style={{
              flex: 1, padding: '12px 16px', borderRadius: 14,
              background: '#F57C00', border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 600, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer',
            }}>
              <Icons.Camera size={18} /> Pridaj fotku
            </button>
            <button onClick={() => {
              setCompareMode(!compareMode);
              setCompareSelection([]);
              setShowCompare(false);
            }} style={{
              padding: '12px 16px', borderRadius: 14,
              background: compareMode ? '#F57C00' : '#1A1A1A',
              border: `1px solid ${compareMode ? '#F57C00' : '#2A2A2A'}`,
              color: '#fff', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              Porovnaj
            </button>
          </div>

          {/* Compare hint */}
          {compareMode && !showCompare && (
            <div style={{
              background: '#1A1A1A', border: '1px solid #F57C00', borderRadius: 12,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F57C00',
              textAlign: 'center',
            }}>
              Vyber 2 fotky na porovnanie ({compareSelection.length}/2)
            </div>
          )}

          {/* Photo grid */}
          {photosLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Nacitavam fotky...</div>
          ) : photos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              <Icons.Camera size={40} color="#888" />
              <div style={{ marginTop: 12 }}>Ziadne fotky. Pridaj prvu!</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {photos.map(photo => {
                const isSelected = compareSelection.some(p => p.id === photo.id);
                return (
                  <div key={photo.id} onClick={() => {
                    if (compareMode) {
                      if (isSelected) {
                        setCompareSelection(compareSelection.filter(p => p.id !== photo.id));
                      } else if (compareSelection.length < 2) {
                        const next = [...compareSelection, photo];
                        setCompareSelection(next);
                        if (next.length === 2) {
                          setShowCompare(true);
                          setSliderPos(50);
                        }
                      }
                    } else {
                      setViewPhoto(photo);
                    }
                  }} style={{
                    position: 'relative', borderRadius: 20, overflow: 'hidden',
                    aspectRatio: '3/4', cursor: 'pointer',
                    border: isSelected ? '3px solid #F57C00' : '1px solid #2A2A2A',
                  }}>
                    <img src={photo.photo_url} alt="" style={{
                      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                    }} />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                      padding: '20px 8px 8px',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
                        {formatDate(photo.date)}
                      </div>
                      {photo.weight && (
                        <div style={{ fontSize: 10, color: '#F57C00' }}>{photo.weight} kg</div>
                      )}
                    </div>
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 24, height: 24, borderRadius: 12,
                        background: '#F57C00', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icons.Check size={14} color="#fff" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload modal */}
          {showUpload && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
              zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }} onClick={() => setShowUpload(false)}>
              <div onClick={e => e.stopPropagation()} style={{
                background: '#0A0A0A', borderRadius: '24px 24px 0 0',
                padding: '24px 20px', width: '100%', maxWidth: 480,
                maxHeight: '90dvh', overflowY: 'auto',
                border: '1px solid #2A2A2A', borderBottom: 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Nova fotka</h2>
                  <button onClick={() => setShowUpload(false)} style={{
                    background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 4,
                  }}>
                    <Icons.X size={20} />
                  </button>
                </div>

                {/* File input */}
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const compressed = await compressImage(file);
                      setUploadPreview(compressed);
                    } catch {
                      alert('Chyba pri spracovani fotky');
                    }
                  }}
                />

                {uploadPreview ? (
                  <div style={{ marginBottom: 16, borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
                    <img src={uploadPreview} alt="Preview" style={{ width: '100%', display: 'block', borderRadius: 20 }} />
                    <button onClick={() => { setUploadPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 32, height: 32, borderRadius: 16,
                        background: 'rgba(0,0,0,0.7)', border: 'none',
                        color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      <Icons.X size={16} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} style={{
                    width: '100%', padding: '40px 20px', borderRadius: 20,
                    background: '#1A1A1A', border: '2px dashed #2A2A2A',
                    color: '#888', fontSize: 14, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    marginBottom: 16,
                  }}>
                    <Icons.Camera size={32} color="#F57C00" />
                    <span>Odfot alebo vyber fotku</span>
                  </button>
                )}

                {/* Form fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>Datum</label>
                    <input type="date" value={uploadDate} onChange={e => setUploadDate(e.target.value)} style={{
                      width: '100%', padding: '10px 12px', borderRadius: 12,
                      background: '#1A1A1A', border: '1px solid #2A2A2A',
                      color: '#fff', fontSize: 14, boxSizing: 'border-box',
                    }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>Vaha (kg)</label>
                      <input type="number" step="0.1" placeholder="napr. 82.5" value={uploadWeight}
                        onChange={e => setUploadWeight(e.target.value)} style={{
                          width: '100%', padding: '10px 12px', borderRadius: 12,
                          background: '#1A1A1A', border: '1px solid #2A2A2A',
                          color: '#fff', fontSize: 14, boxSizing: 'border-box',
                        }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>Tuk (%)</label>
                      <input type="number" step="0.1" placeholder="napr. 15.0" value={uploadBodyFat}
                        onChange={e => setUploadBodyFat(e.target.value)} style={{
                          width: '100%', padding: '10px 12px', borderRadius: 12,
                          background: '#1A1A1A', border: '1px solid #2A2A2A',
                          color: '#fff', fontSize: 14, boxSizing: 'border-box',
                        }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>Poznamky</label>
                    <textarea value={uploadNotes} onChange={e => setUploadNotes(e.target.value)}
                      placeholder="Volitelne poznamky..." rows={2} style={{
                        width: '100%', padding: '10px 12px', borderRadius: 12,
                        background: '#1A1A1A', border: '1px solid #2A2A2A',
                        color: '#fff', fontSize: 14, resize: 'vertical',
                        fontFamily: 'inherit', boxSizing: 'border-box',
                      }} />
                  </div>
                </div>

                <button disabled={!uploadPreview || saving} onClick={async () => {
                  if (!uploadPreview) return;
                  setSaving(true);
                  const { error } = await db.progressPhotos.create({
                    date: uploadDate,
                    photo_url: uploadPreview,
                    weight: uploadWeight ? parseFloat(uploadWeight) : null,
                    body_fat: uploadBodyFat ? parseFloat(uploadBodyFat) : null,
                    notes: uploadNotes,
                  });
                  setSaving(false);
                  if (error) { alert('Chyba: ' + error); return; }
                  setShowUpload(false);
                  loadPhotos();
                }} style={{
                  width: '100%', padding: '14px 20px', borderRadius: 14, marginTop: 16,
                  background: uploadPreview ? '#F57C00' : '#333',
                  border: 'none', color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: uploadPreview ? 'pointer' : 'not-allowed',
                  opacity: saving ? 0.6 : 1,
                }}>
                  {saving ? 'Ukladam...' : 'Ulozit fotku'}
                </button>
              </div>
            </div>
          )}

          {/* View photo modal */}
          {viewPhoto && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
              zIndex: 1000, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }} onClick={() => setViewPhoto(null)}>
              <div onClick={e => e.stopPropagation()} style={{
                maxWidth: 480, width: '100%', padding: 16,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                {/* Top bar */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', marginBottom: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{formatDate(viewPhoto.date)}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>
                      {viewPhoto.weight && `${viewPhoto.weight} kg`}
                      {viewPhoto.weight && viewPhoto.body_fat && ' · '}
                      {viewPhoto.body_fat && `${viewPhoto.body_fat}% tuk`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={async () => {
                      if (!confirm('Naozaj vymazat tuto fotku?')) return;
                      await db.progressPhotos.delete(viewPhoto.id);
                      setViewPhoto(null);
                      loadPhotos();
                    }} style={{
                      padding: '8px 12px', borderRadius: 10,
                      background: '#2A1A1A', border: '1px solid #4A2A2A',
                      color: '#ff5555', fontSize: 13, cursor: 'pointer',
                    }}>
                      <Icons.Trash size={16} color="#ff5555" />
                    </button>
                    <button onClick={() => setViewPhoto(null)} style={{
                      padding: '8px 12px', borderRadius: 10,
                      background: '#1A1A1A', border: '1px solid #2A2A2A',
                      color: '#fff', fontSize: 13, cursor: 'pointer',
                    }}>
                      <Icons.X size={16} />
                    </button>
                  </div>
                </div>

                {/* Photo */}
                <img src={viewPhoto.photo_url} alt="" style={{
                  width: '100%', maxHeight: '70dvh', objectFit: 'contain',
                  borderRadius: 20,
                }} />

                {/* Notes */}
                {viewPhoto.notes && (
                  <div style={{
                    marginTop: 12, padding: '10px 14px', borderRadius: 12,
                    background: '#1A1A1A', border: '1px solid #2A2A2A',
                    fontSize: 13, color: '#ccc', width: '100%', boxSizing: 'border-box',
                  }}>
                    {viewPhoto.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comparison modal */}
          {showCompare && compareSelection.length === 2 && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
              zIndex: 1000, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ maxWidth: 480, width: '100%', padding: 16 }}>
                {/* Top bar */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Porovnanie</div>
                  <button onClick={() => {
                    setShowCompare(false);
                    setCompareMode(false);
                    setCompareSelection([]);
                  }} style={{
                    padding: '8px 12px', borderRadius: 10,
                    background: '#1A1A1A', border: '1px solid #2A2A2A',
                    color: '#fff', cursor: 'pointer',
                  }}>
                    <Icons.X size={16} />
                  </button>
                </div>

                {/* Stats difference */}
                {(() => {
                  const [a, b] = compareSelection.sort((x, y) => x.date.localeCompare(y.date));
                  const weightDiff = a.weight && b.weight ? (b.weight - a.weight).toFixed(1) : null;
                  const daysDiff = Math.round((new Date(b.date).getTime() - new Date(a.date).getTime()) / 86400000);
                  return (
                    <div style={{
                      display: 'flex', justifyContent: 'space-around', marginBottom: 12,
                      padding: '10px 14px', borderRadius: 12,
                      background: '#1A1A1A', border: '1px solid #2A2A2A',
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#888' }}>Obdobie</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#F57C00' }}>{daysDiff} dni</div>
                      </div>
                      {weightDiff && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#888' }}>Vaha</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: parseFloat(weightDiff) <= 0 ? '#4CAF50' : '#ff5555' }}>
                            {parseFloat(weightDiff) > 0 ? '+' : ''}{weightDiff} kg
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Before/after slider */}
                <div ref={sliderRef} style={{
                  position: 'relative', borderRadius: 20, overflow: 'hidden',
                  aspectRatio: '3/4', userSelect: 'none', touchAction: 'none',
                }}
                onPointerDown={(e) => {
                  const el = sliderRef.current;
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  const update = (clientX: number) => {
                    const x = clientX - rect.left;
                    setSliderPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
                  };
                  update(e.clientX);
                  const onMove = (ev: PointerEvent) => update(ev.clientX);
                  const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
                  window.addEventListener('pointermove', onMove);
                  window.addEventListener('pointerup', onUp);
                }}>
                  {/* After (right/newer) - full background */}
                  <img src={compareSelection.sort((x, y) => x.date.localeCompare(y.date))[1].photo_url} alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  {/* Before (left/older) - clipped */}
                  <div style={{
                    position: 'absolute', inset: 0, overflow: 'hidden',
                    width: `${sliderPos}%`,
                  }}>
                    <img src={compareSelection.sort((x, y) => x.date.localeCompare(y.date))[0].photo_url} alt=""
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        width: sliderRef.current ? `${sliderRef.current.offsetWidth}px` : '100vw',
                        height: '100%', objectFit: 'cover',
                      }} />
                  </div>
                  {/* Slider line */}
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `${sliderPos}%`, transform: 'translateX(-50%)',
                    width: 3, background: '#F57C00', zIndex: 10,
                  }}>
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 36, height: 36, borderRadius: 18,
                      background: '#F57C00', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }}>
                      <span style={{ fontSize: 16, color: '#fff', fontWeight: 700 }}>&#x2194;</span>
                    </div>
                  </div>
                  {/* Date labels */}
                  <div style={{
                    position: 'absolute', bottom: 10, left: 10,
                    background: 'rgba(0,0,0,0.7)', padding: '4px 8px',
                    borderRadius: 8, fontSize: 11, color: '#fff', fontWeight: 600, zIndex: 5,
                  }}>
                    {formatDate(compareSelection.sort((x, y) => x.date.localeCompare(y.date))[0].date)}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 10, right: 10,
                    background: 'rgba(0,0,0,0.7)', padding: '4px 8px',
                    borderRadius: 8, fontSize: 11, color: '#fff', fontWeight: 600, zIndex: 5,
                  }}>
                    {formatDate(compareSelection.sort((x, y) => x.date.localeCompare(y.date))[1].date)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
