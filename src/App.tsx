import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CameraStatus, GameState, GameStats, ItemType } from './types';
import { GAME_DURATION_SECONDS } from './constants';
import { sounds } from './utils/audio';
import { ScoreBoard } from './components/ScoreBoard';
import { GameCanvas } from './components/GameCanvas';
import { StartScreen } from './components/StartScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { CameraInitOverlay, CountdownOverlay } from './components/CameraInitOverlay';

const INITIAL_STATS: GameStats = {
  score: 0,
  applesCaught: 0,
  bananasCaught: 0,
  starsCaught: 0,
  bombsCaught: 0,
  totalCaught: 0,
};

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(GAME_DURATION_SECONDS);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);

  // High score loaded from localStorage
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gesture_catch_high_score');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const timerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const handDetectedTimerRef = useRef<number | null>(null);

  // Toggle sound
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  // Start the 3-second countdown before game begins
  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (handDetectedTimerRef.current) {
      clearTimeout(handDetectedTimerRef.current);
      handDetectedTimerRef.current = null;
    }

    setGameState('countdown');
    setCountdown(3);
    sounds.playCountdownTick();

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === 3) {
          sounds.playCountdownTick();
          return 2;
        } else if (prev === 2) {
          sounds.playCountdownTick();
          return 1;
        } else if (prev === 1) {
          sounds.playStart();
          return 0; // "GO!"
        } else {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          setGameState('playing');
          return 0;
        }
      });
    }, 1000);
  }, []);

  // When player clicks Start Game: request camera & show setup screen
  const handleStartGameClick = useCallback(() => {
    setScore(0);
    setTimeLeft(GAME_DURATION_SECONDS);
    setStats({ ...INITIAL_STATS });
    setIsNewHighScore(false);
    setHandDetected(false);
    setGameState('camera_init');
  }, []);

  // Return to start menu
  const backToMenu = useCallback(() => {
    setGameState('start');
    setCameraStatus('idle');
    setHandDetected(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (handDetectedTimerRef.current) {
      clearTimeout(handDetectedTimerRef.current);
      handDetectedTimerRef.current = null;
    }
  }, []);

  // Player chooses to play using mouse controls
  const handlePlayWithMouse = useCallback(() => {
    startCountdown();
  }, [startCountdown]);

  // Handle hand detection from MediaPipe
  const handleHandDetected = useCallback((detected: boolean) => {
    setHandDetected(detected);
  }, []);

  // Automatic trigger: when in camera_init and hand is detected, begin countdown
  useEffect(() => {
    if (gameState === 'camera_init' && handDetected) {
      handDetectedTimerRef.current = window.setTimeout(() => {
        startCountdown();
      }, 550);

      return () => {
        if (handDetectedTimerRef.current) {
          clearTimeout(handDetectedTimerRef.current);
          handDetectedTimerRef.current = null;
        }
      };
    }
  }, [gameState, handDetected, startCountdown]);

  // Handle item catch
  const handleCatch = useCallback((type: ItemType, points: number) => {
    setScore((prevScore) => {
      const updatedScore = Math.max(0, prevScore + points);
      return updatedScore;
    });

    setStats((prevStats) => {
      const updated = { ...prevStats };
      updated.score = Math.max(0, updated.score + points);
      updated.totalCaught += 1;

      if (type === 'apple') updated.applesCaught += 1;
      else if (type === 'banana') updated.bananasCaught += 1;
      else if (type === 'star') updated.starsCaught += 1;
      else if (type === 'bomb') updated.bombsCaught += 1;

      return updated;
    });
  }, []);

  // 60-Second Countdown Timer (runs only when gameState === 'playing')
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Timer expired!
            clearInterval(timerRef.current!);
            timerRef.current = null;
            return 0;
          }

          // Tick sound during final 5 seconds
          if (prevTime <= 6) {
            sounds.playCountdownTick();
          }

          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState]);

  // Trigger game over when timer reaches zero
  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 0) {
      setGameState('gameover');
      sounds.playGameOver();

      // Check high score
      if (score > highScore) {
        setIsNewHighScore(true);
        setHighScore(score);
        try {
          localStorage.setItem('gesture_catch_high_score', score.toString());
        } catch {
          // Ignore localStorage errors
        }
      }
    }
  }, [timeLeft, gameState, score, highScore]);

  return (
    <div className="game-app-container">
      {/* HUD Header */}
      <ScoreBoard
        score={score}
        timeLeft={timeLeft}
        highScore={highScore}
        isMuted={isMuted}
        cameraStatus={cameraStatus}
        onToggleMute={handleToggleMute}
      />

      {/* Main Play Area */}
      <main className="game-stage">
        <GameCanvas
          gameState={gameState}
          cameraStatus={cameraStatus}
          handDetected={handDetected}
          onCameraStatusChange={setCameraStatus}
          onHandDetected={handleHandDetected}
          onCatch={handleCatch}
        />

        {/* Start Screen Overlay */}
        {gameState === 'start' && (
          <StartScreen onStart={handleStartGameClick} highScore={highScore} />
        )}

        {/* Camera Setup & Hand Detection Screen */}
        {gameState === 'camera_init' && (
          <CameraInitOverlay
            cameraStatus={cameraStatus}
            handDetected={handDetected}
            onPlayWithMouse={handlePlayWithMouse}
            onBackToMenu={backToMenu}
          />
        )}

        {/* 3-Second Countdown Overlay */}
        {gameState === 'countdown' && (
          <CountdownOverlay count={countdown} />
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <GameOverScreen
            stats={stats}
            highScore={highScore}
            isNewHighScore={isNewHighScore}
            onPlayAgain={handleStartGameClick}
            onBackToMenu={backToMenu}
          />
        )}
      </main>

      {/* Footer Info / Controls Guide */}
      <footer className="stall-footer">
        <div className="footer-tip">
          <span className="tip-badge">TIP</span>
          <span>
            🖐️ Move your hand in front of the webcam or slide your mouse horizontally to control the bucket!
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
