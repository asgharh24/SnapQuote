import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, ScrollText,
    X, Save, Loader, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function TermsManagement() {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [formData, setFormData] = useState({ profile_name: '', content: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/terms-profiles');
            if (!res.ok) throw new Error('Failed to fetch terms profiles');
            const data = await res.json();
            setProfiles(data);
        } catch (err) {
            console.error(err);
            setError('Could not load terms profiles');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (profile = null) => {
        if (profile) {
            setEditingProfile(profile);
            setFormData({ profile_name: profile.profile_name, content: profile.content });
        } else {
            setEditingProfile(null);
            setFormData({ profile_name: '', content: '' });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const url = editingProfile
                ? `http://localhost:5000/api/terms-profiles/${editingProfile.id}`
                : 'http://localhost:5000/api/terms-profiles';

            const res = await fetch(url, {
                method: editingProfile ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to save profile');

            await fetchProfiles();
            setIsModalOpen(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this profile?')) return;

        try {
            const res = await fetch(`http://localhost:5000/api/terms-profiles/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete profile');
            setProfiles(profiles.filter(p => p.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    const filteredProfiles = profiles.filter(p =>
        p.profile_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ],
    };

    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <AlertCircle size={48} className="mb-4 text-slate-300" />
                <p className="text-xl font-medium">Access Denied</p>
                <p>Only administrators can manage terms profiles.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Terms & Conditions</h1>
                    <p className="text-slate-500">Manage standard terms and conditions profiles.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-sm group"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span>Create Profile</span>
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search profiles..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Profile Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Preview</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-1/2" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-3/4" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-12 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filteredProfiles.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-slate-500">
                                        No terms profiles found.
                                    </td>
                                </tr>
                            ) : (
                                filteredProfiles.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {profile.profile_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 max-w-md truncate">
                                            {profile.content.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleOpenModal(profile)}
                                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                title="Edit Profile"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(profile.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Profile"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-primary-100 text-primary-700 rounded-lg">
                                    <ScrollText size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {editingProfile ? 'Edit Terms Profile' : 'New Terms Profile'}
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center space-x-3">
                                    <AlertCircle size={20} />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Profile Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Standard Payment Terms"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none shadow-sm"
                                    value={formData.profile_name}
                                    onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Content</label>
                                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm min-h-[300px] flex flex-col">
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.content}
                                        onChange={(content) => setFormData({ ...formData, content })}
                                        modules={quillModules}
                                        className="h-[250px] flex-1 bg-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-8 py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all flex items-center space-x-2 shadow-lg shadow-primary-900/10 disabled:opacity-70"
                                >
                                    {isSaving && <Loader size={18} className="animate-spin" />}
                                    <span>{editingProfile ? 'Update Profile' : 'Create Profile'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
