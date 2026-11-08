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

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  score,
  timeLeft,
  highScore,
  isMuted,
  cameraStatus,
  onToggleMute,
}) => {
  const isUrgent = timeLeft <= 10 && timeLeft > 0;

  const getCameraLabel = () => {
    switch (cameraStatus) {
      case 'connected':
        return 'Camera ready';
      case 'requesting':
        return 'Starting camera...';
      case 'unavailable':
        return 'Camera unavailable';
      default:
        return 'Camera ready';
    }
  };

  return (
    <header className="top-bar">
      <div className="top-brand">
        <h1 className="brand-title">Gesture Catch</h1>
        {highScore > 0 && (
          <span className="best-score-badge">Best: {highScore}</span>
        )}
      </div>

      <div className="top-stats">
        <div className="stat-group">
          <span className="stat-label">SCORE</span>
          <span className="stat-value score-number">{score}</span>
        </div>

        <div className={`stat-group ${isUrgent ? 'urgent-timer' : ''}`}>
          <span className="stat-label">TIME</span>
          <span className="stat-value timer-number">{formatTimer(timeLeft)}</span>
        </div>

        <div className={`camera-indicator status-${cameraStatus}`}>
          <span className="camera-indicator-dot"></span>
          <span className="camera-indicator-text">{getCameraLabel()}</span>
        </div>

        <button
          onClick={onToggleMute}
          className="audio-toggle-btn"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          aria-label="Toggle Sound"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>
    </header>
  );
};
