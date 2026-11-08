import { ItemConfig, ItemType } from './types';

// Canvas virtual dimensions (sharp coordinate system)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Game timer in seconds
export const GAME_DURATION_SECONDS = 60;

// Bucket configuration
export const BUCKET_CONFIG = {
  width: 120,
  height: 48,
  bottomOffset: 25,
  colorTop: '#4f46e5',
  colorBottom: '#312e81',
  rimColor: '#818cf8',
  highlightColor: '#c7d2fe',
  handleColor: '#a5b4fc',
};

// Item definitions
export const ITEM_CONFIGS: Record<ItemType, ItemConfig> = {
  apple: {
    type: 'apple',
    name: 'Apple',
    points: 10,
    emoji: '🍎',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    radius: 22,
    spawnWeight: 40,
    speedMultiplier: 1.0,
  },
  banana: {
    type: 'banana',
    name: 'Banana',
    points: 15,
    emoji: '🍌',
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.45)',
    radius: 22,
    spawnWeight: 30,
    speedMultiplier: 1.15,
  },
  star: {
    type: 'star',
    name: 'Golden Star',
    points: 30,
    emoji: '⭐',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.7)',
    radius: 24,
    spawnWeight: 15,
    speedMultiplier: 1.35,
  },
  bomb: {
    type: 'bomb',
    name: 'Bomb',
    points: -20,
    emoji: '💣',
    color: '#dc2626',
    glowColor: 'rgba(220, 38, 38, 0.6)',
    radius: 23,
    spawnWeight: 20,
    speedMultiplier: 1.05,
  },
};

// Base falling speed (pixels per second)
export const BASE_FALL_SPEED = 210;

// Spawn interval (in milliseconds)
export const BASE_SPAWN_INTERVAL_MS = 750;

