import { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { Session, EyeTrackingData } from '../types';

interface SessionContextType {
  currentSession: Session | null;
  sessions: Session[];
  startSession: () => void;
  stopSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  addEyeTrackingData: (data: EyeTrackingData) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

// Persistent guest user ID for localStorage keys
const GUEST_USER_ID = 'guest';

// Data sampling configuration
const DATA_SAMPLING_INTERVAL = 10; // Store every 10th data point
const MAX_SESSION_DATA_POINTS = 1000; // Maximum data points per session

const loadStoredSessions = (): Session[] => {
  const savedSessions = localStorage.getItem(`eyetrack_sessions_${GUEST_USER_ID}`);
  if (!savedSessions) return [];
  try {
    return JSON.parse(savedSessions).map((session: any) => ({
      ...session,
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : null,
    }));
  } catch {
    return [];
  }
};

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>(loadStoredSessions);
  const dataPointCounterRef = useRef(0);

  const saveSessions = (updatedSessions: Session[]) => {
    try {
      const optimizedSessions = updatedSessions.map(session => ({
        ...session,
        data: session.data.slice(-MAX_SESSION_DATA_POINTS),
      }));

      const sessionData = JSON.stringify(optimizedSessions);

      if (sessionData.length > 4 * 1024 * 1024) {
        const furtherOptimized = optimizedSessions.map(session => ({
          ...session,
          data: session.data.filter((_, index) => index % 2 === 0),
        }));
        localStorage.setItem(`eyetrack_sessions_${GUEST_USER_ID}`, JSON.stringify(furtherOptimized));
      } else {
        localStorage.setItem(`eyetrack_sessions_${GUEST_USER_ID}`, sessionData);
      }

      setSessions(updatedSessions);
    } catch (error) {
      console.error('Error saving sessions to localStorage:', error);
      const recentSessions = updatedSessions.slice(-5).map(session => ({
        ...session,
        data: session.data.slice(-100),
      }));
      try {
        localStorage.setItem(`eyetrack_sessions_${GUEST_USER_ID}`, JSON.stringify(recentSessions));
        setSessions(recentSessions);
      } catch {
        localStorage.removeItem(`eyetrack_sessions_${GUEST_USER_ID}`);
        setSessions([]);
      }
    }
  };

  const startSession = () => {
    if (currentSession?.status === 'active') return;

    const newSession: Session = {
      id: crypto.randomUUID(),
      userId: GUEST_USER_ID,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      data: [],
      status: 'active',
    };

    setCurrentSession(newSession);
    dataPointCounterRef.current = 0;
  };

  const stopSession = () => {
    if (!currentSession || currentSession.status !== 'active') return;

    const endTime = new Date();
    const duration = endTime.getTime() - currentSession.startTime.getTime();

    const completedSession: Session = {
      ...currentSession,
      endTime,
      duration,
      status: 'completed',
    };

    const updatedSessions = [...sessions, completedSession];
    saveSessions(updatedSessions);
    setCurrentSession(null);
  };

  const pauseSession = () => {
    if (!currentSession || currentSession.status !== 'active') return;
    setCurrentSession({ ...currentSession, status: 'paused' });
  };

  const resumeSession = () => {
    if (!currentSession || currentSession.status !== 'paused') return;
    setCurrentSession({ ...currentSession, status: 'active' });
  };

  const addEyeTrackingData = (data: EyeTrackingData) => {
    if (!currentSession || currentSession.status !== 'active') return;

    dataPointCounterRef.current += 1;
    const newCounter = dataPointCounterRef.current;
    if (newCounter % DATA_SAMPLING_INTERVAL === 0 || currentSession.data.length < 10) {
        setCurrentSession(prevSession => prevSession ? {
          ...prevSession,
          data: [...prevSession.data.slice(-MAX_SESSION_DATA_POINTS + 1), data],
        } : null);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        currentSession,
        sessions,
        startSession,
        stopSession,
        pauseSession,
        resumeSession,
        addEyeTrackingData,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};