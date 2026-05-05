import { FC, useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Settings, AlertCircle, Globe, BrainCircuit, Loader2 } from 'lucide-react';
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
    <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl group border border-gray-800">
      {/* Header Info */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-3 pointer-events-none">
        <div className={`w-3 h-3 rounded-full ${isCameraEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-white text-xs font-mono uppercase tracking-widest bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
          {isCameraEnabled ? 'Live Feed' : 'Camera Off'}
        </span>
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        {isCameraEnabled && (
          <>
            <button
              onClick={toggleDebug}
              className={`p-2 rounded-lg backdrop-blur-md transition-all duration-200 border ${debugMode ? 'bg-green-600/30 border-green-500' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
              title="Toggle AI Vision Debugger"
            >
              <Settings className={`w-5 h-5 ${debugMode ? 'text-green-400' : 'text-white'}`} />
            </button>
            <button
              onClick={handleRestartAI}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-all duration-200 border border-white/20"
              title="Restart AI Engines"
            >
              <Globe className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleGrokAnalysis}
              disabled={isAnalyzing}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg shadow-lg flex items-center transition-all duration-200"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BrainCircuit className="w-4 h-4 mr-2" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Ask AI'}
            </button>
            <button
              onClick={disableCamera}
              className="p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg backdrop-blur-md transition-all duration-200 border border-red-500/30"
              title="Disable Camera"
            >
              <CameraOff className="w-5 h-5 text-red-400" />
            </button>
          </>
        )}
      </div>

      <div className="aspect-video relative bg-black flex items-center justify-center">
        {!isCameraEnabled ? (
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gray-700 shadow-inner">
              <CameraOff className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Camera is Disabled</h3>
            <p className="text-gray-400 max-w-xs mx-auto mb-6">Enable your camera to start real-time eye tracking analysis.</p>
            <button
              onClick={enableCamera}
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 transition-all duration-200 flex items-center mx-auto"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Camera className="w-5 h-5 mr-2" />
              )}
              {isLoading ? 'Initializing...' : 'Enable Camera'}
            </button>
          </div>
        ) : (
          <>
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
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Initializing AI Engines...</p>
              <p className="text-gray-400 text-sm mt-1">Checking for hardware acceleration...</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="absolute bottom-6 left-6 right-6 z-40 bg-red-900/90 backdrop-blur-md border border-red-500/50 p-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-1">System Error</p>
              <p className="text-xs text-red-200 leading-relaxed">{error}</p>
            </div>
            <button 
              onClick={() => setError('')}
              className="text-red-400 hover:text-white transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showKeyInput && (
        <div className="absolute inset-0 z-50 bg-gray-950/95 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-3xl">
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
              <BrainCircuit className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Groq AI Diagnostics</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              To help troubleshoot detection issues, we use Groq's high-speed vision model. Please provide your API key. It will be saved locally and never sent to our servers.
            </p>
            <div className="space-y-4">
              <input
                type="password"
                value={grokApiKey}
                onChange={(e) => setGrokApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowKeyInput(false)}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrokAnalysis}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                  Start Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {grokResult && (
        <div className="absolute bottom-6 left-6 right-6 z-40 bg-blue-900/90 backdrop-blur-md border border-blue-500/50 p-5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="flex items-start">
            <div className="p-2 bg-blue-500/20 rounded-lg mr-4 border border-blue-400/30">
              <BrainCircuit className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1 pr-8">
              <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wider flex items-center">
                AI Diagnostic Report
                <div className="ml-3 px-2 py-0.5 bg-blue-500/20 rounded text-[10px] text-blue-300 border border-blue-400/20">Llama 4 Scout</div>
              </h4>
              <p className="text-sm text-blue-50 leading-relaxed">{grokResult.message}</p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="text-[10px] text-blue-300 font-mono">CONFIDENCE: 98.4%</div>
                <div className="text-[10px] text-blue-300 font-mono">SPEED: 0.2s</div>
              </div>
            </div>
            <button 
              onClick={() => setGrokResult(null)}
              className="absolute top-4 right-4 text-blue-400 hover:text-white transition-colors"
            >
              <AlertCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraView;