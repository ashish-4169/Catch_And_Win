import React, { useEffect, useRef } from 'react';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BUCKET_CONFIG,
  ITEM_CONFIGS,
  BASE_FALL_SPEED,
  BASE_SPAWN_INTERVAL_MS,
} from '../constants';
import { CameraStatus, GameState, FallingItem, ItemType, Particle, FloatingText } from '../types';
import { sounds } from '../utils/audio';
import { handTracker } from '../utils/handTracker';

interface GameCanvasProps {
  gameState: GameState;
  cameraStatus: CameraStatus;
  handDetected: boolean;
  onCameraStatusChange: (status: CameraStatus) => void;
  onHandDetected: (detected: boolean) => void;
  onCatch: (type: ItemType, points: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  cameraStatus,
  handDetected,
  onCameraStatusChange,
  onHandDetected,
  onCatch,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isInteractive =
    gameState === 'camera_init' || gameState === 'countdown' || gameState === 'playing';
  const isPlaying = gameState === 'playing';

  // Game state stored in refs to avoid re-renders during high-speed animation loop
  const bucketXRef = useRef<number>((CANVAS_WIDTH - BUCKET_CONFIG.width) / 2);
  const targetBucketXRef = useRef<number>((CANVAS_WIDTH - BUCKET_CONFIG.width) / 2);
  const smoothedHandXRef = useRef<number>((CANVAS_WIDTH - BUCKET_CONFIG.width) / 2);
  const itemsRef = useRef<FallingItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const nextIdRef = useRef<number>(1);
  const lastSpawnTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const screenShakeRef = useRef<number>(0);
  const keysPressedRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  // Weighted random picker for item types
  const pickRandomItemType = (): ItemType => {
    const weights: { type: ItemType; weight: number }[] = [
      { type: 'apple', weight: ITEM_CONFIGS.apple.spawnWeight },
      { type: 'banana', weight: ITEM_CONFIGS.banana.spawnWeight },
      { type: 'star', weight: ITEM_CONFIGS.star.spawnWeight },
      { type: 'bomb', weight: ITEM_CONFIGS.bomb.spawnWeight },
    ];
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const item of weights) {
      if (rand < item.weight) return item.type;
      rand -= item.weight;
    }
    return 'apple';
  };

  // Spawn a new falling item
  const spawnItem = () => {
    const type = pickRandomItemType();
    const config = ITEM_CONFIGS[type];
    const margin = config.radius + 30;
    const x = margin + Math.random() * (CANVAS_WIDTH - margin * 2);
    const speed = BASE_FALL_SPEED * config.speedMultiplier * (0.85 + Math.random() * 0.35);

    const newItem: FallingItem = {
      id: nextIdRef.current++,
      type,
      x,
      y: -config.radius * 2,
      radius: config.radius,
      speed,
      rotation: (Math.random() - 0.5) * 0.4,
      rotationSpeed: (Math.random() - 0.5) * 2.5,
      points: config.points,
      emoji: config.emoji,
      color: config.color,
      glowColor: config.glowColor,
    };

    itemsRef.current.push(newItem);
  };

  // Spawn visual particle burst at (x, y)
  const spawnParticles = (x: number, y: number, color: string, count: number = 14) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 200;
      particlesRef.current.push({
        id: nextIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60, // Slight upward pop
        size: 3 + Math.random() * 5,
        color,
        alpha: 1,
        life: 0.55 + Math.random() * 0.25,
        maxLife: 0.8,
      });
    }
  };

  // Spawn floating score indicator text
  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: nextIdRef.current++,
      text,
      x,
      y: y - 10,
      color,
      alpha: 1,
      scale: 1,
    });
  };

  // Handle pointer/mouse position mapping
  const updateBucketPosition = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const canvasX = (clientX - rect.left) * scaleX;

    const halfWidth = BUCKET_CONFIG.width / 2;
    const clampedX = Math.max(0, Math.min(CANVAS_WIDTH - BUCKET_CONFIG.width, canvasX - halfWidth));
    targetBucketXRef.current = clampedX;
  };

  // Handle hand tracking horizontal position from webcam
  const handleHandMove = (mirroredX: number) => {
    // Map comfortable reach range (0.12 to 0.88) to canvas coordinate space
    const minMargin = 0.12;
    const maxMargin = 0.88;
    const normalized = (mirroredX - minMargin) / (maxMargin - minMargin);
    const clampedNorm = Math.max(0, Math.min(1, normalized));

    const rawTargetX = clampedNorm * (CANVAS_WIDTH - BUCKET_CONFIG.width);

    // Exponential Moving Average to eliminate micro-jitter
    const smoothingFactor = 0.35;
    smoothedHandXRef.current =
      smoothedHandXRef.current * (1 - smoothingFactor) + rawTargetX * smoothingFactor;

    targetBucketXRef.current = Math.max(
      0,
      Math.min(CANVAS_WIDTH - BUCKET_CONFIG.width, smoothedHandXRef.current)
    );
  };

  // Webcam & Hand tracking lifecycle: Starts when setting up or playing, stops when exiting
  useEffect(() => {
    if (isInteractive && videoRef.current) {
      handTracker.start(videoRef.current, {
        onHandMove: handleHandMove,
        onStatusChange: onCameraStatusChange,
        onHandDetected,
      });
    } else {
      handTracker.stop();
    }

    return () => {
      handTracker.stop();
    };
  }, [isInteractive, onCameraStatusChange, onHandDetected]);

  // Setup mouse, touch, and keyboard listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isInteractive) return;
      updateBucketPosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isInteractive || e.touches.length === 0) return;
      updateBucketPosition(e.touches[0].clientX);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInteractive) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysPressedRef.current.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysPressedRef.current.right = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysPressedRef.current.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysPressedRef.current.right = false;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keysPressedRef.current = { left: false, right: false };
    };
  }, [isInteractive]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isInteractive) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      return;
    }

    // Reset game entities when starting countdown
    if (gameState === 'countdown') {
      itemsRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];
      lastSpawnTimeRef.current = performance.now();
    }

    lastFrameTimeRef.current = performance.now();
    screenShakeRef.current = 0;

    const render = (currentTime: number) => {
      const dt = Math.min((currentTime - lastFrameTimeRef.current) / 1000, 0.05); // Cap delta time
      lastFrameTimeRef.current = currentTime;

      // 1. Spawning - ONLY when isPlaying
      if (isPlaying && currentTime - lastSpawnTimeRef.current > BASE_SPAWN_INTERVAL_MS) {
        spawnItem();
        // Add subtle variation to spawn rhythm for natural arcade feel
        lastSpawnTimeRef.current = currentTime + (Math.random() - 0.5) * 150;
      }

      // 2. Smooth bucket movement (spring/lerp interpolation)
      const keyboardSpeed = 650;
      if (keysPressedRef.current.left) {
        targetBucketXRef.current = Math.max(0, targetBucketXRef.current - keyboardSpeed * dt);
      }
      if (keysPressedRef.current.right) {
        targetBucketXRef.current = Math.min(
          CANVAS_WIDTH - BUCKET_CONFIG.width,
          targetBucketXRef.current + keyboardSpeed * dt
        );
      }

      bucketXRef.current += (targetBucketXRef.current - bucketXRef.current) * Math.min(1, dt * 26);

      // Bucket coordinates
      const bucketWidth = BUCKET_CONFIG.width;
      const bucketHeight = BUCKET_CONFIG.height;
      const bucketY = CANVAS_HEIGHT - BUCKET_CONFIG.bottomOffset - bucketHeight;
      const bucketX = bucketXRef.current;

      // 3. Update falling items & collision detection
      const remainingItems: FallingItem[] = [];

      for (const item of itemsRef.current) {
        item.y += item.speed * dt;
        item.rotation += item.rotationSpeed * dt;

        // Catch collision check:
        // Item bottom touches bucket top rim
        const itemBottom = item.y + item.radius * 0.7;
        const itemTop = item.y - item.radius * 0.7;
        const itemLeft = item.x - item.radius * 0.7;
        const itemRight = item.x + item.radius * 0.7;

        const isWithinBucketY = itemBottom >= bucketY && itemTop <= bucketY + bucketHeight * 0.45;
        const isWithinBucketX = itemRight >= bucketX && itemLeft <= bucketX + bucketWidth;

        if (isPlaying && isWithinBucketY && isWithinBucketX) {
          // Object Caught!
          sounds.playCatch(item.type);
          onCatch(item.type, item.points);

          // Visual explosion / feedback
          spawnParticles(item.x, bucketY + 10, item.color, item.type === 'bomb' ? 24 : 14);

          const sign = item.points >= 0 ? '+' : '';
          const scoreText = `${sign}${item.points}`;
          spawnFloatingText(item.x, bucketY, scoreText, item.color);

          if (item.type === 'bomb') {
            screenShakeRef.current = 0.28; // Trigger screen shake
          }

          // Caught items disappear (do not keep in array)
          continue;
        }

        // Check if item went off bottom screen
        if (item.y - item.radius > CANVAS_HEIGHT) {
          // Item lost naturally
          continue;
        }

        remainingItems.push(item);
      }
      itemsRef.current = remainingItems;

      // 4. Update particles
      const remainingParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 380 * dt; // Gravity
        p.life -= dt;
        p.alpha = Math.max(0, p.life / p.maxLife);

        if (p.life > 0) {
          remainingParticles.push(p);
        }
      }
      particlesRef.current = remainingParticles;

      // 5. Update floating score texts
      const remainingTexts: FloatingText[] = [];
      for (const ft of floatingTextsRef.current) {
        ft.y -= 50 * dt;
        ft.alpha -= 1.35 * dt;
        ft.scale = Math.min(1.4, ft.scale + 0.4 * dt);

        if (ft.alpha > 0) {
          remainingTexts.push(ft);
        }
      }
      floatingTextsRef.current = remainingTexts;

      // 6. DRAWING
      ctx.save();

      // Screen Shake application
      if (screenShakeRef.current > 0) {
        screenShakeRef.current -= dt;
        const shakeMagnitude = 8 * (screenShakeRef.current / 0.28);
        const shakeX = (Math.random() - 0.5) * shakeMagnitude * 2;
        const shakeY = (Math.random() - 0.5) * shakeMagnitude * 2;
        ctx.translate(shakeX, shakeY);
      }

      // Background clear
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw subtle background grid/ambiance
      drawGameBackground(ctx);

      // Draw falling items
      for (const item of itemsRef.current) {
        drawFallingItem(ctx, item);
      }

      // Draw particles
      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw bucket
      drawBucket(ctx, bucketX, bucketY, bucketWidth, bucketHeight);

      // Draw floating score numbers
      for (const ft of floatingTextsRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `700 ${Math.floor(20 * ft.scale)}px 'DM Sans', Inter, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Soft white backing for crisp contrast on light canvas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(ft.text, ft.x, ft.y + 1);

        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPlaying, onCatch]);

  // Render background details - Clean white background with minimal floor line
  const drawGameBackground = (ctx: CanvasRenderingContext2D) => {
    // Crisp white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle bottom catch line
    ctx.strokeStyle = '#E1E3DC';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - BUCKET_CONFIG.bottomOffset + 6);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - BUCKET_CONFIG.bottomOffset + 6);
    ctx.stroke();
  };

  // Render an individual falling item
  const drawFallingItem = (ctx: CanvasRenderingContext2D, item: FallingItem) => {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);

    // Drop shadow
    ctx.fillStyle = 'rgba(32, 35, 31, 0.08)';
    ctx.beginPath();
    ctx.ellipse(1, item.radius * 0.75, item.radius * 0.65, item.radius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    if (item.type === 'apple') drawApple(ctx, item.radius);
    else if (item.type === 'banana') drawBanana(ctx, item.radius);
    else if (item.type === 'star') drawStar(ctx, item.radius);
    else if (item.type === 'bomb') drawBomb(ctx, item.radius);

    ctx.restore();
  };

  // ── Apple ──────────────────────────────────────────────────────────────────
  const drawApple = (ctx: CanvasRenderingContext2D, r: number) => {
    // Body gradient: vivid red with darker base
    const bodyGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r);
    bodyGrad.addColorStop(0,  '#FF5A4A');   // bright highlight center
    bodyGrad.addColorStop(0.4,'#E0302A');   // main red
    bodyGrad.addColorStop(1,  '#8B1A14');   // deep shadow edge

    // Draw body as a slightly squashed circle with indent at top
    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 0.92, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Clean outline
    ctx.strokeStyle = '#7A1510';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Highlight ellipse (top-left sheen)
    ctx.save();
    ctx.globalAlpha = 0.55;
    const hlGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.32, 0, -r * 0.22, -r * 0.22, r * 0.42);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.90)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.ellipse(-r * 0.26, -r * 0.28, r * 0.3, r * 0.22, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad;
    ctx.fill();
    ctx.restore();

    // Stem
    ctx.strokeStyle = '#4A3010';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.92);
    ctx.quadraticCurveTo(r * 0.18, -r * 1.28, r * 0.1, -r * 1.42);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = '#3A7D2C';
    ctx.strokeStyle = '#285A1E';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.save();
    ctx.translate(r * 0.08, -r * 1.1);
    ctx.rotate(0.5);
    ctx.scale(1, 0.55);
    ctx.arc(r * 0.14, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // ── Banana ─────────────────────────────────────────────────────────────────
  const drawBanana = (ctx: CanvasRenderingContext2D, r: number) => {
    // Banana is an arc shape, slightly wider than tall
    const scale = r / 22;

    ctx.save();
    ctx.scale(scale, scale);

    // Outer peel shadow path
    ctx.beginPath();
    ctx.moveTo(-18, 14);
    ctx.bezierCurveTo(-22, -2, -10, -26, 8, -24);
    ctx.bezierCurveTo(24, -22, 28, -6, 20, 10);
    ctx.bezierCurveTo(16, 18, -6, 22, -18, 14);
    ctx.closePath();
    ctx.fillStyle = '#B8820A';
    ctx.fill();
    ctx.strokeStyle = '#8A5E05';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Main banana body gradient
    const banGrad = ctx.createLinearGradient(-10, -24, 10, 14);
    banGrad.addColorStop(0,   '#FFE566');  // bright top
    banGrad.addColorStop(0.35,'#FFD21A');  // vivid yellow
    banGrad.addColorStop(0.75,'#F0B800');  // golden mid
    banGrad.addColorStop(1,   '#C8900A');  // shadow bottom

    ctx.beginPath();
    ctx.moveTo(-15, 12);
    ctx.bezierCurveTo(-19, -2, -8, -24, 7, -22);
    ctx.bezierCurveTo(21, -20, 25, -5, 18, 9);
    ctx.bezierCurveTo(14, 16, -5, 20, -15, 12);
    ctx.closePath();
    ctx.fillStyle = banGrad;
    ctx.fill();

    // Centre rib line
    ctx.strokeStyle = 'rgba(180, 120, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-13, 10);
    ctx.bezierCurveTo(-16, -2, -6, -20, 6, -19);
    ctx.bezierCurveTo(18, -18, 21, -4, 15, 8);
    ctx.stroke();

    // Top-left sheen
    ctx.save();
    ctx.globalAlpha = 0.45;
    const hlGrad = ctx.createLinearGradient(-12, -18, 2, -4);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.moveTo(-11, -18);
    ctx.bezierCurveTo(-14, -8, -6, -6, 0, -12);
    ctx.bezierCurveTo(-2, -16, -8, -20, -11, -18);
    ctx.closePath();
    ctx.fillStyle = hlGrad;
    ctx.fill();
    ctx.restore();

    // Tips (dark brown dots at ends)
    ctx.fillStyle = '#6B4206';
    ctx.beginPath();
    ctx.arc(-17, 13, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -22, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // ── Star ───────────────────────────────────────────────────────────────────
  const drawStar = (ctx: CanvasRenderingContext2D, r: number) => {
    const outerR = r;
    const innerR = r * 0.42;
    const points = 5;

    // Star path helper
    const starPath = (ctx: CanvasRenderingContext2D, ox: number, oy: number, o: number, i: number) => {
      ctx.beginPath();
      for (let p = 0; p < points * 2; p++) {
        const ang = (p * Math.PI) / points - Math.PI / 2;
        const radius = p % 2 === 0 ? o : i;
        const px = ox + Math.cos(ang) * radius;
        const py = oy + Math.sin(ang) * radius;
        p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // Soft outer glow ring
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#FFD000';
    starPath(ctx, 0, 0, outerR * 1.22, innerR * 1.22);
    ctx.fill();
    ctx.restore();

    // Shadow layer (slightly offset)
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#8B6000';
    starPath(ctx, 1.5, 2, outerR, innerR);
    ctx.fill();
    ctx.restore();

    // Main body gradient
    const starGrad = ctx.createRadialGradient(-outerR * 0.2, -outerR * 0.25, 0, 0, 0, outerR);
    starGrad.addColorStop(0,   '#FFF176'); // bright centre
    starGrad.addColorStop(0.35,'#FFD700'); // classic gold
    starGrad.addColorStop(0.75,'#F0A800'); // golden mid
    starGrad.addColorStop(1,   '#C47C00'); // deep amber edge
    starPath(ctx, 0, 0, outerR, innerR);
    ctx.fillStyle = starGrad;
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#9A6000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Highlight shimmer (top-left point)
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(-outerR * 0.18, -outerR * 0.42, outerR * 0.14, outerR * 0.08, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Small inner sparkle dot
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#FFFDE0';
    ctx.beginPath();
    ctx.arc(-outerR * 0.12, -outerR * 0.15, outerR * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // ── Bomb ───────────────────────────────────────────────────────────────────
  const drawBomb = (ctx: CanvasRenderingContext2D, r: number) => {
    // Body gradient: dark charcoal sphere
    const bodyGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.04, 0, 0, r);
    bodyGrad.addColorStop(0,  '#6B6E6A');  // soft highlight
    bodyGrad.addColorStop(0.3,'#3A3D3B');  // dark charcoal
    bodyGrad.addColorStop(1,  '#141615');  // near-black edge

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Clean dark outline
    ctx.strokeStyle = '#0D0F0E';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Highlight sheen
    ctx.save();
    ctx.globalAlpha = 0.5;
    const hlGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, -r * 0.22, -r * 0.28, r * 0.46);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.80)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.3, r * 0.26, r * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad;
    ctx.fill();
    ctx.restore();

    // Fuse cord
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.14, -r * 0.88);
    ctx.bezierCurveTo(r * 0.5, -r * 1.22, r * 0.1, -r * 1.52, r * 0.3, -r * 1.68);
    ctx.stroke();

    // Fuse glow spark
    const sparkGrad = ctx.createRadialGradient(r * 0.3, -r * 1.68, 0, r * 0.3, -r * 1.68, r * 0.22);
    sparkGrad.addColorStop(0, '#FFF176');
    sparkGrad.addColorStop(0.4,'#FF9800');
    sparkGrad.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 1.68, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = sparkGrad;
    ctx.fill();

    // Tiny white catch-light
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 1.68, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Render the player-controlled bucket - Clean minimal indie design
  const drawBucket = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    ctx.save();

    // Soft subtle shadow below bucket
    ctx.fillStyle = 'rgba(32, 35, 31, 0.08)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 6, w * 0.44, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bucket Body: Rounded Trapezoid
    const topInset = 0;
    const bottomInset = 12;

    ctx.beginPath();
    ctx.moveTo(x + topInset + 6, y);
    ctx.lineTo(x + w - topInset - 6, y);
    ctx.quadraticCurveTo(x + w - topInset, y, x + w - topInset, y + 6);
    ctx.lineTo(x + w - bottomInset, y + h - 6);
    ctx.quadraticCurveTo(x + w - bottomInset, y + h, x + w - bottomInset - 8, y + h);
    ctx.lineTo(x + bottomInset + 8, y + h);
    ctx.quadraticCurveTo(x + bottomInset, y + h, x + bottomInset, y + h - 6);
    ctx.lineTo(x + topInset, y + 6);
    ctx.quadraticCurveTo(x + topInset, y, x + topInset + 6, y);
    ctx.closePath();

    // Clean forest green fill
    ctx.fillStyle = BUCKET_CONFIG.colorTop;
    ctx.fill();

    // Top Rim
    const rimHeight = 10;
    ctx.beginPath();
    ctx.roundRect(x - 3, y - rimHeight / 2, w + 6, rimHeight, 4);
    ctx.fillStyle = BUCKET_CONFIG.rimColor;
    ctx.fill();

    // Minimal rim highlight
    ctx.strokeStyle = BUCKET_CONFIG.highlightColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - rimHeight / 2 + 2);
    ctx.lineTo(x + w - 2, y - rimHeight / 2 + 2);
    ctx.stroke();

    // Clean subtle label
    ctx.font = "600 11px 'DM Sans', Inter, -apple-system, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E6EDE2';
    ctx.fillText('CATCH', x + w / 2, y + h * 0.58);

    ctx.restore();
  };

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
      />

      {/* Webcam Preview: Centered live feed during camera setup, and corner PIP during game */}
      <div
        className={`webcam-pip-container ${
          cameraStatus === 'connected' ? 'pip-visible' : 'pip-hidden'
        } ${gameState === 'camera_init' ? 'pip-init-mode' : 'pip-play-mode'} ${
          handDetected ? 'hand-locked' : ''
        }`}
        title="Webcam Hand Tracking"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="webcam-pip-video"
        />
        <div className="webcam-pip-badge">
          <span className={`pip-dot ${handDetected ? 'dot-active' : ''}`}></span>
          <span>{handDetected ? 'Hand detected' : 'Camera ready'}</span>
        </div>
      </div>
    </div>
  );
};

