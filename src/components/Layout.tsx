import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { isSupabaseConfigured } from '../lib/supabase';
import { AlertTriangle, Menu } from 'lucide-react';

export function Layout() {
  const isConfigured = isSupabaseConfigured();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-white/5">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20 ring-1 ring-white/10">
                    F
                </div>
                <span className="text-lg font-bold text-white tracking-tight">Fixorah EMS</span>
            </div>
            <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
                <Menu className="h-6 w-6" />
            </button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
            {!isConfigured && (
            <div className="mb-6 rounded-xl bg-yellow-500/10 p-4 border border-yellow-500/20 backdrop-blur-sm">
                <div className="flex">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-200">Configuration Required</h3>
                    <div className="mt-2 text-sm text-yellow-200/70">
                    <p>
                        Please configure your Supabase credentials in the <code>.env</code> file to enable database features.
                        <br />
                        You can find the required keys in your Supabase project settings.
                    </p>
                    </div>
                </div>
                </div>
            </div>
            )}
            <Outlet />
        </main>
      </div>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </div>
  );
}
