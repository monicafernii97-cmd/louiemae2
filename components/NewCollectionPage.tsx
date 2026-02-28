import React, { useMemo } from 'react';
import { FadeIn } from './FadeIn';
import { useSite } from '../contexts/BlogContext';
import { Product } from '../types';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

// Collection drop configuration
const DROP_NAME = "Spring 2026 Collection";
const DROP_TAGLINE = "Curated pieces for the season ahead";

const CATEGORY_SECTIONS = [
    { id: 'fashion', title: 'The Mae Collective', subtitle: 'Womenswear', route: '#collection/fashion' },
    { id: 'kids', title: 'Louie Kids & Co.', subtitle: 'Childrenswear', route: '#collection/kids' },
    { id: 'furniture', title: 'Furniture', subtitle: 'Modern Organic', route: '#collection/furniture' },
    { id: 'decor', title: 'Home Decor', subtitle: 'Curated Objects', route: '#collection/decor' },
];

const navigateTo = (hash: string) => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

const ProductCard: React.FC<{ product: Product; index: number }> = ({ product, index }) => (
    <FadeIn delay={index * 100} className="group cursor-pointer flex-shrink-0 w-[240px] md:w-[280px] snap-center">
        <div
            className="relative aspect-[3/4] overflow-hidden bg-stone-50 mb-4 rounded-sm border border-stone-200"
            onClick={() => navigateTo(`#collection/${product.collection}?cat=${encodeURIComponent(product.category)}`)}
        >
            <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
        </div>
        <div className="px-1 text-center md:text-left flex justify-between items-start gap-4">
            <h3 className="font-serif text-base text-earth leading-tight group-hover:text-bronze transition-colors">
                {product.name}
            </h3>
            <span className="font-serif italic text-earth/80 text-sm whitespace-nowrap">${product.price}</span>
        </div>
    </FadeIn>
);

const CategorySection: React.FC<{
    title: string;
    products: Product[];
    route: string;
}> = ({ title, products, route }) => {
    if (products.length === 0) return null;

    return (
        <section className="py-16 md:py-24 border-b border-stone-200/50 last:border-0">
            <div className="container mx-auto px-6 md:px-12">
                {/* Section Header */}
                <FadeIn className="flex justify-between items-end mb-12">
                    <h2 className="font-serif text-3xl md:text-5xl text-earth">{title}</h2>
                    <button
                        onClick={() => navigateTo(route)}
                        className="hidden md:flex items-center gap-2 text-xs uppercase tracking-widest text-earth/60 hover:text-earth hover:border-b hover:border-earth transition-all pb-1 group"
                    >
                        View All <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                </FadeIn>

                {/* Products Grid (Desktop) / Scroll (Mobile) */}
                <div className="relative -mx-6 px-6 md:mx-0 md:px-0">
                    <div
                        className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 overflow-x-auto md:overflow-visible scrollbar-hide pb-8 md:pb-0 snap-x snap-mandatory"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                        {products.map((product, idx) => (
                            <ProductCard key={product.id} product={product} index={idx} />
                        ))}
                    </div>
                </div>

                {/* Mobile View All */}
                <FadeIn className="md:hidden mt-8 text-center flex justify-center">
                    <button
                        onClick={() => navigateTo(route)}
                        className="text-[10px] uppercase tracking-widest text-earth border-b border-earth pb-1 flex items-center gap-2"
                    >
                        View All {title} <ArrowRight className="w-3 h-3" />
                    </button>
                </FadeIn>
            </div>
        </section>
    );
};

export const NewCollectionPage: React.FC = () => {
    const { products } = useSite();

    // Mock logic to select the "drop" products. 
    // In a real app, this might be filtered by a specific publish date, tag, or collection ID.
    // Here we're grabbing the 3-5 newest items per collection.
    const dropProducts = useMemo(() => {
        const result: Record<string, Product[]> = {};

        CATEGORY_SECTIONS.forEach(sec => {
            const colProducts = products.filter(p => p.collection === sec.id);

            // Sort newest first
            colProducts.sort((a, b) => {
                const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
                const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
                // If neither has date, fallback to isNew flag
                if (!dateA && !dateB) {
                    return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
                }
                return dateB - dateA;
            });

            // Take top 4 for aesthetics
            result[sec.id] = colProducts.slice(0, 4);
        });

        return result;
    }, [products]);

    return (
        <div className="bg-[#FAF9F6] min-h-screen pt-[72px] selection:bg-stone-200">
            {/* Editorial Hero */}
            <div className="relative h-[60vh] md:h-[70vh] w-full bg-stone-100 overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1490750967868-88cb4ecb08cb?q=80&w=2500&auto=format&fit=crop"
                    alt="Spring Floral Setup"
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-90"
                />
                <div className="absolute inset-0 bg-stone-900/10 mix-blend-multiply" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F6] via-transparent to-transparent opacity-60" />

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                    <FadeIn delay={100}>
                        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white drop-shadow-sm mb-4 md:mb-6">
                            {DROP_NAME}
                        </h1>
                    </FadeIn>
                    <FadeIn delay={300}>
                        <p className="font-sans text-white text-[10px] md:text-sm uppercase tracking-[0.3em] font-medium drop-shadow-sm">
                            {DROP_TAGLINE}
                        </p>
                    </FadeIn>
                </div>
            </div>

            {/* Editorial Intro Text */}
            <section className="py-20 md:py-32 px-6 text-center max-w-3xl mx-auto">
                <FadeIn>
                    <p className="font-serif text-2xl md:text-4xl text-earth leading-snug italic text-stone-600">
                        "A celebration of soft textures, earthy tones, and the joy of dressing for warmer days. Curated with intention for your home and wardrobe."
                    </p>
                </FadeIn>
            </section>

            {/* Collection Sections */}
            <div className="pb-24">
                {CATEGORY_SECTIONS.map((section) => (
                    <CategorySection
                        key={section.id}
                        title={section.title}
                        products={dropProducts[section.id] || []}
                        route={section.route}
                    />
                ))}
            </div>

            {/* Newsletter Tease */}
            <section className="py-32 bg-stone-100/50 text-center px-6 border-t border-stone-200">
                <FadeIn className="max-w-xl mx-auto">
                    <h2 className="font-serif text-3xl md:text-4xl text-earth mb-4">Never Miss a Drop</h2>
                    <p className="text-sm text-stone-500 mb-8 max-w-md mx-auto">
                        Join the Mae Letter for early access to our curated collections, exclusive pieces, and boutique announcements.
                    </p>
                    <button
                        onClick={() => {
                            // Let the global newsletter popup take over, or scroll to footer
                            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }}
                        className="bg-earth text-white px-8 py-3 text-[10px] uppercase tracking-widest hover:bg-bronze transition-colors rounded-sm"
                    >
                        Join The Inner Circle
                    </button>
                </FadeIn>
            </section>
        </div>
    );
};

export default NewCollectionPage;
