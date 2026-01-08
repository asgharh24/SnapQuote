import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, FileText, DollarSign, ArrowUpRight, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { API_BASE_URL } from '../config';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: {
            pipeline: 0,
            revenue: 0,
            activeQuotes: 0,
            conversionRate: 0,
            totalClients: 0
        },
        pipelineData: [],
        recentQuotes: []
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/dashboard/stats?user_id=${user?.id}&user_role=${user?.role}`);
                if (!res.ok) throw new Error('Failed to fetch stats');
                const result = await res.json();

                // Ensure data structure is correct even if API changes
                setData({
                    stats: result.stats || { pipeline: 0, revenue: 0, activeQuotes: 0, conversionRate: 0, totalClients: 0 },
                    pipelineData: result.pipelineData || [],
                    recentQuotes: result.recentQuotes || []
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchStats();
    }, [user]);

    const formatCurrency = (val) => {
        if (val >= 1000000) return `AED ${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `AED ${(val / 1000).toFixed(1)}K`;
        return `AED ${Math.round(val).toLocaleString()}`;
    };

    const statsConfig = [
        { label: 'Revenue Pipeline', value: formatCurrency(data.stats.pipeline), icon: DollarSign, trend: '', color: 'bg-primary-500' },
        { label: 'Active Quotes', value: data.stats.activeQuotes, icon: FileText, trend: '', color: 'bg-emerald-500' },
        { label: 'Conversion Rate', value: `${data.stats.conversionRate}%`, icon: TrendingUp, trend: '', color: 'bg-violet-500' },
        { label: 'Total Clients', value: data.stats.totalClients, icon: Users, trend: '', color: 'bg-orange-500' },
    ];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader className="animate-spin text-primary-500" size={48} />
        </div>
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500 mt-1">Snapshot of your business performance.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsConfig.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="card hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</h3>
                                </div>
                                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10 text-${stat.color.replace('bg-', '')}`}>
                                    <Icon size={24} className={`text-${stat.color.replace('bg-', '')}`} />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm font-medium text-slate-400">
                                <span className="font-normal italic">Real-time aggregate</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts / Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Placeholder */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Monthly Revenue Growth</h3>
                            <p className="text-xs text-slate-500">Based on issued quotations</p>
                        </div>
                    </div>

                    <div className="h-64 flex items-end justify-between space-x-2 px-4">
                        {data.pipelineData.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 italic border-2 border-dashed border-slate-100 rounded-xl">
                                No data available for this period
                            </div>
                        ) : (
                            data.pipelineData.map((d, i) => {
                                const maxVal = Math.max(...data.pipelineData.map(row => Number(row.amount)), 1);
                                const height = (Number(d.amount) / maxVal) * 100;
                                return (
                                    <div key={i} className="flex flex-col items-center space-y-2 flex-1 group relative">
                                        <div className="w-full bg-slate-50 rounded-t-lg relative h-48 overflow-hidden group-hover:bg-slate-100 transition-colors">
                                            <div
                                                className="absolute bottom-0 left-0 w-full bg-primary-500 rounded-t-lg transition-all duration-700 ease-out group-hover:bg-primary-400"
                                                style={{ height: `${height}%` }}
                                            ></div>
                                        </div>
                                        <div className="absolute top-0 transform -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded mb-1 z-10 whitespace-nowrap">
                                            {formatCurrency(Number(d.amount))}
                                        </div>
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{d.month}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Recent Quotes */}
                <div className="card">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Activity</h3>
                    <div className="space-y-4">
                        {data.recentQuotes.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                                <FileText size={40} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No recent quotes found</p>
                            </div>
                        ) : (
                            data.recentQuotes.map((quote, i) => (
                                <div
                                    key={i}
                                    onClick={() => navigate(`/quotes/${quote.id}`)}
                                    className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 cursor-pointer active:scale-95"
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="font-bold text-slate-900 text-sm truncate">{quote.company_name || quote.contact_person}</p>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{quote.quote_number}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(quote.grand_total_aed))}</p>
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter",
                                            quote.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                                quote.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                                                    quote.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                                                        quote.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'
                                        )}>
                                            {quote.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <button
                        onClick={() => navigate('/quotes')}
                        className="w-full mt-6 btn-secondary text-sm py-2.5 rounded-xl font-bold"
                    >
                        View All Quotes
                    </button>
                </div>
            </div>
        </div>
    );
}
