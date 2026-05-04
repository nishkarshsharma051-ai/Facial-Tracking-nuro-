import { FC } from 'react';
import { Calendar, Clock, Eye, Play } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { format } from 'date-fns';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sessions & Results</h1>
        <p className="mt-2 text-gray-600">View all your eye tracking sessions and their results</p>
      </div>

      {/* Sessions Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Eye className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">{sessions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Play className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">{currentSession ? 1 : 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Duration</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatDuration(sessions.reduce((total, session) => total + session.duration, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">This Week</p>
              <p className="text-2xl font-semibold text-gray-900">
                {sessions.filter(session => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return session.startTime >= weekAgo;
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Sessions</h2>
        </div>
        
        {allSessions.length === 0 ? (
          <div className="text-center py-12">
            <Eye className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first tracking session.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {allSessions.map((session) => (
              <div key={session.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      session.status === 'active' 
                        ? 'bg-green-500' 
                        : session.status === 'paused' 
                        ? 'bg-yellow-500' 
                        : 'bg-gray-400'
                    }`} />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Session {session.id.slice(0, 8)}
                        {session.status === 'active' && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                        {session.status === 'paused' && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Paused
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Started: {format(session.startTime, 'MMM d, yyyy HH:mm:ss')}
                      </p>
                      {session.endTime && (
                        <p className="text-sm text-gray-500">
                          Ended: {format(session.endTime, 'MMM d, yyyy HH:mm:ss')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      Duration: {formatDuration(session.duration)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {session.data.length} data points
                    </p>
                    {session.data.length > 0 && (
                      <p className="text-xs text-gray-400">
                        Avg fixation: {(session.data.reduce((sum, d) => sum + d.fixationDuration, 0) / session.data.length).toFixed(0)}ms
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;