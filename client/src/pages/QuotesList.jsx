import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, FileText, Edit, Loader, MoreHorizontal, Download, Eye, Clock, User, Check, Ban, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { format } from 'date-fns';

export default function QuotesList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchQuotes();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchQuotes = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/quotes');
            const data = await res.json();
            setQuotes(data);
        } catch (error) {
            console.error('Error fetching quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredQuotes = quotes.filter(q => {
        const matchesSearch =
            (q.quote_number && q.quote_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (q.company_name && q.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (q.contact_person && q.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (q.project_name && q.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (q.creator_name && q.creator_name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        // Role-based visibility
        if (user?.role === 'admin') return true;

        // Sales User:
        // - Can see their own Drafts
        // - Cannot see others' Drafts
        // - Can see all Sent/Approved/etc.
        if (q.status === 'Draft' && q.created_by !== user?.id) {
            return false;
        }

        return true;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredQuotes.slice(indexOfFirstItem, indexOfLastItem);

    const handleDownload = async (quoteId, quoteNumber, version) => {
        setDownloadingId(quoteId);
        try {
            const res = await fetch(`http://localhost:5000/api/quotes/${quoteId}/download`);
            if (!res.ok) throw new Error('Download failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Sirkap_Quote_${quoteNumber}_v${version}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download PDF');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleStatusUpdate = async (quoteId, newStatus) => {
        const action = newStatus === 'Approved' ? 'Approve' : 'Reject';
        if (!window.confirm(`Are you sure you want to ${action} this quotation?`)) return;

        try {
            const res = await fetch(`http://localhost:5000/api/quotes/${quoteId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    user_id: user.id,
                    user_role: user.role
                })
            });

            if (res.ok) {
                fetchQuotes(); // Refresh list
            } else {
                const data = await res.json();
                alert(data.message || 'Error updating status');
            }
        } catch (error) {
            console.error('Status update error:', error);
            alert('Failed to update status');
        }
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'Approved': return 'bg-emerald-100 text-emerald-700';
            case 'Rejected': return 'bg-rose-100 text-rose-700';
            case 'Sent': return 'bg-blue-100 text-blue-700';
            case 'Revised': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Quotations</h1>
                    <p className="text-slate-500 mt-1">Manage and track your sales quotes.</p>
                </div>
                <button
                    onClick={() => navigate('/quotes/new')}
                    className="btn-primary flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/20"
                >
                    <PlusCircle size={20} />
                    <span>Create New Quote</span>
                </button>
            </div>

            {/* Filters */}
            <div className="card p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by quote #, client, or project..."
                        className="input pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Quotes Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-sm">Quote Details</th>
                                <th className="px-6 py-4 font-bold text-sm">Client / Project</th>
                                <th className="px-6 py-4 font-bold text-sm">Created By</th>
                                <th className="px-6 py-4 font-bold text-sm">Amount</th>
                                <th className="px-6 py-4 font-bold text-sm">Status</th>
                                <th className="px-6 py-4 font-bold text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center space-x-2">
                                            <Loader className="animate-spin" />
                                            <span>Loading quotations...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <FileText size={48} className="text-slate-200 mb-2" />
                                            <p className="text-slate-400">No quotes found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((quote) => (
                                    <tr key={quote.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">{quote.quote_number}</span>
                                                <span className="text-xs text-slate-400 flex items-center mt-1">
                                                    <Clock size={12} className="mr-1" />
                                                    {format(new Date(quote.date_issued), 'dd MMM yyyy')}
                                                    <span className="ml-2 bg-slate-100 px-1.5 rounded">v{quote.version_number}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-800">{quote.company_name || quote.contact_person}</span>
                                                <span className="text-xs text-slate-400 line-clamp-1">{quote.project_name || 'No Project Name'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-slate-600">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mr-2 border border-slate-200">
                                                    <User size={14} />
                                                </div>
                                                <span className="font-medium">{quote.creator_name || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">AED {Math.round(Number(quote.grand_total_aed)).toLocaleString()}</span>
                                                <span className="text-[10px] text-slate-400">
                                                    {quote.is_vat_applicable ? 'Inc. VAT (5%)' : 'Exc. VAT'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                                getStatusStyles(quote.status)
                                            )}>
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                {['Sent', 'Revised'].includes(quote.status) && (user.role === 'admin' || quote.created_by === user.id) && (
                                                    <div className="flex items-center space-x-1 pr-2 border-r border-slate-200 mr-1">
                                                        <button
                                                            onClick={() => handleStatusUpdate(quote.id, 'Approved')}
                                                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                                                            title="Approve / Mark Won"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(quote.id, 'Rejected')}
                                                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                                                            title="Reject / Mark Lost"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/quotes/${quote.id}`)}
                                                    className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                                    title="View/Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(quote.id, quote.quote_number, quote.version_number)}
                                                    disabled={downloadingId === quote.id}
                                                    className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                                                    title={downloadingId === quote.id ? "Generating PDF..." : "Download PDF"}
                                                >
                                                    {downloadingId === quote.id ? (
                                                        <Loader size={18} className="animate-spin text-primary-600" />
                                                    ) : (
                                                        <Download size={18} />
                                                    )}
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
                            Showing <span className="font-bold text-slate-900">{indexOfFirstItem + 1}</span> to <span className="font-bold text-slate-900">{Math.min(indexOfLastItem, filteredQuotes.length)}</span> of <span className="font-bold text-slate-900">{filteredQuotes.length}</span> quotes
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
