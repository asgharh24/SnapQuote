import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    ArrowLeft, Save, Send, Plus, Trash2, GripVertical,
    Search, User, ShoppingBag, Percent, Receipt, Info, Image as ImageIcon,
    ChevronDown, X, Loader, Calculator, Download, ScrollText, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { format } from 'date-fns';
import { z } from 'zod';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { API_BASE_URL } from '../config';

// DnD Kit
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Zod Schema ---
const quotationItemSchema = z.object({
    id: z.string().optional(), // Map to optional for save
    product_id: z.number().nullable(),
    item_name: z.string().optional(),
    description_override: z.string().min(1, "Description is required"),
    origin_snapshot: z.string().nullable(),
    unit_of_measure: z.string(),
    quantity: z.number().min(0.01, "Quantity must be > 0"),
    original_unit_price: z.number().min(0),
    discounted_unit_price: z.number().min(0),
    cost_price_snapshot: z.number().min(0).optional(),
    row_total: z.number().min(0),
    image_url: z.string().nullable().optional()
});

const quotationSchema = z.object({
    client_id: z.number({ required_error: "Please select a client" }),
    project_name: z.string().min(1, "Project name/address is required"),
    date_issued: z.string(),
    status: z.string(),
    is_vat_applicable: z.boolean(),
    is_delivery_applicable: z.boolean().optional().default(false),
    delivery_charges_aed: z.number().min(0).optional().default(0),
    quote_number: z.string(),
    version_number: z.number(),
    subtotal_aed: z.number(),
    vat_amount_aed: z.number(),
    grand_total_aed: z.number(),
    created_by: z.number(),
    terms_id: z.number().optional().nullable(),
    terms_content: z.string().optional().nullable(),
    items: z.array(quotationItemSchema).min(1, "At least one item is required")
});

// --- Main Component ---
export default function QuoteBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isTermsConfirmed, setIsTermsConfirmed] = useState(false);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [termsProfiles, setTermsProfiles] = useState([]);

    // Form State
    const [quoteHeader, setQuoteHeader] = useState({
        quote_number: '',
        version_number: 1,
        project_name: '',
        date_issued: format(new Date(), 'yyyy-MM-dd'),
        is_vat_applicable: true,
        is_delivery_applicable: false,
        delivery_charges_aed: 0,
        status: 'Draft',
        terms_id: null,
        terms_content: '',
        has_revision: false
    });

    const [items, setItems] = useState([]);

    // Initialize
    useEffect(() => {
        fetchInitialData();
    }, [id]);

    const fetchInitialData = async () => {
        try {
            // Fetch Clients & Products for selectors
            const [clientRes, productRes, termsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/clients`),
                fetch(`${API_BASE_URL}/api/products`),
                fetch(`${API_BASE_URL}/api/terms-profiles`)
            ]);

            const clientsData = await clientRes.json();
            const productsData = await productRes.json();
            const termsData = await termsRes.json();

            setClients(clientsData);
            setProducts(productsData);
            setTermsProfiles(termsData);

            if (id) {
                // Fetch Existing Quote
                const quoteRes = await fetch(`${API_BASE_URL}/api/quotes/${id}`);
                const quoteData = await quoteRes.json();

                // If it's a revision-intent from URL
                const isRevision = new URLSearchParams(location.search).get('revision') === 'true';

                if (isRevision) {
                    setQuoteHeader({
                        ...quoteData,
                        id: undefined, // Create new record
                        parent_quote_id: quoteData.id,
                        version_number: quoteData.version_number + 1,
                        status: 'Draft',
                        date_issued: format(new Date(), 'yyyy-MM-dd'),
                        subtotal_aed: Number(quoteData.subtotal_aed),
                        vat_amount_aed: Number(quoteData.vat_amount_aed),
                        grand_total_aed: Number(quoteData.grand_total_aed),
                        terms_id: quoteData.terms_id,
                        terms_content: quoteData.terms_content || ''
                    });
                } else {
                    setQuoteHeader({
                        ...quoteData,
                        is_vat_applicable: !!quoteData.is_vat_applicable,
                        is_delivery_applicable: !!quoteData.is_delivery_applicable,
                        delivery_charges_aed: Number(quoteData.delivery_charges_aed || 0),
                        date_issued: format(new Date(quoteData.date_issued), 'yyyy-MM-dd'),
                        subtotal_aed: Number(quoteData.subtotal_aed),
                        vat_amount_aed: Number(quoteData.vat_amount_aed),
                        grand_total_aed: Number(quoteData.grand_total_aed),
                        terms_id: quoteData.terms_id,
                        terms_content: quoteData.terms_content || '',
                        has_revision: quoteData.has_revision
                    });
                }

                setSelectedClient(clientsData.find(c => c.id === quoteData.client_id));
                setItems(quoteData.items.map(item => ({
                    ...item,
                    id: `item-${Date.now()}-${Math.random()}`,
                    type: item.product_id ? 'catalog' : 'bespoke',
                    quantity: Number(item.quantity),
                    original_unit_price: Number(item.original_unit_price),
                    discounted_unit_price: Number(item.discounted_unit_price),
                    cost_price_snapshot: Number(item.cost_price_snapshot),
                    row_total: Number(item.row_total)
                })));
            } else {
                // New Quote: Fetch next number
                const nextNumRes = await fetch(`${API_BASE_URL}/api/quotes/next-number`);
                const { nextNumber } = await nextNumRes.json();
                setQuoteHeader(prev => ({ ...prev, quote_number: nextNumber }));
                // Start with one empty catalog row
                addItem('catalog');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Row Actions ---
    const addItem = (type) => {
        const newItem = {
            id: `item-${Date.now()}-${Math.random()}`,
            type, // 'catalog' or 'bespoke'
            product_id: null,
            item_name: '',
            description_override: '',
            origin_snapshot: '',
            unit_of_measure: 'SQM',
            quantity: 1,
            original_unit_price: 0,
            discounted_unit_price: 0,
            cost_price_snapshot: 0,
            row_total: 0,
            image_url: null
        };
        setItems([...items, newItem]);
    };

    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id, updates) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const updated = { ...item, ...updates };
                // Recalculate row total
                updated.row_total = updated.quantity * updated.discounted_unit_price;
                return updated;
            }
            return item;
        }));
    };

    const handleProductSelect = async (itemId, productStub) => {
        try {
            console.log('--- PRODUCT SELECTION START ---');
            console.log('Selected Stub:', productStub);

            const res = await fetch(`${API_BASE_URL}/api/products/${productStub.id}`);
            if (!res.ok) throw new Error('Failed to fetch full product details');

            const product = await res.json();
            console.log('Full Product from API:', product);

            const updates = {
                product_id: product.id,
                item_name: product.item_name || product.name || '',
                description_override: product.product_description || product.description || '',
                origin_snapshot: product.origin || '',
                unit_of_measure: product.unit || product.unit_of_measure || 'SQM',
                original_unit_price: Number(product.base_price || product.basePrice || 0),
                discounted_unit_price: Number(product.base_price || product.basePrice || 0),
                cost_price_snapshot: Number(product.cost_price || product.costPrice || 0),
                image_url: product.image_url || product.imageUrl || product.image || null
            };

            console.log('Applying Updates to Item:', itemId, updates);
            updateItem(itemId, updates);

            console.log('--- PRODUCT SELECTION END ---');
        } catch (err) {
            console.error('Error in handleProductSelect:', err);
            updateItem(itemId, {
                product_id: productStub.id,
                item_name: productStub.item_name || productStub.name || '',
                description_override: productStub.product_description || productStub.description || ''
            });
        }
    };

    // --- Calculations ---
    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + (item.row_total || 0), 0);
        const totalCost = items.reduce((sum, item) => sum + ((item.cost_price_snapshot || 0) * item.quantity), 0);
        const vat = quoteHeader.is_vat_applicable ? subtotal * 0.05 : 0;
        const delivery = quoteHeader.is_delivery_applicable ? (quoteHeader.delivery_charges_aed || 0) : 0;
        const grandTotal = subtotal + vat + delivery;
        const profit = subtotal - totalCost;
        const margin = subtotal > 0 ? (profit / subtotal) * 100 : 0;

        return { subtotal, vat, delivery, grandTotal, totalCost, profit, margin };
    }, [items, quoteHeader.is_vat_applicable, quoteHeader.is_delivery_applicable, quoteHeader.delivery_charges_aed]);

    // --- Submission ---
    const handleSave = async (status = 'Draft') => {
        if (!user) {
            alert('Your session has expired. Please login again.');
            return;
        }

        if (status === 'Sent' && !isTermsConfirmed) {
            alert('Please confirm that you have reviewed the Terms & Conditions before finalizing.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...quoteHeader,
                client_id: selectedClient?.id,
                status,
                subtotal_aed: totals.subtotal,
                vat_amount_aed: totals.vat,
                grand_total_aed: totals.grandTotal,
                created_by: user.id,
                terms_id: quoteHeader.terms_id,
                terms_content: quoteHeader.terms_content,
                items: items.map(item => ({
                    ...item,
                    id: undefined, // Remove temp ID for save
                    type: undefined
                }))
            };

            // Basic validation check
            const validation = quotationSchema.safeParse(payload);
            if (!validation.success) {
                const errorMsg = validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
                alert(`Validation Error:\n${errorMsg}`);
                setSaving(false);
                return;
            }

            const url = id && quoteHeader.id ? `${API_BASE_URL}/api/quotes/${id}` : `${API_BASE_URL}/api/quotes`;
            const method = id && quoteHeader.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validation.data)
            });

            if (res.ok) {
                navigate('/quotes');
            } else {
                const err = await res.json();
                alert(err.message || 'Error saving quote');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert(`Failed to save quotation: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    // --- DnD Sensors ---
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const isLocked = quoteHeader.status !== 'Draft';

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quotes/${id}/download`);
            if (!res.ok) throw new Error('Download failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Sirkap_Quote_${quoteHeader.quote_number}_v${quoteHeader.version_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleRevise = async () => {
        if (!window.confirm('This will create a new editable version (Revision) of this quotation. The current version will be archived and locked. Proceed?')) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quotes/${id}/revise`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id })
            });

            const data = await res.json();
            if (res.ok) {
                navigate(`/quotes/${data.id}`);
            } else {
                alert(data.message || 'Error creating revision');
            }
        } catch (error) {
            console.error('Revision error:', error);
            alert('Failed to create revision');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        const action = newStatus === 'Approved' ? 'Approve (Confirm Sale)' : 'Reject (Mark as Lost)';
        if (!window.confirm(`Are you sure you want to ${action} this quotation? This action is permanent.`)) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quotes/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    user_id: user.id,
                    user_role: user.role
                })
            });

            if (res.ok) {
                // Refresh data to reflect new status
                window.location.reload();
            } else {
                const data = await res.json();
                alert(data.message || 'Error updating status');
            }
        } catch (error) {
            console.error('Status update error:', error);
            alert('Failed to update status');
        } finally {
            setSaving(false);
        }
    };

    const handleDragEnd = (event) => {
        if (isLocked) return;
        const { active, over } = event;
        if (active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <Loader className="animate-spin text-primary-500" size={48} />
            <p className="text-slate-500 font-medium">Preparing Quote Builder...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Decision Bar for Sent/Revised Quotes */}
            {id && ['Sent', 'Revised'].includes(quoteHeader.status) && (user.role === 'admin' || quoteHeader.created_by === user.id) && (
                <div className="bg-white border-2 border-primary-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                            <Info size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Finalize Document Decision</h3>
                            <p className="text-xs text-slate-500">This quotation is currently {quoteHeader.status.toLowerCase()}. Has the client responded?</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 w-full md:w-auto">
                        <button
                            onClick={() => handleStatusUpdate('Rejected')}
                            disabled={saving}
                            className="flex-1 md:flex-none px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-sm font-bold transition-colors border border-rose-200 flex items-center justify-center space-x-2"
                        >
                            <X size={18} />
                            <span>Mark as Lost</span>
                        </button>
                        <button
                            onClick={() => handleStatusUpdate('Approved')}
                            disabled={saving}
                            className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-200 flex items-center justify-center space-x-2"
                        >
                            <CheckCircle size={18} />
                            <span>Mark as Won</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-slate-50/80 backdrop-blur-md py-4 z-40 border-b border-slate-200 -mx-4 px-4 sm:-mx-8 sm:px-8">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/quotes')} className="p-2 hover:bg-white rounded-full transition-colors order-first">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-display font-bold text-slate-900">
                            {id ? `Edit Quote ${quoteHeader.quote_number}` : 'New Quotation'}
                        </h1>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200">v{quoteHeader.version_number}</span>
                            <span>•</span>
                            <span>{statusMap[quoteHeader.status] || quoteHeader.status}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {id && (
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="btn-secondary flex items-center space-x-2 disabled:opacity-70"
                            title="Download PDF"
                        >
                            {isDownloading ? (
                                <>
                                    <Loader size={18} className="animate-spin" />
                                    <span className="hidden sm:inline">Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={18} />
                                    <span className="hidden sm:inline">Download PDF</span>
                                </>
                            )}
                        </button>
                    )}
                    {isLocked ? (
                        <button
                            onClick={handleRevise}
                            disabled={saving || quoteHeader.has_revision}
                            className={cn(
                                "btn-primary flex items-center space-x-2 shadow-lg",
                                quoteHeader.has_revision
                                    ? "bg-slate-400 border-slate-400 cursor-not-allowed shadow-none"
                                    : "shadow-primary-500/20"
                            )}
                            title={quoteHeader.has_revision ? "A revision has already been created from this version" : "Create new revision"}
                        >
                            <Plus size={18} />
                            <span>{saving ? 'Creating...' : (quoteHeader.has_revision ? 'Revision Created' : 'Create Revision')}</span>
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => handleSave('Draft')}
                                disabled={saving}
                                className="btn-secondary flex items-center space-x-2"
                            >
                                <Save size={18} />
                                <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                            </button>
                            <button
                                onClick={() => handleSave('Sent')}
                                disabled={saving}
                                className="btn-primary flex items-center space-x-2 shadow-lg shadow-primary-500/20"
                            >
                                <Send size={18} />
                                <span>Finalize & Send</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Metadata & Items */}
                <div className="lg:col-span-2 space-y-8">

                    {/* 1. Metadata Card */}
                    <div className="card grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                        {/* Client Selector */}
                        <div className="relative">
                            <label className="label">Client Selection</label>
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    className="input pl-10 h-11"
                                    placeholder="Search clients..."
                                    disabled={isLocked}
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowClientDropdown(true);
                                    }}
                                    onFocus={() => setShowClientDropdown(true)}
                                />
                                {showClientDropdown && (
                                    <div className="absolute top-full left-0 w-full bg-white mt-1 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                                        <div className="max-h-60 overflow-y-auto">
                                            {clients.filter(c =>
                                                c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
                                            ).map(client => (
                                                <button
                                                    key={client.id}
                                                    className="w-full px-4 py-3 text-left hover:bg-slate-50 flex flex-col border-b border-slate-50 last:border-0"
                                                    onClick={() => {
                                                        setSelectedClient(client);
                                                        setShowClientDropdown(false);
                                                        setSearchTerm('');
                                                    }}
                                                >
                                                    <span className="font-bold text-slate-900">{client.company_name || client.contact_person}</span>
                                                    <span className="text-xs text-slate-400">{client.contact_person} {client.phone ? `• ${client.phone}` : ''}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="label">Project Name/Address</label>
                            <input
                                type="text"
                                className="input h-11"
                                placeholder="e.g. Burj Khalifa Apartment 402"
                                disabled={isLocked}
                                value={quoteHeader.project_name || ''}
                                onChange={(e) => setQuoteHeader({ ...quoteHeader, project_name: e.target.value })}
                            />
                        </div>

                        {/* Client Info Card - Visible when client is selected */}
                        {selectedClient && (
                            <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-start space-x-3">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary-500 shadow-sm">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{selectedClient.company_name || selectedClient.contact_person}</h4>
                                        <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                                            <span>TRN: {selectedClient.vat_number || 'N/A'}</span>
                                            <span>•</span>
                                            <span className="line-clamp-1">{selectedClient.address || 'No address provided'}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedClient(null)}
                                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 2. Dynamic Items Builder */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                                <ShoppingBag size={20} className="text-primary-500" />
                                <span>Quotation Items</span>
                            </h2>
                            <div className="flex items-center space-x-2">
                                {!isLocked && (
                                    <>
                                        <button
                                            onClick={() => addItem('catalog')}
                                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center space-x-1 transition-colors"
                                        >
                                            <Plus size={16} />
                                            <span>Add Item</span>
                                        </button>
                                        {isAdmin && (
                                            <button
                                                onClick={() => addItem('bespoke')}
                                                className="px-3 py-1.5 bg-slate-800 border border-slate-800 rounded-lg text-sm font-medium text-white hover:bg-slate-900 flex items-center space-x-1 transition-colors"
                                            >
                                                <Plus size={16} />
                                                <span>Add Bespoke Row</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Drag and Drop Context */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="space-y-3">
                                <SortableContext
                                    items={items.map(i => i.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {items.map((item, index) => (
                                        <SortableItem
                                            key={item.id}
                                            item={item}
                                            index={index}
                                            products={products}
                                            updateItem={updateItem}
                                            removeItem={removeItem}
                                            handleProductSelect={handleProductSelect}
                                            isAdmin={isAdmin}
                                            isLocked={isLocked}
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        </DndContext>

                        {items.length === 0 && (
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl py-12 text-center text-slate-400">
                                <ShoppingBag className="mx-auto mb-2 opacity-20" size={48} />
                                <p>No items added yet. Click above to start.</p>
                            </div>
                        )}
                    </div>

                    {/* 3. Terms and Conditions Panel */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                                <ScrollText size={18} className="text-primary-500" />
                                <span>Terms & Conditions</span>
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Select Profile</label>
                                <select
                                    className="input h-10 text-sm"
                                    disabled={isLocked}
                                    value={quoteHeader.terms_id || ''}
                                    onChange={(e) => {
                                        const profileId = parseInt(e.target.value);
                                        const profile = termsProfiles.find(p => p.id === profileId);
                                        setQuoteHeader({
                                            ...quoteHeader,
                                            terms_id: profileId,
                                            terms_content: profile ? profile.content : ''
                                        });
                                        // Reset confirmation when profile changes
                                        setIsTermsConfirmed(false);
                                    }}
                                >
                                    <option value="">-- No Profile Selected --</option>
                                    {termsProfiles.map(profile => (
                                        <option key={profile.id} value={profile.id}>{profile.profile_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="label">Custom Terms Editor</label>
                                <div className="rounded-xl overflow-hidden shadow-sm">
                                    <ReactQuill
                                        theme="snow"
                                        value={quoteHeader.terms_content || ''}
                                        onChange={(content) => setQuoteHeader({ ...quoteHeader, terms_content: content })}
                                        modules={{
                                            toolbar: [
                                                ['bold', 'italic', 'underline'],
                                                [{ 'list': 'bullet' }],
                                                ['clean']
                                            ]
                                        }}
                                        readOnly={isLocked}
                                        placeholder="Enter specific terms for this quotation..."
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 italic">
                                    Note: You can select a template above and then customize it here uniquely for this quote.
                                </p>
                            </div>

                            {/* Confirmation Checkbox */}
                            <div className={cn(
                                "flex items-center space-x-3 p-4 rounded-xl border transition-all duration-300",
                                isTermsConfirmed ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                            )}>
                                <input
                                    type="checkbox"
                                    id="terms-confirm"
                                    disabled={isLocked}
                                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 cursor-pointer"
                                    checked={isTermsConfirmed}
                                    onChange={(e) => setIsTermsConfirmed(e.target.checked)}
                                />
                                <label
                                    htmlFor="terms-confirm"
                                    className={cn(
                                        "text-xs font-medium cursor-pointer select-none leading-none",
                                        isTermsConfirmed ? "text-emerald-800" : "text-slate-600"
                                    )}
                                >
                                    I have reviewed and confirmed that these Terms & Conditions are accurate for this specific quotation.
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Totals & VAT Config */}
                <div className="space-y-6">
                    <div className="card p-6 space-y-6 sticky top-24">
                        <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                            <Calculator size={20} className="text-primary-500" />
                            <span>Summary & Totals</span>
                        </h3>

                        {/* VAT Toggle */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                                <Receipt size={18} className="text-slate-400" />
                                <span>Apply UAE VAT (5%)</span>
                            </div>
                            <button
                                onClick={() => !isLocked && setQuoteHeader(prev => ({ ...prev, is_vat_applicable: !prev.is_vat_applicable }))}
                                disabled={isLocked}
                                className={cn(
                                    "w-11 h-6 rounded-full transition-colors relative",
                                    quoteHeader.is_vat_applicable ? "bg-primary-600" : "bg-slate-300",
                                    isLocked && "cursor-not-allowed opacity-70"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                                    quoteHeader.is_vat_applicable ? "translate-x-5" : ""
                                )} />
                            </button>
                        </div>

                        {/* Totals Breakdown */}
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal</span>
                                <span>AED {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>VAT (5%)</span>
                                <span>AED {totals.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* Delivery Charge UI */}
                            <div className="pt-3 border-t border-slate-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                                        <Plus size={16} className="text-slate-400" />
                                        <span>Delivery Charges</span>
                                    </div>
                                    <button
                                        onClick={() => !isLocked && setQuoteHeader(prev => ({ ...prev, is_delivery_applicable: !prev.is_delivery_applicable }))}
                                        disabled={isLocked}
                                        className={cn(
                                            "w-11 h-6 rounded-full transition-colors relative",
                                            quoteHeader.is_delivery_applicable ? "bg-primary-600" : "bg-slate-300",
                                            isLocked && "cursor-not-allowed opacity-70"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                                            quoteHeader.is_delivery_applicable ? "translate-x-5" : ""
                                        )} />
                                    </button>
                                </div>

                                {quoteHeader.is_delivery_applicable && (
                                    <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">AED</span>
                                            <input
                                                type="number"
                                                className="input h-9 pl-10 text-sm font-bold"
                                                placeholder="Amount"
                                                disabled={isLocked}
                                                value={quoteHeader.delivery_charges_aed}
                                                onChange={(e) => setQuoteHeader({ ...quoteHeader, delivery_charges_aed: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {quoteHeader.is_delivery_applicable && (
                                    <div className="flex justify-between text-slate-500 text-sm">
                                        <span>Delivery Total</span>
                                        <span>AED {totals.delivery.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex justify-between">
                                <span className="font-bold text-slate-900 text-lg">Grand Total</span>
                                <span className="font-bold text-primary-600 text-lg">AED {totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Admin Profit Insights */}
                        {isAdmin && (
                            <div className="pt-6 border-t border-slate-100 space-y-4">
                                <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <Percent size={12} />
                                    <span>Internal Margin Insights</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <span className="text-[10px] text-emerald-600 font-bold block mb-1">PROFIT</span>
                                        <span className="text-sm font-bold text-emerald-700">AED {totals.profit.toLocaleString()}</span>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <span className="text-[10px] text-blue-600 font-bold block mb-1">MARGIN</span>
                                        <span className="text-sm font-bold text-blue-700">{totals.margin.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-50 p-2 rounded-lg italic">
                                    <Info size={14} />
                                    <span>Visible to Admins only. Based on internal costs.</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .quill {
                    border-radius: 0.75rem;
                    background: white;
                }
                .ql-toolbar.ql-snow {
                    border-top-left-radius: 0.75rem;
                    border-top-right-radius: 0.75rem;
                    border-color: #e2e8f0;
                    background: #f8fafc;
                }
                .ql-container.ql-snow {
                    border-bottom-left-radius: 0.75rem;
                    border-bottom-right-radius: 0.75rem;
                    border-color: #e2e8f0;
                    min-height: 100px;
                    font-family: inherit;
                    font-size: 0.875rem;
                }
                .ql-editor {
                    min-height: 100px;
                }
                .ql-editor.ql-blank::before {
                    color: #94a3b8;
                    font-style: normal;
                }
            `}</style>
        </div>
    );
}

// --- Helper Components ---

function SortableItem({ item, index, products, updateItem, removeItem, handleProductSelect, isAdmin, isLocked }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const isBespokeReadOnly = item.type === 'bespoke' && !isAdmin;

    const handleNumberChange = (field, value) => {
        // Allow empty string for typing, otherwise parse
        if (value === '') {
            updateItem(item.id, { [field]: 0 });
            return;
        }
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && parsed >= 0) {
            updateItem(item.id, { [field]: parsed });
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden group">
            <div className="flex flex-col md:flex-row">
                {/* Drag Handle & Index */}
                <div className="bg-slate-50 flex md:flex-col items-center justify-between p-3 md:w-12 border-b md:border-b-0 md:border-r border-slate-100">
                    <div {...attributes} {...listeners} className={cn(
                        "transition-colors",
                        isLocked ? "cursor-not-allowed text-slate-200" : "cursor-grab hover:text-primary-500 text-slate-300"
                    )}>
                        <GripVertical size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                    <button
                        onClick={() => !isLocked && removeItem(item.id)}
                        disabled={isLocked}
                        className={cn(
                            "transition-colors",
                            isLocked ? "text-slate-200 cursor-not-allowed" : "text-slate-300 hover:text-rose-500"
                        )}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                {/* row Content */}
                <div className="flex-1 p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">

                        {/* 1. Item Identification & Thumbnail */}
                        <div className="md:col-span-2 lg:col-span-3 space-y-3">
                            <div className="flex items-start space-x-3">
                                {/* Interactive Thumbnail */}
                                <div className="relative group/thumb">
                                    <input
                                        type="file"
                                        id={`file-${item.id}`}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file || isLocked) return;
                                            const formData = new FormData();
                                            formData.append('image', file);
                                            try {
                                                const res = await fetch(`${API_BASE_URL}/api/upload`, {
                                                    method: 'POST',
                                                    body: formData
                                                });
                                                const data = await res.json();
                                                if (res.ok) updateItem(item.id, { image_url: data.imageUrl || data.image_url });
                                            } catch (err) {
                                                console.error('Upload failed', err);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => !isLocked && document.getElementById(`file-${item.id}`).click()}
                                        disabled={isLocked}
                                        className={cn(
                                            "w-12 h-12 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-400 overflow-hidden border transition-all relative",
                                            (item.image_url || item.imageUrl) ? "border-slate-200" : "border-dashed border-slate-300",
                                            !isLocked && "hover:border-primary-400 hover:text-primary-500",
                                            isLocked && "cursor-not-allowed opacity-70"
                                        )}
                                        title={isLocked ? "Locked" : "Click to upload/change photo"}
                                    >
                                        {(item.image_url || item.imageUrl) ? (
                                            <img src={item.image_url || item.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon size={20} className="opacity-40" />
                                        )}

                                        {/* Hover Overlay */}
                                        {!isLocked && (
                                            <div className="absolute inset-0 bg-primary-600/10 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                                <Plus size={16} className="text-primary-600" />
                                            </div>
                                        )}
                                    </button>
                                </div>

                                <div className="flex-1 relative">
                                    {item.type === 'catalog' ? (
                                        <>
                                            <div className="relative">
                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    className="input pl-9 h-9 text-sm"
                                                    placeholder="Search catalog..."
                                                    disabled={isLocked}
                                                    value={searchQuery || item.item_name}
                                                    onChange={(e) => {
                                                        setSearchQuery(e.target.value);
                                                        setShowSearch(true);
                                                    }}
                                                    onFocus={() => !isLocked && setShowSearch(true)}
                                                />
                                            </div>
                                            {showSearch && (
                                                <div className="absolute top-full left-0 w-full bg-white mt-1 border border-slate-200 rounded-lg shadow-xl z-10 max-h-40 overflow-y-auto">
                                                    {products.filter(p => p.item_name?.toLowerCase().includes((searchQuery || '').toLowerCase())).map(p => (
                                                        <button
                                                            key={p.id}
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                                            onClick={() => {
                                                                handleProductSelect(item.id, p);
                                                                setShowSearch(false);
                                                                setSearchQuery('');
                                                            }}
                                                        >
                                                            {p.item_name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <input
                                            type="text"
                                            className="input h-9 text-sm font-bold bg-slate-50"
                                            placeholder="Item Name (Bespoke)"
                                            disabled={isLocked || isBespokeReadOnly}
                                            value={item.item_name}
                                            onChange={(e) => updateItem(item.id, { item_name: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="rich-text-container">
                                <ReactQuill
                                    theme="snow"
                                    value={item.description_override}
                                    onChange={(content) => updateItem(item.id, { description_override: content })}
                                    placeholder="Detailed description..."
                                    readOnly={isLocked || isBespokeReadOnly}
                                    modules={{
                                        toolbar: [
                                            ['bold', 'italic', 'underline'],
                                            [{ 'list': 'bullet' }]
                                        ]
                                    }}
                                />
                            </div>
                        </div>

                        {/* 2. Values Configuration */}
                        <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Quantity</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="input h-9 text-sm"
                                    disabled={isLocked}
                                    value={item.quantity}
                                    onChange={(e) => handleNumberChange('quantity', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Unit</label>
                                {item.type === 'catalog' ? (
                                    <input
                                        type="text"
                                        className="input h-9 text-sm bg-slate-50"
                                        value={item.unit_of_measure}
                                        disabled
                                    />
                                ) : (
                                    <select
                                        className="input h-9 text-sm"
                                        disabled={isLocked}
                                        value={item.unit_of_measure}
                                        onChange={(e) => updateItem(item.id, { unit_of_measure: e.target.value })}
                                    >
                                        <option value="SQM">SQM</option>
                                        <option value="Running Meter">RM</option>
                                        <option value="Unit">Piece</option>
                                        <option value="Job">Job</option>
                                    </select>
                                )}
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                                    {item.type === 'bespoke' ? 'Bespoke Pricing (Base vs Selling)' : 'Unit Price (AED)'}
                                </label>
                                <div className="flex items-center space-x-2">
                                    {item.type === 'bespoke' ? (
                                        <div className="flex items-center space-x-2 w-full">
                                            <div className="relative flex-1">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">BASE</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="input h-9 pl-10 text-[13px] bg-slate-50 italic text-slate-400"
                                                    placeholder="0.00"
                                                    disabled={isLocked || isBespokeReadOnly}
                                                    value={item.original_unit_price}
                                                    onChange={(e) => handleNumberChange('original_unit_price', e.target.value)}
                                                />
                                            </div>
                                            <div className="relative flex-1">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-primary-300">SALE</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="input h-9 pl-10 text-[13px] font-bold text-primary-600"
                                                    placeholder="0.00"
                                                    disabled={isLocked || isBespokeReadOnly}
                                                    value={item.discounted_unit_price}
                                                    onChange={(e) => handleNumberChange('discounted_unit_price', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="input h-9 text-sm font-bold text-primary-600"
                                                disabled={isLocked}
                                                value={item.discounted_unit_price}
                                                onChange={(e) => handleNumberChange('discounted_unit_price', e.target.value)}
                                            />
                                            {item.discounted_unit_price !== item.original_unit_price && (
                                                <span className="text-[10px] line-through text-slate-300">
                                                    {item.original_unit_price.toFixed(2)}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Cost Control */}
                        <div className="flex flex-col space-y-4 lg:col-span-1">
                            {isAdmin && (
                                <div className={cn(
                                    "p-2 rounded-lg border",
                                    item.type === 'catalog' ? "bg-slate-50 border-slate-200" : "bg-amber-50 border-amber-100"
                                )}>
                                    <label className={cn(
                                        "text-[9px] uppercase font-bold block mb-1",
                                        item.type === 'catalog' ? "text-slate-400" : "text-amber-600"
                                    )}>Int. Cost</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        disabled={isLocked || item.type === 'catalog' || isBespokeReadOnly}
                                        className={cn(
                                            "bg-transparent border-0 p-0 text-sm font-bold w-full focus:ring-0",
                                            (isLocked || item.type === 'catalog' || isBespokeReadOnly) ? "text-slate-400" : "text-amber-800"
                                        )}
                                        value={item.cost_price_snapshot}
                                        onChange={(e) => handleNumberChange('cost_price_snapshot', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. Row Total (Moved to Bottom) */}
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-end bg-slate-50/50 -mx-5 -mb-5 px-5 py-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Line Items Total</span>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-xs text-slate-400">AED</span>
                                <span className="text-xl font-bold text-slate-900">
                                    {item.row_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const statusMap = {
    'Draft': 'Draft Mode',
    'Sent': 'Official Proposal',
    'Approved': 'Signed / Won',
    'Rejected': 'Declined',
    'Revised': 'Revision Needed'
};
