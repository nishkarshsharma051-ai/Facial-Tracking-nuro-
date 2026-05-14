import { FC } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Eye, BarChart3, FileText, LayoutDashboard, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout: FC = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Sessions', href: '/sessions', icon: BarChart3 },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <nav className="sticky top-0 z-50 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card px-6 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-white uppercase italic">
                EyeTrack <span className="text-indigo-500">Pro</span>
              </span>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className="relative px-4 py-2 rounded-xl transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-2 relative z-10">
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'}`} />
                      <span className={`text-sm font-semibold transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                        {item.name}
                      </span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-20 py-10 text-center border-t border-white/5">
        <p className="text-gray-500 text-sm font-medium">
          &copy; {new Date().getFullYear()} EyeTrack Pro • Advanced Gaze Analytics
        </p>
      </footer>
    </div>
  );
};

export default Layout;