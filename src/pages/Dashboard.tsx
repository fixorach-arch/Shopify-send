import { useEffect, useState } from 'react';
import { Users, UserCheck, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalContacts: 0,
    activeSubscribers: 0,
    emailsSent: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      // 1. Fetch Contacts Count
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch Emails Sent Count (Mocked via LocalStorage for demo purposes as we don't have a logs table yet)
      // In a real app, this would be: await supabase.from('campaign_logs').select('*', { count: 'exact', head: true });
      const storedSentCount = localStorage.getItem('fixorah_emails_sent');
      const emailsSent = storedSentCount ? parseInt(storedSentCount) : 0;

      setStats((prev) => ({
        ...prev,
        totalContacts: totalContacts || 0,
        activeSubscribers: totalContacts || 0, // Assuming all are active for now
        emailsSent: emailsSent,
      }));
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-lg">Dashboard</h1>
          <p className="mt-2 text-base md:text-lg text-slate-400">Overview of your email marketing performance.</p>
        </div>
        <div className="text-sm text-slate-500 font-medium bg-white/5 px-3 py-1 rounded-full border border-white/5 w-fit">
          Last updated: Just now
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard
          title="Total Contacts"
          value={stats.totalContacts}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Subscribers"
          value={stats.activeSubscribers}
          icon={UserCheck}
          color="emerald"
        />
        <StatCard
          title="Total Emails Sent"
          value={stats.emailsSent}
          icon={Send}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-3xl bg-slate-900/50 p-6 md:p-8 shadow-xl border border-white/5 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <span className="w-1 h-6 bg-cyan-400 rounded-full mr-3 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></span>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/campaigns" className="block">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-violet-500/50 hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden h-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <h3 className="font-semibold text-white group-hover:text-violet-300 relative z-10 flex items-center">
                        Create New Campaign
                        <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 relative z-10">Draft and send a new email blast to your subscribers.</p>
                </div>
            </Link>
            <Link to="/contacts" className="block">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/50 hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden h-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <h3 className="font-semibold text-white group-hover:text-cyan-300 relative z-10 flex items-center">
                        Import Contacts
                        <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 relative z-10">Bulk upload contacts via CSV or copy-paste.</p>
                </div>
            </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorClasses: Record<string, any> = {
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      shadow: 'shadow-blue-500/10',
      icon: 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      shadow: 'shadow-emerald-500/10',
      icon: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      shadow: 'shadow-purple-500/10',
      icon: 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]'
    },
  };

  const theme = colorClasses[color];

  return (
    <div className={`overflow-hidden rounded-3xl bg-slate-900/80 p-8 shadow-lg border ${theme.border} backdrop-blur-md transition-all hover:scale-[1.02] hover:shadow-2xl hover:${theme.shadow}`}>
      <div className="flex items-center">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${theme.bg} ring-1 ring-white/5`}>
          <Icon className={`h-7 w-7 ${theme.icon}`} />
        </div>
        <div className="ml-5">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className={`text-3xl font-bold ${theme.text} mt-1 drop-shadow-sm`}>{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
