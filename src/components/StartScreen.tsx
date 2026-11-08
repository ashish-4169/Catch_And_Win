import React from 'react';

interface StartScreenProps {
  onStart: () => void;
  highScore: number;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, highScore }) => {
  return (
    <div className="overlay-screen">
      <div className="modal-card">
        {/* Stall Header Badge */}
        <div className="stall-badge">
          <span className="badge-dot"></span>
          COLLEGE FEST GAMING STALL • HAND GESTURE READY
        </div>

        {/* Title */}
        <h1 className="game-title">
          <span className="title-gradient">GESTURE CATCH</span>
        </h1>
        <p className="game-tagline">
          Fast-paced arcade reflex challenge. Catch the goodies, avoid the bombs!
        </p>

        {/* High Score Preview */}
        {highScore > 0 && (
          <div className="banner-highscore">
            🏆 Stall Record to Beat: <strong>{highScore} pts</strong>
          </div>
        )}

        {/* Scoring Rules Grid */}
        <div className="rules-section">
          <h2 className="section-title">Point System</h2>
          <div className="items-grid">
            <div className="item-pill apple-pill">
              <span className="pill-emoji">🍎</span>
              <div className="pill-info">
                <span className="pill-name">Apple</span>
                <span className="pill-pts positive">+10 pts</span>
              </div>
            </div>

            <div className="item-pill banana-pill">
              <span className="pill-emoji">🍌</span>
              <div className="pill-info">
                <span className="pill-name">Banana</span>
                <span className="pill-pts positive">+15 pts</span>
              </div>
            </div>

            <div className="item-pill star-pill">
              <span className="pill-emoji">⭐</span>
              <div className="pill-info">
                <span className="pill-name">Golden Star</span>
                <span className="pill-pts bonus">+30 pts</span>
              </div>
            </div>

            <div className="item-pill bomb-pill">
              <span className="pill-emoji">💣</span>
              <div className="pill-info">
                <span className="pill-name">Bomb</span>
                <span className="pill-pts negative">-20 pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* How to Play */}
        <div className="instructions-box">
          <div className="instruction-step">
            <span className="step-num">1</span>
            <span>Wave your <strong>Hand</strong> left & right (or use <strong>Mouse</strong>) to slide the bucket.</span>
          </div>
          <div className="instruction-step">
            <span className="step-num">2</span>
            <span>Catch fruits & stars before they hit the ground. Avoid bombs!</span>
          </div>
          <div className="instruction-step">
            <span className="step-num">3</span>
            <span>You have <strong>60 Seconds</strong> on the clock to set the top stall score!</span>
          </div>
        </div>

        {/* Big Start Button */}
        <button className="primary-action-btn pulse-anim" onClick={onStart}>
          <span className="btn-icon">🚀</span>
          START GAME (60s)
        </button>
      </div>
    </div>
  );
};

