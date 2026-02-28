import React, { useMemo, useState } from 'react';
import { FadeIn } from './FadeIn';
import { useSite } from '../contexts/BlogContext';
import { useNewsletter } from '../contexts/NewsletterContext';
import { Product } from '../types';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

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
    const { addSubscriberWithTags } = useNewsletter();

    // VIP signup form state
    const [firstName, setFirstName] = useState('');
    const [email, setEmail] = useState('');
    const [signupStatus, setSignupStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const handleVipSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setSignupStatus('loading');
        await addSubscriberWithTags(email, firstName || 'Friend', ['vip', 'inner-circle', 'early-access']);
        setSignupStatus('success');
        setFirstName('');
        setEmail('');
    };

    const dropProducts = useMemo(() => {
        const result: Record<string, Product[]> = {};

        CATEGORY_SECTIONS.forEach(sec => {
            const colProducts = products.filter(p => p.collection === sec.id);

            colProducts.sort((a, b) => {
                const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
                const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
                if (!dateA && !dateB) {
                    return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
                }
                return dateB - dateA;
            });

            result[sec.id] = colProducts.slice(0, 4);
        });

        return result;
    }, [products]);

    return (
        <div className="bg-[#FAF9F6] min-h-screen pt-[72px] selection:bg-stone-200">
            {/* Editorial Hero */}
            <div className="relative h-[60vh] md:h-[70vh] w-full bg-stone-100 overflow-hidden">
                <img
                    src="/images/brand/hero-living-organic.png"
                    alt="Spring Collection"
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

            {/* VIP Early Access Newsletter Signup */}
            <section className="py-24 md:py-32 bg-earth text-center px-6">
                <FadeIn className="max-w-xl mx-auto">
                    <div className="flex justify-center mb-6">
                        <Sparkles className="w-6 h-6 text-bronze" />
                    </div>
                    <h2 className="font-serif text-3xl md:text-5xl text-cream mb-4">Never Miss a Drop</h2>
                    <p className="text-sm text-sand/80 mb-3 max-w-md mx-auto leading-relaxed">
                        Join the Inner Circle and get <span className="text-white font-medium">24-hour early access</span> to every new collection before anyone else.
                    </p>
                    <p className="text-xs text-sand/50 mb-10 uppercase tracking-widest">
                        First to know · First to shop · Exclusive pieces
                    </p>

                    {signupStatus === 'success' ? (
                        <FadeIn className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-sm p-8">
                            <div className="flex justify-center mb-4">
                                <div className="w-12 h-12 rounded-full bg-bronze/20 flex items-center justify-center">
                                    <Check className="w-6 h-6 text-bronze" />
                                </div>
                            </div>
                            <h3 className="font-serif text-2xl text-cream mb-2">You're In! ✨</h3>
                            <p className="text-sm text-sand/70">
                                Welcome to the Inner Circle. You'll be the first to know when our next collection drops.
                            </p>
                        </FadeIn>
                    ) : (
                        <form onSubmit={handleVipSignup} className="space-y-4 max-w-md mx-auto">
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="First Name"
                                className="w-full bg-white/10 border border-white/20 px-5 py-3.5 text-sm text-cream placeholder:text-sand/40 focus:outline-none focus:border-bronze transition-colors rounded-sm"
                            />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email Address"
                                required
                                className="w-full bg-white/10 border border-white/20 px-5 py-3.5 text-sm text-cream placeholder:text-sand/40 focus:outline-none focus:border-bronze transition-colors rounded-sm"
                            />
                            <button
                                type="submit"
                                disabled={signupStatus === 'loading'}
                                className="w-full bg-bronze text-white py-3.5 text-[10px] uppercase tracking-[0.25em] hover:bg-bronze/80 transition-colors rounded-sm disabled:opacity-70 font-medium"
                            >
                                {signupStatus === 'loading' ? 'Joining...' : 'Join the Inner Circle'}
                            </button>
                            <p className="text-[10px] text-sand/40 pt-2">
                                No spam, ever. Just early access & curated drops.
                            </p>
                        </form>
                    )}
                </FadeIn>
            </section>
        </div>
    );
};

export default NewCollectionPage;
