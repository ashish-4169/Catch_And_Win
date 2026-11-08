import React from 'react';
import { GameStats } from '../types';

interface GameOverScreenProps {
  stats: GameStats;
  highScore: number;
  isNewHighScore: boolean;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  stats,
  highScore,
  isNewHighScore,
  onPlayAgain,
  onBackToMenu,
}) => {
  return (
    <div className="overlay-screen">
      <div className="game-over-card">
        <span className="game-tag">Round Finished</span>
        <h2 className="game-over-title">Game Over</h2>

        {isNewHighScore && (
          <div className="new-best-pill">
            New Best Score!
          </div>
        )}

        <div className="final-score-display">
          <span className="final-score-sub">FINAL SCORE</span>
          <span className="final-score-value">{stats.score}</span>
          <span className="final-best-label">Best: {highScore} pts</span>
        </div>

        {/* Clean summary row */}
        <div className="summary-strip">
          <div className="summary-col">
            <span className="summary-icon">🍎</span>
            <span className="summary-val">{stats.applesCaught}</span>
          </div>
          <div className="summary-col">
            <span className="summary-icon">🍌</span>
            <span className="summary-val">{stats.bananasCaught}</span>
          </div>
          <div className="summary-col">
            <span className="summary-icon">⭐</span>
            <span className="summary-val">{stats.starsCaught}</span>
          </div>
          <div className="summary-col">
            <span className="summary-icon">💣</span>
            <span className="summary-val">{stats.bombsCaught}</span>
          </div>
        </div>

        <div className="game-over-actions">
          <button className="clean-primary-btn" onClick={onPlayAgain}>
            Play Again
          </button>
          <button className="clean-secondary-btn" onClick={onBackToMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
