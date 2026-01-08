import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Package, Ruler, Globe, Tag, Image } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { API_BASE_URL } from '../config';

export default function ProductForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        item_name: '',
        product_description: '',
        origin: '',
        unit: 'SQM',
        base_price: '',
        cost_price: '',
        image_url: ''
    });

    useEffect(() => {
        if (isEditing) {
            fetchProduct();
        }
    }, [id]);

    const fetchProduct = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
            const data = await res.json();
            setFormData(data);
        } catch (error) {
            console.error('Error fetching product:', error);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('image', file);

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: uploadData
            });
            const data = await res.json();
            if (res.ok) {
                setFormData({ ...formData, image_url: data.imageUrl });
            } else {
                alert(data.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const url = isEditing
            ? `${API_BASE_URL}/api/products/${id}`
            : `${API_BASE_URL}/api/products`;

        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                navigate('/products');
            } else {
                alert('Failed to save product');
            }
        } catch (error) {
            console.error('Error saving product:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => navigate('/products')}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-display font-bold text-slate-900">
                        {isEditing ? 'Edit Product' : 'Add New Product'}
                    </h1>
                    <p className="text-slate-500">Manage catalog item details.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card space-y-8">
                {/* Basic Details */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Product Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Item</label>
                            <div className="relative">
                                <Tag size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    className="input pl-10"
                                    placeholder="e.g. Crema Marfil Premium"
                                    value={formData.item_name || ''}
                                    onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                            <div className="rich-text-container">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.product_description || ''}
                                    onChange={(content) => setFormData(prev => ({ ...prev, product_description: content }))}
                                    placeholder="Detailed product description..."
                                    modules={{
                                        toolbar: [
                                            ['bold', 'italic', 'underline'],
                                            [{ 'list': 'bullet' }]
                                        ]
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Origin</label>
                            <div className="relative">
                                <Globe size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    className="input pl-10"
                                    placeholder="e.g. Spain"
                                    value={formData.origin || ''}
                                    onChange={e => setFormData({ ...formData, origin: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
                            <div className="relative">
                                <Ruler size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    className="input pl-10 appearance-none bg-white"
                                    value={formData.unit}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="SQM">Square Meter (SQM)</option>
                                    <option value="Running Meter">Running Meter</option>
                                    <option value="Unit">Unit / Piece</option>
                                    <option value="Job">Job / Service</option>
                                </select>
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Product Image</label>
                            <div className="flex items-start space-x-4">
                                {formData.image_url && (
                                    <div className="w-32 h-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex-shrink-0">
                                        <img
                                            src={formData.image_url}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="flex items-center justify-center w-full">
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <Image size={28} className="text-slate-400 mb-2" />
                                                <p className="mb-1 text-sm text-slate-500 font-bold">Click to upload</p>
                                                <p className="text-xs text-slate-400">PNG, JPG or WebP</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                            />
                                        </label>
                                    </div>
                                    {formData.image_url && (
                                        <p className="mt-2 text-xs text-slate-400 truncate">
                                            Current: {formData.image_url}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Pricing & Costing</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Base Price (AED) <span className="text-xs text-slate-400 ml-1">(Public)</span></label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">AED</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="input pl-12 font-bold text-slate-800"
                                    placeholder="0.00"
                                    value={formData.base_price}
                                    onChange={e => setFormData({ ...formData, base_price: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Cost Price (AED) <span className="text-xs text-emerald-600 font-bold ml-1">(Internal Only)</span></label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">AED</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="input pl-12 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/20"
                                    placeholder="0.00"
                                    value={formData.cost_price}
                                    onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => navigate('/products')}
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
                        <span>{loading ? 'Saving...' : 'Save Product'}</span>
                    </button>
                </div>
            </form>

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
                    min-height: 150px;
                    font-family: inherit;
                    font-size: 0.875rem;
                }
                .ql-editor {
                    min-height: 150px;
                }
                .ql-editor.ql-blank::before {
                    color: #94a3b8;
                    font-style: normal;
                }
                .rich-text-container .ql-editor ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin: 0.5rem 0;
                }
                .rich-text-container .ql-editor ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin: 0.5rem 0;
                }
            `}</style>
        </div>
    );
}
