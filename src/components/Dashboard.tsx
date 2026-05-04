import { FC, useEffect, useState } from 'react';
import { Play, Pause, Square, Eye, Activity, Clock, Target, Smile, Camera, BrainCircuit } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { realEyeTrackingService, RealEyeTrackingData } from '../services/realEyeTrackingService';
import CameraView from './CameraView';

const Dashboard: FC = () => {
  const { currentSession, startSession, stopSession, pauseSession, resumeSession, addEyeTrackingData } = useSession();
  const [realtimeData, setRealtimeData] = useState<RealEyeTrackingData | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string>('');

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
      setInitError('');
      const success = await realEyeTrackingService.initialize(video, canvas);
      if (success) {
        setIsInitialized(true);
      } else {
        setInitError('Eye tracking initialization failed. Please try enabling the camera again.');
      }
    } catch (error) {
      const err = error as Error;
      setInitError(`Setup error: ${err.message}`);
      console.error('Eye tracking initialization error:', err);
    }
  };

  const handleStartSession = async () => {
    if (!isInitialized) {
      setInitError('Please enable the camera first before starting a session.');
      return;
    }
    
    startSession();
    const success = await realEyeTrackingService.start();
    if (!success) {
      setInitError('Failed to start eye tracking. Please check camera permissions.');
    }
  };

  const handleStopSession = () => {
    stopSession();
    realEyeTrackingService.stop();
    // Note: Camera will remain enabled for potential future sessions
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


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Monitor and control your eye tracking sessions</p>
      </div>

      {/* Camera View */}
      <div className="mb-8">
        <CameraView 
          onCameraReady={handleCameraReady}
          isActive={currentSession?.status === 'active'}
        />
      </div>

      {initError && (
        <div className="mb-8 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
          <div className="flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            <span>{initError}</span>
          </div>
        </div>
      )}

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="w-5 h-5 text-blue-500 mr-2" />
              <span className="font-medium text-gray-700">Primary AI (MediaPipe)</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${isInitialized ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {isInitialized ? 'LOADED' : 'INITIALIZING...'}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BrainCircuit className="w-5 h-5 text-orange-500 mr-2" />
              <span className="font-medium text-gray-700">Secondary AI (FaceAPI)</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${isInitialized ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              READY
            </span>
          </div>
        </div>
      </div>

      {/* Session Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Controls</h2>
        <div className="flex items-center space-x-4">
          {!currentSession ? (
            <button
              onClick={handleStartSession}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Session
            </button>
          ) : (
            <>
              {currentSession.status === 'active' ? (
                <button
                  onClick={handlePauseSession}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 transition-colors duration-200 shadow-sm"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResumeSession}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-200 shadow-sm"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </button>
              )}
              <button
                onClick={handleStopSession}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-200 shadow-sm"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop Session
              </button>
            </>
          )}
          
          {currentSession && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Duration: {formatDuration(sessionDuration)}</span>
              <span className={`ml-4 ${isInitialized ? 'text-green-600' : 'text-orange-600'}`}>
                • {isInitialized ? 'Tracking active' : 'Camera setup required'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Gaze Position</p>
              <p className="text-2xl font-semibold text-gray-900">
                {realtimeData ? `${(realtimeData.x * 100).toFixed(1)}%, ${(realtimeData.y * 100).toFixed(1)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Eye className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Blink Count</p>
              <p className="text-2xl font-semibold text-gray-900">
                {realtimeData?.blinkCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pupil Size</p>
              <p className="text-2xl font-semibold text-gray-900">
                {realtimeData ? `${realtimeData.pupilSize.toFixed(1)}mm` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Fixation Time</p>
              <p className="text-2xl font-semibold text-gray-900">
                {realtimeData ? `${realtimeData.fixationDuration.toFixed(0)}ms` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Smile className="w-8 h-8 text-pink-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Expression</p>
              <p className="text-2xl font-semibold text-gray-900 capitalize">
                {realtimeData ? getDominantExpression(realtimeData.facialExpression) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Real-time Data */}
      {realtimeData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Eye Tracking Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Eye Tracking Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Left Eye Openness:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${realtimeData.eyeOpenness.left * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{(realtimeData.eyeOpenness.left * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Right Eye Openness:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${realtimeData.eyeOpenness.right * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{(realtimeData.eyeOpenness.right * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Gaze Direction:</span>
                <span className="text-sm font-medium">
                  H: {realtimeData.gazeDirection.horizontal.toFixed(2)}, V: {realtimeData.gazeDirection.vertical.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Head Pose:</span>
                <span className="text-sm font-medium">
                  Yaw: {realtimeData.headPose.yaw.toFixed(2)}°
                </span>
              </div>
            </div>
          </div>

          {/* Facial Expression Analysis */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Facial Expression Analysis</h2>
            <div className="space-y-3">
              {Object.entries(realtimeData.facialExpression).map(([expression, value]) => (
                <div key={expression} className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 capitalize">{expression}:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-200 ${
                          expression === 'happy' ? 'bg-yellow-500' :
                          expression === 'sad' ? 'bg-blue-500' :
                          expression === 'angry' ? 'bg-red-500' :
                          expression === 'surprised' ? 'bg-purple-500' :
                          expression === 'focused' ? 'bg-green-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${(value as number) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{((value as number) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Eye Tracking Visualization */}
      {realtimeData && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Real-time Gaze Tracking</h2>
          <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
            <div
              className="absolute w-4 h-4 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 shadow-lg"
              style={{
                left: `${realtimeData.x * 100}%`,
                top: `${realtimeData.y * 100}%`,
              }}
            />
            <div className="absolute top-2 left-2 text-xs text-gray-500">
              Gaze Position: ({(realtimeData.x * 100).toFixed(1)}%, {(realtimeData.y * 100).toFixed(1)}%)
            </div>
            <div className="absolute top-2 right-2 text-xs text-gray-500">
              Expression: {getDominantExpression(realtimeData.facialExpression)}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            The red dot shows your current gaze position in real-time based on camera-detected eye movements.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;