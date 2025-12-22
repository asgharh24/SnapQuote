import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, ShoppingBag, Settings, LogOut, Menu, X, Shield, ScrollText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export default function AppLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: FileText, label: 'Quotations', path: '/quotes' },
        { icon: Users, label: 'Clients', path: '/clients' },
    ];

    if (user?.role === 'admin') {
        navItems.push({ icon: Shield, label: 'Team', path: '/users' });
        navItems.push({ icon: ShoppingBag, label: 'Products', path: '/products' });
        navItems.push({ icon: ScrollText, label: 'Terms & Conditions', path: '/terms' });
        navItems.push({ icon: Settings, label: 'Settings', path: '/settings' });
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar - Desktop */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-xl",
                    !isSidebarOpen && "-translate-x-full lg:hidden"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <img src="/logo.png" alt="SIRKAP Logo" className="h-12 w-auto invert" style={{ mixBlendMode: 'screen' }} />
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                                        isActive
                                            ? "bg-primary-600 text-white shadow-md shadow-primary-900/20"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                    )}
                                >
                                    <Icon size={20} className={cn(isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-slate-800 bg-slate-850">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold border border-slate-600">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{user?.name}</p>
                                    <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-slate-800"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
                    <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
                        <Menu size={24} />
                    </button>
                    <img src="/logo.png" alt="SIRKAP Logo" className="h-10 w-auto" />
                    <div className="w-6" /> {/* Spacer */}
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-auto bg-slate-50 p-4 md:p-8">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
