import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Building2, User, Mail, Phone, MapPin, Receipt } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function ClientForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        vat_number: ''
    });

    useEffect(() => {
        if (isEditing) {
            fetchClient();
        }
    }, [id]);

    const fetchClient = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/clients/${id}`);
            const data = await res.json();
            setFormData(data);
        } catch (error) {
            console.error('Error fetching client:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const url = isEditing
            ? `${API_BASE_URL}/api/clients/${id}`
            : `${API_BASE_URL}/api/clients`;

        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                navigate('/clients');
            } else {
                alert('Failed to save client');
            }
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Error saving client');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => navigate('/clients')}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-display font-bold text-slate-900">
                        {isEditing ? 'Edit Client' : 'Add New Client'}
                    </h1>
                    <p className="text-slate-500">Manage customer details for quotations.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Company / Client Name</label>
                        <div className="relative">
                            <Building2 size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                className="input pl-10"
                                placeholder="e.g. Emaar Properties (Leave blank for individuals)"
                                value={formData.company_name || ''}
                                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person</label>
                        <div className="relative">
                            <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                required
                                className="input pl-10"
                                placeholder="e.g. John Doe"
                                value={formData.contact_person}
                                onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">TRN / VAT Number</label>
                        <div className="relative">
                            <Receipt size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                className="input pl-10"
                                placeholder="Optional"
                                value={formData.vat_number || ''}
                                onChange={e => setFormData({ ...formData, vat_number: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                        <div className="relative">
                            <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="email"
                                className="input pl-10"
                                placeholder="client@example.com"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                        <div className="relative">
                            <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="tel"
                                className="input pl-10"
                                placeholder="+971 50 ..."
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Billing Address</label>
                        <div className="relative">
                            <MapPin size={20} className="absolute left-3 top-3 text-slate-400" />
                            <textarea
                                className="input pl-10 py-3 resize-none h-24"
                                placeholder="Street, City, Emirate..."
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => navigate('/clients')}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex items-center space-x-2"
                    >
                        <Save size={20} />
                        <span>{loading ? 'Saving...' : 'Save Client'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
