import { createContext, useContext, useState, useRef, ReactNode, useCallback, useMemo } from 'react';
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

  const saveSessions = useCallback((updatedSessions: Session[]) => {
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
      
      return updatedSessions;
    } catch (error) {
      console.error('Error saving sessions to localStorage:', error);
      const recentSessions = updatedSessions.slice(-5).map(session => ({
        ...session,
        data: session.data.slice(-100),
      }));
      try {
        localStorage.setItem(`eyetrack_sessions_${GUEST_USER_ID}`, JSON.stringify(recentSessions));
        return recentSessions;
      } catch {
        localStorage.removeItem(`eyetrack_sessions_${GUEST_USER_ID}`);
        return [];
      }
    }
  }, []);

  const startSession = useCallback(() => {
    setCurrentSession(prev => {
      if (prev?.status === 'active') return prev;

      dataPointCounterRef.current = 0;
      return {
        id: crypto.randomUUID(),
        userId: GUEST_USER_ID,
        startTime: new Date(),
        endTime: null,
        duration: 0,
        data: [],
        status: 'active',
      };
    });
  }, []);

  const stopSession = useCallback(() => {
    setCurrentSession(prevSession => {
      if (!prevSession || prevSession.status !== 'active') return prevSession;

      const endTime = new Date();
      const duration = endTime.getTime() - prevSession.startTime.getTime();

      const completedSession: Session = {
        ...prevSession,
        endTime,
        duration,
        status: 'completed',
      };

      setSessions(prevSessions => {
        const updatedSessions = [...prevSessions, completedSession];
        return saveSessions(updatedSessions);
      });
      
      return null;
    });
  }, [saveSessions]);

  const pauseSession = useCallback(() => {
    setCurrentSession(prev => {
      if (!prev || prev.status !== 'active') return prev;
      return { ...prev, status: 'paused' };
    });
  }, []);

  const resumeSession = useCallback(() => {
    setCurrentSession(prev => {
      if (!prev || prev.status !== 'paused') return prev;
      return { ...prev, status: 'active' };
    });
  }, []);

  const addEyeTrackingData = useCallback((data: EyeTrackingData) => {
    dataPointCounterRef.current += 1;
    const newCounter = dataPointCounterRef.current;
    
    setCurrentSession(prevSession => {
      if (!prevSession || prevSession.status !== 'active') return prevSession;
      
      if (newCounter % DATA_SAMPLING_INTERVAL === 0 || prevSession.data.length < 10) {
        return {
          ...prevSession,
          data: [...prevSession.data.slice(-MAX_SESSION_DATA_POINTS + 1), data],
        };
      }
      return prevSession;
    });
  }, []);

  const contextValue = useMemo(() => ({
    currentSession,
    sessions,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    addEyeTrackingData,
  }), [currentSession, sessions, startSession, stopSession, pauseSession, resumeSession, addEyeTrackingData]);

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};