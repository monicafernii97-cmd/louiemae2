import React from 'react';
import { XCircle, ArrowRight, ShoppingBag } from 'lucide-react';

export const CheckoutCancel: React.FC = () => {
    return (
        <div className="min-h-screen bg-cream pt-32 pb-20 px-6">
            <div className="max-w-2xl mx-auto text-center">
                {/* Cancel Icon */}
                <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-8">
                    <XCircle className="w-12 h-12 text-amber-600" />
                </div>

                {/* Heading */}
                <h1 className="font-serif text-4xl md:text-5xl text-earth mb-4">
                    Checkout Cancelled
                </h1>
                <p className="text-lg text-earth/70 mb-8">
                    Your order was not completed. No charges have been made.
                </p>

                {/* Info */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-earth/10 mb-8">
                    <p className="text-sm text-earth/60 mb-4">
                        Your cart items are still saved. You can return to checkout
                        whenever you're ready.
                    </p>
                    <p className="text-sm text-earth/60">
                        If you experienced any issues, please contact us at{' '}
                        <a href="mailto:hello@louiemae.com" className="text-bronze hover:underline">
                            hello@louiemae.com
                        </a>
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => window.location.hash = '#shop'}
                        className="inline-flex items-center justify-center gap-2 bg-earth text-cream px-8 py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-colors"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        View Cart
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

export default CheckoutCancel;
