import { FC } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Eye, BarChart3, FileText, LayoutDashboard, User, Radio } from 'lucide-react';
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

      {/* ── Aurora Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Primary aurora blobs */}
        <div
          className="absolute w-[700px] h-[700px] rounded-full opacity-20"
          style={{
            top: '-200px',
            left: '-150px',
            background: 'radial-gradient(circle, rgba(99,102,241,1) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'aurora-shift 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            bottom: '-100px',
            right: '-100px',
            background: 'radial-gradient(circle, rgba(139,92,246,1) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'aurora-shift 16s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            top: '40%',
            right: '20%',
            background: 'radial-gradient(circle, rgba(6,182,212,1) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'aurora-shift 20s ease-in-out infinite 4s',
          }}
        />
        {/* Accent blob */}
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-08"
          style={{
            top: '60%',
            left: '15%',
            background: 'radial-gradient(circle, rgba(236,72,153,1) 0%, transparent 70%)',
            filter: 'blur(70px)',
            animation: 'aurora-shift 18s ease-in-out infinite 8s',
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 px-4 pt-4 pb-3">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="glass-card px-5 py-3 flex justify-between items-center"
            style={{
              background: 'linear-gradient(135deg, rgba(10,12,32,0.9) 0%, rgba(15,18,48,0.85) 100%)',
              borderColor: 'rgba(99,102,241,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-xl opacity-50"
                  style={{
                    background: 'radial-gradient(circle, rgba(99,102,241,0.8), transparent)',
                    filter: 'blur(10px)',
                    animation: 'neon-flicker 6s ease-in-out infinite',
                  }}
                />
                <div
                  className="relative p-2 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    boxShadow: '0 4px 15px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  <Eye className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <span
                  className="text-lg font-black tracking-tighter"
                  style={{
                    background: 'linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 60%, #c084fc 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  EyeTrack
                </span>
                <span
                  className="text-lg font-black tracking-tighter ml-1"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  Pro
                </span>
              </div>
              {/* Live indicator */}
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <Radio className="w-3 h-3 text-green-400" />
                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Live</span>
              </div>
            </div>

            {/* Nav Links */}
            <div className="flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className="relative px-3 py-2 rounded-xl transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-2 relative z-10">
                      <Icon
                        className="w-4 h-4 transition-all duration-300"
                        style={{ color: isActive ? '#818cf8' : 'rgba(148,163,184,0.8)' }}
                      />
                      <span
                        className="text-sm font-semibold transition-all duration-300 hidden sm:block"
                        style={{ color: isActive ? '#e2e8f0' : 'rgba(148,163,184,0.8)' }}
                      >
                        {item.name}
                      </span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 nav-active-pill rounded-xl"
                        transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                      />
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-20 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <Eye className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-gray-600 text-xs font-semibold tracking-wide">EyeTrack Pro</span>
            </div>
            <p className="text-gray-600 text-xs font-medium">
              © {new Date().getFullYear()} · Advanced Ocular Analytics System · All rights reserved
            </p>
            <div className="flex items-center space-x-1.5">
              <div className="status-dot status-dot-active" style={{ width: '6px', height: '6px' }} />
              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">All Systems Nominal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;