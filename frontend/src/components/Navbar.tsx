import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Factory, Home, Activity, BarChart3 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const navItems = [
    { path: '/', label: 'Overview', icon: Home, end: true },
    { path: '/monitor', label: 'Live Monitor', icon: Activity },
    { path: '/analytics', label: 'OEE Analytics', icon: BarChart3 },
  ];

  return (
    <header className="bg-[#070b14]/90 backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand Logo */}
        <Link 
          to="/"
          className="flex items-center space-x-3 group select-none flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/60 transition-colors">
            <Factory className="w-4 h-4" />
          </div>
          <span className="font-bold text-white tracking-tight text-base sm:text-lg">
            FactoryPulse
          </span>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06] text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md transition-all duration-150 font-medium ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
