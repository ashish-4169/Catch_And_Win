import React from 'react';
import { CameraStatus } from '../types';

interface ScoreBoardProps {
  score: number;
  timeLeft: number;
  highScore: number;
  isMuted: boolean;
  cameraStatus: CameraStatus;
  onToggleMute: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  score,
  timeLeft,
  highScore,
  isMuted,
  cameraStatus,
  onToggleMute,
}) => {
  const isUrgent = timeLeft <= 10;

  return (
    <header className="hud-container">
      {/* Score Card */}
      <div className="hud-card score-card">
        <span className="hud-label">SCORE</span>
        <span className="hud-value score-val">{score}</span>
      </div>

      {/* Timer Card */}
      <div className={`hud-card timer-card ${isUrgent ? 'timer-urgent' : ''}`}>
        <span className="hud-label">TIME LEFT</span>
        <span className="hud-value timer-val">
          {timeLeft}
          <span className="hud-unit">s</span>
        </span>
      </div>

      {/* High Score Card */}
      <div className="hud-card highscore-card">
        <span className="hud-label">BEST</span>
        <span className="hud-value highscore-val">{highScore}</span>
      </div>

      {/* Camera Status Badge */}
      <div className={`hud-card camera-card camera-${cameraStatus}`}>
        <span className="hud-label">TRACKING</span>
        <div className="camera-status-row">
          <span className={`camera-dot dot-${cameraStatus}`}></span>
          <span className="camera-status-text">
            {cameraStatus === 'connected' && 'Camera connected'}
            {cameraStatus === 'unavailable' && 'Camera unavailable'}
            {cameraStatus === 'requesting' && 'Connecting camera...'}
            {cameraStatus === 'idle' && 'Ready'}
          </span>
        </div>
      </div>

      {/* Sound Toggle Button */}
      <button
        onClick={onToggleMute}
        className="hud-btn mute-btn"
        title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        aria-label="Toggle Sound"
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </header>
  );
};

