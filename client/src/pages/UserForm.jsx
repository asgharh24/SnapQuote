import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Mail, Lock, Shield, Loader, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export default function UserForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        user_role: 'sales'
    });

    useEffect(() => {
        if (id) {
            fetchUser();
        }
    }, [id]);

    const fetchUser = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/users/${id}`);
            const data = await res.json();
            if (res.ok) {
                setFormData({
                    full_name: data.full_name,
                    email: data.email,
                    password: '', // Don't fetch password
                    user_role: data.user_role
                });
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Error fetching user:', err);
            setError('Failed to load user data');
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const url = id ? `http://localhost:5000/api/users/${id}` : 'http://localhost:5000/api/users';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                navigate('/users');
            } else {
                setError(data.message || 'Something went wrong');
            }
        } catch (err) {
            console.error('Error saving user:', err);
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
            <Loader className="animate-spin text-primary-500" size={40} />
            <p className="text-slate-500 font-medium">Loading user details...</p>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/users')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-display font-bold text-slate-900">
                            {id ? 'Edit User' : 'Add New User'}
                        </h1>
                        <p className="text-slate-500 text-sm">Fill in the details below to manage system access.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="card p-8 space-y-6">
                    {error && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Full Name */}
                    <div className="space-y-2">
                        <label className="label flex items-center space-x-2">
                            <User size={16} className="text-primary-500" />
                            <span>Full Name</span>
                        </label>
                        <input
                            required
                            type="text"
                            className="input h-12"
                            placeholder="e.g. John Doe"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="label flex items-center space-x-2">
                            <Mail size={16} className="text-primary-500" />
                            <span>Email Address</span>
                        </label>
                        <input
                            required
                            type="email"
                            className="input h-12"
                            placeholder="john@sirkap.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="label flex items-center space-x-2">
                            <Lock size={16} className="text-primary-500" />
                            <span>{id ? 'Change Password (Leave blank to keep current)' : 'Password'}</span>
                        </label>
                        <input
                            required={!id}
                            type="password"
                            className="input h-12"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2">
                        <label className="label flex items-center space-x-2">
                            <Shield size={16} className="text-primary-500" />
                            <span>User Role</span>
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, user_role: 'sales' })}
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all group",
                                    formData.user_role === 'sales'
                                        ? "border-primary-500 bg-primary-50"
                                        : "border-slate-100 hover:border-slate-200 bg-white"
                                )}
                            >
                                <User className={cn("mb-2", formData.user_role === 'sales' ? "text-primary-600" : "text-slate-400")} size={24} />
                                <span className={cn("text-sm font-bold", formData.user_role === 'sales' ? "text-primary-900" : "text-slate-600")}>Sales</span>
                                <span className="text-[10px] text-slate-400 mt-1">Can create & view quotes</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, user_role: 'admin' })}
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all group",
                                    formData.user_role === 'admin'
                                        ? "border-purple-500 bg-purple-50"
                                        : "border-slate-100 hover:border-slate-200 bg-white"
                                )}
                            >
                                <Shield className={cn("mb-2", formData.user_role === 'admin' ? "text-purple-600" : "text-slate-400")} size={24} />
                                <span className={cn("text-sm font-bold", formData.user_role === 'admin' ? "text-purple-900" : "text-slate-600")}>Admin</span>
                                <span className="text-[10px] text-slate-400 mt-1">Full system access</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate('/users')}
                        className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary min-w-[140px] flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/20"
                    >
                        {loading ? (
                            <>
                                <Loader className="animate-spin" size={20} />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                <span>{id ? 'Update User' : 'Create User'}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
