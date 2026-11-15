export type DhikrCategory =
  | 'istighfar'
  | 'tasbih'
  | 'tahmid'
  | 'takbir'
  | 'tahlil'
  | 'salawat'
  | 'custom';

export interface DhikrPreset {
  id: string;
  text: string;
  categoryLabel: string;
  category: DhikrCategory;
  defaultTarget: number;
  keywords: string[];
  virtue?: string;
  isCustom?: boolean;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  totalCount: number;
  roundsCompleted: number;
  byDhikr: Record<string, number>;
}

export type VoiceMode = 'speech' | 'cadence';
export type VoiceScope = 'selected' | 'any';
export type MobileTab = 'counter' | 'adhkar' | 'stats';
