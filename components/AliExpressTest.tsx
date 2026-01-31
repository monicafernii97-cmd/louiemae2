/**
 * AliExpress API Test Component
 * Temporary component to test the API integration
 */

import React, { useState } from 'react';
import { aliexpressService } from '../services/aliexpressService';
import type { AliExpressProduct } from '../types';

const AliExpressTest: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('minimalist furniture');
    const [products, setProducts] = useState<AliExpressProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

    const checkConfiguration = () => {
        const configured = aliexpressService.isConfigured();
        setIsConfigured(configured);
        if (!configured) {
            setError('API key not configured. Check your .env.local file.');
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        setError(null);
        setProducts([]);

        try {
            const result = await aliexpressService.searchProducts({
                query: searchQuery,
                pageSize: 10,
            });
            setProducts(result.products);
            console.log('Search result:', result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        checkConfiguration();
    }, []);

    return (
        <div style={{
            padding: '40px',
            maxWidth: '1200px',
            margin: '0 auto',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <h1 style={{ marginBottom: '20px' }}>🧪 AliExpress API Test</h1>

            {/* Configuration Status */}
            <div style={{
                padding: '20px',
                marginBottom: '20px',
                borderRadius: '8px',
                background: isConfigured ? '#d4edda' : '#f8d7da',
                border: `1px solid ${isConfigured ? '#c3e6cb' : '#f5c6cb'}`
            }}>
                <strong>API Status:</strong>{' '}
                {isConfigured === null ? 'Checking...' :
                    isConfigured ? '✅ Configured' : '❌ Not Configured'}
            </div>

            {/* Search Form */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        fontSize: '16px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                    }}
                />
                <button
                    onClick={handleSearch}
                    disabled={loading || !isConfigured}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        background: loading ? '#ccc' : '#000',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    padding: '15px',
                    marginBottom: '20px',
                    background: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: '6px',
                    color: '#c00'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Results */}
            {products.length > 0 && (
                <div>
                    <h2 style={{ marginBottom: '15px' }}>
                        Found {products.length} products
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '20px'
                    }}>
                        {products.map((product) => (
                            <div
                                key={product.id}
                                style={{
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    background: '#fff'
                                }}
                            >
                                {product.images[0] && (
                                    <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        style={{
                                            width: '100%',
                                            height: '200px',
                                            objectFit: 'cover'
                                        }}
                                    />
                                )}
                                <div style={{ padding: '15px' }}>
                                    <h3 style={{
                                        fontSize: '14px',
                                        marginBottom: '8px',
                                        lineHeight: '1.4',
                                        height: '40px',
                                        overflow: 'hidden'
                                    }}>
                                        {product.name}
                                    </h3>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            color: '#e44'
                                        }}>
                                            ${product.salePrice.toFixed(2)}
                                        </span>
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#888'
                                        }}>
                                            ⭐ {product.averageRating.toFixed(1)}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#666',
                                        marginTop: '8px'
                                    }}>
                                        {product.shippingInfo.freeShipping ?
                                            '🚚 Free shipping' :
                                            `🚚 $${product.shippingInfo.cost.toFixed(2)}`
                                        }
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Console Info */}
            <div style={{
                marginTop: '40px',
                padding: '20px',
                background: '#f5f5f5',
                borderRadius: '8px',
                fontSize: '14px'
            }}>
                <strong>Debug Info:</strong>
                <pre style={{ marginTop: '10px', overflow: 'auto' }}>
                    {JSON.stringify({
                        isConfigured,
                        productsLoaded: products.length,
                        cacheStats: aliexpressService.getCacheStats(),
                    }, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default AliExpressTest;
