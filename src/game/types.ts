export interface LocationData {
  name: string;
  description: string;
  exits: Record<string, string>;
  items: string[];
  characters: string[];
  required_items?: string[];
  secret_exit?: { hidden: string };
  secret?: boolean;
  special?: string;
  time_sensitive?: boolean;
  shop?: boolean;
}

export interface ItemData {
  description: string;
  type: string;
  consumable: boolean;
  health?: number;
  score?: number;
  attack?: number;
  defense?: number;
  requires_key?: string;
  contains?: string;
  win_item?: boolean;
  health_random?: boolean;
  health_good?: number;
  health_bad?: number;
  cures_poison?: boolean;
  reveals_secrets?: boolean;
  ranged?: boolean;
  value?: number;
  ghost_effect?: boolean;
}

export interface CharacterData {
  name: string;
  dialogue: string;
  action: string;
  personality: string;
  helpfulness: string;
  quest_giver?: boolean;
  quest?: string;
  combat_enemy?: boolean;
  enemy_stats?: EnemyStats;
  riddle_master?: boolean;
  random_effect?: boolean;
  shopkeeper?: boolean;
  craftsman?: boolean;
  recipe?: Record<string, string>;
  bribe_item?: string;
  tribute_item?: string;
}

export interface EnemyStats {
  health: number;
  attack: number;
  defense: number;
  boss?: boolean;
}

export interface EnemyData {
  name: string;
  description: string;
  health: number;
  attack: number;
  defense: number;
  boss?: boolean;
  weakness?: string[];
  location?: string;
  drops?: string[];
  bribe_item?: string;
  tribute_item?: string;
  time_appear?: string;
  dialogue_before: string;
  dialogue_after: string;
}

export interface QuestObjective {
  item?: string;
  action?: string;
  description: string;
}

export interface QuestData {
  name: string;
  description: string;
  giver: string;
  objectives: QuestObjective[];
  reward: {
    score?: number;
    health?: number;
    items?: string[];
    message?: string;
  };
  ending_path?: string;
}

export interface PuzzleData {
  location?: string;
  riddle?: string;
  answers?: string[];
  success_message: string;
  failure_message: string;
  reward?: { score?: number; health?: number; items?: string[]; reveals?: string };
  penalty?: { health: number };
  attempts_allowed?: number;
  required_items?: string[];
  result_item?: string;
  consumes_item?: boolean;
  outcomes?: { type: string; message: string; health?: number; score?: number; items?: string[] }[];
}

export interface GameState {
  location: string;
  inventory: string[];
  health: number;
  maxHealth: number;
  score: number;
  moves: number;
  maxMoves: number;
  visitedLocations: Set<string>;
  achievements: string[];
  timeOfDay: string;
  weather: string;
  activeQuests: string[];
  completedQuests: string[];
  locationItems: Record<string, string[]>;
  locationCharacters: Record<string, string[]>;
  solvedPuzzles: string[];
  freedPrincess: boolean;
  dragonDefeated: boolean;
  completedObjectives: Record<string, string[]>;
  previousState: GameStateSnapshot | null;
  inCombat: boolean;
  currentEnemy: EnemyData | null;
  enemyHealth: number;
  endingTriggered: string | null;
  game_over: boolean;
  _pendingRiddle?: string;
}

export interface GameStateSnapshot {
  location: string;
  inventory: string[];
  health: number;
  score: number;
  moves: number;
  locationItems: Record<string, string[]>;
  locationCharacters: Record<string, string[]>;
  timeOfDay: string;
  weather: string;
  enemyHealth: number;
  inCombat: boolean;
}

export interface LogEntry {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'combat' | 'quest' | 'achievement' | 'room-desc';
}

export interface GameDataReferences {
  characters: Record<string, CharacterData>;
  quests: Record<string, QuestData>;
  items: Record<string, ItemData>;
  enemies: Record<string, EnemyData>;
  puzzles: Record<string, PuzzleData>;
  locations: Record<string, LocationData>;
}
