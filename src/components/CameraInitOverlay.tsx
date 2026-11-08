import React from 'react';
import { CameraStatus } from '../types';

interface CameraInitOverlayProps {
  cameraStatus: CameraStatus;
  handDetected: boolean;
  onPlayWithMouse: () => void;
  onBackToMenu: () => void;
}

export const CameraInitOverlay: React.FC<CameraInitOverlayProps> = ({
  cameraStatus,
  handDetected,
  onPlayWithMouse,
  onBackToMenu,
}) => {
  return (
    <div className="overlay-screen">
      <div className="setup-card">
        <span className="game-tag">Camera Setup</span>

        {cameraStatus === 'requesting' && (
          <div className="setup-state-block">
            <div className="clean-spinner"></div>
            <h2 className="setup-title">Starting camera...</h2>
            <p className="setup-sub">
              Please allow camera access when prompted by your browser.
            </p>
          </div>
        )}

        {cameraStatus === 'connected' && !handDetected && (
          <div className="setup-state-block">
            <div className="setup-icon">🖐️</div>
            <h2 className="setup-title">Camera connected! Show your hand.</h2>
            <p className="setup-sub">
              Show your hand in front of the camera to begin.
            </p>
          </div>
        )}

        {cameraStatus === 'connected' && handDetected && (
          <div className="setup-state-block">
            <div className="setup-icon icon-success">✨</div>
            <h2 className="setup-title setup-success">Hand detected! Get ready.</h2>
            <p className="setup-sub">
              Starting countdown...
            </p>
          </div>
        )}

        {cameraStatus === 'unavailable' && (
          <div className="setup-state-block">
            <div className="setup-icon icon-warning">⚠️</div>
            <h2 className="setup-title setup-warning">
              Camera unavailable. You can play using mouse controls.
            </h2>
            <p className="setup-sub">
              Camera access was denied or no webcam was detected.
            </p>
          </div>
        )}

        <div className="setup-actions">
          {cameraStatus === 'unavailable' ? (
            <button className="clean-primary-btn" onClick={onPlayWithMouse}>
              Play with Mouse
            </button>
          ) : (
            <button className="clean-secondary-btn" onClick={onPlayWithMouse}>
              Use Mouse Instead
            </button>
          )}

          <button className="clean-secondary-btn" onClick={onBackToMenu}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

interface CountdownOverlayProps {
  count: number;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count }) => {
  return (
    <div className="overlay-screen countdown-backdrop">
      <div className="countdown-card">
        <span className="countdown-digit" key={count}>
          {count > 0 ? count : 'GO!'}
        </span>
        <span className="countdown-caption">
          {count > 0 ? 'Get Ready' : 'Catch the items!'}
        </span>
      </div>
    </div>
  );
};
