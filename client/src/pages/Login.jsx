import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const success = await login(email, password);
            if (success) {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-slate-100">
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 opacity-50"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <img src="/logo.png" alt="SIRKAP Logo" className="h-24 w-auto invert" style={{ mixBlendMode: 'screen' }} />
                        <p className="text-slate-400 mt-2">Quotation Management System</p>
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input w-full"
                                placeholder="sales@sirkap.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input w-full"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
                                <ShieldCheck size={16} className="mr-2" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full btn-primary py-3 text-lg shadow-lg shadow-primary-500/30"
                        >
                            Sign In
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-slate-400">
                        <p>Protected by Sirkap Security. Authorized personnel only.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
