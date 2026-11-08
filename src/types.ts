export type ItemType = 'apple' | 'banana' | 'star' | 'bomb';

export type GameState = 'start' | 'camera_init' | 'countdown' | 'playing' | 'gameover';

export type CameraStatus = 'idle' | 'requesting' | 'connected' | 'unavailable';

export interface ItemConfig {
  type: ItemType;
  name: string;
  points: number;
  emoji: string;
  color: string;
  glowColor: string;
  radius: number;
  spawnWeight: number; // Probability weight
  speedMultiplier: number;
}

export interface FallingItem {
  id: number;
  type: ItemType;
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  points: number;
  emoji: string;
  color: string;
  glowColor: string;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
}

export interface GameStats {
  score: number;
  applesCaught: number;
  bananasCaught: number;
  starsCaught: number;
  bombsCaught: number;
  totalCaught: number;
}

