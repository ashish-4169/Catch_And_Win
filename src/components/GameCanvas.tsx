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
        ctx.font = `bold ${Math.floor(22 * ft.scale)}px 'Outfit', 'Inter', -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outer glow/shadow
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 4;
        ctx.strokeText(ft.text, ft.x, ft.y);

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

  // Render background details
  const drawGameBackground = (ctx: CanvasRenderingContext2D) => {
    // Subtle gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0c1022');
    bgGrad.addColorStop(0.5, '#131838');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle starry dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 35; i++) {
      const sx = (i * 123.7) % CANVAS_WIDTH;
      const sy = (i * 91.3) % (CANVAS_HEIGHT - 80);
      const sRadius = (i % 3) + 1;
      ctx.beginPath();
      ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floor catch baseline
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - BUCKET_CONFIG.bottomOffset + 6);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - BUCKET_CONFIG.bottomOffset + 6);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // Render an individual falling item
  const drawFallingItem = (ctx: CanvasRenderingContext2D, item: FallingItem) => {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);

    // Glowing aura behind item
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, item.radius * 1.5);
    glow.addColorStop(0, item.glowColor);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, item.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Specific extra touches
    if (item.type === 'star') {
      // Golden star shine ring
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, item.radius * 1.1, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Render crisp Emoji glyph
    ctx.font = `${Math.floor(item.radius * 1.9)}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, 0, 2);

    ctx.restore();
  };

  // Render the player-controlled bucket
  const drawBucket = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    ctx.save();

    // Soft drop shadow below bucket
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 8, w * 0.52, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bucket Body: Rounded Trapezoid
    const topInset = 0;
    const bottomInset = 14;

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

    // Bucket body gradient
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
    bodyGrad.addColorStop(0, BUCKET_CONFIG.colorTop);
    bodyGrad.addColorStop(1, BUCKET_CONFIG.colorBottom);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Subtle vertical highlight stripe
    const highlightGrad = ctx.createLinearGradient(x, y, x + w, y);
    highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    highlightGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
    highlightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    highlightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = highlightGrad;
    ctx.fill();

    // Rim at top
    const rimHeight = 12;
    ctx.beginPath();
    ctx.roundRect(x - 4, y - rimHeight / 2, w + 8, rimHeight, 6);
    const rimGrad = ctx.createLinearGradient(x, y - rimHeight / 2, x, y + rimHeight / 2);
    rimGrad.addColorStop(0, '#a5b4fc');
    rimGrad.addColorStop(0.5, BUCKET_CONFIG.rimColor);
    rimGrad.addColorStop(1, '#4338ca');
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // Rim glossy highlight
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - rimHeight / 2 + 2);
    ctx.lineTo(x + w - 2, y - rimHeight / 2 + 2);
    ctx.stroke();

    // Decorative "CATCH" label on bucket
    ctx.font = "bold 13px 'Outfit', 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(224, 231, 255, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText('⚡ CATCH ⚡', x + w / 2, y + h * 0.58);

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
          <span>{handDetected ? 'HAND READY' : 'CAMERA ACTIVE'}</span>
        </div>
      </div>
    </div>
  );
};

