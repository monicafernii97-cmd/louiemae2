import React, { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Wifi, RefreshCw, Settings, CheckCircle, XCircle, Loader2, Package, Clock, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';
import { FadeIn } from './FadeIn';

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

    // Action Card Component
    const ActionCard = ({ icon: Icon, title, description, loading, onClick, colorClass = "text-bronze" }: any) => (
        <div
            onClick={loading ? undefined : onClick}
            className="group relative bg-white border border-earth/5 p-8 shadow-sm hover:shadow-[0_20px_40px_-10px_rgba(74,59,50,0.1)] transition-all duration-500 cursor-pointer overflow-hidden rounded-sm"
        >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <ArrowRight className="w-5 h-5 text-earth/20" />
            </div>

            <div className={`mb-6 p-4 bg-cream/50 inline-block rounded-full group-hover:scale-110 transition-transform duration-500 ${loading ? 'animate-pulse' : ''}`}>
                <Icon className={`w-6 h-6 ${colorClass}`} />
            </div>

            <h3 className="font-serif text-xl text-earth mb-2">{title}</h3>
            <p className="text-xs text-earth/50 leading-relaxed mb-6 h-8">{description}</p>

            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-earth/40 group-hover:text-bronze transition-colors">
                {loading ? (
                    <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Processing...</span>
                    </>
                ) : (
                    <span>Execute Task</span>
                )}
            </div>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div className="mb-12">
                <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Integration Center</span>
                <h1 className="font-serif text-4xl text-earth">CJ Dropshipping Link</h1>
            </div>

            {/* Notification Banner */}
            {result && (
                <FadeIn className="mb-8">
                    <div className={`p-4 border-l-2 flex items-center gap-4 shadow-sm ${result.success
                            ? 'bg-green-50/50 border-green-500 text-green-900'
                            : 'bg-red-50/50 border-red-500 text-red-900'
                        }`}>
                        <div className={`p-2 rounded-full ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                            {result.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <span className="text-sm tracking-wide font-medium">{result.message}</span>
                        <button onClick={() => setResult(null)} className="ml-auto opacity-50 hover:opacity-100">
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                </FadeIn>
            )}

            {/* Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                <FadeIn delay={100}>
                    <ActionCard
                        icon={Wifi}
                        title="API Connection"
                        description="Test connectivity to CJ platform securely."
                        loading={testing}
                        onClick={handleTestConnection}
                    />
                </FadeIn>
                <FadeIn delay={200}>
                    <ActionCard
                        icon={Settings}
                        title="Webhooks"
                        description="Configure real-time event listeners."
                        loading={configuring}
                        onClick={handleConfigureWebhooks}
                    />
                </FadeIn>
                <FadeIn delay={300}>
                    <ActionCard
                        icon={Package}
                        title="Check Status"
                        description="Verify product sourcing approvals."
                        loading={checkingSourcing}
                        onClick={handleCheckSourcing}
                    />
                </FadeIn>
                <FadeIn delay={400}>
                    <ActionCard
                        icon={RefreshCw}
                        title="Sync Tracking"
                        description="Update latest shipment locations."
                        loading={syncing}
                        onClick={handleSyncTracking}
                    />
                </FadeIn>
            </div>

            {/* Sourcing Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* Panel 1: Pending */}
                <FadeIn delay={500} className="lg:col-span-1">
                    <div className="bg-white border border-earth/5 p-8 shadow-[0_20px_50px_-12px_rgba(74,59,50,0.05)] h-full">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-earth/5">
                            <h3 className="font-serif text-2xl text-earth">Pending Review</h3>
                            <span className="bg-amber-100/50 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                {pendingProducts.length}
                            </span>
                        </div>

                        {pendingProducts.length === 0 ? (
                            <div className="text-center py-12 opacity-40">
                                <Clock className="w-8 h-8 mx-auto mb-3" />
                                <p className="text-xs uppercase tracking-widest">All Clear</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                                {pendingProducts.map((product: any) => (
                                    <div key={product._id} className="flex gap-4 items-center group p-2 hover:bg-cream/30 transition-colors rounded-sm cursor-default">
                                        <div className="w-12 h-16 bg-cream/50 overflow-hidden relative border border-earth/5">
                                            {product.images?.[0] ? (
                                                <img src={product.images[0]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-earth/20"><Package className="w-4 h-4" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-earth text-sm truncate">{product.name}</h4>
                                            <p className="text-[10px] uppercase tracking-wider text-earth/40 mt-1">Awaiting CJ Approval</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </FadeIn>

                {/* Panel 2 & 3: Approved & Rejected (Stacked on Mobile, Split on LG) */}
                <FadeIn delay={600} className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Approved */}
                    <div className="bg-white border border-earth/5 p-8 shadow-[0_20px_50px_-12px_rgba(74,59,50,0.05)]">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-earth/5">
                            <h3 className="font-serif text-2xl text-earth">Recently Approved</h3>
                            <span className="bg-green-100/50 text-green-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                {recentlyApproved.length}
                            </span>
                        </div>

                        {recentlyApproved.length === 0 ? (
                            <div className="text-center py-12 opacity-40">
                                <CheckCircle className="w-8 h-8 mx-auto mb-3" />
                                <p className="text-xs uppercase tracking-widest">No New Items</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar">
                                {recentlyApproved.map((product: any) => (
                                    <div key={product._id} className="flex gap-4 items-center group p-2 hover:bg-cream/30 transition-colors rounded-sm">
                                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-earth text-sm truncate">{product.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded-sm">Live</span>
                                                <span className="text-[9px] text-earth/30 font-mono">{product.cjVariantId || 'Variant ID'}</span>
                                            </div>
                                        </div>
                                        <a href={`https://cjdropshipping.com/product/${product.cjVariantId}`} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:text-bronze">
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Rejected */}
                    <div className="bg-white border border-earth/5 p-8 shadow-[0_20px_50px_-12px_rgba(74,59,50,0.05)]">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-earth/5">
                            <h3 className="font-serif text-2xl text-earth">Requires Attention</h3>
                            <span className="bg-red-100/50 text-red-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                {rejectedProducts.length}
                            </span>
                        </div>

                        {rejectedProducts.length === 0 ? (
                            <div className="text-center py-12 opacity-40">
                                <CheckCircle className="w-8 h-8 mx-auto mb-3 text-green-500" />
                                <p className="text-xs uppercase tracking-widest">All Good</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar">
                                {rejectedProducts.map((product: any) => (
                                    <div key={product._id} className="flex gap-4 items-center group p-2 hover:bg-red-50/30 transition-colors rounded-sm border-l-2 border-transparent hover:border-red-500">
                                        <div className="shrink-0">
                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-earth text-sm truncate">{product.name}</h4>
                                            <p className="text-[10px] text-red-600 mt-1 truncate max-w-full">
                                                {product.cjSourcingError || 'Rejected by CJ'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </FadeIn>
            </div>

            {/* Knowledge Base / Footer Info */}
            <FadeIn delay={700} className="mt-16 pt-8 border-t border-earth/5 opacity-60 hover:opacity-100 transition-opacity duration-500">
                <div className="flex flex-col md:flex-row gap-8 text-xs text-earth/50 leading-relaxed font-sans">
                    <div className="flex-1">
                        <strong className="block text-earth uppercase tracking-widest mb-2">Automated Workflow</strong>
                        <p>Products imported from AliExpress are automatically submitted to CJ for sourcing. They remain "Pending" and hidden from the storefront until CJ approves the sourcing request. Once approved, they automatically go live.</p>
                    </div>
                    <div className="flex-1">
                        <strong className="block text-earth uppercase tracking-widest mb-2">System Sync</strong>
                        <p>The system automatically checks for status updates every 2 hours. Use "Check Status" above to force an immediate check. Tracking numbers are synced daily for all fulfilled orders.</p>
                    </div>
                </div>
            </FadeIn>
        </div>
    );
};
