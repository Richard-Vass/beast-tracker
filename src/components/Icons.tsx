/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — SVG Icons
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';

type IconProps = {
  size?: number;
  color?: string;
  className?: string;
};

const icon = (path: string, viewBox = '0 0 24 24') =>
  ({ size = 24, color = 'currentColor', className }: IconProps) => (
    <svg width={size} height={size} viewBox={viewBox} fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );

export const Icons = {
  // Navigation
  Home: icon('M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z'),
  Dumbbell: ({ size = 24, color = 'currentColor', className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6.5 6.5h11M6.5 17.5h11M2 12h20" />
      <rect x="4" y="4" width="3" height="16" rx="1" />
      <rect x="17" y="4" width="3" height="16" rx="1" />
    </svg>
  ),
  Apple: icon('M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2'),
  Book: icon('M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5z'),
  User: icon('M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z'),
  Settings: icon('M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'),

  // Actions
  Plus: icon('M12 5v14M5 12h14'),
  X: icon('M18 6L6 18M6 6l12 12'),
  Check: icon('M20 6L9 17l-5-5'),
  ChevronRight: icon('M9 18l6-6-6-6'),
  ChevronLeft: icon('M15 18l-6-6 6-6'),
  ChevronDown: icon('M6 9l6 6 6-6'),
  Edit: icon('M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'),
  Trash: icon('M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2'),
  Search: icon('M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35'),

  // Features
  Flame: icon('M12 22c4-4 8-7.58 8-12a8 8 0 10-16 0c0 4.42 4 8 8 12z'),
  Timer: icon('M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z'),
  Trophy: icon('M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22h10c0-2-0.85-3.25-2.03-3.79A1.07 1.07 0 0114 17v-2.34M18 2H6v7a6 6 0 1012 0V2z'),
  Brain: icon('M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z'),
  Camera: icon('M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z'),
  BarChart: icon('M12 20V10M18 20V4M6 20v-4'),
  Calendar: icon('M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18'),
  Mic: icon('M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8'),
  Droplet: icon('M12 2.69l5.66 5.66a8 8 0 11-11.31 0z'),
  Pill: icon('M10.5 1.5l-8 8a5 5 0 007.07 7.07l8-8a5 5 0 00-7.07-7.07zM6 14l8-8'),
  Heart: icon('M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'),
  Moon: icon('M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z'),
  Sun: icon('M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'),
  LogOut: icon('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9'),
  Download: icon('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3'),
  Upload: icon('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12'),
  Zap: icon('M13 2L3 14h9l-1 8 10-12h-9l1-8'),
  Activity: icon('M22 12h-4l-3 9L9 3l-3 9H2'),
  Target: icon('M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z'),
};
