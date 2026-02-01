import React, { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Wifi, RefreshCw, Settings, CheckCircle, XCircle, Loader2, Package, Clock, AlertTriangle } from 'lucide-react';

export const CJSettings: React.FC = () => {
    const testConnection = useAction(api.cjActions.testConnection);
    const configureWebhooks = useAction(api.cjActions.configureWebhooks);
    const syncTracking = useAction(api.cjActions.syncTracking);
    const checkSourcing = useAction(api.cjActions.checkSourcingStatus);

    // Product sourcing queries
    const pendingProducts = useQuery(api.products.getPendingSourcing) || [];
    const recentlyApproved = useQuery(api.products.getRecentlyApproved) || [];
    const rejectedProducts = useQuery(api.products.getRejectedProducts) || [];

    const [testing, setTesting] = useState(false);
    const [configuring, setConfiguring] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [checkingSourcing, setCheckingSourcing] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleTestConnection = async () => {
        setTesting(true);
        setResult(null);
        try {
            const res = await testConnection({});
            setResult(res);
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setTesting(false);
        }
    };

    const handleConfigureWebhooks = async () => {
        setConfiguring(true);
        setResult(null);
        try {
            const res = await configureWebhooks({});
            setResult(res);
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setConfiguring(false);
        }
    };

    const handleSyncTracking = async () => {
        setSyncing(true);
        setResult(null);
        try {
            const res = await syncTracking({});
            setResult({
                success: true,
                message: `Synced ${res.synced} orders${res.errors > 0 ? `, ${res.errors} errors` : ''}`
            });
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setSyncing(false);
        }
    };

    const handleCheckSourcing = async () => {
        setCheckingSourcing(true);
        setResult(null);
        try {
            const res = await checkSourcing({});
            setResult({
                success: true,
                message: `Checked ${res.checked} products: ${res.approved} approved, ${res.rejected} rejected`
            });
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setCheckingSourcing(false);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h2 className="font-serif text-3xl text-earth mb-2">CJ Dropshipping</h2>
                <p className="text-earth/50 text-sm">Configure CJ Dropshipping integration settings</p>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Test Connection */}
                <div className="bg-white rounded-lg border border-earth/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Wifi className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-earth">API Connection</h3>
                            <p className="text-xs text-earth/50">Test CJ API access</p>
                        </div>
                    </div>
                    <button
                        onClick={handleTestConnection}
                        disabled={testing}
                        className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {testing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Wifi className="w-4 h-4" />
                        )}
                        {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                </div>

                {/* Configure Webhooks */}
                <div className="bg-white rounded-lg border border-earth/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-earth">Webhooks</h3>
                            <p className="text-xs text-earth/50">Enable real-time updates</p>
                        </div>
                    </div>
                    <button
                        onClick={handleConfigureWebhooks}
                        disabled={configuring}
                        className="w-full py-2 px-4 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {configuring ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Settings className="w-4 h-4" />
                        )}
                        {configuring ? 'Configuring...' : 'Configure Webhooks'}
                    </button>
                </div>

                {/* Sync Tracking */}
                <div className="bg-white rounded-lg border border-earth/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-earth">Tracking Sync</h3>
                            <p className="text-xs text-earth/50">Fetch latest tracking</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSyncTracking}
                        disabled={syncing}
                        className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {syncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </div>

                {/* Check Sourcing */}
                <div className="bg-white rounded-lg border border-earth/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-earth">Check Sourcing</h3>
                            <p className="text-xs text-earth/50">Check pending products</p>
                        </div>
                    </div>
                    <button
                        onClick={handleCheckSourcing}
                        disabled={checkingSourcing}
                        className="w-full py-2 px-4 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {checkingSourcing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Package className="w-4 h-4" />
                        )}
                        {checkingSourcing ? 'Checking...' : 'Check Now'}
                    </button>
                </div>
            </div>

            {/* Result Message */}
            {result && (
                <div className={`p-4 rounded-lg flex items-center gap-3 mb-8 ${result.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {result.success ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span>{result.message}</span>
                </div>
            )}

            {/* Product Sourcing Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Pending Products */}
                <div className="bg-white rounded-lg border border-earth/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-5 h-5 text-amber-500" />
                        <h3 className="font-medium text-earth">Pending Sourcing</h3>
                        <span className="ml-auto bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">
                            {pendingProducts.length}
                        </span>
                    </div>
                    {pendingProducts.length === 0 ? (
                        <p className="text-sm text-earth/50">No products pending approval</p>
                    ) : (
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                            {pendingProducts.slice(0, 5).map((product: any) => (
                                <li key={product._id} className="flex items-center gap-2 text-sm">
                                    {product.images?.[0] && (
                                        <img src={product.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                                    )}
                                    <span className="truncate">{product.name}</span>
                                </li>
                            ))}
                            {pendingProducts.length > 5 && (
                                <li className="text-xs text-earth/50">+{pendingProducts.length - 5} more</li>
                            )}
                        </ul>
                    )}
                </div>

                {/* Recently Approved */}
                <div className="bg-white rounded-lg border border-earth/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <h3 className="font-medium text-earth">Recently Approved</h3>
                        <span className="ml-auto bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                            {recentlyApproved.length}
                        </span>
                    </div>
                    {recentlyApproved.length === 0 ? (
                        <p className="text-sm text-earth/50">No recently approved products</p>
                    ) : (
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                            {recentlyApproved.slice(0, 5).map((product: any) => (
                                <li key={product._id} className="flex items-center gap-2 text-sm">
                                    {product.images?.[0] && (
                                        <img src={product.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <span className="truncate block">{product.name}</span>
                                        <span className="text-xs text-green-600">CJ: {product.cjVariantId || product.cjSku}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Rejected Products */}
                <div className="bg-white rounded-lg border border-earth/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <h3 className="font-medium text-earth">Rejected</h3>
                        <span className="ml-auto bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                            {rejectedProducts.length}
                        </span>
                    </div>
                    {rejectedProducts.length === 0 ? (
                        <p className="text-sm text-earth/50">No rejected products</p>
                    ) : (
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                            {rejectedProducts.slice(0, 5).map((product: any) => (
                                <li key={product._id} className="flex items-center gap-2 text-sm">
                                    {product.images?.[0] && (
                                        <img src={product.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <span className="truncate block">{product.name}</span>
                                        <span className="text-xs text-red-600">{product.cjSourcingError || 'Rejected'}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Info Box */}
            <div className="p-6 bg-cream/30 rounded-lg border border-earth/10">
                <h4 className="font-medium text-earth mb-3">How It Works</h4>
                <ul className="space-y-2 text-sm text-earth/70">
                    <li className="flex items-start gap-2">
                        <span className="font-medium text-earth">1.</span>
                        <span><strong>Import Products</strong> - Products from AliExpress are auto-submitted to CJ for sourcing</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-medium text-earth">2.</span>
                        <span><strong>Pending</strong> - Products stay hidden from customers while awaiting CJ approval</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-medium text-earth">3.</span>
                        <span><strong>Approved</strong> - Once CJ approves, the product appears on your store and can be fulfilled</span>
                    </li>
                </ul>
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 text-blue-700 text-sm">
                    <strong>Auto-check:</strong> Sourcing status is checked every 2 hours automatically.
                    Click "Check Now" to check immediately.
                </div>
            </div>
        </div>
    );
};
