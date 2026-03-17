/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — Food Database (per 100g)
   ═══════════════════════════════════════════════════════════════ */

import type { FoodItem } from '@/types';

export const FOOD_DB: FoodItem[] = [
  // Mäso
  { id: 'chicken_breast', name: 'Kuracie prsia', cat: 'meat', cal: 165, p: 31, c: 0, f: 3.6 },
  { id: 'chicken_thigh', name: 'Kuracie stehná', cat: 'meat', cal: 209, p: 26, c: 0, f: 10.9 },
  { id: 'turkey_breast', name: 'Morčacie prsia', cat: 'meat', cal: 135, p: 30, c: 0, f: 1 },
  { id: 'beef_lean', name: 'Hovädzie mleté (lean)', cat: 'meat', cal: 250, p: 26, c: 0, f: 15 },
  { id: 'beef_steak', name: 'Hovädzi steak', cat: 'meat', cal: 271, p: 26, c: 0, f: 18 },
  { id: 'pork_loin', name: 'Bravčová panenka', cat: 'meat', cal: 143, p: 26, c: 0, f: 3.5 },
  { id: 'pork_chop', name: 'Bravčový rezeň', cat: 'meat', cal: 231, p: 25, c: 0, f: 14 },
  { id: 'salmon', name: 'Losos', cat: 'meat', cal: 208, p: 20, c: 0, f: 13 },
  { id: 'tuna', name: 'Tuniak (konzerva)', cat: 'meat', cal: 116, p: 26, c: 0, f: 0.8 },
  { id: 'shrimp', name: 'Krevety', cat: 'meat', cal: 85, p: 20, c: 0, f: 0.5 },
  { id: 'eggs', name: 'Vajcia', cat: 'meat', cal: 155, p: 13, c: 1.1, f: 11, serving: 60, unit: 'ks' },
  { id: 'egg_whites', name: 'Vaječné bielka', cat: 'meat', cal: 52, p: 11, c: 0.7, f: 0.2 },

  // Mliečne
  { id: 'greek_yogurt', name: 'Grécky jogurt', cat: 'dairy', cal: 97, p: 9, c: 3.6, f: 5 },
  { id: 'skyr', name: 'Skyr', cat: 'dairy', cal: 63, p: 11, c: 4, f: 0.2 },
  { id: 'cottage', name: 'Cottage cheese', cat: 'dairy', cal: 98, p: 11, c: 3.4, f: 4.3 },
  { id: 'milk', name: 'Mlieko 1.5%', cat: 'dairy', cal: 47, p: 3.4, c: 4.8, f: 1.5 },
  { id: 'cheese_eidam', name: 'Eidam 30%', cat: 'dairy', cal: 262, p: 27, c: 0, f: 17 },
  { id: 'mozzarella', name: 'Mozzarella', cat: 'dairy', cal: 280, p: 28, c: 3, f: 17 },
  { id: 'cream_cheese', name: 'Krémový syr', cat: 'dairy', cal: 342, p: 6, c: 4, f: 34 },

  // Obilniny a pečivo
  { id: 'rice_white', name: 'Ryža biela (varená)', cat: 'grains', cal: 130, p: 2.7, c: 28, f: 0.3 },
  { id: 'rice_brown', name: 'Ryža hnedá (varená)', cat: 'grains', cal: 112, p: 2.3, c: 24, f: 0.8 },
  { id: 'pasta', name: 'Cestoviny (varené)', cat: 'grains', cal: 131, p: 5, c: 25, f: 1.1 },
  { id: 'oats', name: 'Ovsené vločky', cat: 'grains', cal: 389, p: 17, c: 66, f: 6.9 },
  { id: 'bread_whole', name: 'Chlieb celozrnný', cat: 'grains', cal: 247, p: 13, c: 41, f: 3.4 },
  { id: 'bread_white', name: 'Chlieb biely', cat: 'grains', cal: 265, p: 9, c: 49, f: 3.2 },
  { id: 'potato', name: 'Zemiaky (varené)', cat: 'grains', cal: 77, p: 2, c: 17, f: 0.1 },
  { id: 'sweet_potato', name: 'Sladké zemiaky', cat: 'grains', cal: 86, p: 1.6, c: 20, f: 0.1 },
  { id: 'tortilla', name: 'Tortilla', cat: 'grains', cal: 312, p: 8, c: 52, f: 8, serving: 60, unit: 'ks' },

  // Ovocie
  { id: 'banana', name: 'Banán', cat: 'fruit', cal: 89, p: 1.1, c: 23, f: 0.3, serving: 120, unit: 'ks' },
  { id: 'apple', name: 'Jablko', cat: 'fruit', cal: 52, p: 0.3, c: 14, f: 0.2, serving: 150, unit: 'ks' },
  { id: 'blueberries', name: 'Čučoriedky', cat: 'fruit', cal: 57, p: 0.7, c: 14, f: 0.3 },
  { id: 'strawberries', name: 'Jahody', cat: 'fruit', cal: 32, p: 0.7, c: 7.7, f: 0.3 },
  { id: 'orange', name: 'Pomaranč', cat: 'fruit', cal: 47, p: 0.9, c: 12, f: 0.1, serving: 150, unit: 'ks' },
  { id: 'avocado', name: 'Avokádo', cat: 'fruit', cal: 160, p: 2, c: 8.5, f: 15 },
  { id: 'dates', name: 'Datle', cat: 'fruit', cal: 277, p: 1.8, c: 75, f: 0.2 },

  // Zelenina
  { id: 'broccoli', name: 'Brokolica', cat: 'vegetables', cal: 34, p: 2.8, c: 7, f: 0.4 },
  { id: 'spinach', name: 'Špenát', cat: 'vegetables', cal: 23, p: 2.9, c: 3.6, f: 0.4 },
  { id: 'tomato', name: 'Paradajka', cat: 'vegetables', cal: 18, p: 0.9, c: 3.9, f: 0.2 },
  { id: 'cucumber', name: 'Uhorka', cat: 'vegetables', cal: 15, p: 0.7, c: 3.6, f: 0.1 },
  { id: 'pepper', name: 'Paprika', cat: 'vegetables', cal: 31, p: 1, c: 6, f: 0.3 },
  { id: 'onion', name: 'Cibuľa', cat: 'vegetables', cal: 40, p: 1.1, c: 9.3, f: 0.1 },
  { id: 'carrot', name: 'Mrkva', cat: 'vegetables', cal: 41, p: 0.9, c: 10, f: 0.2 },
  { id: 'mushrooms', name: 'Šampiňóny', cat: 'vegetables', cal: 22, p: 3.1, c: 3.3, f: 0.3 },

  // Orechy a semienka
  { id: 'almonds', name: 'Mandle', cat: 'nuts', cal: 579, p: 21, c: 22, f: 50 },
  { id: 'walnuts', name: 'Vlašské orechy', cat: 'nuts', cal: 654, p: 15, c: 14, f: 65 },
  { id: 'peanut_butter', name: 'Arašidové maslo', cat: 'nuts', cal: 588, p: 25, c: 20, f: 50 },
  { id: 'cashews', name: 'Kešu', cat: 'nuts', cal: 553, p: 18, c: 30, f: 44 },
  { id: 'chia_seeds', name: 'Chia semienka', cat: 'nuts', cal: 486, p: 17, c: 42, f: 31 },

  // Nápoje
  { id: 'coffee', name: 'Káva (čierna)', cat: 'drinks', cal: 2, p: 0.3, c: 0, f: 0, serving: 250, unit: 'ml' },
  { id: 'protein_shake', name: 'Proteínový šejk', cat: 'drinks', cal: 120, p: 24, c: 3, f: 1.5, serving: 30, unit: 'scoop' },
  { id: 'milk_almond', name: 'Mandľové mlieko', cat: 'drinks', cal: 17, p: 0.4, c: 2.5, f: 0.6 },
  { id: 'juice_orange', name: 'Pomarančový džús', cat: 'drinks', cal: 45, p: 0.7, c: 10, f: 0.2 },

  // Sladkosti
  { id: 'dark_chocolate', name: 'Tmavá čokoláda 70%', cat: 'sweets', cal: 598, p: 8, c: 46, f: 43 },
  { id: 'honey', name: 'Med', cat: 'sweets', cal: 304, p: 0.3, c: 82, f: 0, serving: 20, unit: 'lyžica' },
  { id: 'ice_cream', name: 'Zmrzlina', cat: 'sweets', cal: 207, p: 3.5, c: 24, f: 11 },

  // Oleje a tuky
  { id: 'olive_oil', name: 'Olivový olej', cat: 'fats', cal: 884, p: 0, c: 0, f: 100, serving: 15, unit: 'lyžica' },
  { id: 'coconut_oil', name: 'Kokosový olej', cat: 'fats', cal: 862, p: 0, c: 0, f: 100, serving: 15, unit: 'lyžica' },
  { id: 'butter', name: 'Maslo', cat: 'fats', cal: 717, p: 0.9, c: 0.1, f: 81 },

  // Luštěniny
  { id: 'chickpeas', name: 'Cícer (varený)', cat: 'legumes', cal: 164, p: 9, c: 27, f: 2.6 },
  { id: 'lentils', name: 'Šošovica (varená)', cat: 'legumes', cal: 116, p: 9, c: 20, f: 0.4 },
  { id: 'beans_kidney', name: 'Fazuľa (varená)', cat: 'legumes', cal: 127, p: 8.7, c: 22, f: 0.5 },
  { id: 'tofu', name: 'Tofu', cat: 'legumes', cal: 76, p: 8, c: 1.9, f: 4.8 },
];

// Search food DB with fuzzy matching
export function searchFood(query: string): FoodItem[] {
  const q = query.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove diacritics

  return FOOD_DB.filter(item => {
    const name = item.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return name.includes(q) || item.cat.includes(q);
  });
}

export const FOOD_CATEGORIES = [
  { id: 'meat', label: 'Mäso & ryby' },
  { id: 'dairy', label: 'Mliečne' },
  { id: 'grains', label: 'Obilniny' },
  { id: 'fruit', label: 'Ovocie' },
  { id: 'vegetables', label: 'Zelenina' },
  { id: 'nuts', label: 'Orechy' },
  { id: 'drinks', label: 'Nápoje' },
  { id: 'sweets', label: 'Sladkosti' },
  { id: 'fats', label: 'Tuky' },
  { id: 'legumes', label: 'Luštěniny' },
];
