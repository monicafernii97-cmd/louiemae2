import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Package, Truck, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, MapPin, Mail } from 'lucide-react';

type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
    processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: <Package className="w-4 h-4" /> },
    shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-4 h-4" /> },
    delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-4 h-4" /> },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
};

export const AdminOrders: React.FC = () => {
    const orders = useQuery(api.orders.getAll) || [];
    const updateStatus = useMutation(api.orders.updateStatus);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');

    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter(o => o.status === filterStatus);

    const handleStatusChange = async (orderId: Id<"orders">, newStatus: OrderStatus) => {
        await updateStatus({ orderId, status: newStatus });
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

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="font-serif text-3xl text-earth mb-2">Orders</h2>
                    <p className="text-earth/50 text-sm">{orders.length} total orders</p>
                </div>

                {/* Filter */}
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
                    className="px-4 py-2 border border-earth/20 rounded text-sm text-earth bg-white"
                >
                    <option value="all">All Orders</option>
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
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

                        return (
                            <div key={order._id} className="bg-white border border-earth/10 rounded-lg overflow-hidden shadow-sm">
                                {/* Order Header */}
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-cream/20 transition-colors"
                                    onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                >
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <p className="font-mono text-sm text-earth font-medium">
                                                #{order.stripeSessionId.slice(-8).toUpperCase()}
                                            </p>
                                            <p className="text-xs text-earth/50">{formatDate(order.createdAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-earth/70">
                                            <Mail className="w-4 h-4" />
                                            {order.customerEmail}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <span className="font-serif text-lg text-earth">${order.total.toFixed(2)}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${status.color}`}>
                                            {status.icon}
                                            {status.label}
                                        </span>
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-earth/30" /> : <ChevronDown className="w-5 h-5 text-earth/30" />}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t border-earth/10 p-6 bg-cream/10">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Items */}
                                            <div>
                                                <h4 className="text-xs uppercase tracking-widest text-earth/50 mb-3">Items</h4>
                                                <div className="space-y-2">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between text-sm">
                                                            <span className="text-earth">{item.name} × {item.quantity}</span>
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
