import { ItemConfig, ItemType } from './types';

// Canvas virtual dimensions (sharp coordinate system)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Game timer in seconds
export const GAME_DURATION_SECONDS = 60;

// Bucket configuration - Clean modern indie aesthetic
export const BUCKET_CONFIG = {
  width: 120,
  height: 48,
  bottomOffset: 25,
  colorTop: '#426B43',
  colorBottom: '#315232',
  rimColor: '#2A462B',
  highlightColor: '#507E51',
  handleColor: '#69926A',
  badgeColor: '#E6EDE2',
};

// Item definitions
export const ITEM_CONFIGS: Record<ItemType, ItemConfig> = {
  apple: {
    type: 'apple',
    name: 'Apple',
    points: 10,
    emoji: '🍎',
    color: '#D9483B',
    glowColor: 'rgba(217, 72, 59, 0.15)',
    radius: 22,
    spawnWeight: 40,
    speedMultiplier: 1.0,
  },
  banana: {
    type: 'banana',
    name: 'Banana',
    points: 15,
    emoji: '🍌',
    color: '#E5A93C',
    glowColor: 'rgba(229, 169, 60, 0.15)',
    radius: 22,
    spawnWeight: 30,
    speedMultiplier: 1.15,
  },
  star: {
    type: 'star',
    name: 'Golden Star',
    points: 30,
    emoji: '⭐',
    color: '#F2B827',
    glowColor: 'rgba(242, 184, 39, 0.2)',
    radius: 24,
    spawnWeight: 15,
    speedMultiplier: 1.35,
  },
  bomb: {
    type: 'bomb',
    name: 'Bomb',
    points: -20,
    emoji: '💣',
    color: '#2D312E',
    glowColor: 'rgba(45, 49, 46, 0.15)',
    radius: 23,
    spawnWeight: 20,
    speedMultiplier: 1.05,
  },
};

// Base falling speed (pixels per second)
export const BASE_FALL_SPEED = 210;

// Spawn interval (in milliseconds)
export const BASE_SPAWN_INTERVAL_MS = 750;

