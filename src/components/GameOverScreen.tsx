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
      <div className="modal-card">
        {/* Banner */}
        <div className="game-over-tag">TIME'S UP!</div>

        <h1 className="game-over-title">Game Over</h1>

        {/* New High Score Celebratory Badge */}
        {isNewHighScore && (
          <div className="new-record-badge bounce-anim">
            🎉 NEW STALL RECORD! 🎉
          </div>
        )}

        {/* Final Score Display */}
        <div className="final-score-box">
          <span className="final-score-label">FINAL SCORE</span>
          <span className="final-score-num">{stats.score}</span>
          <span className="final-highscore-sub">All-Time Best: {highScore} pts</span>
        </div>

        {/* Stats Breakdown */}
        <div className="breakdown-card">
          <h3 className="breakdown-title">Performance Breakdown</h3>
          <div className="breakdown-grid">
            <div className="breakdown-item">
              <span className="breakdown-emoji">🍎</span>
              <span className="breakdown-name">Apples</span>
              <span className="breakdown-count">× {stats.applesCaught}</span>
              <span className="breakdown-subscore">+{stats.applesCaught * 10}</span>
            </div>

            <div className="breakdown-item">
              <span className="breakdown-emoji">🍌</span>
              <span className="breakdown-name">Bananas</span>
              <span className="breakdown-count">× {stats.bananasCaught}</span>
              <span className="breakdown-subscore">+{stats.bananasCaught * 15}</span>
            </div>

            <div className="breakdown-item">
              <span className="breakdown-emoji">⭐</span>
              <span className="breakdown-name">Stars</span>
              <span className="breakdown-count">× {stats.starsCaught}</span>
              <span className="breakdown-subscore bonus">+{stats.starsCaught * 30}</span>
            </div>

            <div className="breakdown-item">
              <span className="breakdown-emoji">💣</span>
              <span className="breakdown-name">Bombs Hit</span>
              <span className="breakdown-count">× {stats.bombsCaught}</span>
              <span className="breakdown-subscore negative">-{stats.bombsCaught * 20}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="actions-row">
          <button className="primary-action-btn pulse-anim" onClick={onPlayAgain}>
            <span className="btn-icon">🔄</span> PLAY AGAIN
          </button>
          <button className="secondary-action-btn" onClick={onBackToMenu}>
            🏠 Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

