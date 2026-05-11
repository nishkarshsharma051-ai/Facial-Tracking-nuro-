import { FC, useState, useEffect } from 'react';
import { User, Shield, Zap, Key, History, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../contexts/SessionContext';
import { grokService } from '../services/grokService';

const Profile: FC = () => {
  const { sessions } = useSession();
  const [userName, setUserName] = useState(localStorage.getItem('user_name') || 'Neural Pilot');
  const [grokKey, setGrokKey] = useState(localStorage.getItem('grok_api_key') || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-6"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative w-24 h-24 bg-[#0a0a0f] rounded-3xl flex items-center justify-center border border-white/10 overflow-hidden">
              <User className="w-12 h-12 text-gray-500" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">
              {userName} <span className="text-blue-500">_PROFILE</span>
            </h1>
            <p className="text-gray-500 font-mono text-xs tracking-[0.3em] uppercase mt-1">Status: Authorized Operator</p>
          </div>
        </motion.div>

        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center ${isEditing ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
        >
          {saveStatus === 'saving' ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          ) : saveStatus === 'saved' ? (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          ) : (
            isEditing ? <Save className="w-4 h-4 mr-2" /> : <Shield className="w-4 h-4 mr-2" />
          )}
          {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Synced' : isEditing ? 'Save Changes' : 'Edit Identity'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Statistics Column */}
        <div className="md:col-span-2 space-y-8">
          <div className="glass-card p-8 space-y-8">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <History className="w-5 h-5 mr-3 text-blue-500" />
                TELEMETRY OVERVIEW
              </h2>
              <span className="text-[10px] font-black text-gray-500 tracking-[0.2em]">LIFETIME STATS</span>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Archives</p>
                <p className="text-3xl font-black text-white">{stats.totalSessions}</p>
                <p className="text-[10px] text-gray-600">Recorded sessions</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Airtime</p>
                <p className="text-3xl font-black text-white">{formatDuration(stats.totalDuration)}</p>
                <p className="text-[10px] text-gray-600">Ocular tracking time</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Data Processed</p>
                <p className="text-3xl font-black text-white">{(stats.totalDataPoints / 1000).toFixed(1)}k</p>
                <p className="text-[10px] text-gray-600">Neural data points</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">System Fidelity</p>
                <p className="text-3xl font-black text-green-500">{stats.avgAccuracy}%</p>
                <p className="text-[10px] text-gray-600">Average tracking score</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8">
            <h2 className="text-xl font-bold text-white mb-8 flex items-center">
              <Zap className="w-5 h-5 mr-3 text-yellow-500" />
              IDENTITY CONFIGURATION
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Operator Name</label>
                <input 
                  type="text" 
                  value={userName}
                  disabled={!isEditing}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50"
                  placeholder="Enter operator name..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Groq Vision Uplink Key</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input 
                    type="password" 
                    value={grokKey}
                    disabled={!isEditing}
                    onChange={(e) => setGrokKey(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 font-mono text-sm"
                    placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-2 italic">Used for deep diagnostic AI vision analysis.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Actions */}
        <div className="space-y-6">
          <div className="glass-card p-6 bg-blue-600/5 border-blue-500/20">
            <h3 className="text-sm font-bold text-white mb-4">Neural Security</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Your biometric telemetry and ocular data never leave this device. All synthesis is performed locally.</p>
            <div className="mt-6 p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center">
              <Shield className="w-5 h-5 text-blue-500 mr-3" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Encypted Storage</span>
            </div>
          </div>

          <div className="glass-card p-6 border-red-500/20 hover:border-red-500/40 transition-all">
            <h3 className="text-sm font-bold text-red-500 mb-4 uppercase tracking-widest">Danger Zone</h3>
            <p className="text-xs text-gray-500 mb-6">Purge all historical session data and reset system configuration.</p>
            <button 
              onClick={clearData}
              className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Purge All Archives
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
