import { FC, useState } from 'react';
import { User, Shield, Zap, Key, History, Trash2, Save, CheckCircle2, Camera, CameraOff, Sparkles, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../contexts/SessionContext';
import { grokService } from '../services/grokService';
import CameraView from './CameraView';

const Profile: FC = () => {
  const { sessions } = useSession();
  const [userName, setUserName] = useState(localStorage.getItem('user_name') || 'Neural Pilot');
  const [grokKey, setGrokKey] = useState(localStorage.getItem('grok_api_key') || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showLiveFeed, setShowLiveFeed] = useState(false);

  const stats = {
    totalSessions: sessions.length,
    totalDuration: sessions.reduce((acc, s) => acc + s.duration, 0),
    totalDataPoints: sessions.reduce((acc, s) => acc + s.data.length, 0),
    avgAccuracy: 98.4 // Mock or calculated accuracy
  };

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
  };

  const handleSave = () => {
    setSaveStatus('saving');
    localStorage.setItem('user_name', userName);
    if (grokKey) {
      localStorage.setItem('grok_api_key', grokKey);
      grokService.setApiKey(grokKey);
    }
    
    setTimeout(() => {
      setSaveStatus('saved');
      setIsEditing(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  const clearData = () => {
    if (window.confirm('Are you sure you want to purge all local telemetry archives? This cannot be undone.')) {
      localStorage.removeItem('eyetrack_sessions_guest');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-8"
        >
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-[2rem] blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <div className="relative w-28 h-28 bg-[#0a0a0f] rounded-[2rem] flex items-center justify-center border border-white/10 overflow-hidden shadow-2xl">
              <img 
                src="/avatar.png" 
                alt="Profile Avatar" 
                className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                }}
              />
              <div className="fallback-icon hidden">
                <User className="w-14 h-14 text-gray-500" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-40" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 bg-blue-600 rounded-xl border-4 border-[#040512] shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                {userName} <span className="text-gradient">_OPERATOR</span>
              </h1>
              <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded-md text-[9px] font-black text-blue-400 uppercase tracking-widest">Lv. 07</div>
            </div>
            <p className="text-gray-500 font-mono text-[10px] tracking-[0.4em] uppercase flex items-center gap-2">
              <Activity className="w-3 h-3 text-green-500" />
              Status: <span className="text-green-500 font-black">Authorized Pipeline Access</span>
            </p>
          </div>
        </motion.div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowLiveFeed(!showLiveFeed)}
            className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center border ${showLiveFeed ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
          >
            {showLiveFeed ? <CameraOff className="w-3.5 h-3.5 mr-2" /> : <Camera className="w-3.5 h-3.5 mr-2" />}
            {showLiveFeed ? 'Terminate Link' : 'Live Feed'}
          </button>
          
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center shadow-lg ${isEditing ? 'bg-white text-black shadow-white/10' : 'bg-blue-600 text-white shadow-blue-500/20'}`}
          >
            {saveStatus === 'saving' ? (
              <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
            ) : (
              isEditing ? <Save className="w-3.5 h-3.5 mr-2" /> : <Shield className="w-3.5 h-3.5 mr-2" />
            )}
            {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Synced' : isEditing ? 'Save Identity' : 'Edit Identity'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showLiveFeed && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-4 border-indigo-500/30">
              <div className="flex items-center justify-between mb-4 px-4">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Optical Telemetry Preview</span>
                <div className="flex items-center gap-1.5">
                  <div className="status-dot status-dot-active" />
                  <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Secured Stream</span>
                </div>
              </div>
              <CameraView onCameraReady={() => {}} isActive={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Statistics Column */}
        <div className="md:col-span-2 space-y-8">
          <div className="glass-card p-10 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <History className="w-48 h-48 text-white" />
            </div>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-8 relative z-10">
              <h2 className="text-xl font-bold text-white flex items-center">
                <History className="w-6 h-6 mr-4 text-blue-500" />
                TELEMETRY ARCHIVE SUMMARY
              </h2>
              <span className="text-[10px] font-black text-gray-500 tracking-[0.3em]">LIFETIME_METRICS</span>
            </div>

            <div className="grid grid-cols-2 gap-12 relative z-10">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Total Archives</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black text-white tracking-tighter" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.totalSessions}</p>
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Logs</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Active Airtime</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black text-white tracking-tighter" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatDuration(stats.totalDuration)}</p>
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Total</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Data Processed</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black text-white tracking-tighter" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{(stats.totalDataPoints / 1000).toFixed(1)}k</p>
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Points</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">System Fidelity</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black text-green-500 tracking-tighter" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.avgAccuracy}%</p>
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Avg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-10">
            <h2 className="text-xl font-bold text-white mb-10 flex items-center">
              <Zap className="w-6 h-6 mr-4 text-yellow-500" />
              IDENTITY CONFIGURATION
            </h2>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Operator Alias</label>
                <input 
                  type="text" 
                  value={userName}
                  disabled={!isEditing}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 font-bold tracking-tight"
                  placeholder="Enter operator name..."
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Groq Vision Uplink Key</label>
                <div className="relative">
                  <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                  <input 
                    type="password" 
                    value={grokKey}
                    disabled={!isEditing}
                    onChange={(e) => setGrokKey(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 py-5 text-white focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 font-mono text-sm tracking-widest"
                    placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-3 italic ml-1">Used for deep diagnostic AI vision analysis through Groq Cloud.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Actions */}
        <div className="space-y-6">
          <div className="glass-card p-8 bg-blue-600/5 border-blue-500/20">
            <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest">Neural Security</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">Your biometric telemetry and ocular data never leave this device. All synthesis is performed locally.</p>
            <div className="mt-8 p-5 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center group-hover:bg-blue-600/20 transition-all">
              <Shield className="w-6 h-6 text-blue-500 mr-4" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Encrypted Storage</span>
            </div>
          </div>

          <div className="glass-card p-8 border-red-500/20 hover:border-red-500/40 transition-all group">
            <h3 className="text-sm font-black text-red-500 mb-4 uppercase tracking-[0.2em]">Danger Zone</h3>
            <p className="text-xs text-gray-500 mb-8 leading-relaxed font-medium">Purge all historical session data and reset system configuration to defaults.</p>
            <button 
              onClick={clearData}
              className="w-full py-4 bg-red-600/5 hover:bg-red-600/20 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center group-hover:border-red-500/40"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Purge All Archives
            </button>
          </div>

          <div className="glass-card p-8 border-white/5 opacity-50">
            <h3 className="text-[10px] font-black text-gray-500 mb-4 uppercase tracking-[0.2em]">System Version</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">v1.4.2-PRO</span>
              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Build 2026.05</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

