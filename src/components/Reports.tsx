import { FC, useState, useEffect } from 'react';
import { FileDown, Eye, BarChart3, TrendingUp, Target, Heart } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement } from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { useSession } from '../contexts/SessionContext';
import { ReportService } from '../services/reportService';
import { SessionReport } from '../types';
import { RealEyeTrackingData } from '../services/realEyeTrackingService';
import { format } from 'date-fns';

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

  const getGazeTrackingData = () => {
    if (!report) return null;

    const data = report.session.data.slice(0, 100); // Limit for performance
    
    return {
      labels: data.map((_, index) => `${index * 0.1}s`),
      datasets: [
        {
          label: 'X Position (%)',
          data: data.map(d => d.x * 100),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
        },
        {
          label: 'Y Position (%)',
          data: data.map(d => d.y * 100),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
        },
      ],
    };
  };

  const getPupilSizeData = () => {
    if (!report) return null;

    const data = report.session.data.slice(0, 100);
    
    return {
      labels: data.map((_, index) => `${index * 0.1}s`),
      datasets: [
        {
          label: 'Pupil Size (mm)',
          data: data.map(d => d.pupilSize),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.3,
        },
      ],
    };
  };

  const getFixationData = () => {
    if (!report) return null;

    const focusAreas = report.analytics.focusAreas.slice(0, 10);
    
    return {
      labels: focusAreas.map((_, index) => `Area ${index + 1}`),
      datasets: [
        {
          label: 'Fixation Count',
          data: focusAreas.map(area => area.frequency),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(245, 101, 101, 0.8)',
            'rgba(59, 130, 246, 0.6)',
            'rgba(16, 185, 129, 0.6)',
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(139, 92, 246, 1)',
            'rgba(249, 115, 22, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(34, 197, 94, 1)',
            'rgba(168, 85, 247, 1)',
            'rgba(245, 101, 101, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const getMoodData = () => {
    if (!report) return null;

    const realData = report.session.data as RealEyeTrackingData[];
    const hasMoodData = realData.length > 0 && realData[0].facialExpression;
    
    if (!hasMoodData) return null;

    const moodCounts = {
      happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0, focused: 0
    };

    realData.forEach(point => {
      if (point.facialExpression) {
        const dominantMood = Object.entries(point.facialExpression)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0];
        moodCounts[dominantMood as keyof typeof moodCounts]++;
      }
    });

    return {
      labels: Object.keys(moodCounts).map(mood => mood.charAt(0).toUpperCase() + mood.slice(1)),
      datasets: [
        {
          label: 'Mood Distribution',
          data: Object.values(moodCounts),
          backgroundColor: [
            'rgba(255, 206, 84, 0.8)',   // happy - yellow
            'rgba(54, 162, 235, 0.8)',   // sad - blue
            'rgba(255, 99, 132, 0.8)',   // angry - red
            'rgba(153, 102, 255, 0.8)',  // surprised - purple
            'rgba(201, 203, 207, 0.8)',  // neutral - gray
            'rgba(75, 192, 192, 0.8)',   // focused - teal
          ],
          borderColor: [
            'rgba(255, 206, 84, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(201, 203, 207, 1)',
            'rgba(75, 192, 192, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const getBlinkPatternData = () => {
    if (!report) return null;

    const data = report.session.data.slice(0, 50); // Sample data for performance
    const blinkIntervals = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i].blinkCount > data[i-1].blinkCount) {
        blinkIntervals.push(i * 0.1); // Time in seconds
      }
    }
    
    return {
      labels: blinkIntervals.map((_, index) => `Blink ${index + 1}`),
      datasets: [
        {
          label: 'Blink Timing (seconds)',
          data: blinkIntervals,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
        },
      ],
    };
  };

  const getAttentionDistributionData = () => {
    if (!report) return null;

    const focusAreas = report.analytics.focusAreas.slice(0, 8);
    const totalFixations = focusAreas.reduce((sum, area) => sum + area.frequency, 0);
    
    return {
      labels: focusAreas.map((_, index) => `Zone ${index + 1}`),
      datasets: [
        {
          data: focusAreas.map(area => ((area.frequency / totalFixations) * 100).toFixed(1)),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
          ],
          borderColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const getPupilSizeDistributionData = () => {
    if (!report) return null;

    const pupilSizes = report.session.data.map(d => d.pupilSize);
    const ranges = {
      'Small (2-3mm)': 0,
      'Medium (3-4mm)': 0,
      'Large (4-5mm)': 0,
      'Very Large (5-6mm)': 0
    };

    pupilSizes.forEach(size => {
      if (size < 3) ranges['Small (2-3mm)']++;
      else if (size < 4) ranges['Medium (3-4mm)']++;
      else if (size < 5) ranges['Large (4-5mm)']++;
      else ranges['Very Large (5-6mm)']++;
    });

    return {
      labels: Object.keys(ranges),
      datasets: [
        {
          data: Object.values(ranges),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(249, 115, 22, 1)',
            'rgba(239, 68, 68, 1)'
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const getSessionQualityData = () => {
    if (!report) return null;

    const realData = report.session.data as RealEyeTrackingData[];
    const hasMoodData = realData.length > 0 && realData[0].facialExpression;
    
    if (!hasMoodData) {
      // Fallback quality metrics based on eye tracking data
      const avgFixation = report.analytics.avgFixationTime;
      const blinkRate = report.analytics.totalBlinks / (report.session.duration / 60000); // blinks per minute
      
      return {
        labels: ['Focus Quality', 'Attention Stability', 'Eye Comfort', 'Overall Engagement'],
        datasets: [
          {
            data: [
              avgFixation > 300 ? 85 : avgFixation > 200 ? 70 : 50,
              report.analytics.focusAreas.length > 5 ? 60 : 80,
              blinkRate > 10 && blinkRate < 20 ? 90 : 70,
              75
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(168, 85, 247, 0.8)',
              'rgba(249, 115, 22, 0.8)'
            ],
            borderColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(59, 130, 246, 1)',
              'rgba(168, 85, 247, 1)',
              'rgba(249, 115, 22, 1)'
            ],
            borderWidth: 2,
          },
        ],
      };
    }

    // Calculate quality metrics from mood data
    const moodCounts = { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0, focused: 0 };
    realData.forEach(point => {
      if (point.facialExpression) {
        const dominantMood = Object.entries(point.facialExpression)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0];
        moodCounts[dominantMood as keyof typeof moodCounts]++;
      }
    });

    const focusScore = (moodCounts.focused / realData.length) * 100;
    const positivityScore = ((moodCounts.happy + moodCounts.surprised) / realData.length) * 100;
    const stabilityScore = (moodCounts.neutral / realData.length) * 100;
    const engagementScore = ((moodCounts.focused + moodCounts.happy) / realData.length) * 100;

    return {
      labels: ['Focus Score', 'Positivity Score', 'Emotional Stability', 'Overall Engagement'],
      datasets: [
        {
          data: [focusScore, positivityScore, stabilityScore, engagementScore],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(255, 206, 84, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(249, 115, 22, 0.8)'
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(255, 206, 84, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(249, 115, 22, 1)'
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-2 text-gray-600">Generate detailed reports with eye tracking analytics and mood analysis</p>
      </div>

      {/* Session Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Session</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          >
            <option value="">Choose a session...</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                Session {session.id.slice(0, 8)} - {format(session.startTime, 'MMM d, yyyy HH:mm')}
                ({Math.round(session.duration / 1000)}s, {session.data.length} points)
              </option>
            ))}
          </select>
          
          {report && (
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <FileDown className="w-4 h-4 mr-2" />
              {isGeneratingPDF ? 'Generating...' : 'Export PDF with Mood Analysis'}
            </button>
          )}
        </div>
      </div>

      {!report ? (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No session selected</h3>
          <p className="mt-1 text-sm text-gray-500">Choose a session above to view detailed analytics and reports.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Report Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <Eye className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Blinks</p>
                  <p className="text-2xl font-semibold text-gray-900">{report.analytics.totalBlinks}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Target className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg Fixation</p>
                  <p className="text-2xl font-semibold text-gray-900">{report.analytics.avgFixationTime.toFixed(0)}ms</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg Pupil Size</p>
                  <p className="text-2xl font-semibold text-gray-900">{report.analytics.avgPupilSize.toFixed(1)}mm</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Data Points</p>
                  <p className="text-2xl font-semibold text-gray-900">{report.session.data.length}</p>
                </div>
              </div>
              
              {/* Add mood summary if available */}
              {(() => {
                const realData = report.session.data as RealEyeTrackingData[];
                const hasMoodData = realData.length > 0 && realData[0].facialExpression;
                if (!hasMoodData) return null;
                
                const moodCounts = { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0, focused: 0 };
                realData.forEach(point => {
                  if (point.facialExpression) {
                    const dominantMood = Object.entries(point.facialExpression)
                      .reduce((a, b) => a[1] > b[1] ? a : b)[0];
                    moodCounts[dominantMood as keyof typeof moodCounts]++;
                  }
                });
                
                const dominantMood = Object.entries(moodCounts)
                  .reduce((a, b) => a[1] > b[1] ? a : b);
                
                return (
                  <div className="flex items-center space-x-3 md:col-span-2 lg:col-span-1">
                    <Heart className="w-8 h-8 text-pink-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Dominant Mood</p>
                      <p className="text-2xl font-semibold text-gray-900 capitalize">
                        {dominantMood[0]} ({Math.round((dominantMood[1] / realData.length) * 100)}%)
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-8">
            {/* Line Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gaze Tracking Chart */}
              <div className="bg-white rounded-lg shadow-sm p-6 chart-container">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Gaze Position Over Time</h3>
                {getGazeTrackingData() && (
                  <Line
                    data={getGazeTrackingData()!}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        title: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          title: {
                            display: true,
                            text: 'Position (%)',
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Time',
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>

              {/* Pupil Size Chart */}
              <div className="bg-white rounded-lg shadow-sm p-6 chart-container">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pupil Size Variation</h3>
                {getPupilSizeData() && (
                  <Line
                    data={getPupilSizeData()!}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Pupil Size (mm)',
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Time',
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>

            {/* Bar Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Mood Distribution Chart */}
              {getMoodData() && (
                <div className="bg-white rounded-lg shadow-sm p-6 chart-container">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Mood & Emotional State Distribution</h3>
                  <Bar
                    data={getMoodData()!}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        title: {
                          display: true,
                          text: 'Emotional States During Session'
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Frequency',
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Emotional State',
                          },
                        },
                      },
                    }}
                  />
                </div>
              )}

              {/* Focus Areas Chart */}
              <div className="bg-white rounded-lg shadow-sm p-6 chart-container">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Focus Areas</h3>
                {getFixationData() && (
                  <Bar
                    data={getFixationData()!}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Fixation Count',
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>

            {/* Pie Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Attention Distribution Pie Chart */}
              <div className="bg-white rounded-lg shadow-sm p-6 chart-container">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Attention Distribution</h3>
                {getAttentionDistributionData() && (
                  <Pie
                    data={getAttentionDistributionData()!}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'right' as const,
                        },
                        title: {
                          display: true,
                          text: 'Focus Areas Distribution (%)'
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.label}: ${context.parsed}%`;
                            }
                          }
                        }
                      },
                    }}
                  />
                )}
              </div>

              {/* Pupil Size Distribution Pie Chart */}
              <div className="bg-white rounded-lg shadow-sm p-6 chart-container">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pupil Size Distribution</h3>
                {getPupilSizeDistributionData() && (
                  <Doughnut
                    data={getPupilSizeDistributionData()!}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                        },
                        title: {
                          display: true,
                          text: 'Pupil Size Categories'
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                              return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                          }
                        }
                      },
                    }}
                  />
                )}
              </div>
            </div>

            {/* Additional Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Session Quality Radar/Pie Chart */}
              <div className="bg-white rounded-lg shadow-sm p-6 chart-container">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Quality Metrics</h3>
                {getSessionQualityData() && (
                  <Doughnut
                    data={getSessionQualityData()!}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                        },
                        title: {
                          display: true,
                          text: 'Quality Scores (%)'
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.label}: ${context.parsed}%`;
                            }
                          }
                        }
                      },
                    }}
                  />
                )}
              </div>

              {/* Blink Pattern Chart */}
              <div className="bg-white rounded-lg shadow-sm p-6 chart-container">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Blink Pattern Analysis</h3>
                {getBlinkPatternData() && (
                  <Bar
                    data={getBlinkPatternData()!}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        title: {
                          display: true,
                          text: 'Blink Timing Throughout Session'
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Time (seconds)',
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Blink Events',
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mood Analysis Details */}
          {(() => {
            const realData = report.session.data as RealEyeTrackingData[];
            const hasMoodData = realData.length > 0 && realData[0].facialExpression;
            if (!hasMoodData) return null;
            
            return (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Mood Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Emotional State Breakdown</h4>
                    {(() => {
                      const moodCounts = { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0, focused: 0 };
                      realData.forEach(point => {
                        if (point.facialExpression) {
                          const dominantMood = Object.entries(point.facialExpression)
                            .reduce((a, b) => a[1] > b[1] ? a : b)[0];
                          moodCounts[dominantMood as keyof typeof moodCounts]++;
                        }
                      });
                      
                      return Object.entries(moodCounts)
                        .sort(([,a], [,b]) => b - a)
                        .map(([mood, count]) => {
                          const percentage = (count / realData.length) * 100;
                          if (percentage < 1) return null;
                          
                          return (
                            <div key={mood} className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-600 capitalize">{mood}:</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      mood === 'happy' ? 'bg-yellow-500' :
                                      mood === 'sad' ? 'bg-blue-500' :
                                      mood === 'angry' ? 'bg-red-500' :
                                      mood === 'surprised' ? 'bg-purple-500' :
                                      mood === 'focused' ? 'bg-green-500' :
                                      'bg-gray-500'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                          );
                        });
                    })()}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Mood Insights</h4>
                    {(() => {
                      const moodCounts = { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0, focused: 0 };
                      realData.forEach(point => {
                        if (point.facialExpression) {
                          const dominantMood = Object.entries(point.facialExpression)
                            .reduce((a, b) => a[1] > b[1] ? a : b)[0];
                          moodCounts[dominantMood as keyof typeof moodCounts]++;
                        }
                      });
                      
                      const dominantMood = Object.entries(moodCounts)
                        .reduce((a, b) => a[1] > b[1] ? a : b);
                      const dominantPercentage = (dominantMood[1] / realData.length) * 100;
                      
                      return (
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>
                            <strong>Primary Emotional State:</strong> {dominantMood[0].charAt(0).toUpperCase() + dominantMood[0].slice(1)} ({dominantPercentage.toFixed(1)}%)
                          </p>
                          <p>
                            <strong>Emotional Stability:</strong> {dominantPercentage > 60 ? 'High' : dominantPercentage > 40 ? 'Moderate' : 'Variable'}
                          </p>
                          <p>
                            <strong>Session Quality:</strong> {
                              moodCounts.focused > moodCounts.happy ? 'Highly Focused' :
                              moodCounts.happy > realData.length * 0.3 ? 'Positive Engagement' :
                              moodCounts.neutral > realData.length * 0.5 ? 'Neutral State' :
                              'Mixed Emotions'
                            }
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Detailed Analytics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Session Information</h4>
                <dl className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Session ID:</dt>
                    <dd className="text-gray-900 font-mono">{report.session.id.slice(0, 8)}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Start Time:</dt>
                    <dd className="text-gray-900">{format(report.session.startTime, 'MMM d, yyyy HH:mm:ss')}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Duration:</dt>
                    <dd className="text-gray-900">{Math.round(report.session.duration / 1000)}s</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Data Points:</dt>
                    <dd className="text-gray-900">{report.session.data.length}</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Eye Metrics</h4>
                <dl className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Min Pupil Size:</dt>
                    <dd className="text-gray-900">{report.analytics.minPupilSize.toFixed(2)}mm</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Max Pupil Size:</dt>
                    <dd className="text-gray-900">{report.analytics.maxPupilSize.toFixed(2)}mm</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Focus Areas:</dt>
                    <dd className="text-gray-900">{report.analytics.focusAreas.length}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Top Focus Area:</dt>
                    <dd className="text-gray-900">
                      {report.analytics.focusAreas.length > 0 
                        ? `${report.analytics.focusAreas[0].frequency} fixations`
                        : 'N/A'
                      }
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;