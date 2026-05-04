export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface EyeTrackingData {
  timestamp: number;
  x: number;
  y: number;
  blinkCount: number;
  fixationDuration: number;
  pupilSize: number;
  facialExpression?: {
    happy: number;
    sad: number;
    angry: number;
    surprised: number;
    neutral: number;
    focused: number;
  };
  eyeOpenness?: {
    left: number;
    right: number;
  };
  gazeDirection?: {
    horizontal: number;
    vertical: number;
  };
  headPose?: {
    pitch: number;
    yaw: number;
    roll: number;
  };
}

export interface Session {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  data: EyeTrackingData[];
  status: 'active' | 'completed' | 'paused';
  notes?: string;
}

export interface SessionReport {
  session: Session;
  analytics: {
    avgFixationTime: number;
    totalBlinks: number;
    maxPupilSize: number;
    minPupilSize: number;
    avgPupilSize: number;
    focusAreas: { x: number; y: number; frequency: number }[];
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}