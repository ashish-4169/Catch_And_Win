import React from 'react';

interface StartScreenProps {
  onStart: () => void;
  highScore: number;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, highScore }) => {
  return (
    <div className="overlay-screen">
      <div className="start-card">
        <div className="start-header">
          <span className="game-tag">Indie Arcade</span>
          <h1 className="start-title">Gesture Catch</h1>
          <p className="start-subtitle">
            Catch the falling objects. Move your hand or use your mouse.
          </p>
        </div>

        {/* Clean Point Values Strip */}
        <div className="point-legend-strip">
          <div className="legend-chip">
            <span className="legend-emoji">🍎</span>
            <span className="legend-label">Apple</span>
            <span className="legend-pts pts-positive">+10</span>
          </div>
          <div className="legend-chip">
            <span className="legend-emoji">🍌</span>
            <span className="legend-label">Banana</span>
            <span className="legend-pts pts-positive">+15</span>
          </div>
          <div className="legend-chip">
            <span className="legend-emoji">⭐</span>
            <span className="legend-label">Star</span>
            <span className="legend-pts pts-bonus">+30</span>
          </div>
          <div className="legend-chip">
            <span className="legend-emoji">💣</span>
            <span className="legend-label">Bomb</span>
            <span className="legend-pts pts-negative">-20</span>
          </div>
        </div>

        {/* Controls Hint */}
        <div className="control-note">
          <span>🖐️ Move hand in front of camera</span>
          <span className="note-divider">•</span>
          <span>🖱️ Mouse controls ready</span>
        </div>

        {highScore > 0 && (
          <div className="start-highscore">
            Best score: <strong>{highScore} pts</strong>
          </div>
        )}

        <button className="clean-primary-btn" onClick={onStart}>
          Start Game
        </button>
      </div>
    </div>
  );
};
