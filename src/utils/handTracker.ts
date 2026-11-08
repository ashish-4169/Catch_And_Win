import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { CameraStatus } from '../types';

export interface HandTrackerCallbacks {
  onHandMove: (normalizedX: number) => void;
  onStatusChange: (status: CameraStatus) => void;
  onHandDetected?: (detected: boolean) => void;
}

class HandTrackerService {
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private isTracking: boolean = false;
  private lastVideoTime: number = -1;
  private wasHandDetected: boolean = false;
  private callbacks: HandTrackerCallbacks | null = null;

  /**
   * Lazily initialize MediaPipe HandLandmarker.
   * Tries local WASM and local model first for fast offline loading,
   * with fallback to official CDN.
   */
  private async getLandmarker(): Promise<HandLandmarker> {
    if (this.landmarker) {
      return this.landmarker;
    }

    // 1. Resolve WASM files
    let vision;
    try {
      vision = await FilesetResolver.forVisionTasks('/wasm');
    } catch (wasmErr) {
      console.warn('Local WASM loading failed, falling back to CDN...', wasmErr);
      vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
    }

    // 2. Initialize HandLandmarker (try GPU first, fallback to CPU)
    try {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    } catch (gpuErr) {
      console.warn('GPU delegate failed, attempting CPU mode...', gpuErr);
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    }

    return this.landmarker;
  }

  /**
   * Request webcam access and start detecting hand movements.
   */
  public async start(videoEl: HTMLVideoElement, callbacks: HandTrackerCallbacks) {
    this.videoElement = videoEl;
    this.callbacks = callbacks;
    this.isTracking = true;

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Webcam getUserMedia is not supported in this browser environment.');
      callbacks.onStatusChange('unavailable');
      return;
    }

    callbacks.onStatusChange('requesting');

    try {
      // 1. Request webcam video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      // If stopped while waiting for permission, terminate immediately
      if (!this.isTracking) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.stream = stream;
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;

      // Wait until video is ready to play
      await new Promise<void>((resolve) => {
        if (videoEl.readyState >= 2) {
          resolve();
        } else {
          videoEl.onloadeddata = () => resolve();
        }
      });

      await videoEl.play();

      // 2. Load HandLandmarker
      const landmarker = await this.getLandmarker();

      callbacks.onStatusChange('connected');

      // 3. Start detection loop
      this.startDetectionLoop(landmarker);
    } catch (err) {
      console.warn('Webcam initialization or permission failed:', err);
      this.stop();
      callbacks.onStatusChange('unavailable');
    }
  }

  /**
   * Frame-by-frame hand detection loop.
   */
  private startDetectionLoop(landmarker: HandLandmarker) {
    const detect = () => {
      if (!this.isTracking || !this.videoElement) return;

      const video = this.videoElement;

      if (video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = video.currentTime;

        try {
          const results = landmarker.detectForVideo(video, performance.now());
          const hasHand = Boolean(results.landmarks && results.landmarks.length > 0);

          if (hasHand !== this.wasHandDetected) {
            this.wasHandDetected = hasHand;
            this.callbacks?.onHandDetected?.(hasHand);
          }

          if (hasHand && results.landmarks) {
            const hand = results.landmarks[0];

            // Use middle MCP (index 9) or wrist (index 0) for stable palm tracking
            const palmPoint = hand[9] || hand[0];

            if (palmPoint && typeof palmPoint.x === 'number') {
              // Mirror X so moving hand to user's right moves bucket right
              const mirroredX = 1 - palmPoint.x;
              this.callbacks?.onHandMove(mirroredX);
            }
          }
        } catch (detectErr) {
          // Detection frame error safeguard
          console.debug('Hand detection frame skipped:', detectErr);
        }
      }

      this.animationFrameId = requestAnimationFrame(detect);
    };

    this.animationFrameId = requestAnimationFrame(detect);
  }

  /**
   * Stop the webcam and release hardware camera resources.
   */
  public stop() {
    this.isTracking = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      this.stream = null;
    }

    if (this.videoElement) {
      try {
        this.videoElement.pause();
        this.videoElement.srcObject = null;
      } catch {
        // Ignore video cleanup errors
      }
    }

    this.lastVideoTime = -1;
    this.wasHandDetected = false;
  }
}

export const handTracker = new HandTrackerService();
