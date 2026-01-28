import React, { useEffect, useState } from 'react';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

export const CheckoutSuccess: React.FC = () => {
    const { clearCart } = useCart();
    const [orderDetails, setOrderDetails] = useState<any>(null);

    useEffect(() => {
        // Clear the cart on successful checkout
        clearCart();

        // Get session ID from URL
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const sessionId = urlParams.get('session_id');

        if (sessionId) {
            setOrderDetails({ sessionId });
        }
    }, [clearCart]);

    return (
        <div className="min-h-screen bg-cream pt-32 pb-20 px-6">
            <div className="max-w-2xl mx-auto text-center">
                {/* Success Icon */}
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>

                {/* Heading */}
                <h1 className="font-serif text-4xl md:text-5xl text-earth mb-4">
                    Thank You!
                </h1>
                <p className="text-lg text-earth/70 mb-8">
                    Your order has been placed successfully.
                </p>

                {/* Order Info Card */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-earth/10 mb-8 text-left">
                    <div className="flex items-center gap-3 mb-6">
                        <Package className="w-6 h-6 text-bronze" />
                        <h2 className="font-serif text-xl text-earth">Order Confirmed</h2>
                    </div>

                    <p className="text-sm text-earth/60 mb-4">
                        A confirmation email has been sent to your email address.
                        You'll receive tracking information once your order ships.
                    </p>

                    {orderDetails?.sessionId && (
                        <div className="bg-cream/50 p-4 rounded-md">
                            <p className="text-[10px] uppercase tracking-widest text-earth/40 mb-1">
                                Order Reference
                            </p>
                            <p className="font-mono text-sm text-earth">
                                {orderDetails.sessionId.slice(-12).toUpperCase()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => window.location.hash = '#shop'}
                        className="inline-flex items-center justify-center gap-2 bg-earth text-cream px-8 py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-colors"
                    >
                        Continue Shopping
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => window.location.hash = '#'}
                        className="text-[10px] uppercase tracking-widest text-earth/50 hover:text-earth transition-colors py-4"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutSuccess;
