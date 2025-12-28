import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, PlusCircle, Search, Ruler, Package, Edit, Loader } from 'lucide-react';
import { cn } from '../utils/cn';
import { API_BASE_URL } from '../config';

export default function ProductsList() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/products`);
            const data = await res.json();
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.product_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.item_name && p.item_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.origin && p.origin.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Products (Catalog)</h1>
                    <p className="text-slate-500 mt-1">Manage your stone types and services.</p>
                </div>
                <button
                    onClick={() => navigate('/products/new')}
                    className="btn-primary flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/20"
                >
                    <PlusCircle size={20} />
                    <span>Add Product</span>
                </button>
            </div>

            {/* Filters */}
            <div className="card p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Item, Description or Origin..."
                        className="input pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Products Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-sm">Item Name</th>
                                <th className="px-6 py-4 font-bold text-sm">Origin</th>
                                <th className="px-6 py-4 font-bold text-sm">Unit</th>
                                <th className="px-6 py-4 font-bold text-sm text-right">Base Price (AED)</th>
                                <th className="px-6 py-4 font-bold text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center space-x-2">
                                            <Loader className="animate-spin" />
                                            <span>Loading catalog...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        No products found.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors overflow-hidden">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-800 block">{product.item_name || 'Unnamed Item'}</span>
                                                    {product.product_description && (
                                                        <span className="text-xs text-slate-400 line-clamp-1">
                                                            {product.product_description.replace(/<[^>]*>?/gm, '')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{product.origin || '-'}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="inline-flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded text-xs font-medium">
                                                <Ruler size={12} />
                                                <span>{product.unit}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-right text-slate-900">
                                            {Number(product.base_price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right">
                                            <button
                                                onClick={() => navigate(`/products/${product.id}`)}
                                                className="text-primary-600 hover:text-primary-700 font-medium p-2 hover:bg-primary-50 rounded-full transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
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
                            Showing <span className="font-bold text-slate-900">{indexOfFirstItem + 1}</span> to <span className="font-bold text-slate-900">{Math.min(indexOfLastItem, filteredProducts.length)}</span> of <span className="font-bold text-slate-900">{filteredProducts.length}</span> products
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
