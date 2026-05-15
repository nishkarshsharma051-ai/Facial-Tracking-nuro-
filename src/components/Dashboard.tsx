import { FC, useEffect, useState } from 'react';
import { Play, Pause, Square, Eye, Activity, Clock, Target, Smile, Zap, ShieldCheck, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../contexts/SessionContext';
import { realEyeTrackingService, RealEyeTrackingData } from '../services/realEyeTrackingService';
import CameraView from './CameraView';

const Dashboard: FC = () => {
  const { currentSession, startSession, stopSession, pauseSession, resumeSession, addEyeTrackingData } = useSession();
  const [realtimeData, setRealtimeData] = useState<RealEyeTrackingData | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = realEyeTrackingService.subscribe((data) => {
      setRealtimeData(data);
      if (currentSession?.status === 'active') addEyeTrackingData(data);
    });
    return unsubscribe;
  }, [currentSession, addEyeTrackingData]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (currentSession?.status === 'active') {
      interval = setInterval(() => {
        setSessionDuration(Date.now() - currentSession.startTime.getTime());
      }, 100);
    } else {
      setSessionDuration(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [currentSession]);

  const handleCameraReady = async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    try {
      const success = await realEyeTrackingService.initialize(video, canvas);
      if (success) setIsInitialized(true);
    } catch (error) {
      console.error('Eye tracking initialization error:', error);
    }
  };

  const handleStartSession = async () => {
    if (!isInitialized) return;
    startSession();
    await realEyeTrackingService.start();
  };

  const handleStopSession = () => { stopSession(); realEyeTrackingService.stop(); };
  const handlePauseSession = () => { pauseSession(); realEyeTrackingService.stop(); };
  const handleResumeSession = async () => { resumeSession(); await realEyeTrackingService.start(); };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const getDominantExpression = (expressions: any) => {
    if (!expressions) return 'neutral';
    return (Object.entries(expressions) as [string, number][]).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 relative">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, #6366f1, #a855f7)' }} />
            <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.25em]">Real-time Analytics</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
            ANALYTICS <span className="text-gradient">DASHBOARD</span>
          </h1>
          <p className="mt-2 text-slate-400 font-medium text-sm">Real-time ocular telemetry and neural response monitoring.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center space-x-2.5 px-4 py-2 rounded-xl"
            style={{
              background: isInitialized ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${isInitialized ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}
          >
            <div className={`status-dot ${isInitialized ? 'status-dot-active' : ''}`}
              style={!isInitialized ? { background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.5)' } : {}}
            />
            <span className="text-xs font-black uppercase tracking-widest"
              style={{ color: isInitialized ? '#4ade80' : '#f87171' }}
            >
              {isInitialized ? 'System Active' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 rounded-xl"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-black text-yellow-400 uppercase tracking-widest">12ms Latency</span>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 rounded-xl"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">MediaPipe AI</span>
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left — Camera + Controls */}
        <div className="xl:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <CameraView onCameraReady={handleCameraReady} isActive={currentSession?.status === 'active'} />
          </motion.div>

          {/* Mission Control */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-card p-7"
            style={{
              background: 'linear-gradient(135deg, rgba(15,20,50,0.9) 0%, rgba(10,14,35,0.9) 100%)',
              borderColor: 'rgba(99,102,241,0.2)',
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                  </div>
                  Mission Control
                </h2>
                <p className="text-sm text-slate-500 mt-1 ml-9">Manage recording sessions and data streams.</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {!currentSession ? (
                  <button
                    onClick={handleStartSession}
                    disabled={!isInitialized}
                    className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    Initialize Session
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    {currentSession.status === 'active' ? (
                      <button onClick={handlePauseSession} className="btn-secondary flex items-center gap-2"
                        style={{ borderColor: 'rgba(234,179,8,0.3)', color: '#fbbf24' }}
                      >
                        <Pause className="w-4 h-4" /> Pause
                      </button>
                    ) : (
                      <button onClick={handleResumeSession} className="btn-primary flex items-center gap-2">
                        <Play className="w-4 h-4" /> Resume
                      </button>
                    )}
                    <button onClick={handleStopSession}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#f87171',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                    >
                      <Square className="w-4 h-4" /> Terminate
                    </button>
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence>
              {currentSession && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-2xl font-black text-white tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatDuration(sessionDuration)}
                      </span>
                    </div>
                    <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                      style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}
                    >
                      ● Recording
                    </div>
                  </div>
                  <div className="flex items-end gap-1">
                    {[0, 200, 400].map((delay, i) => (
                      <div key={i} className="w-1 rounded-full"
                        style={{
                          height: `${12 + i * 4}px`,
                          background: 'linear-gradient(180deg, #6366f1, #a855f7)',
                          animation: `bounce 0.8s ease-in-out ${delay}ms infinite alternate`,
                          opacity: 0.8,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Right — Telemetry */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <TelemetryCard icon={Target} label="Gaze Position" value={realtimeData ? `${(realtimeData.x * 100).toFixed(1)}%, ${(realtimeData.y * 100).toFixed(1)}%` : 'WAITING...'} color="blue" variants={itemVariants} />
          <TelemetryCard icon={Eye} label="Blink Rate" value={realtimeData?.blinkCount?.toString() || '0'} color="green" suffix="count" variants={itemVariants} />
          <TelemetryCard icon={Activity} label="Pupil Dilation" value={realtimeData ? realtimeData.pupilSize.toFixed(1) : '0.0'} color="purple" suffix="mm" variants={itemVariants} />
          <TelemetryCard icon={Clock} label="Fixation" value={realtimeData ? realtimeData.fixationDuration.toFixed(0) : '0'} color="orange" suffix="ms" variants={itemVariants} />
          <TelemetryCard icon={Smile} label="Neural Affect" value={realtimeData ? getDominantExpression(realtimeData.facialExpression) : 'NEUTRAL'} color="pink" isCapitalize variants={itemVariants} />
        </motion.div>
      </div>

      {/* Bottom Viz */}
      <AnimatePresence>
        {realtimeData && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Ocular Mechanics */}
            <div className="glass-card p-8" style={{ borderColor: 'rgba(59,130,246,0.15)' }}>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Eye className="w-4 h-4 text-blue-400" />
                </div>
                Ocular Mechanics
              </h3>
              <div className="space-y-6">
                {[
                  { label: 'Left Eye Aperture', value: realtimeData.eyeOpenness.left },
                  { label: 'Right Eye Aperture', value: realtimeData.eyeOpenness.right },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                      <span className="text-sm font-black text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {(value * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${value * 100}%` }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="progress-fill-blue"
                      />
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Gaze Vector</span>
                    <span className="text-xs font-black text-blue-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      H:{realtimeData.gazeDirection.horizontal.toFixed(2)} V:{realtimeData.gazeDirection.vertical.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)' }}>
                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Head Pose</span>
                    <span className="text-xs font-black text-purple-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Yaw: {realtimeData.headPose.yaw.toFixed(1)}°
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Affective Spectrum */}
            <div className="glass-card p-8" style={{ borderColor: 'rgba(236,72,153,0.15)' }}>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <div className="p-1.5 rounded-lg" style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.2)' }}>
                  <Smile className="w-4 h-4 text-pink-400" />
                </div>
                Affective Spectrum
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {Object.entries(realtimeData.facialExpression).map(([expression, value]) => {
                  const colorMap: Record<string, string> = {
                    happy: '#eab308', sad: '#3b82f6', angry: '#ef4444',
                    surprised: '#a855f7', focused: '#22c55e', neutral: '#94a3b8',
                  };
                  const color = colorMap[expression] || '#94a3b8';
                  return (
                    <div key={expression} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest capitalize">{expression}</span>
                        <span className="text-xs font-black text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {((value as number) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(value as number) * 100}%` }}
                          transition={{ type: 'spring', damping: 20 }}
                          className="h-full rounded-full"
                          style={{ background: color, boxShadow: `0 0 8px ${color}66` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gaze Map */}
      <AnimatePresence>
        {realtimeData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="glass-card p-8"
            style={{ borderColor: 'rgba(239,68,68,0.15)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-3">
                <div className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Target className="w-4 h-4 text-red-400" />
                </div>
                Ocular Trajectory Map
              </h2>
              <div className="flex gap-2">
                <div className="data-chip">X: {(realtimeData.x * 100).toFixed(1)}%</div>
                <div className="data-chip">Y: {(realtimeData.y * 100).toFixed(1)}%</div>
              </div>
            </div>

            <div className="relative w-full h-[380px] rounded-2xl overflow-hidden"
              style={{ background: 'radial-gradient(ellipse at center, #070a1a 0%, #040512 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Grid */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)',
                  backgroundSize: '10% 10%',
                }}
              />

              {/* Crosshair lines */}
              <motion.div
                className="absolute top-0 bottom-0 w-px pointer-events-none"
                animate={{ left: `${realtimeData.x * 100}%` }}
                transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                style={{ background: 'linear-gradient(180deg, transparent, rgba(99,102,241,0.4), transparent)' }}
              />
              <motion.div
                className="absolute left-0 right-0 h-px pointer-events-none"
                animate={{ top: `${realtimeData.y * 100}%` }}
                transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)' }}
              />

              {/* Gaze point */}
              <motion.div
                className="absolute z-10 pointer-events-none"
                animate={{ left: `${realtimeData.x * 100}%`, top: `${realtimeData.y * 100}%` }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                style={{ x: '-50%', y: '-50%' }}
              >
                <div className="relative flex items-center justify-center w-8 h-8">
                  <div className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: 'rgba(99,102,241,0.4)', animationDuration: '1.5s' }}
                  />
                  <div className="absolute w-14 h-14 rounded-full border"
                    style={{ borderColor: 'rgba(99,102,241,0.2)', animation: 'ping 2s ease-in-out infinite' }}
                  />
                  <div className="w-4 h-4 rounded-full border-2 border-white z-10"
                    style={{ background: 'radial-gradient(circle, #818cf8, #6366f1)', boxShadow: '0 0 16px rgba(99,102,241,0.8)' }}
                  />
                </div>
              </motion.div>

              <div className="absolute bottom-4 left-6 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em]">
                Real-time Spatial Projection
              </div>
              <div className="absolute bottom-4 right-6 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em]">
                60Hz Refresh
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── TELEMETRY CARD ─────────────────────────────────── */
interface TelemetryCardProps {
  icon: any;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  suffix?: string;
  isCapitalize?: boolean;
  variants?: any;
}

const colorConfig = {
  blue:   { text: '#60a5fa', bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.2)',  glow: 'rgba(59,130,246,0.25)' },
  green:  { text: '#4ade80', bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.2)',   glow: 'rgba(34,197,94,0.25)' },
  purple: { text: '#c084fc', bg: 'rgba(168,85,247,0.08)',   border: 'rgba(168,85,247,0.2)',  glow: 'rgba(168,85,247,0.25)' },
  orange: { text: '#fb923c', bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.2)',  glow: 'rgba(249,115,22,0.25)' },
  pink:   { text: '#f472b6', bg: 'rgba(236,72,153,0.08)',   border: 'rgba(236,72,153,0.2)',  glow: 'rgba(236,72,153,0.25)' },
};

const TelemetryCard: FC<TelemetryCardProps> = ({ icon: Icon, label, value, color, suffix, isCapitalize, variants }) => {
  const cfg = colorConfig[color];
  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -2, scale: 1.01 }}
      className="glass-card glass-card-hover p-5 flex items-center gap-4 group"
      style={{ borderColor: cfg.border }}
    >
      <div
        className="p-3 rounded-xl flex-shrink-0 transition-all duration-300 group-hover:scale-110"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, boxShadow: `0 0 16px ${cfg.glow}` }}
      >
        <Icon className="w-5 h-5" style={{ color: cfg.text }} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className={`text-xl font-black text-white truncate ${isCapitalize ? 'capitalize' : ''}`}
            style={{ fontFamily: isCapitalize ? 'Inter' : "'JetBrains Mono', monospace" }}
          >
            {value}
          </p>
          {suffix && <span className="text-[9px] font-black text-slate-600 uppercase flex-shrink-0">{suffix}</span>}
        </div>
      </div>
      {/* Right accent bar */}
      <div className="ml-auto w-0.5 h-8 rounded-full flex-shrink-0 opacity-60"
        style={{ background: `linear-gradient(180deg, ${cfg.text}, transparent)` }}
      />
    </motion.div>
  );
};

export default Dashboard;