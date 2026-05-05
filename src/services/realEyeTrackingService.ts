import { EyeTrackingData } from '../types';
import * as faceapi from 'face-api.js';

export interface FacialExpression {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  neutral: number;
  focused: number;
}

export interface RealEyeTrackingData extends EyeTrackingData {
  facialExpression: FacialExpression;
  eyeOpenness: { left: number; right: number };
  gazeDirection: { horizontal: number; vertical: number };
  headPose: { pitch: number; yaw: number; roll: number };
}

// ── MediaPipe FaceMesh landmark indices ──────────────────────────────────────
// Eye Aspect Ratio (EAR) points: [p1(outer), p2(top-outer), p3(top-inner), p4(inner), p5(bot-inner), p6(bot-outer)]
const RIGHT_EAR_IDX = [33, 160, 158, 133, 153, 144];
const LEFT_EAR_IDX  = [362, 385, 387, 263, 373, 380];

// Iris (only available when refineLandmarks: true)
const LEFT_IRIS_CENTER  = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_IRIS_RING    = [469, 470, 471, 472];
const RIGHT_IRIS_RING   = [474, 475, 476, 477];

// Eye corners (for gaze normalisation)
const LEFT_EYE_OUTER  = 263;
const LEFT_EYE_INNER  = 362;
const RIGHT_EYE_OUTER = 33;
const RIGHT_EYE_INNER = 133;
const LEFT_EYE_TOP    = 386;
const LEFT_EYE_BOT    = 374;
const RIGHT_EYE_TOP   = 159;
const RIGHT_EYE_BOT   = 145;

// Face geometry helpers
const NOSE_TIP         = 4;
const LEFT_MOUTH_COR   = 61;
const RIGHT_MOUTH_COR  = 291;
const UPPER_LIP        = 13;
const LOWER_LIP        = 14;
const LEFT_BROW_OUTER  = 282;
const RIGHT_BROW_OUTER = 52;

const BLINK_THRESHOLD = 0.21;   // EAR below this → blink
const MAX_OPEN_EAR    = 0.38;   // EAR for fully-open eye
const SMOOTH_N        = 6;      // gaze smoothing window

// ── Service class ─────────────────────────────────────────────────────────────
class RealEyeTrackingService {
  private faceMesh: any = null;
  private isRunning    = false;
  private isInited     = false;
  private isProcessing = false;        // guard: no concurrent faceMesh.send()
  private lastResultMs = 0;            // when we last got a real result
  private callbacks: ((d: RealEyeTrackingData) => void)[] = [];
  private useFallback  = false;        // whether to use face-api.js as backup
  private faceApiLoaded = false;
  private debugMode    = false;

  private blinkCount   = 0;
  private lastBlinkMs  = 0;
  private wasBlinking  = false;

  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId: number | null = null;

  private offscreenCv: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private frameCount = 0;

  // Fixation tracking
  private gazeHistory: { x: number; y: number; t: number }[] = [];
  private fixationStart = 0;
  private fixationDur   = 0;

  // ── Public API ──────────────────────────────────────────────────────────────

  async initialize(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      this.videoEl  = video;
      this.canvasEl = canvas;
      this.ctx      = canvas.getContext('2d');
      if (!this.ctx) throw new Error('No canvas 2D context');

      // Wait for video metadata if not already loaded
      if (video.videoWidth === 0) {
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
      }

      // Match canvas to video aspect ratio
      canvas.width  = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // 1. Initialize MediaPipe (Primary) with a STABLE version lock
      const { FaceMesh } = await import('@mediapipe/face_mesh');
      this.faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
      });

      this.faceMesh.setOptions({
        maxNumFaces:            1,
        refineLandmarks:        true,
        minDetectionConfidence: 0.3,
        minTrackingConfidence:  0.3,
      });

      this.faceMesh.onResults((r: any) => this.onResults(r));
      console.log('[EyeTrack] Initializing FaceMesh (Stable v0.4)...');
      await this.faceMesh.initialize();

      // 2. Load face-api.js (Secondary Fallback) - doing this in background
      this.initFaceApi().catch(e => console.error('[EyeTrack] face-api.js init failed:', e));

      this.offscreenCv = document.createElement('canvas');
      this.offscreenCv.width = canvas.width;
      this.offscreenCv.height = canvas.height;
      this.offscreenCtx = this.offscreenCv.getContext('2d');

      this.isInited = true;
      console.log(`[EyeTrack] All models ready (${canvas.width}x${canvas.height})`);
      return true;
    } catch (err) {
      console.error('[EyeTrack] init failed:', err);
      return false;
    }
  }

  async reInitialize() {
    this.stop();
    this.isInited = false;
    this.faceMesh = null;
    if (this.videoEl && this.canvasEl) {
      await this.initialize(this.videoEl, this.canvasEl);
      this.start();
    }
  }

  setDebugMode(val: boolean) {
    this.debugMode = val;
  }

  private async initFaceApi() {
    console.log('[EyeTrack] Loading face-api.js fallback models...');
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/weights';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    ]);
    this.faceApiLoaded = true;
    console.log('[EyeTrack] face-api.js ready');
  }

  async start(): Promise<boolean> {
    if (!this.videoEl || !this.isInited || this.isRunning) {
      console.warn('[EyeTrack] Cannot start: videoEl=', !!this.videoEl, 'isInited=', this.isInited, 'isRunning=', this.isRunning);
      return false;
    }
    this.isRunning   = true;
    this.isProcessing = false;
    this.errorCount  = 0;
    this.lastResultMs = 0;
    this.blinkCount  = 0;
    this.lastBlinkMs = Date.now();
    this.gazeHistory = [];
    console.log('[EyeTrack] Starting tracking loop...');
    this.loop();
    return true;
  }

  stop() {
    this.isRunning = false;
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    if (this.ctx && this.canvasEl)
      this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
  }

  subscribe(cb: (d: RealEyeTrackingData) => void) {
    this.callbacks.push(cb);
    return () => { this.callbacks = this.callbacks.filter(c => c !== cb); };
  }

  isActive() { return this.isRunning; }

  /** Capture current frame as base64 for diagnostics */
  getSnapshot(): string | null {
    if (!this.offscreenCv) return null;
    return this.offscreenCv.toDataURL('image/jpeg', 0.8);
  }

  // ── Frame loop ──────────────────────────────────────────────────────────────

  // Draw the raw video to canvas every frame so it's never blank
  private drawVideoOnly() {
    const ctx = this.ctx;
    const cv  = this.canvasEl;
    const vid = this.videoEl;
    if (!ctx || !cv || !vid) return;
    
    // Ensure canvas matches video size if it changed (e.g. orientation or camera switch)
    if (cv.width !== vid.videoWidth || cv.height !== vid.videoHeight) {
      cv.width = vid.videoWidth;
      cv.height = vid.videoHeight;
      if (this.offscreenCv) {
        this.offscreenCv.width = cv.width;
        this.offscreenCv.height = cv.height;
      }
    }

    // Draw mirrored for natural feel
    ctx.save();
    ctx.translate(cv.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(vid, 0, 0, cv.width, cv.height);
    ctx.restore();

    // Overlay status
    const now = Date.now();
    const staleSec = this.lastResultMs > 0 ? (now - this.lastResultMs) / 1000 : 0;
    
    if (this.lastResultMs === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, cv.width, 40);
      ctx.fillStyle = '#00e6ff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('⏳ Initializing AI engines…', 20, 26);
    } else if (staleSec > 2) {
      ctx.fillStyle = 'rgba(220,38,38,0.7)'; // Red-600
      ctx.fillRect(0, 0, cv.width, 40);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`⚠ Detection lost (${staleSec.toFixed(0)} s) — checking fallback…`, 20, 26);
    }

    // ── DEBUG VIEW ────────────────────────────────────────────────────────────
    if (this.debugMode && this.offscreenCv) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(cv.width - 170, 50, 160, 120);
      ctx.drawImage(this.offscreenCv, cv.width - 170, 50, 160, 120);
      ctx.fillStyle = '#00ff00';
      ctx.font = '10px monospace';
      ctx.fillText('AI VISION BUFFER', cv.width - 170, 45);
    }
  }

  private loop() {
    if (!this.isRunning) return;

    // 1. Always draw video every RAF tick (canvas never blank)
    this.drawVideoOnly();

    // 2. Decide which AI to use
    const vid = this.videoEl;
    const videoReady = vid && !vid.paused && !vid.ended && vid.readyState >= 2 && vid.videoWidth > 0;
    
    this.frameCount++;
    const now = Date.now();
    
    // WATCHDOG: If AI is "processing" for > 3 seconds, it's likely crashed/hung
    if (this.isProcessing && this.lastResultMs > 0 && (now - this.lastResultMs) > 3000) {
      console.warn('[EyeTrack] AI processing timeout. Force-resetting watchdog...');
      this.isProcessing = false;
    }

    const staleMs = this.lastResultMs > 0 ? (now - this.lastResultMs) : (this.frameCount * 16); 
    
    // Auto-switch to fallback if Primary fails for > 3 seconds
    if (this.faceApiLoaded && staleMs > 3000 && !this.useFallback) {
      this.useFallback = true;
    } else if (this.useFallback && this.lastResultMs > 0 && (now - this.lastResultMs) < 500) {
      this.useFallback = false;
    }

    if (!this.isProcessing && videoReady && this.offscreenCtx && this.offscreenCv) {
      this.isProcessing = true;
      
      // Capture frame with a BRIGHTNESS BOOST
      this.offscreenCtx.filter = 'brightness(1.1) contrast(1.1)'; 
      this.offscreenCtx.drawImage(vid, 0, 0, this.offscreenCv.width, this.offscreenCv.height);
      this.offscreenCtx.filter = 'none';
      
      if (this.useFallback) {
        this.processFaceApi(this.offscreenCv)
          .catch(e => console.error('[EyeTrack] Fallback error:', e))
          .finally(() => { this.isProcessing = false; });
      } else if (this.faceMesh) {
        this.faceMesh
          .send({ image: this.offscreenCv })
          .catch((e: unknown) => {
            console.error(`[EyeTrack] faceMesh.send error:`, e);
            this.isProcessing = false;
          });
          // Note: isProcessing is set to false in onResults callback
      } else {
        this.isProcessing = false;
      }
    }

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private async processFaceApi(canvas: HTMLCanvasElement) {
    if (!this.faceApiLoaded) return;
    
    try {
      const result = await faceapi.detectSingleFace(
        canvas, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
      ).withFaceLandmarks().withFaceExpressions();

      if (result) {
        // Map face-api.js results to our common format
        const dims = faceapi.matchDimensions(this.canvasEl!, canvas, true);
        const resized = faceapi.resizeResults(result, dims);
        
        // Use landmarks to estimate gaze (simplified for fallback)
        const landmarks = resized.landmarks.positions;
        
        // For fallback, we just center the gaze on the face 
        // until MediaPipe recovers (since iris tracking is hard in face-api.js)
        const box = resized.detection.box;
        const gx = (box.x + box.width / 2) / dims.width;
        const gy = (box.y + box.height / 3) / dims.height;

        this.onResults({
          multiFaceLandmarks: [landmarks.map(p => ({ x: p.x / dims.width, y: p.y / dims.height, z: 0 }))],
          fromFallback: true,
          expressions: resized.expressions
        });
      } else {
        this.onResults({ multiFaceLandmarks: [] });
      }
    } catch (e) {
      console.error('[EyeTrack] face-api detection failed:', e);
    }
  }

  // ── Result handler ──────────────────────────────────────────────────────────

  private onResults(results: any) {
    if (!this.ctx || !this.canvasEl || !this.videoEl) return;
    this.lastResultMs = Date.now();
    this.errorCount   = 0;
    this.frameCount++;
    
    const { width, height } = this.canvasEl;
    const ctx = this.ctx;

    // Log every 100 frames to show model is alive
    if (this.frameCount % 100 === 0) {
      console.log(`[EyeTrack] Results received. Faces found: ${results.multiFaceLandmarks?.length || 0}`);
    }

    // Draw mirrored video for natural "mirror" feel
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoEl, 0, 0, width, height);
    ctx.restore();

    if (!results.multiFaceLandmarks?.length) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👁  No face detected — look at the camera', width / 2, height / 2);
      ctx.textAlign = 'left';
      return;
    }

    try {
      const lm = results.multiFaceLandmarks[0];
      const hasIris = lm.length >= 478;  // iris landmarks only with refineLandmarks

      const rightEAR = this.ear(lm, RIGHT_EAR_IDX);
      const leftEAR  = this.ear(lm, LEFT_EAR_IDX);
      const avgEAR   = (rightEAR + leftEAR) / 2;

      // Blink detection
      const now = Date.now();
      if (avgEAR < BLINK_THRESHOLD && !this.wasBlinking) {
        this.wasBlinking = true;
      } else if (avgEAR >= BLINK_THRESHOLD && this.wasBlinking) {
        this.wasBlinking = false;
        if (now - this.lastBlinkMs > 200) { this.blinkCount++; this.lastBlinkMs = now; }
      }

      const leftOpen  = Math.min(1, leftEAR  / MAX_OPEN_EAR);
      const rightOpen = Math.min(1, rightEAR / MAX_OPEN_EAR);

      // Iris-based metrics (only if iris landmarks present)
      const gaze      = hasIris ? this.gazeFromIris(lm) : { x: 0.5, y: 0.5, direction: { horizontal: 0, vertical: 0 } };
      const pupilSize = hasIris ? this.irisRadius(lm)   : 4;
      const headPose  = this.headPose(lm);
      const expr      = this.expression(lm, avgEAR);

      // Smooth gaze
      this.gazeHistory.push({ x: gaze.x, y: gaze.y, t: now });
      if (this.gazeHistory.length > SMOOTH_N) this.gazeHistory.shift();
      const sx = this.gazeHistory.reduce((s, p) => s + p.x, 0) / this.gazeHistory.length;
      const sy = this.gazeHistory.reduce((s, p) => s + p.y, 0) / this.gazeHistory.length;

      // Fixation duration
      const oldest = this.gazeHistory[0];
      const dist = Math.hypot(sx - oldest.x, sy - oldest.y);
      if (dist < 0.04) {
        if (this.fixationStart === 0) this.fixationStart = now;
        this.fixationDur = now - this.fixationStart;
      } else {
        this.fixationStart = now;
        this.fixationDur   = 0;
      }

      this.drawOverlay(ctx, width, height, lm, sx, sy, leftOpen, rightOpen, expr, hasIris);

      const data: RealEyeTrackingData = {
        timestamp:        now,
        x: sx, y: sy,
        blinkCount:       this.blinkCount,
        fixationDuration: this.fixationDur,
        pupilSize,
        facialExpression: expr,
        eyeOpenness:      { left: leftOpen, right: rightOpen },
        gazeDirection:    gaze.direction,
        headPose,
      };
      this.callbacks.forEach(cb => cb(data));
    } catch (err) {
      console.error('[EyeTrack] onResults processing error:', err);
    }
  }

  // ── Maths helpers ───────────────────────────────────────────────────────────

  private dist(a: any, b: any) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Eye Aspect Ratio */
  private ear(lm: any[], idx: number[]) {
    const [p1, p2, p3, p4, p5, p6] = idx.map(i => lm[i]);
    const h = this.dist(p1, p4);
    if (h < 1e-6) return 0.3;
    return (this.dist(p2, p6) + this.dist(p3, p5)) / (2 * h);
  }

  /** Gaze from iris centre relative to eye corners */
  private gazeFromIris(lm: any[]) {
    const li = lm[LEFT_IRIS_CENTER];
    const ri = lm[RIGHT_IRIS_CENTER];

    const lo = lm[LEFT_EYE_OUTER];
    const linn = lm[LEFT_EYE_INNER];
    const ro = lm[RIGHT_EYE_OUTER];
    const rinn = lm[RIGHT_EYE_INNER];

    const lw = Math.abs(lo.x - linn.x) || 0.01;
    const rw = Math.abs(ro.x - rinn.x) || 0.01;

    const lh = Math.abs(lm[LEFT_EYE_TOP].y  - lm[LEFT_EYE_BOT].y)  || 0.01;
    const rh = Math.abs(lm[RIGHT_EYE_TOP].y - lm[RIGHT_EYE_BOT].y) || 0.01;

    // Horizontal: iris x within eye width (mirrored so right = right)
    const lGH = (li.x - Math.min(lo.x, linn.x)) / lw;
    const rGH = (ri.x - Math.min(ro.x, rinn.x)) / rw;
    const gazeH = 1 - (lGH + rGH) / 2;   // mirror

    // Vertical
    const lGV = (li.y - Math.min(lm[LEFT_EYE_TOP].y,  lm[LEFT_EYE_BOT].y))  / lh;
    const rGV = (ri.y - Math.min(lm[RIGHT_EYE_TOP].y, lm[RIGHT_EYE_BOT].y)) / rh;
    const gazeV = (lGV + rGV) / 2;

    return {
      x:         Math.max(0, Math.min(1, gazeH)),
      y:         Math.max(0, Math.min(1, gazeV)),
      direction: { horizontal: (gazeH - 0.5) * 2, vertical: (gazeV - 0.5) * 2 },
    };
  }

  /** Pupil size from mean iris ring radius → mm estimate */
  private irisRadius(lm: any[]) {
    const avgRad = (ring: number[], center: number) => {
      const c = lm[center];
      return ring.reduce((s, i) => s + this.dist(c, lm[i]), 0) / ring.length;
    };
    const lRad = avgRad(LEFT_IRIS_RING,  LEFT_IRIS_CENTER);
    const rRad = avgRad(RIGHT_IRIS_RING, RIGHT_IRIS_CENTER);
    // Normalised radius → mm (iris ≈ 11.7 mm, faces ≈ 150 mm wide at ~60 cm)
    const faceLm = lm[LEFT_EYE_OUTER];
    const faceRm = lm[RIGHT_EYE_OUTER];
    const faceWidthN = Math.abs(faceLm.x - faceRm.x) || 0.15;
    const scale = 150 / faceWidthN;          // px-per-mm in normalised space
    const mm = ((lRad + rRad) / 2) * scale * 0.078; // empirical factor
    return Math.max(2, Math.min(8, mm));
  }

  /** Head pose from face geometry */
  private headPose(lm: any[]) {
    const nose  = lm[NOSE_TIP];
    const lEye  = lm[LEFT_EYE_OUTER];
    const rEye  = lm[RIGHT_EYE_OUTER];
    const lMouth = lm[LEFT_MOUTH_COR];
    const rMouth = lm[RIGHT_MOUTH_COR];

    const eyeSpan   = Math.abs(lEye.x  - rEye.x)   || 0.01;
    const mouthSpan = Math.abs(lMouth.x - rMouth.x) || 0.01;
    const yaw   = ((eyeSpan / mouthSpan) - 1) * 0.6;

    const eyeMidY = (lEye.y + rEye.y) / 2;
    const pitch = (nose.y - eyeMidY - 0.08) * 2.5;

    const roll = Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x);

    return { pitch, yaw, roll };
  }

  /** Facial expression from geometric ratios */
  private expression(lm: any[], ear: number): FacialExpression {
    const ul = lm[UPPER_LIP];
    const ll = lm[LOWER_LIP];
    const lmc = lm[LEFT_MOUTH_COR];
    const rmc = lm[RIGHT_MOUTH_COR];
    const lbrow = lm[LEFT_BROW_OUTER];
    const rbrow = lm[RIGHT_BROW_OUTER];
    const ltop  = lm[LEFT_EYE_TOP];
    const rtop  = lm[RIGHT_EYE_TOP];

    const mouthOpen   = this.dist(ul, ll);
    const mouthWidth  = this.dist(lmc, rmc) || 0.01;
    const mouthAR     = mouthOpen / mouthWidth;

    // Smile: corners above lip midpoint
    const lipMidY       = (ul.y + ll.y) / 2;
    const cornerAvgY    = (lmc.y + rmc.y) / 2;
    const smileScore    = Math.max(0, (lipMidY - cornerAvgY) * 15);

    // Brow elevation (higher brow → more surprised)
    const browElev      = ((ltop.y - lbrow.y) + (rtop.y - rbrow.y)) / 2;
    const surpriseScore = Math.max(0, browElev * 8 + mouthAR * 4);

    // Happy = smile dominant
    const happyScore    = smileScore;

    // Sad = corners below lip midpoint
    const sadScore      = Math.max(0, (cornerAvgY - lipMidY) * 15);

    // Angry = brows low (negative browElev), slight squint
    const angryScore    = Math.max(0, -browElev * 6 + (1 - ear / MAX_OPEN_EAR) * 0.3);

    // Focused = normal EAR, low expression scores
    const focusedScore  = Math.max(0.05,
      0.6 - Math.abs(smileScore) - surpriseScore * 0.5 - sadScore);

    // Neutral = residual
    const neutralScore  = Math.max(0,
      0.5 - happyScore - sadScore * 0.5 - angryScore - surpriseScore * 0.5);

    const total = happyScore + sadScore + angryScore + surpriseScore + neutralScore + focusedScore || 1;

    return {
      happy:     happyScore    / total,
      sad:       sadScore      / total,
      angry:     angryScore    / total,
      surprised: surpriseScore / total,
      neutral:   neutralScore  / total,
      focused:   focusedScore  / total,
    };
  }

  // ── Canvas overlay ──────────────────────────────────────────────────────────

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    lm: any[],
    gx: number, gy: number,
    lOpen: number, rOpen: number,
    expr: FacialExpression,
    hasIris: boolean,
  ) {
    const px = gx * W;
    const py = gy * H;

    // Gaze circle (show as hollow/dashed if no iris)
    ctx.strokeStyle = hasIris ? 'rgba(255, 60, 60, 0.9)' : 'rgba(255, 165, 0, 0.5)';
    ctx.lineWidth = 3;
    if (!hasIris) ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(px, py, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = hasIris ? 'rgba(255, 60, 60, 0.75)' : 'rgba(255, 165, 0, 0.4)';
    ctx.beginPath(); ctx.arc(px, py, 8,  0, Math.PI * 2); ctx.fill();

    // Crosshair
    ctx.strokeStyle = hasIris ? 'rgba(255, 60, 60, 0.5)' : 'rgba(255, 165, 0, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px - 30, py); ctx.lineTo(px + 30, py);
    ctx.moveTo(px, py - 30); ctx.lineTo(px, py + 30);
    ctx.stroke();

    // Iris dots (only if detected) - mirror the X coordinate to match video
    if (hasIris) {
      const irisColor = 'rgba(0, 230, 255, 0.9)';
      [...LEFT_IRIS_RING, LEFT_IRIS_CENTER, ...RIGHT_IRIS_RING, RIGHT_IRIS_CENTER].forEach(i => {
        const p = lm[i];
        if (p) {
          ctx.fillStyle = irisColor;
          ctx.beginPath(); ctx.arc((1 - p.x) * W, p.y * H, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      });
    }

    // HUD background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(6, 6, 252, 105);

    ctx.fillStyle = this.useFallback ? '#ffaa00' : '#00e6ff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`▶ ${this.useFallback ? 'SECONDARY AI (face-api)' : 'PRIMARY AI (MediaPipe)'}`, 12, 22);

    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    const dom = Object.entries(expr).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    ctx.fillText(`Gaze  : ${(gx * 100).toFixed(1)}%  ${(gy * 100).toFixed(1)}%`, 12, 38);
    ctx.fillText(`Blinks: ${this.blinkCount}`, 12, 52);
    ctx.fillText(`Eyes  : L ${(lOpen * 100).toFixed(0)}%  R ${(rOpen * 100).toFixed(0)}%`, 12, 66);
    ctx.fillText(`Expr  : ${dom}`, 12, 80);
    
    if (this.useFallback) {
      ctx.fillStyle = '#ffaa00';
      ctx.fillText('⚠ FALLBACK ACTIVE (Reduced accuracy)', 12, 94);
    } else if (!hasIris) {
      ctx.fillStyle = '#ffaa00';
      ctx.fillText('⚠ IRIS NOT DETECTED (gaze estimated)', 12, 94);
    } else {
      ctx.fillStyle = '#00ffaa';
      ctx.fillText('✔ Tracking active', 12, 94);
    }
  }
}

export const realEyeTrackingService = new RealEyeTrackingService();