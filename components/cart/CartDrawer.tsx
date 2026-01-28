import React, { useState } from 'react';
import { X, ShoppingBag, Loader2 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import CartItem from './CartItem';

export const CartDrawer: React.FC = () => {
    const { isOpen, closeCart, items, subtotal, itemCount } = useCart();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async () => {
        if (items.length === 0) return;

        setIsCheckingOut(true);
        setError(null);

        try {
            // Get Convex URL from environment
            const convexUrl = import.meta.env.VITE_CONVEX_URL;
            if (!convexUrl) {
                throw new Error('Convex not configured');
            }

            // Extract the site ID from convex URL and construct HTTP endpoint
            const siteId = convexUrl.replace('https://', '').replace('.convex.cloud', '');
            const httpUrl = `https://${siteId}.convex.site/stripe/checkout`;

            // Prepare cart items for Stripe
            const checkoutItems = items.map(item => ({
                productId: item.product.id,
                name: item.product.name,
                price: item.product.price,
                quantity: item.quantity,
                image: item.product.images[0] || undefined,
            }));

            // Create checkout session
            const response = await fetch(httpUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: checkoutItems,
                    successUrl: `${window.location.origin}/#checkout/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/#checkout/cancel`,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Checkout failed');
            }

            const { url } = await response.json();

            // Redirect to Stripe Checkout
            if (url) {
                window.location.href = url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'Something went wrong. Please try again.');
            setIsCheckingOut(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] transition-opacity"
                onClick={closeCart}
            />

            {/* Drawer */}
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[201] shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-earth/10">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="w-5 h-5 text-earth" />
                        <h2 className="font-serif text-xl text-earth">Your Cart</h2>
                        <span className="text-[10px] uppercase tracking-widest text-earth/50">
                            ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                        </span>
                    </div>
                    <button
                        onClick={closeCart}
                        className="p-2 text-earth/30 hover:text-earth transition-colors"
                        aria-label="Close cart"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <ShoppingBag className="w-16 h-16 text-earth/20 mb-4" />
                            <p className="font-serif text-xl text-earth/50 mb-2">Your cart is empty</p>
                            <p className="text-sm text-earth/40">
                                Add some beautiful pieces to get started
                            </p>
                            <button
                                onClick={closeCart}
                                className="mt-6 text-[10px] uppercase tracking-widest text-bronze hover:text-earth transition-colors"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    ) : (
                        <div>
                            {items.map(item => (
                                <CartItem key={item.product.id} item={item} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-earth/10 p-6 bg-cream/30">
                        {/* Subtotal */}
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] uppercase tracking-widest text-earth/50">Subtotal</span>
                            <span className="font-serif text-xl text-earth">${subtotal.toFixed(2)}</span>
                        </div>

                        <p className="text-[10px] text-earth/40 mb-4 text-center">
                            Shipping and taxes calculated at checkout
                        </p>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                                <p className="text-xs text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Checkout Button */}
                        <button
                            className="w-full bg-earth text-cream py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleCheckout}
                            disabled={isCheckingOut}
                        >
                            {isCheckingOut ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Proceed to Checkout'
                            )}
                        </button>

                        {/* Continue Shopping */}
                        <button
                            onClick={closeCart}
                            className="w-full mt-3 py-3 text-[10px] uppercase tracking-widest text-earth/50 hover:text-earth transition-colors"
                        >
                            Continue Shopping
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;
