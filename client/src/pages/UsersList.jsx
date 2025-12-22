import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, User, Edit, Loader, Trash2, Shield, UserCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { format } from 'date-fns';

export default function UsersList() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/users');
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            const res = await fetch(`http://localhost:5000/api/users/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== id));
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.user_role && u.user_role.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500 mt-1">Manage system access and roles.</p>
                </div>
                <button
                    onClick={() => navigate('/users/new')}
                    className="btn-primary flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/20"
                >
                    <PlusCircle size={20} />
                    <span>Add New User</span>
                </button>
            </div>

            {/* Filters */}
            <div className="card p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or role..."
                        className="input pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-sm">Full Name</th>
                                <th className="px-6 py-4 font-bold text-sm">Email Address</th>
                                <th className="px-6 py-4 font-bold text-sm">Role</th>
                                <th className="px-6 py-4 font-bold text-sm">Created At</th>
                                <th className="px-6 py-4 font-bold text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center space-x-2">
                                            <Loader className="animate-spin" />
                                            <span>Loading users...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <UserCircle size={48} className="text-slate-200 mb-2" />
                                            <p className="text-slate-400">No users found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                                                    {user.full_name?.charAt(0)}
                                                </div>
                                                <span className="font-bold text-slate-900">{user.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center w-fit space-x-1",
                                                user.user_role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                            )}>
                                                {user.user_role === 'admin' && <Shield size={10} />}
                                                <span>{user.user_role}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-400">
                                            {format(new Date(user.created_at), 'dd MMM yyyy, HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => navigate(`/users/${user.id}`)}
                                                    className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                            Showing <span className="font-bold text-slate-900">{indexOfFirstItem + 1}</span> to <span className="font-bold text-slate-900">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of <span className="font-bold text-slate-900">{filteredUsers.length}</span> users
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            >
                                Previous
                            </button>
                            <div className="flex items-center space-x-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={cn(
                                            "w-8 h-8 rounded text-sm font-medium transition-colors",
                                            currentPage === i + 1
                                                ? "bg-primary-600 text-white"
                                                : "text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
