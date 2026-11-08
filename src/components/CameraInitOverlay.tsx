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
    <div className="overlay-screen camera-init-overlay">
      <div className="modal-card camera-init-card">
        {/* Stall Header Badge */}
        <div className="stall-badge">
          <span className="badge-dot"></span>
          GESTURE CATCH • WEBCAM SETUP
        </div>

        {/* Dynamic Status Header */}
        <div className="cam-status-section">
          {cameraStatus === 'requesting' && (
            <div className="status-flow-state state-requesting">
              <div className="cam-spinner"></div>
              <h2 className="cam-headline">Starting camera...</h2>
              <p className="cam-subline">
                Please click <strong>&quot;Allow&quot;</strong> on your browser&apos;s camera prompt.
              </p>
            </div>
          )}

          {cameraStatus === 'connected' && !handDetected && (
            <div className="status-flow-state state-connected">
              <div className="hand-prompt-icon pulse-anim">🖐️</div>
              <h2 className="cam-headline">Camera connected! Show your hand.</h2>
              <p className="cam-subline">
                Show your hand in front of the camera.
              </p>
              <div className="hand-detection-box">
                <span className="detection-pulse"></span>
                <span>Waiting for hand in view...</span>
              </div>
            </div>
          )}

          {cameraStatus === 'connected' && handDetected && (
            <div className="status-flow-state state-detected">
              <div className="hand-prompt-icon success-bounce">✨🖐️✨</div>
              <h2 className="cam-headline text-success">Hand detected! Get ready.</h2>
              <p className="cam-subline">
                Locking on to your hand gestures...
              </p>
            </div>
          )}

          {cameraStatus === 'unavailable' && (
            <div className="status-flow-state state-unavailable">
              <div className="cam-warn-icon">⚠️</div>
              <h2 className="cam-headline text-warning">
                Camera unavailable. You can play using mouse controls.
              </h2>
              <p className="cam-subline">
                Webcam permission was denied or no camera was found. Don&apos;t worry, mouse controls are fully supported!
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="actions-row">
          {cameraStatus === 'unavailable' ? (
            <button className="primary-action-btn pulse-anim" onClick={onPlayWithMouse}>
              <span className="btn-icon">🖱️</span> Continue with Mouse Controls
            </button>
          ) : (
            <button className="secondary-action-btn" onClick={onPlayWithMouse} title="Play using mouse instead">
              🖱️ Switch to Mouse
            </button>
          )}

          <button className="secondary-action-btn" onClick={onBackToMenu}>
            🏠 Back to Menu
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
    <div className="overlay-screen countdown-overlay">
      <div className="countdown-box">
        <div className="countdown-ring">
          <span className="countdown-num" key={count}>
            {count > 0 ? count : 'GO!'}
          </span>
        </div>
        <div className="countdown-label">
          {count > 0 ? 'GET READY!' : 'CATCH THE FRUITS!'}
        </div>
      </div>
    </div>
  );
};

