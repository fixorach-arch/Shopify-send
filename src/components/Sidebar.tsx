import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Mail, Settings, X } from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Campaigns', href: '/campaigns', icon: Mail },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={clsx(
          "fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar container */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 flex-col bg-slate-900/90 backdrop-blur-xl border-r border-white/5 shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-full",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-20 items-center justify-between px-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20 ring-1 ring-white/10">
              F
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Fixorah EMS</span>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 space-y-2 px-4 py-6">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => onClose()} // Close sidebar on navigation (mobile)
                className={clsx(
                  isActive
                    ? 'bg-white/5 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)] ring-1 ring-white/10'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white',
                  'group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ease-out'
                )}
              >
                <item.icon
                  className={clsx(
                    isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-slate-500 group-hover:text-slate-300',
                    'mr-3 h-5 w-5 flex-shrink-0 transition-all duration-300'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-6">
          <div className="flex items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 font-bold border border-white/10 group-hover:border-cyan-500/50 transition-colors">
              U
            </div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">Admin User</p>
              <p className="text-xs text-slate-500">Pro Plan</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
