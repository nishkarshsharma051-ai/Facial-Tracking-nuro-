import { FC } from 'react';
import { Calendar, Clock, Eye, Play, History, TrendingUp, Database } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } }
};

const Sessions: FC = () => {
  const { sessions, currentSession } = useSession();

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const allSessions = currentSession ? [currentSession, ...sessions] : sessions;
  const totalDuration = sessions.reduce((t, s) => t + s.duration, 0);
  const weekSessions = sessions.filter(s => {
    const w = new Date(); w.setDate(w.getDate() - 7); return s.startTime >= w;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, #a855f7, #6366f1)' }} />
          <span className="text-xs font-black text-purple-400 uppercase tracking-[0.25em]">Telemetry Archive</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
          SESSION <span className="text-gradient">ARCHIVES</span>
        </h1>
        <p className="mt-2 text-slate-400 text-sm font-medium">Historical ocular telemetry data and session summaries.</p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard icon={Eye}       label="Total Sessions"  value={sessions.length.toString()}     color="blue"   variants={itemVariants} />
        <StatCard icon={Play}      label="Active Stream"   value={currentSession ? '1' : '0'}    color="green"  variants={itemVariants} />
        <StatCard icon={Clock}     label="Total Airtime"   value={formatDuration(totalDuration)}  color="purple" variants={itemVariants} />
        <StatCard icon={Calendar}  label="This Week"       value={weekSessions.length.toString()} color="orange" variants={itemVariants} />
      </motion.div>

      {/* Sessions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden"
        style={{ borderColor: 'rgba(99,102,241,0.15)' }}
      >
        {/* Table Header */}
        <div className="px-8 py-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.04))', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2 className="text-base font-bold text-white flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <History className="w-4 h-4 text-indigo-400" />
            </div>
            Recent Telemetry Logs
          </h2>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {allSessions.length} Record{allSessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {allSessions.length === 0 ? (
          <div className="text-center py-24">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Database className="w-10 h-10 text-slate-600" />
            </motion.div>
            <h3 className="text-xl font-bold text-white">No Records Found</h3>
            <p className="mt-2 text-slate-500 text-sm font-medium max-w-xs mx-auto">
              Initialize your first tracking session from the Dashboard to populate the archives.
            </p>
          </div>
        ) : (
          <div>
            {allSessions.map((session, idx) => {
              const isActive = session.status === 'active';
              const isPaused = session.status === 'paused';
              const avgFixation = session.data.length > 0
                ? (session.data.reduce((s, d) => s + d.fixationDuration, 0) / session.data.length).toFixed(0)
                : '—';

              return (
                <motion.div
                  key={session.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: idx * 0.05 }}
                  className="px-8 py-5 group transition-all duration-200"
                  style={{ borderBottom: idx < allSessions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: ID + Status + Dates */}
                    <div className="flex items-center gap-5">
                      {/* Status indicator */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: isActive ? 'rgba(34,197,94,0.1)' : isPaused ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : isPaused ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >
                          <div className={`w-3 h-3 rounded-full ${isActive ? 'status-dot-active' : ''}`}
                            style={
                              isPaused ? { background: '#fbbf24', boxShadow: '0 0 8px rgba(234,179,8,0.5)' } :
                              !isActive ? { background: '#334155' } : {}
                            }
                          />
                        </div>
                        {isActive && (
                          <div className="absolute inset-0 animate-ping rounded-xl"
                            style={{ background: 'rgba(34,197,94,0.15)', animationDuration: '2s' }}
                          />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            SES-{session.id.slice(0, 8).toUpperCase()}
                          </h3>
                          {session.status !== 'completed' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                              style={{
                                background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                                border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`,
                                color: isActive ? '#4ade80' : '#fbbf24',
                              }}
                            >
                              {session.status}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-medium text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(session.startTime, 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(session.startTime, 'HH:mm')}
                            {session.endTime && ` → ${format(session.endTime, 'HH:mm')}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Metrics */}
                    <div className="flex items-center gap-6 md:gap-10 ml-15">
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Duration</p>
                        <p className="text-sm font-black text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatDuration(session.duration)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Data Points</p>
                        <p className="text-sm font-black text-indigo-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {session.data.length.toLocaleString()}
                        </p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Avg Fixation</p>
                        <p className="text-sm font-black text-purple-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {avgFixation}{avgFixation !== '—' ? 'ms' : ''}
                        </p>
                      </div>
                      <div className="hidden lg:block">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Quality</p>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                          <p className="text-sm font-black text-green-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {session.data.length > 10 ? 'High' : session.data.length > 0 ? 'Med' : 'Low'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

/* ─── STAT CARD ─────────────────────────────────── */
interface StatCardProps {
  icon: any;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  variants?: any;
}

const colorConfig = {
  blue:   { text: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  glow: 'rgba(59,130,246,0.2)' },
  green:  { text: '#4ade80', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   glow: 'rgba(34,197,94,0.2)' },
  purple: { text: '#c084fc', bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.2)',  glow: 'rgba(168,85,247,0.2)' },
  orange: { text: '#fb923c', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  glow: 'rgba(249,115,22,0.2)' },
};

const StatCard: FC<StatCardProps> = ({ icon: Icon, label, value, color, variants }) => {
  const cfg = colorConfig[color];
  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -3, scale: 1.02 }}
      className="glass-card p-6 group transition-all duration-300"
      style={{ borderColor: cfg.border }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, boxShadow: `0 0 16px ${cfg.glow}` }}
        >
          <Icon className="w-5 h-5" style={{ color: cfg.text }} />
        </div>
        <div className="w-1.5 h-8 rounded-full opacity-40"
          style={{ background: `linear-gradient(180deg, ${cfg.text}, transparent)` }}
        />
      </div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-white tracking-tighter" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
    </motion.div>
  );
};

export default Sessions;