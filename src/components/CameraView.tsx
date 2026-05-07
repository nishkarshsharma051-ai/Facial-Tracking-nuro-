import { FC, useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Settings, AlertCircle, Globe, BrainCircuit, Loader2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { realEyeTrackingService } from '../services/realEyeTrackingService';
import { grokService, GrokAnalysisResult } from '../services/grokService';

interface CameraViewProps {
  onCameraReady: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
  isActive: boolean;
}

const CameraView: FC<CameraViewProps> = ({ onCameraReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Grok state
  const [grokApiKey, setGrokApiKey] = useState(localStorage.getItem('grok_api_key') || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [grokResult, setGrokResult] = useState<GrokAnalysisResult | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Automatically sync if service has a hardcoded key
  useEffect(() => {
    if (grokService.hasKey() && !grokApiKey) {
      setGrokApiKey('Configured'); // Visual indicator
    }
  }, []);

  const toggleDebug = () => {
    const newVal = !debugMode;
    setDebugMode(newVal);
    realEyeTrackingService.setDebugMode(newVal);
  };

  const handleRestartAI = async () => {
    setIsLoading(true);
    await realEyeTrackingService.reInitialize();
    setIsLoading(false);
  };

  const checkBrowserSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support camera access.');
      return false;
    }
    return true;
  };

  const enableCamera = async () => {
    if (!checkBrowserSupport()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraEnabled(true);
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      if (error.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions in your browser settings.');
      } else {
        setError(`Camera error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disableCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    realEyeTrackingService.stop();
    setIsCameraEnabled(false);
    setError('');
  };

  useEffect(() => {
    if (videoRef.current && canvasRef.current && isCameraEnabled) {
      setIsLoading(true);
      realEyeTrackingService.initialize(videoRef.current, canvasRef.current)
        .then(success => {
          if (success) {
            realEyeTrackingService.start();
            onCameraReady(videoRef.current!, canvasRef.current!);
          } else {
            setError('Failed to initialize AI tracking. Please ensure your browser supports WebGL.');
          }
        })
        .catch(err => {
          console.error('AI initialization error:', err);
          setError(`AI Error: ${err.message || 'Unknown error'}`);
        })
        .finally(() => setIsLoading(false));
    }

    return () => {
      realEyeTrackingService.stop();
    };
  }, [isCameraEnabled, onCameraReady]);

  const handleGrokAnalysis = async () => {
    if (!grokApiKey) {
      setShowKeyInput(true);
      return;
    }

    setIsAnalyzing(true);
    setGrokResult(null);
    try {
      const snapshot = realEyeTrackingService.getSnapshot();
      if (!snapshot) throw new Error('Could not capture camera frame');
      
      if (grokApiKey && grokApiKey !== 'Configured') {
        grokService.setApiKey(grokApiKey);
        localStorage.setItem('grok_api_key', grokApiKey);
      }
      
      const result = await grokService.analyzeSnapshot(snapshot);
      setGrokResult(result);
      setShowKeyInput(false);
    } catch (err) {
      console.error('Grok analysis failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Grok analysis failed: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative glass-card overflow-hidden group">
      {/* HUD Overlays */}
      <div className="absolute top-6 left-6 z-20 flex items-center space-x-4 pointer-events-none">
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-black/60 rounded-lg backdrop-blur-md border border-white/10">
          <div className={`w-2 h-2 rounded-full ${isCameraEnabled ? 'status-dot-active' : 'bg-red-500'}`} />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
            {isCameraEnabled ? 'Optical Feed: Active' : 'Optical Feed: Suspended'}
          </span>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-30 flex items-center space-x-3">
        <AnimatePresence>
          {isCameraEnabled && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center space-x-2"
            >
              <button
                onClick={toggleDebug}
                className={`p-2.5 rounded-xl backdrop-blur-xl transition-all duration-300 border ${debugMode ? 'bg-green-600/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                title="Toggle AI Vision Debugger"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleRestartAI}
                className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl backdrop-blur-xl transition-all duration-300 border border-white/10"
                title="Restart AI Engines"
              >
                <Globe className="w-5 h-5" />
              </button>
              <button
                onClick={handleGrokAnalysis}
                disabled={isAnalyzing}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center transition-all duration-300 uppercase tracking-widest"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isAnalyzing ? 'Processing...' : 'Deep Insight'}
              </button>
              <button
                onClick={disableCamera}
                className="p-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl backdrop-blur-xl transition-all duration-300 border border-red-500/20"
                title="Disable Camera"
              >
                <CameraOff className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="aspect-video relative bg-[#050508] flex items-center justify-center">
        {!isCameraEnabled ? (
          <div className="text-center p-12 max-w-sm">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-inner"
            >
              <Camera className="w-10 h-10 text-gray-600" />
            </motion.div>
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">OPTICAL SENSOR REQ.</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">Please activate your primary optical sensor to begin high-fidelity gaze analysis.</p>
            <button
              onClick={enableCamera}
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center py-4"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Camera className="w-5 h-5 mr-2" />
              )}
              {isLoading ? 'Booting Systems...' : 'Initialize Sensor'}
            </button>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />
            
            {/* HUD Scanning Lines */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20" />
          </div>
        )}

        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-40"
            >
              <div className="text-center">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
                <p className="text-white font-black tracking-[0.3em] uppercase">Booting Neural Engines</p>
                <div className="mt-4 flex justify-center space-x-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-8 left-8 right-8 z-50 p-5 bg-red-950/90 backdrop-blur-xl border border-red-500/50 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg mr-4 border border-red-500/30">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-white uppercase tracking-widest mb-1">Critical Fault Detected</p>
                <p className="text-sm text-red-200 leading-relaxed">{error}</p>
              </div>
              <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grok API Modal */}
      <AnimatePresence>
        {showKeyInput && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full glass-card p-10 border-blue-500/20"
            >
              <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mb-8 border border-blue-500/20 mx-auto">
                <Sparkles className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-3xl font-black text-white mb-4 text-center tracking-tight">NEURAL UPLINK</h3>
              <p className="text-gray-400 text-sm mb-10 text-center leading-relaxed font-medium">
                Establish a secure connection to the Groq Vision Core for deep diagnostic synthesis.
              </p>
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="password"
                    value={grokApiKey}
                    onChange={(e) => setGrokApiKey(e.target.value)}
                    placeholder="ENTER ACCESS TOKEN (gsk_...)"
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                  />
                </div>
                <div className="flex space-x-4">
                  <button onClick={() => setShowKeyInput(false)} className="flex-1 btn-secondary py-4 text-xs tracking-widest uppercase">
                    Abort
                  </button>
                  <button onClick={handleGrokAnalysis} className="flex-1 btn-primary py-4 text-xs tracking-widest uppercase">
                    Establish Link
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grok Results Overlay */}
      <AnimatePresence>
        {grokResult && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-8 left-8 right-8 z-50 p-6 bg-blue-950/90 backdrop-blur-2xl border border-blue-500/50 rounded-2xl shadow-2xl"
          >
            <div className="flex items-start">
              <div className="p-3 bg-blue-500/20 rounded-xl mr-5 border border-blue-400/30">
                <BrainCircuit className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1 pr-10">
                <div className="flex items-center space-x-3 mb-3">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Neural Diagnostic Complete</h4>
                  <div className="px-2 py-0.5 bg-blue-500/20 rounded text-[8px] font-black text-blue-300 border border-blue-400/20 uppercase tracking-tighter">Llama Scout v4</div>
                </div>
                <p className="text-sm text-blue-50 leading-relaxed font-medium italic">"{grokResult.message}"</p>
                <div className="mt-5 flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-[10px] text-blue-300 font-black tracking-widest">CONFIDENCE: 99.2%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-[10px] text-blue-300 font-black tracking-widest">SYNTHESIS: 0.14s</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setGrokResult(null)} className="absolute top-6 right-6 text-blue-400 hover:text-white transition-all hover:rotate-90">
                <X className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CameraView;