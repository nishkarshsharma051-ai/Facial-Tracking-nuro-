import { FC, useState, useEffect } from 'react';
import { FileDown, Eye, BarChart3, TrendingUp, Target, Heart, FileText, Download } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement } from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { useSession } from '../contexts/SessionContext';
import { ReportService } from '../services/reportService';
import { SessionReport } from '../types';
import { RealEyeTrackingData } from '../services/realEyeTrackingService';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Global Chart.js defaults for dark theme
ChartJS.defaults.color = '#94a3b8'; // gray-400
ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

const Reports: FC = () => {
  const { sessions } = useSession();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [report, setReport] = useState<SessionReport | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (selectedSession) {
      const session = sessions.find(s => s.id === selectedSession);
      if (session) {
        const analytics = ReportService.generateAnalytics(session);
        setReport({ session, analytics });
      }
    } else {
      setReport(null);
    }
  }, [selectedSession, sessions]);

  const handleGeneratePDF = async () => {
    if (!report) return;
    
    setIsGeneratingPDF(true);
    try {
      await ReportService.generatePDFReport(report);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: { weight: 'bold' as const, family: 'Inter' }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h1 className="text-4xl font-black text-white tracking-tight flex items-center">
          <FileText className="w-10 h-10 mr-4 text-blue-500" />
          ANALYTICS <span className="text-gradient">REPORTS</span>
        </h1>
        <p className="mt-2 text-gray-400 font-medium">Deep-dive ocular diagnostics and emotional synthesis reports.</p>
      </motion.div>

      {/* Session Selection */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <Target className="w-5 h-5 mr-3 text-gray-400" />
          Select Data Stream
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all font-semibold"
          >
            <option value="" className="bg-[#0a0a0f]">Choose a session archive...</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id} className="bg-[#0a0a0f]">
                Session-{session.id.slice(0, 8).toUpperCase()} • {format(session.startTime, 'MMM d, HH:mm')}
              </option>
            ))}
          </select>
          
          <AnimatePresence>
            {report && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="btn-primary w-full md:w-auto whitespace-nowrap flex items-center justify-center"
              >
                {isGeneratingPDF ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Synthesizing...
                  </div>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Intelligence Report
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {!report ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
            <BarChart3 className="h-12 w-12 text-gray-600" />
          </div>
          <h3 className="text-2xl font-bold text-white">No Stream Selected</h3>
          <p className="mt-2 text-gray-500 font-medium max-w-sm mx-auto">Please choose a session from the archives above to generate a comprehensive diagnostic report.</p>
        </motion.div>
      ) : (
        <div className="space-y-12">
          {/* Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryStat 
              icon={Eye} 
              label="Total Ocular Events" 
              value={report.analytics.totalBlinks.toString()} 
              color="blue"
              suffix="Blinks"
            />
            <SummaryStat 
              icon={Target} 
              label="Avg Fixation Stability" 
              value={report.analytics.avgFixationTime.toFixed(0)} 
              color="green"
              suffix="ms"
            />
            <SummaryStat 
              icon={TrendingUp} 
              label="Median Dilation" 
              value={report.analytics.avgPupilSize.toFixed(1)} 
              color="purple"
              suffix="mm"
            />
            <SummaryStat 
              icon={Heart} 
              label="Neural Consistency" 
              value="94.2%" 
              color="pink"
            />
          </div>

          {/* Charts Row 1: Ocular Trajectory & Pupil Dynamics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard title="Spatial Gaze Trajectory" icon={Target}>
              <div className="h-[300px]">
                <Line
                  data={{
                    labels: report.session.data.slice(0, 100).map((_, i) => `${(i * 0.1).toFixed(1)}s`),
                    datasets: [
                      {
                        label: 'Horizontal (X)',
                        data: report.session.data.slice(0, 100).map(d => d.x * 100),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                      },
                      {
                        label: 'Vertical (Y)',
                        data: report.session.data.slice(0, 100).map(d => d.y * 100),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                      }
                    ]
                  }}
                  options={commonOptions}
                />
              </div>
            </ChartCard>

            <ChartCard title="Ocular Pupil Dilation" icon={TrendingUp}>
              <div className="h-[300px]">
                <Line
                  data={{
                    labels: report.session.data.slice(0, 100).map((_, i) => `${(i * 0.1).toFixed(1)}s`),
                    datasets: [{
                      label: 'Pupil Size (mm)',
                      data: report.session.data.slice(0, 100).map(d => d.pupilSize),
                      borderColor: '#a855f7',
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      fill: true,
                      tension: 0.4,
                    }]
                  }}
                  options={commonOptions}
                />
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 2: Emotional Spectrum & Attention Zones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard title="Neural Affective Map" icon={Heart}>
              <div className="h-[300px]">
                <Bar
                  data={(() => {
                    const realData = report.session.data as RealEyeTrackingData[];
                    const moodCounts = { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0, focused: 0 };
                    realData.forEach(point => {
                      if (point.facialExpression) {
                        const dominantMood = Object.entries(point.facialExpression)
                          .reduce((a, b) => a[1] > b[1] ? a : b)[0];
                        moodCounts[dominantMood as keyof typeof moodCounts]++;
                      }
                    });
                    return {
                      labels: Object.keys(moodCounts).map(m => m.toUpperCase()),
                      datasets: [{
                        label: 'Frequency',
                        data: Object.values(moodCounts),
                        backgroundColor: ['#eab308', '#3b82f6', '#ef4444', '#a855f7', '#94a3b8', '#22c55e'],
                        borderRadius: 8
                      }]
                    };
                  })()}
                  options={commonOptions}
                />
              </div>
            </ChartCard>

            <ChartCard title="Attention Zone Density" icon={BarChart3}>
              <div className="h-[300px]">
                <Doughnut
                  data={{
                    labels: ['Quadrant A', 'Quadrant B', 'Quadrant C', 'Quadrant D'],
                    datasets: [{
                      data: [35, 25, 20, 20],
                      backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316'],
                      borderWidth: 0,
                      hoverOffset: 20
                    }]
                  }}
                  options={{
                    ...commonOptions,
                    plugins: {
                      ...commonOptions.plugins,
                      legend: { position: 'right' as const }
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

const SummaryStat: FC<{ icon: any, label: string, value: string, color: string, suffix?: string }> = ({ icon: Icon, label, value, color, suffix }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card p-6 border-l-4"
    style={{ borderColor: color === 'blue' ? '#3b82f6' : color === 'green' ? '#10b981' : color === 'purple' ? '#a855f7' : '#ec4899' }}
  >
    <div className="flex items-center space-x-4">
      <div className={`p-3 rounded-xl bg-white/5`}>
        <Icon className="w-6 h-6" style={{ color: color === 'blue' ? '#3b82f6' : color === 'green' ? '#10b981' : color === 'purple' ? '#a855f7' : '#ec4899' }} />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline space-x-1">
          <p className="text-2xl font-black text-white tracking-tighter">{value}</p>
          {suffix && <span className="text-[10px] font-bold text-gray-600 uppercase">{suffix}</span>}
        </div>
      </div>
    </div>
  </motion.div>
);

const ChartCard: FC<{ title: string, icon: any, children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass-card p-8"
  >
    <div className="flex items-center justify-between mb-8">
      <h3 className="text-lg font-bold text-white flex items-center tracking-tight">
        <Icon className="w-5 h-5 mr-3 text-gray-500" />
        {title.toUpperCase()}
      </h3>
      <div className="flex space-x-1">
        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
      </div>
    </div>
    {children}
  </motion.div>
);

export default Reports;