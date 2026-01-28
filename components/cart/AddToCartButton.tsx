import React, { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { Product } from '../../types';

interface AddToCartButtonProps {
    product: Product;
    className?: string;
    variant?: 'primary' | 'secondary' | 'icon';
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
    product,
    className = '',
    variant = 'primary'
}) => {
    const { addToCart } = useCart();
    const [isAdded, setIsAdded] = useState(false);

    const handleClick = () => {
        if (!product.inStock) return;

        addToCart(product);
        setIsAdded(true);

        // Reset after animation
        setTimeout(() => setIsAdded(false), 1500);
    };

    const isDisabled = !product.inStock;

    if (variant === 'icon') {
        return (
            <button
                onClick={handleClick}
                disabled={isDisabled}
                className={`p-3 bg-earth text-cream hover:bg-bronze transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                aria-label={isDisabled ? 'Out of Stock' : 'Add to Cart'}
            >
                {isAdded ? (
                    <Check className="w-4 h-4" />
                ) : (
                    <ShoppingBag className="w-4 h-4" />
                )}
            </button>
        );
    }

    if (variant === 'secondary') {
        return (
            <button
                onClick={handleClick}
                disabled={isDisabled}
                className={`px-6 py-3 border border-earth text-earth text-[10px] uppercase tracking-[0.2em] hover:bg-earth hover:text-cream transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
            >
                {isAdded ? (
                    <>
                        <Check className="w-4 h-4" />
                        Added!
                    </>
                ) : isDisabled ? (
                    'Out of Stock'
                ) : (
                    <>
                        <ShoppingBag className="w-4 h-4" />
                        Add to Cart
                    </>
                )}
            </button>
        );
    }

    // Primary variant (default)
    return (
        <button
            onClick={handleClick}
            disabled={isDisabled}
            className={`w-full bg-earth text-cream py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
        >
            {isAdded ? (
                <>
                    <Check className="w-4 h-4" />
                    Added to Cart!
                </>
            ) : isDisabled ? (
                'Out of Stock'
            ) : (
                <>
                    <ShoppingBag className="w-4 h-4" />
                    Add to Cart
                </>
            )}
        </button>
    );
};

export default AddToCartButton;
