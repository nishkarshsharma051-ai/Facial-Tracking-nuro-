import { FC, useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Settings, AlertCircle, Globe, BrainCircuit, Loader2 } from 'lucide-react';
import { realEyeTrackingService } from '../services/realEyeTrackingService';
import { grokService, GrokAnalysisResult } from '../services/grokService';

interface CameraViewProps {
  onCameraReady: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
  isActive: boolean;
}

const CameraView: FC<CameraViewProps> = ({ onCameraReady, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [browserSupport, setBrowserSupport] = useState<string>('');
  
  // Grok state
  const [grokApiKey, setGrokApiKey] = useState(localStorage.getItem('grok_api_key') || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [grokResult, setGrokResult] = useState<GrokAnalysisResult | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Automatically sync if service has a hardcoded key
  useEffect(() => {
    if (grokService.hasKey() && !grokApiKey) {
      setGrokApiKey('Configured'); // Visual indicator
    }
  }, []);

  useEffect(() => {
    checkBrowserSupport();
    if (videoRef.current && canvasRef.current && isCameraEnabled) {
      onCameraReady(videoRef.current, canvasRef.current);
    }
  }, [isCameraEnabled, onCameraReady]);

  const checkBrowserSupport = () => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    
    if (isChrome) setBrowserSupport('Chrome - Excellent support');
    else if (isFirefox) setBrowserSupport('Firefox - Good support');
    else if (isSafari) setBrowserSupport('Safari - Limited support');
    else if (isEdge) setBrowserSupport('Edge - Good support');
    else setBrowserSupport('Unknown browser - May have issues');
  };

  const enableCamera = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Enhanced browser compatibility check
      let getUserMedia = null;
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      } else if ((navigator as any).getUserMedia) {
        getUserMedia = (navigator as any).getUserMedia.bind(navigator);
      } else if ((navigator as any).webkitGetUserMedia) {
        getUserMedia = (navigator as any).webkitGetUserMedia.bind(navigator);
      } else if ((navigator as any).mozGetUserMedia) {
        getUserMedia = (navigator as any).mozGetUserMedia.bind(navigator);
      } else if ((navigator as any).msGetUserMedia) {
        getUserMedia = (navigator as any).msGetUserMedia.bind(navigator);
      }
      
      if (!getUserMedia) {
        throw new Error('Camera access is not supported in this browser. Please update your browser or try Chrome/Firefox.');
      }

      // Enhanced camera constraints for better compatibility
      const constraints = {
        video: {
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          facingMode: 'user',
          frameRate: { ideal: 15, min: 10, max: 30 }
        } as MediaTrackConstraints,
        audio: false
      };

      // Try modern API first, then fallback to legacy
      let stream: MediaStream;
      try {
        stream = await getUserMedia(constraints);
      } catch (modernError) {
        // Fallback with simpler constraints
        const simpleConstraints = {
          video: true,
          audio: false
        };
        stream = await getUserMedia(simpleConstraints);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video metadata to load
        const videoLoadPromise = new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }

          const video = videoRef.current;
          
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = (_e: Event) => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Failed to load video'));
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Video loading timeout'));
          }, 10000);
        });

        await videoLoadPromise;
        
        // Start video playback
        await videoRef.current.play();
        
        setIsCameraEnabled(true);
        setError('');
        console.log('Camera enabled successfully');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      const error = err as Error;
      
      // Stop any streams that might have been created
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      if (error.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions in your browser settings and refresh the page.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotSupportedError') {
        setError('Camera is not supported in this browser. Please try Chrome, Firefox, or Safari.');
      } else if (error.name === 'NotReadableError') {
        setError('Camera is already in use by another application. Please close other apps using the camera.');
      } else if (error.name === 'OverconstrainedError') {
        setError('Camera constraints not supported. Trying with basic settings...');
        // Retry with basic constraints
        setTimeout(() => enableCamera(), 1000);
        return;
      } else {
        setError(`Camera error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disableCamera = () => {
    // Stop all media tracks
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Stop the eye tracking service (imported service handles its own state)
    realEyeTrackingService.stop();
    
    setIsCameraEnabled(false);
    setError('');
    console.log('Camera disabled successfully');
  };

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
      
      // Only set if user provided a new key, otherwise use the service default
      if (grokApiKey && grokApiKey !== 'Configured') {
        grokService.setApiKey(grokApiKey);
        localStorage.setItem('grok_api_key', grokApiKey);
      }
      
      const result = await grokService.analyzeSnapshot(snapshot);
      setGrokResult(result);
      setShowKeyInput(false);
    } catch (err) {
      console.error('Grok analysis failed:', err);
      setError(`Grok analysis failed: ${(err as Error).message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Camera className="w-5 h-5 mr-2 text-blue-600" />
          Camera Feed
        </h2>
        <div className="flex items-center space-x-2">
          {isCameraEnabled && (
            <button
              onClick={handleGrokAnalysis}
              disabled={isAnalyzing}
              className="inline-flex items-center px-3 py-2 border border-purple-200 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors duration-200 shadow-sm"
              title="Analyze issues with Grok AI"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BrainCircuit className="w-4 h-4 mr-2" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Ask Grok AI'}
            </button>
          )}
          {isCameraEnabled ? (
            <button
              onClick={disableCamera}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-200"
            >
              <CameraOff className="w-4 h-4 mr-2" />
              Disable
            </button>
          ) : (
            <button
              onClick={enableCamera}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isLoading ? 'Enabling...' : 'Enable Camera'}
            </button>
          )}
        </div>
      </div>

      {showKeyInput && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="text-sm font-medium text-purple-900 mb-2">Grok API Key Required</h4>
          <p className="text-xs text-purple-700 mb-3">To analyze detection issues, please provide your xAI API key.</p>
          <div className="flex space-x-2">
            <input
              type="password"
              value={grokApiKey}
              onChange={(e) => setGrokApiKey(e.target.value)}
              placeholder="xai-..."
              className="flex-1 px-3 py-2 border border-purple-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleGrokAnalysis}
              className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
            >
              Analyze
            </button>
          </div>
        </div>
      )}

      {grokResult && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start">
            <BrainCircuit className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-900">Grok Analysis</h4>
              <p className="text-sm text-green-800 mt-1">{grokResult.message}</p>
              <div className="mt-2 p-2 bg-white bg-opacity-50 rounded border border-green-100">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Advice:</p>
                <p className="text-sm text-green-900">{grokResult.advice}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Browser Support Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center">
          <Globe className="w-5 h-5 text-blue-600 mr-2" />
          <span className="text-sm text-blue-800">{browserSupport}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Camera Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Video Feed */}
          <div className="relative">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Live Video</h3>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
                style={{ transform: 'scaleX(-1)' }} // Mirror the video
              />
              {!isCameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">
                      {isLoading ? 'Initializing camera...' : 'Camera not enabled'}
                    </p>
                  </div>
                </div>
              )}
              {isActive && isCameraEnabled && (
                <div className="absolute top-2 left-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-white text-xs font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                      TRACKING
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Eye Tracking Overlay */}
          <div className="relative">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Eye Tracking Analysis</h3>
            <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="w-full h-full object-cover"
              />
              {!isCameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Settings className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Eye tracking overlay</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isCameraEnabled && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Position your face in the camera view for optimal tracking. 
              The red dot shows your estimated gaze position, and green bars indicate eye openness.
            </p>
          </div>
        )}

        {!isCameraEnabled && !error && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Camera className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Camera Setup Required</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Click "Enable Camera" to start eye tracking. Works in all modern browsers including Chrome, Firefox, Safari, and Edge.
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Note: Some browsers may require HTTPS for camera access. If you encounter issues, try accessing via HTTPS.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraView;