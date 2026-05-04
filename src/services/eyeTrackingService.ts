import { EyeTrackingData } from '../types';

class EyeTrackingService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: ((data: EyeTrackingData) => void)[] = [];
  private blinkCount: number = 0;
  private lastBlinkTime: number = 0;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.blinkCount = 0;
    this.lastBlinkTime = Date.now();
    
    this.intervalId = setInterval(() => {
      this.generateData();
    }, 100); // Generate data every 100ms
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  subscribe(callback: (data: EyeTrackingData) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  private generateData() {
    const now = Date.now();
    
    // Simulate eye movement with realistic patterns
    const baseX = 0.5 + 0.3 * Math.sin(now / 2000) + 0.1 * Math.sin(now / 500);
    const baseY = 0.5 + 0.3 * Math.cos(now / 3000) + 0.1 * Math.cos(now / 700);
    
    // Add some noise for realism
    const x = Math.max(0, Math.min(1, baseX + (Math.random() - 0.5) * 0.1));
    const y = Math.max(0, Math.min(1, baseY + (Math.random() - 0.5) * 0.1));
    
    // Simulate blinks (roughly every 3-5 seconds)
    const timeSinceLastBlink = now - this.lastBlinkTime;
    if (timeSinceLastBlink > 3000 && Math.random() < 0.1) {
      this.blinkCount++;
      this.lastBlinkTime = now;
    }
    
    // Simulate fixation duration (how long the eye stays in one area)
    const fixationDuration = 200 + Math.random() * 800; // 200-1000ms
    
    // Simulate pupil size (affected by light, attention, etc.)
    const pupilSize = 3 + Math.sin(now / 5000) * 1 + Math.random() * 0.5;
    
    const data: EyeTrackingData = {
      timestamp: now,
      x,
      y,
      blinkCount: this.blinkCount,
      fixationDuration,
      pupilSize: Math.max(2, Math.min(6, pupilSize)), // Clamp between 2-6mm
    };
    
    this.callbacks.forEach(callback => callback(data));
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

export const eyeTrackingService = new EyeTrackingService();