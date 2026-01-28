import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ArrowRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProductClick: (productId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onProductClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const products = useQuery(api.products.list) || [];

    // Filter products based on search term
    const filteredProducts = products.filter(product => {
        const term = searchTerm.toLowerCase();
        return (
            product.name.toLowerCase().includes(term) ||
            product.description.toLowerCase().includes(term) ||
            product.category.toLowerCase().includes(term) ||
            product.collection.toLowerCase().includes(term)
        );
    });

    // Auto-focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleProductClick = (productId: string) => {
        onProductClick(productId);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-cream/98 backdrop-blur-sm">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-6 md:px-12 border-b border-earth/10">
                <div className="flex flex-col">
                    <span className="font-serif text-2xl text-earth italic tracking-tight">Search</span>
                    <span className="text-[0.5rem] uppercase tracking-[0.3em] text-bronze/70">Find Products</span>
                </div>
                <button
                    onClick={onClose}
                    className="group relative w-10 h-10 flex items-center justify-center rounded-full border border-earth/10 hover:border-earth/30 transition-all duration-300"
                >
                    <X className="w-5 h-5 text-earth group-hover:rotate-90 transition-transform duration-500" />
                </button>
            </div>

            {/* Search Input */}
            <div className="px-6 md:px-12 py-8">
                <div className="max-w-2xl mx-auto relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-earth/40" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search for furniture, decor, and more..."
                        className="w-full bg-white/80 border border-earth/10 rounded-full py-4 pl-12 pr-6 text-earth placeholder:text-earth/40 focus:outline-none focus:border-bronze/40 focus:ring-2 focus:ring-bronze/10 transition-all duration-300 font-sans"
                    />
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-12">
                <div className="max-w-5xl mx-auto">
                    {searchTerm.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-earth/50 text-sm">Start typing to search products...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-earth/50 text-sm">No products found for "{searchTerm}"</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-earth/50 mb-6">
                                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} found
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {filteredProducts.map(product => (
                                    <button
                                        key={product._id}
                                        onClick={() => handleProductClick(product._id)}
                                        className="group text-left bg-white/60 rounded-2xl overflow-hidden border border-earth/5 hover:border-bronze/20 hover:shadow-lg transition-all duration-300"
                                    >
                                        <div className="aspect-square overflow-hidden bg-sand/20">
                                            {product.images && product.images[0] ? (
                                                <img
                                                    src={product.images[0]}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-earth/20">
                                                    No Image
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-serif text-sm text-earth group-hover:text-bronze transition-colors line-clamp-1">
                                                {product.name}
                                            </h3>
                                            <p className="text-[0.6rem] uppercase tracking-[0.15em] text-earth/50 mt-1">
                                                {product.category}
                                            </p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-bronze font-medium text-sm">${product.price}</span>
                                                <ArrowRight className="w-3 h-3 text-earth/30 group-hover:text-bronze group-hover:translate-x-1 transition-all duration-300" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
