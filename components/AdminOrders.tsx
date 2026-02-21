import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Package, Truck, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, MapPin, Mail, RefreshCw, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';

type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type CjStatus = 'pending' | 'sending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'failed' | 'cancelled';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
    processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: <Package className="w-4 h-4" /> },
    shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-4 h-4" /> },
    delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-4 h-4" /> },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
};

const cjStatusConfig: Record<CjStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'CJ Pending', color: 'bg-gray-100 text-gray-600', icon: <Clock className="w-3 h-3" /> },
    sending: { label: 'Sending to CJ', color: 'bg-blue-100 text-blue-600', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
    confirmed: { label: 'CJ Confirmed', color: 'bg-green-100 text-green-600', icon: <CheckCircle className="w-3 h-3" /> },
    processing: { label: 'CJ Processing', color: 'bg-blue-100 text-blue-600', icon: <Package className="w-3 h-3" /> },
    shipped: { label: 'CJ Shipped', color: 'bg-purple-100 text-purple-600', icon: <Truck className="w-3 h-3" /> },
    delivered: { label: 'CJ Delivered', color: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle className="w-3 h-3" /> },
    failed: { label: 'CJ Failed', color: 'bg-red-100 text-red-600', icon: <XCircle className="w-3 h-3" /> },
    cancelled: { label: 'CJ Cancelled', color: 'bg-gray-100 text-gray-600', icon: <XCircle className="w-3 h-3" /> },
};

export const AdminOrders: React.FC = () => {
    const orders = useQuery(api.orders.getAll) || [];
    const updateStatus = useMutation(api.orders.updateStatus);
    const resetCjStatus = useMutation(api.orders.resetCjStatus);
    const syncTracking = useAction(api.cjActions.syncTracking);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all' | 'cj-failed'>('all');
    const [retryingOrder, setRetryingOrder] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ synced: number; errors: number } | null>(null);

    const filteredOrders = filterStatus === 'all'
        ? orders
        : filterStatus === 'cj-failed'
            ? orders.filter(o => o.cjStatus === 'failed')
            : orders.filter(o => o.status === filterStatus);

    const handleStatusChange = async (orderId: Id<"orders">, newStatus: OrderStatus) => {
        await updateStatus({ orderId, status: newStatus });
    };

    const handleRetryCj = async (orderId: Id<"orders">) => {
        setRetryingOrder(orderId);
        try {
            await resetCjStatus({ orderId });
            // The CJ order will be resent on the next sync or manually triggered
        } finally {
            setRetryingOrder(null);
        }
    };

    const handleSyncTracking = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const result = await syncTracking({});
            setSyncResult(result);
            // Clear result after 5 seconds
            setTimeout(() => setSyncResult(null), 5000);
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Count CJ failed orders
    const cjFailedCount = orders.filter(o => o.cjStatus === 'failed').length;

    return (
        <div className="p-2 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-3">
                <div>
                    <h2 className="font-serif text-2xl md:text-3xl text-earth mb-1 md:mb-2">Orders</h2>
                    <p className="text-earth/50 text-sm">{orders.length} total orders</p>
                </div>

                {/* Filter */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {cjFailedCount > 0 && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" />
                            {cjFailedCount} CJ Failed
                        </span>
                    )}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all' | 'cj-failed')}
                        className="px-4 py-2 border border-earth/20 rounded text-sm text-earth bg-white"
                    >
                        <option value="all">All Orders</option>
                        <option value="paid">Paid</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        {cjFailedCount > 0 && <option value="cj-failed">⚠️ CJ Failed ({cjFailedCount})</option>}
                    </select>

                    {/* Sync Tracking Button */}
                    <button
                        onClick={handleSyncTracking}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2 bg-earth text-white rounded hover:bg-earth/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        {isSyncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {isSyncing ? 'Syncing...' : 'Sync Tracking'}
                    </button>

                    {/* Sync Result Toast */}
                    {syncResult && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            ✓ Synced {syncResult.synced} orders
                            {syncResult.errors > 0 && `, ${syncResult.errors} errors`}
                        </span>
                    )}
                </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-cream/30 rounded-lg">
                    <Package className="w-12 h-12 text-earth/20 mx-auto mb-4" />
                    <p className="text-earth/50">No orders found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => {
                        const isExpanded = expandedOrder === order._id;
                        const status = statusConfig[order.status as OrderStatus] || statusConfig.pending;
                        const cjStatus = order.cjStatus ? cjStatusConfig[order.cjStatus as CjStatus] : null;
                        const hasCjProducts = order.items?.some((item: any) => item.cjVariantId || item.cjSku);

                        return (
                            <div key={order._id} className={`bg-white border rounded-lg overflow-hidden shadow-sm ${order.cjStatus === 'failed' ? 'border-red-300' : 'border-earth/10'}`}>
                                {/* Order Header */}
                                <div
                                    className="p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-cream/20 transition-colors gap-2 md:gap-0"
                                    onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                >
                                    <div className="flex items-center gap-3 md:gap-6 min-w-0">
                                        <div>
                                            <p className="font-mono text-sm text-earth font-medium">
                                                #{order.stripeSessionId.slice(-8).toUpperCase()}
                                            </p>
                                            <p className="text-xs text-earth/50">{formatDate(order.createdAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-earth/70 min-w-0">
                                            <Mail className="w-4 h-4 flex-shrink-0" />
                                            <span className="truncate">{order.customerEmail}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                        <span className="font-serif text-lg text-earth">${order.total.toFixed(2)}</span>

                                        {/* CJ Status Badge */}
                                        {cjStatus && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${cjStatus.color}`}>
                                                {cjStatus.icon}
                                                {cjStatus.label}
                                            </span>
                                        )}

                                        {/* Order Status Badge */}
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${status.color}`}>
                                            {status.icon}
                                            {status.label}
                                        </span>
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-earth/30" /> : <ChevronDown className="w-5 h-5 text-earth/30" />}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t border-earth/10 p-3 md:p-6 bg-cream/10">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            {/* Items */}
                                            <div>
                                                <h4 className="text-xs uppercase tracking-widest text-earth/50 mb-3">Items</h4>
                                                <div className="space-y-2">
                                                    {order.items.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between text-sm">
                                                            <span className="text-earth">
                                                                {item.name} × {item.quantity}
                                                                {(item.cjVariantId || item.cjSku) && (
                                                                    <span className="ml-1 text-xs text-purple-600">(CJ)</span>
                                                                )}
                                                            </span>
                                                            <span className="text-earth/70">${(item.price * item.quantity).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="border-t border-earth/10 pt-2 mt-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-earth/50">Subtotal</span>
                                                            <span>${order.subtotal.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-earth/50">Shipping</span>
                                                            <span>${(order.shipping || 0).toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm font-medium mt-1">
                                                            <span>Total</span>
                                                            <span className="text-bronze">${order.total.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Shipping Address */}
                                            <div>
                                                <h4 className="text-xs uppercase tracking-widest text-earth/50 mb-3 flex items-center gap-2">
                                                    <MapPin className="w-3 h-3" /> Shipping Address
                                                </h4>
                                                {order.shippingAddress ? (
                                                    <div className="text-sm text-earth">
                                                        <p>{order.customerName}</p>
                                                        <p>{order.shippingAddress.line1}</p>
                                                        {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                                                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                                                        <p>{order.shippingAddress.country}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-earth/50">No address provided</p>
                                                )}
                                            </div>

                                            {/* CJ Fulfillment */}
                                            <div>
                                                <h4 className="text-xs uppercase tracking-widest text-earth/50 mb-3 flex items-center gap-2">
                                                    <Package className="w-3 h-3" /> CJ Fulfillment
                                                </h4>
                                                {hasCjProducts ? (
                                                    <div className="space-y-3">
                                                        {order.cjOrderId && (
                                                            <div className="text-sm">
                                                                <span className="text-earth/50">CJ Order: </span>
                                                                <span className="font-mono text-earth">{order.cjOrderId}</span>
                                                            </div>
                                                        )}

                                                        {order.trackingNumber && (
                                                            <div className="text-sm">
                                                                <span className="text-earth/50">Tracking: </span>
                                                                {order.trackingUrl ? (
                                                                    <a
                                                                        href={order.trackingUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="font-mono text-purple-600 hover:underline inline-flex items-center gap-1"
                                                                    >
                                                                        {order.trackingNumber}
                                                                        <ExternalLink className="w-3 h-3" />
                                                                    </a>
                                                                ) : (
                                                                    <span className="font-mono text-earth">{order.trackingNumber}</span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {order.carrier && (
                                                            <div className="text-sm">
                                                                <span className="text-earth/50">Carrier: </span>
                                                                <span className="text-earth">{order.carrier}</span>
                                                            </div>
                                                        )}

                                                        {order.cjError && (
                                                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                                                <strong>Error:</strong> {order.cjError}
                                                            </div>
                                                        )}

                                                        {order.cjStatus === 'failed' && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRetryCj(order._id as Id<"orders">); }}
                                                                disabled={retryingOrder === order._id}
                                                                className="mt-2 w-full px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                            >
                                                                <RefreshCw className={`w-4 h-4 ${retryingOrder === order._id ? 'animate-spin' : ''}`} />
                                                                Retry CJ Order
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-earth/50">No CJ products</p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div>
                                                <h4 className="text-xs uppercase tracking-widest text-earth/50 mb-3">Update Status</h4>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order._id as Id<"orders">, e.target.value as OrderStatus)}
                                                    className="w-full px-3 py-2 border border-earth/20 rounded text-sm text-earth bg-white"
                                                >
                                                    <option value="paid">Paid</option>
                                                    <option value="processing">Processing</option>
                                                    <option value="shipped">Shipped</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
