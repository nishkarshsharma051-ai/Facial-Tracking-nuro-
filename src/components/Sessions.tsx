import { FC } from 'react';
import { Calendar, Clock, Eye, Play, History } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

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

const Sessions: FC = () => {
  const { sessions, currentSession } = useSession();

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const allSessions = currentSession ? [currentSession, ...sessions] : sessions;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h1 className="text-4xl font-black text-white tracking-tight flex items-center">
          <History className="w-10 h-10 mr-4 text-purple-500" />
          SESSION <span className="text-gradient">ARCHIVES</span>
        </h1>
        <p className="mt-2 text-gray-400 font-medium">Historical ocular telemetry data and session summaries.</p>
      </motion.div>

      {/* Sessions Stats */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <StatCard 
          icon={Eye} 
          label="Total Sessions" 
          value={sessions.length.toString()} 
          color="blue"
        />
        <StatCard 
          icon={Play} 
          label="Active Stream" 
          value={currentSession ? '1' : '0'} 
          color="green"
        />
        <StatCard 
          icon={Clock} 
          label="Total Airtime" 
          value={formatDuration(sessions.reduce((total, session) => total + session.duration, 0))} 
          color="purple"
        />
        <StatCard 
          icon={Calendar} 
          label="Weekly Volume" 
          value={sessions.filter(session => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return session.startTime >= weekAgo;
          }).length.toString()} 
          color="orange"
        />
      </motion.div>

      {/* Sessions List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-white/5 bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center">
            <History className="w-5 h-5 mr-3 text-gray-400" />
            Recent Telemetry Logs
          </h2>
        </div>
        
        {allSessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
              <Eye className="h-10 w-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white">No session data found</h3>
            <p className="mt-2 text-gray-500 font-medium">Initialize your first tracking session to populate the archives.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {allSessions.map((session) => (
              <motion.div 
                key={session.id} 
                variants={itemVariants}
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                className="px-8 py-6 transition-colors duration-150 group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className={`w-4 h-4 rounded-full ${
                        session.status === 'active' 
                          ? 'status-dot-active' 
                          : session.status === 'paused' 
                          ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' 
                          : 'bg-gray-700'
                      }`} />
                      {session.status === 'active' && (
                        <div className="absolute inset-0 animate-ping rounded-full bg-green-500/30 scale-150" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                          Session-{session.id.slice(0, 8).toUpperCase()}
                        </h3>
                        {session.status !== 'completed' && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                            session.status === 'active' 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                              : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          }`}>
                            {session.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs font-medium text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1.5" />
                          {format(session.startTime, 'MMM d, yyyy • HH:mm')}
                        </span>
                        {session.endTime && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1.5" />
                            {format(session.endTime, 'HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:flex items-center md:space-x-12">
                    <div className="text-right md:text-left">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Duration</p>
                      <p className="text-sm font-mono font-bold text-white">{formatDuration(session.duration)}</p>
                    </div>
                    <div className="text-right md:text-left">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Data Points</p>
                      <p className="text-sm font-mono font-bold text-blue-400">{session.data.length.toLocaleString()}</p>
                    </div>
                    {session.data.length > 0 && (
                      <div className="hidden md:block">
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Avg Fixation</p>
                        <p className="text-sm font-mono font-bold text-purple-400">
                          {(session.data.reduce((sum, d) => sum + d.fixationDuration, 0) / session.data.length).toFixed(0)}ms
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

interface StatCardProps {
  icon: any;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const StatCard: FC<StatCardProps> = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  };

  return (
    <motion.div 
      variants={itemVariants}
      className="glass-card p-6 flex items-center"
    >
      <div className={`p-3 rounded-xl mr-5 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
    </motion.div>
  );
};

export default Sessions;