import { FC, useEffect, useState } from 'react';
import { Play, Pause, Square, Eye, Activity, Clock, Target, Smile, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
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
      if (currentSession?.status === 'active') {
        addEyeTrackingData(data);
      }
    });

    return unsubscribe;
  }, [currentSession, addEyeTrackingData]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (currentSession?.status === 'active') {
      interval = setInterval(() => {
        const duration = Date.now() - currentSession.startTime.getTime();
        setSessionDuration(duration);
      }, 100);
    } else {
      setSessionDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentSession]);

  const handleCameraReady = async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    try {

      const success = await realEyeTrackingService.initialize(video, canvas);
      if (success) {
        setIsInitialized(true);
      } else {
        // Eye tracking initialization failed.
      }
    } catch (error) {
      const err = error as Error;

      console.error('Eye tracking initialization error:', err);
    }
  };

  const handleStartSession = async () => {
    if (!isInitialized) {
      return;
    }
    
    startSession();
    const success = await realEyeTrackingService.start();
    if (!success) {
    }
  };

  const handleStopSession = () => {
    stopSession();
    realEyeTrackingService.stop();
  };

  const handlePauseSession = () => {
    pauseSession();
    realEyeTrackingService.stop();
  };

  const handleResumeSession = async () => {
    resumeSession();
    await realEyeTrackingService.start();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDominantExpression = (expressions: any) => {
    if (!expressions) return 'neutral';
    const entries = Object.entries(expressions) as [string, number][];
    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 relative">
      {/* Subtle Technical Grid Overlay */}
      <div className="absolute inset-0 -z-10 opacity-30 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }} 
      />
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            ANALYTICS <span className="text-gradient">DASHBOARD</span>
          </h1>
          <p className="mt-2 text-gray-400 font-medium">Real-time ocular telemetry and neural response monitoring.</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 glass-card px-4 py-2">
            <div className={`status-dot ${isInitialized ? 'status-dot-active' : 'bg-red-500'}`} />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
              System: {isInitialized ? 'Active' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center space-x-2 glass-card px-4 py-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
              Latency: 12ms
            </span>
          </div>
        </div>
      </motion.div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Camera and Controls */}
        <div className="xl:col-span-2 space-y-8">
          {/* Camera View Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <CameraView 
              onCameraReady={handleCameraReady}
              isActive={currentSession?.status === 'active'}
            />
          </motion.div>

          {/* Session Controls Glass Card */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="show"
            className="glass-card p-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <ShieldCheck className="w-5 h-5 mr-2 text-blue-500" />
                  Mission Control
                </h2>
                <p className="text-sm text-gray-400">Manage recording sessions and data stream.</p>
              </div>

              <div className="flex items-center space-x-4">
                {!currentSession ? (
                  <button onClick={handleStartSession} className="btn-primary flex items-center">
                    <Play className="w-5 h-5 mr-2" />
                    Initialize Session
                  </button>
                ) : (
                  <div className="flex items-center space-x-3">
                    {currentSession.status === 'active' ? (
                      <button onClick={handlePauseSession} className="btn-secondary flex items-center border-yellow-500/30 text-yellow-500">
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </button>
                    ) : (
                      <button onClick={handleResumeSession} className="btn-primary flex items-center">
                        <Play className="w-5 h-5 mr-2" />
                        Resume
                      </button>
                    )}
                    <button onClick={handleStopSession} className="px-6 py-2.5 rounded-xl font-semibold bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600/30 transition-all">
                      <Square className="w-5 h-5 mr-2 inline" />
                      Terminate
                    </button>
                  </div>
                )}
              </div>
            </div>

            {currentSession && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-2xl font-mono font-bold text-white tracking-wider">
                      {formatDuration(sessionDuration)}
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    Recording Live
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className="w-1 h-4 bg-blue-500 animate-[bounce_1s_infinite_0ms]" />
                  <div className="w-1 h-4 bg-blue-500 animate-[bounce_1s_infinite_200ms]" />
                  <div className="w-1 h-4 bg-blue-500 animate-[bounce_1s_infinite_400ms]" />
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Telemetry */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Telemetry Cards */}
          <TelemetryCard 
            icon={Target} 
            label="Gaze Position" 
            value={realtimeData ? `${(realtimeData.x * 100).toFixed(1)}%, ${(realtimeData.y * 100).toFixed(1)}%` : 'WAITING...'} 
            color="blue"
          />
          <TelemetryCard 
            icon={Eye} 
            label="Blink Rate" 
            value={realtimeData?.blinkCount?.toString() || '0'} 
            color="green"
            suffix="count"
          />
          <TelemetryCard 
            icon={Activity} 
            label="Pupil Dilation" 
            value={realtimeData ? realtimeData.pupilSize.toFixed(1) : '0.0'} 
            color="purple"
            suffix="mm"
          />
          <TelemetryCard 
            icon={Clock} 
            label="Fixation" 
            value={realtimeData ? realtimeData.fixationDuration.toFixed(0) : '0'} 
            color="orange"
            suffix="ms"
          />
          <TelemetryCard 
            icon={Smile} 
            label="Neural Affect" 
            value={realtimeData ? getDominantExpression(realtimeData.facialExpression) : 'NEUTRAL'} 
            color="pink"
            isCapitalize
          />
        </motion.div>
      </div>

      {/* Bottom Visualization Section */}
      {realtimeData && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Eye State Detail */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center">
              <Eye className="w-5 h-5 mr-3 text-blue-500" />
              Ocular Mechanics
            </h3>
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Left Eye Aperture</span>
                  <span className="text-sm font-mono text-white">{(realtimeData.eyeOpenness.left * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${realtimeData.eyeOpenness.left * 100}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Right Eye Aperture</span>
                  <span className="text-sm font-mono text-white">{(realtimeData.eyeOpenness.right * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${realtimeData.eyeOpenness.right * 100}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Gaze Vector</span>
                  <span className="text-xs font-mono text-blue-400">
                    H:{realtimeData.gazeDirection.horizontal.toFixed(2)} V:{realtimeData.gazeDirection.vertical.toFixed(2)}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Head Pose</span>
                  <span className="text-xs font-mono text-purple-400">
                    Yaw: {realtimeData.headPose.yaw.toFixed(1)}°
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Affective Map */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center">
              <Smile className="w-5 h-5 mr-3 text-pink-500" />
              Affective Spectrum
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              {Object.entries(realtimeData.facialExpression).map(([expression, value]) => (
                <div key={expression} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest capitalize">{expression}</span>
                    <span className="text-xs font-mono text-white">{((value as number) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(value as number) * 100}%` }}
                      className={`h-full shadow-[0_0_8px_rgba(255,255,255,0.1)] ${
                        expression === 'happy' ? 'bg-yellow-500' :
                        expression === 'sad' ? 'bg-blue-500' :
                        expression === 'angry' ? 'bg-red-500' :
                        expression === 'surprised' ? 'bg-purple-500' :
                        expression === 'focused' ? 'bg-green-500' :
                        'bg-gray-400'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Real-time Gaze Map */}
      {realtimeData && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Target className="w-5 h-5 mr-3 text-red-500" />
              Ocular Trajectory Map
            </h2>
            <div className="flex space-x-2">
              <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">
                X: {(realtimeData.x * 100).toFixed(1)}%
              </div>
              <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">
                Y: {(realtimeData.y * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="relative w-full h-[400px] bg-[#050508] rounded-2xl overflow-hidden border border-white/10 group">
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none opacity-20">
              {Array.from({ length: 100 }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-white/10" />
              ))}
            </div>

            {/* Crosshair */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div 
                className="absolute top-0 bottom-0 w-[1px] bg-blue-500/20"
                animate={{ left: `${realtimeData.x * 100}%` }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
              />
              <motion.div 
                className="absolute left-0 right-0 h-[1px] bg-blue-500/20"
                animate={{ top: `${realtimeData.y * 100}%` }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
              />
            </div>

            {/* The Gaze Point */}
            <motion.div
              className="absolute w-6 h-6 z-10 pointer-events-none"
              animate={{
                left: `${realtimeData.x * 100}%`,
                top: `${realtimeData.y * 100}%`,
              }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              style={{ x: '-50%', y: '-50%' }}
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-50 animate-pulse" />
                <div className="w-3 h-3 bg-blue-400 rounded-full border-2 border-white shadow-lg" />
                <div className="absolute w-12 h-12 border border-blue-500/30 rounded-full animate-[ping_2s_infinite]" />
              </div>
            </motion.div>

            <div className="absolute bottom-4 left-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
              Real-time Spatial Projection
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

interface TelemetryCardProps {
  icon: any;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  suffix?: string;
  isCapitalize?: boolean;
}

const TelemetryCard: FC<TelemetryCardProps> = ({ icon: Icon, label, value, color, suffix, isCapitalize }) => {
  const colors = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    pink: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  };

  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, x: 20 },
        show: { opacity: 1, x: 0 }
      }}
      className="glass-card glass-card-hover p-5 flex items-center group"
    >
      <div className={`p-3 rounded-xl mr-5 transition-transform group-hover:scale-110 duration-300 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline space-x-1">
          <p className={`text-2xl font-black text-white ${isCapitalize ? 'capitalize' : ''}`}>
            {value}
          </p>
          {suffix && <span className="text-[10px] font-bold text-gray-600 uppercase">{suffix}</span>}
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;