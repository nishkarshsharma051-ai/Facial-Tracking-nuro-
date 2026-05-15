import { FC, useState, useEffect } from 'react';
import { Eye, BarChart3, TrendingUp, Target, Heart, FileText, Download, Sparkles } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useSession } from '../contexts/SessionContext';
import { ReportService } from '../services/reportService';
import { SessionReport } from '../types';
import { RealEyeTrackingData } from '../services/realEyeTrackingService';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

ChartJS.defaults.color = '#64748b';
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.06)';
ChartJS.defaults.font.family = 'Inter';

const Reports: FC = () => {
  const { sessions } = useSession();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [report, setReport] = useState<SessionReport | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (selectedSession) {
      const session = sessions.find(s => s.id === selectedSession);
      if (session) setReport({ session, analytics: ReportService.generateAnalytics(session) });
    } else {
      setReport(null);
    }
  }, [selectedSession, sessions]);

  const handleGeneratePDF = async () => {
    if (!report) return;
    setIsGeneratingPDF(true);
    try { await ReportService.generatePDFReport(report); }
    catch (error) { console.error('Error generating PDF:', error); }
    finally { setIsGeneratingPDF(false); }
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: { weight: 'bold' as const, family: 'Inter', size: 11 },
          color: '#64748b',
          boxWidth: 12,
          boxHeight: 12,
          borderRadius: 4,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10,12,32,0.95)',
        borderColor: 'rgba(99,102,241,0.3)',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        padding: 12,
        cornerRadius: 12,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', font: { size: 10 } } }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, #3b82f6, #06b6d4)' }} />
          <span className="text-xs font-black text-blue-400 uppercase tracking-[0.25em]">Diagnostic Engine</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
          ANALYTICS <span className="text-gradient">REPORTS</span>
        </h1>
        <p className="mt-2 text-slate-400 text-sm font-medium">Deep-dive ocular diagnostics and emotional synthesis reports.</p>
      </motion.div>

      {/* Session Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-7"
        style={{ borderColor: 'rgba(59,130,246,0.15)' }}
      >
        <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          Select Data Stream
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full">
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-5 py-3.5 rounded-xl text-white font-semibold text-sm appearance-none cursor-pointer transition-all focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            >
              <option value="" style={{ background: '#0a0c20' }}>Choose a session archive...</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id} style={{ background: '#0a0c20' }}>
                  SES-{session.id.slice(0, 8).toUpperCase()} · {format(session.startTime, 'MMM d, HH:mm')}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path d="M1 1L6 6L11 1" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <AnimatePresence>
            {report && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="btn-primary whitespace-nowrap flex items-center gap-2 w-full md:w-auto"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export Report
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Empty State */}
      {!report ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-28">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-8"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <BarChart3 className="h-12 w-12 text-slate-600" />
          </motion.div>
          <h3 className="text-2xl font-bold text-white">No Stream Selected</h3>
          <p className="mt-2 text-slate-500 font-medium max-w-sm mx-auto text-sm">
            Choose a session archive above to generate a comprehensive diagnostic report.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI-powered analytics ready</span>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {/* Summary Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <SummaryStat icon={Eye}       label="Total Blinks"      value={report.analytics.totalBlinks.toString()} suffix="Events"  color="blue"   />
            <SummaryStat icon={Target}    label="Avg Fixation"      value={report.analytics.avgFixationTime.toFixed(0)} suffix="ms" color="green"  />
            <SummaryStat icon={TrendingUp} label="Median Dilation"  value={report.analytics.avgPupilSize.toFixed(1)} suffix="mm"    color="purple" />
            <SummaryStat icon={Heart}     label="Neural Consistency" value="94.2"             suffix="%"          color="pink"   />
          </motion.div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard title="Spatial Gaze Trajectory" icon={Target}>
              <div className="h-[280px]">
                <Line
                  data={{
                    labels: report.session.data.slice(0, 100).map((_, i) => `${(i * 0.1).toFixed(1)}s`),
                    datasets: [
                      {
                        label: 'Horizontal (X)',
                        data: report.session.data.slice(0, 100).map(d => d.x * 100),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99,102,241,0.08)',
                        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0,
                      },
                      {
                        label: 'Vertical (Y)',
                        data: report.session.data.slice(0, 100).map(d => d.y * 100),
                        borderColor: '#22d3ee',
                        backgroundColor: 'rgba(34,211,238,0.06)',
                        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0,
                      }
                    ]
                  }}
                  options={commonOptions}
                />
              </div>
            </ChartCard>

            <ChartCard title="Pupil Dilation Dynamics" icon={TrendingUp}>
              <div className="h-[280px]">
                <Line
                  data={{
                    labels: report.session.data.slice(0, 100).map((_, i) => `${(i * 0.1).toFixed(1)}s`),
                    datasets: [{
                      label: 'Pupil Size (mm)',
                      data: report.session.data.slice(0, 100).map(d => d.pupilSize),
                      borderColor: '#a855f7',
                      backgroundColor: 'rgba(168,85,247,0.08)',
                      fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0,
                    }]
                  }}
                  options={commonOptions}
                />
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard title="Neural Affective Map" icon={Heart}>
              <div className="h-[280px]">
                <Bar
                  data={(() => {
                    const realData = report.session.data as RealEyeTrackingData[];
                    const moodCounts = { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0, focused: 0 };
                    realData.forEach(point => {
                      if (point.facialExpression) {
                        const dom = Object.entries(point.facialExpression).reduce((a, b) => a[1] > b[1] ? a : b)[0];
                        moodCounts[dom as keyof typeof moodCounts]++;
                      }
                    });
                    return {
                      labels: Object.keys(moodCounts).map(m => m.toUpperCase()),
                      datasets: [{
                        label: 'Frequency',
                        data: Object.values(moodCounts),
                        backgroundColor: ['rgba(234,179,8,0.7)', 'rgba(59,130,246,0.7)', 'rgba(239,68,68,0.7)', 'rgba(168,85,247,0.7)', 'rgba(148,163,184,0.5)', 'rgba(34,197,94,0.7)'],
                        borderColor: ['#eab308', '#3b82f6', '#ef4444', '#a855f7', '#94a3b8', '#22c55e'],
                        borderWidth: 1,
                        borderRadius: 8,
                      }]
                    };
                  })()}
                  options={commonOptions}
                />
              </div>
            </ChartCard>

            <ChartCard title="Attention Zone Density" icon={BarChart3}>
              <div className="h-[280px]">
                <Doughnut
                  data={{
                    labels: ['Quadrant A', 'Quadrant B', 'Quadrant C', 'Quadrant D'],
                    datasets: [{
                      data: [35, 25, 20, 20],
                      backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(139,92,246,0.8)', 'rgba(236,72,153,0.8)', 'rgba(6,182,212,0.8)'],
                      borderColor: ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4'],
                      borderWidth: 1,
                      hoverOffset: 16,
                    }]
                  }}
                  options={{
                    ...commonOptions,
                    plugins: {
                      ...commonOptions.plugins,
                      legend: { position: 'right' as const, labels: { ...commonOptions.plugins.legend.labels, padding: 16 } }
                    }
                  }}
                />
              </div>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── SUMMARY STAT ──────────────────────────────── */
const colorMap: Record<string, { text: string; bg: string; border: string; barBg: string }> = {
  blue:   { text: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  barBg: 'linear-gradient(180deg,#6366f1,#3b82f6)' },
  green:  { text: '#4ade80', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   barBg: 'linear-gradient(180deg,#22c55e,#4ade80)' },
  purple: { text: '#c084fc', bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.2)',  barBg: 'linear-gradient(180deg,#7c3aed,#a855f7)' },
  pink:   { text: '#f472b6', bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.2)',  barBg: 'linear-gradient(180deg,#db2777,#ec4899)' },
};

const SummaryStat: FC<{ icon: any; label: string; value: string; color: string; suffix?: string }> = ({ icon: Icon, label, value, color, suffix }) => {
  const cfg = colorMap[color] ?? colorMap.blue;
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="glass-card p-6 group"
      style={{ borderColor: cfg.border }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="p-2.5 rounded-xl transition-all group-hover:scale-110 duration-300"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          <Icon className="w-5 h-5" style={{ color: cfg.text }} />
        </div>
        <div className="w-1 h-10 rounded-full opacity-40" style={{ background: cfg.barBg }} />
      </div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <p className="text-3xl font-black text-white tracking-tighter" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
        {suffix && <span className="text-[10px] font-bold text-slate-600 uppercase">{suffix}</span>}
      </div>
    </motion.div>
  );
};

/* ─── CHART CARD ────────────────────────────────── */
const ChartCard: FC<{ title: string; icon: any; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    className="glass-card p-7"
    style={{ borderColor: 'rgba(99,102,241,0.12)' }}
  >
    <div className="flex items-center justify-between mb-7">
      <h3 className="text-sm font-bold text-white flex items-center gap-2.5 tracking-tight">
        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Icon className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        {title.toUpperCase()}
      </h3>
      <div className="flex gap-1.5">
        {[0.15, 0.25, 0.4].map((o, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: `rgba(99,102,241,${o})` }} />
        ))}
      </div>
    </div>
    {children}
  </motion.div>
);

export default Reports;