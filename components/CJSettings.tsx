import React, { useState } from 'react';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Wifi, RefreshCw, Settings, CheckCircle, XCircle, Loader2, Package, Clock, AlertTriangle, ArrowRight, ExternalLink, Trash2 } from 'lucide-react';
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
    const [deletingId, setDeletingId] = useState<Id<"products"> | null>(null);

    // Use the admin products.adminRemove mutation for deleting (no auth required)
    const deleteProduct = useMutation(api.products.adminRemove);

    const handleDeleteProduct = async (id: Id<"products">, productName: string, _cjSourcingId?: string) => {
        console.log("Delete button clicked for:", productName, id);

        const confirmed = window.confirm(`Remove "${productName}" from import queue? This cannot be undone.`);
        console.log("User confirmed:", confirmed);

        if (!confirmed) {
            console.log("User cancelled deletion");
            return;
        }

        console.log("Starting deletion process...");
        setDeletingId(id);

        try {
            console.log("Calling deleteProduct mutation with id:", id);
            await deleteProduct({ id });
            console.log("Delete successful!");
            setResult({ success: true, message: `"${productName}" removed successfully` });
        } catch (error: any) {
            console.error("Delete failed with error:", error);
            setResult({ success: false, message: error.message || 'Failed to remove product' });
        } finally {
            console.log("Deletion process complete, resetting state");
            setDeletingId(null);
        }
    };

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

    // Action Card Component (Refined & Minimalist)
    const ActionCard = ({ icon: Icon, title, description, loading, onClick, colorClass = "text-bronze" }: any) => (
        <div
            onClick={loading ? undefined : onClick}
            className="group relative backdrop-blur-xl bg-white/60 border border-white/40 p-6 shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer overflow-hidden rounded-xl hover:-translate-y-1"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg bg-white/50 backdrop-blur-md shadow-sm border border-white/20 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                </div>
                <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="w-4 h-4 text-earth/30" />
                </div>
            </div>

            <div className="relative z-10">
                <h3 className="font-serif text-lg text-earth font-medium mb-1 group-hover:text-bronze transition-colors">{title}</h3>
                <p className="text-xs text-earth/50 leading-relaxed font-sans line-clamp-2">{description}</p>
            </div>

            {loading && (
                <div className="absolute bottom-4 right-4 animate-pulse">
                    <Loader2 className="w-4 h-4 text-bronze animate-spin" />
                </div>
            )}
        </div>
    );

    return (
        <div className="relative min-h-screen overflow-hidden p-8">
            {/* Animated Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-bronze/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
                <div className="absolute top-0 -right-4 w-72 h-72 bg-sand/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cream-dark/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
            </div>

            {/* Header */}
            <div className="mb-12 relative z-10">
                <FadeIn>
                    <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-3 block font-medium">Integration Center</span>
                    <h1 className="font-serif text-5xl text-earth drop-shadow-sm">CJ Dropshipping Link</h1>
                </FadeIn>
            </div>

            {/* Notification Banner */}
            {result && (
                <FadeIn className="mb-8 relative z-20">
                    <div className={`p-4 border border-white/50 backdrop-blur-md rounded-xl flex items-center gap-4 shadow-lg ${result.success
                        ? 'bg-green-50/40 text-green-800'
                        : 'bg-red-50/40 text-red-800'
                        }`}>
                        {result.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        <span className="font-medium tracking-wide text-sm">{result.message}</span>
                        <button onClick={() => setResult(null)} className="ml-auto hover:bg-black/5 p-1 rounded-full transition-colors">
                            <XCircle className="w-4 h-4 opacity-50" />
                        </button>
                    </div>
                </FadeIn>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">

                {/* Panel 1: Main Controls */}
                <div className="space-y-8">
                    <FadeIn delay={100}>
                        <h2 className="font-serif text-2xl text-earth mb-6 flex items-center gap-3">
                            <Settings className="w-5 h-5 text-bronze/60" />
                            System Controls
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ActionCard
                                icon={Wifi}
                                title="Connection"
                                description="Verify API connectivity with CJ."
                                onClick={handleTestConnection}
                                loading={testing}
                                colorClass="text-green-600"
                            />

                            <ActionCard
                                icon={ExternalLink}
                                title="Webhooks"
                                description="Setup status callbacks."
                                onClick={handleConfigureWebhooks}
                                loading={configuring}
                                colorClass="text-amber-500"
                            />

                            <ActionCard
                                icon={RefreshCw}
                                title="Tracking"
                                description="Pull latest tracking numbers."
                                onClick={handleSyncTracking}
                                loading={syncing}
                                colorClass="text-green-500"
                            />

                            <ActionCard
                                icon={Package}
                                title="Sourcing"
                                description="Update sourcing status."
                                onClick={handleCheckSourcing}
                                loading={checkingSourcing}
                                colorClass="text-amber-500"
                            />
                        </div>
                    </FadeIn>
                </div>

                {/* Panel 2 & 3: Product Import Pipeline */}
                <div className="lg:col-span-2 space-y-8">
                    <FadeIn delay={200}>
                        <h2 className="font-serif text-2xl text-earth mb-6 flex items-center gap-3">
                            <Clock className="w-5 h-5 text-bronze/60" />
                            Import Pipeline
                        </h2>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Pending Products - Glass Panel */}
                        <FadeIn delay={300} className="h-full">
                            <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-2xl p-6 shadow-xl h-full flex flex-col relative overflow-hidden group">
                                <div className="flex items-center gap-4 mb-6 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                                        <Clock className="w-6 h-6 text-earth/60" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif text-xl text-earth leading-tight">Pending Review</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                            <span className="text-[10px] uppercase tracking-wider text-earth/50 font-medium">
                                                {pendingProducts.length} Items Waiting
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {pendingProducts.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-earth/30 py-12">
                                        <CheckCircle className="w-12 h-12 mb-3 opacity-50" />
                                        <p className="text-sm">All cleared</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 relative z-10 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {pendingProducts.map((product) => (
                                            <div key={product._id} className="group/item flex items-center justify-between bg-white/40 hover:bg-white/60 border border-white/40 p-3 rounded-xl transition-all hover:shadow-md hover:scale-[1.01]">
                                                <div className="flex items-center flex-1 min-w-0 mr-4">
                                                    {/* Image Preview */}
                                                    <div className="h-10 w-10 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20 overflow-hidden flex-shrink-0 mr-3 relative shadow-sm">
                                                        {product.images && product.images[0] ? (
                                                            <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-earth/20">
                                                                <Package className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h4 className="font-medium text-earth text-sm truncate font-serif leading-tight">{product.name}</h4>
                                                        <p className="text-[10px] uppercase tracking-wider text-earth/40 mt-0.5 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                                            Awaiting CJ
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteProduct(product._id, product.name, product.cjSourcingId)}
                                                    disabled={deletingId === product._id}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50/50 rounded-full transition-all disabled:opacity-50 backdrop-blur-sm"
                                                    title="Remove from import"
                                                >
                                                    {deletingId === product._id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </FadeIn>

                        {/* Rejected & Approved Stack */}
                        <div className="space-y-8">

                            {/* Approved - Glass Panel */}
                            <FadeIn delay={400}>
                                <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                                    <div className="flex items-center gap-4 mb-6 relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-green-50/50 backdrop-blur-md border border-green-100 flex items-center justify-center shadow-sm">
                                            <CheckCircle className="w-5 h-5 text-green-600/80" />
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-lg text-earth leading-tight">Recently Approved</h3>
                                            <span className="text-[10px] uppercase tracking-wider text-green-700/60 font-medium block mt-0.5">
                                                {recentlyApproved.length} Live Items
                                            </span>
                                        </div>
                                    </div>

                                    {recentlyApproved.length === 0 ? (
                                        <div className="py-8 text-center text-earth/30 text-sm">No recent approvals</div>
                                    ) : (
                                        <div className="space-y-3 relative z-10">
                                            {recentlyApproved.slice(0, 3).map((product) => (
                                                <div key={product._id} className="flex items-center gap-3 text-sm text-earth/70 bg-green-50/30 border border-green-100/50 p-3 rounded-lg backdrop-blur-sm">
                                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                    <span className="truncate">{product.name}</span>
                                                </div>
                                            ))}
                                            {recentlyApproved.length > 3 && (
                                                <div className="text-center text-xs text-earth/40 italic mt-2">
                                                    + {recentlyApproved.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </FadeIn>

                            {/* Rejected - Glass Panel */}
                            <FadeIn delay={500}>
                                <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                                    <div className="flex items-center gap-4 mb-6 relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-red-50/50 backdrop-blur-md border border-red-100 flex items-center justify-center shadow-sm">
                                            <AlertTriangle className="w-5 h-5 text-red-500/80" />
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-lg text-earth leading-tight">Requires Attention</h3>
                                            <span className="text-[10px] uppercase tracking-wider text-red-700/60 font-medium block mt-0.5">
                                                {rejectedProducts.length} Issues Found
                                            </span>
                                        </div>
                                    </div>

                                    {rejectedProducts.length === 0 ? (
                                        <div className="py-8 text-center text-earth/30 text-sm">No issues found</div>
                                    ) : (
                                        <div className="space-y-3 relative z-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {rejectedProducts.map((product) => (
                                                <div key={product._id} className="group/item bg-red-50/30 border border-red-100/50 p-4 rounded-xl backdrop-blur-sm hover:bg-red-50/50 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-medium text-earth text-sm truncate pr-2 font-serif">{product.name}</h4>
                                                        <button
                                                            onClick={() => handleDeleteProduct(product._id, product.name, product.cjSourcingId)}
                                                            disabled={deletingId === product._id}
                                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100/50 rounded-full transition-all disabled:opacity-50"
                                                            title="Remove from catalog"
                                                        >
                                                            {deletingId === product._id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                                                        <p className="text-[10px] text-red-600/80 leading-snug">
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
                    </div>
                </div>
            </div>

            {/* Knowledge Base / Footer Info */}
            <FadeIn delay={700} className="mt-16 pt-8 border-t border-earth/5 mix-blend-multiply opacity-60 hover:opacity-100 transition-opacity duration-500 relative z-10">
                <div className="flex flex-col md:flex-row gap-8 text-xs text-earth/50 leading-relaxed font-sans backdrop-blur-sm bg-white/20 p-6 rounded-2xl border border-white/30">
                    <div className="flex-1">
                        <strong className="block text-earth uppercase tracking-widest mb-2 font-bold">Automated Workflow</strong>
                        <p>Products imported from AliExpress are automatically submitted to CJ for sourcing. They remain "Pending" and hidden from the storefront until CJ approves the sourcing request. Once approved, they automatically go live.</p>
                    </div>
                    <div className="flex-1">
                        <strong className="block text-earth uppercase tracking-widest mb-2 font-bold">CJ Sourcing ID</strong>
                        <p>If CJ provides a new SKU or Variant ID, the system will link it. Pricing is not automatically synced - please review the imported cost in CJ before setting your retail price.</p>
                    </div>
                    <div className="flex-1">
                        <strong className="block text-earth uppercase tracking-widest mb-2 font-bold">Troubleshooting</strong>
                        <p>If products stick in "Pending" for more than 48 hours, use "Check Sourcing" above. For "Failed" items, verify the AliExpress URL is valid and accessible publicly.</p>
                    </div>
                </div>
            </FadeIn>

            {/* Custom Scrollbar Styles for this component only */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.02);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(74, 59, 50, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(74, 59, 50, 0.2);
                }
            `}</style>
        </div>
    );
};
