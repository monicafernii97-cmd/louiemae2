
import React, { useState, useMemo } from 'react';
import { FadeIn } from './FadeIn';
import { useSite } from '../contexts/BlogContext';
import { Product, CollectionType } from '../types';
import { ArrowLeft, X, ArrowUpRight } from 'lucide-react';
import { AddToCartButton } from './cart';

interface StorePageProps {
  collection: CollectionType;
  initialCategory?: string;
}

export const StorePage: React.FC<StorePageProps> = ({ collection, initialCategory = 'All' }) => {
  const { products, siteContent } = useSite();
  const [sortOption, setSortOption] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  // Find the configuration for this collection from the dynamic state
  const config = useMemo(() => {
    return siteContent.collections.find(c => c.id === collection) || {
      id: collection,
      title: collection.charAt(0).toUpperCase() + collection.slice(1),
      subtitle: 'Collection',
      heroImage: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=2000',
      subcategories: []
    };
  }, [siteContent.collections, collection]);

  // Decoded category from URL
  const selectedCategory = useMemo(() => decodeURIComponent(initialCategory), [initialCategory]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // View State Logic
  const isRootView = selectedCategory === 'All';

  // Filter products by collection
  const collectionProducts = useMemo(() => {
    return products.filter(p => p.collection === collection);
  }, [products, collection]);

  // Get unique categories for display in filter bar
  const categories = useMemo(() => {
    const cats = new Set(collectionProducts.map(p => p.category));
    const list = Array.from(cats);

    // Ensure defined subcategories are present
    config.subcategories.forEach(sub => {
      if (!list.includes(sub.title)) list.push(sub.title);
    });

    // Ensure currently selected category is in the list
    if (selectedCategory !== 'All' && !list.includes(selectedCategory)) {
      list.push(selectedCategory);
    }

    return ['All', ...list.sort()];
  }, [collectionProducts, selectedCategory, config.subcategories]);

  // Filter and Sort
  const filteredProducts = useMemo(() => {
    let result = collectionProducts;

    if (selectedCategory !== 'All') {
      // Improved partial matching: "Girls" matches "Girls Tops"
      result = result.filter(p =>
        p.category === selectedCategory ||
        p.category.startsWith(selectedCategory + ' ')
      );
    }

    return result.sort((a, b) => {
      if (sortOption === 'price-asc') return a.price - b.price;
      if (sortOption === 'price-desc') return b.price - a.price;
      return b.id.localeCompare(a.id);
    });
  }, [collectionProducts, selectedCategory, sortOption]);

  const handleCategoryChange = (cat: string) => {
    if (cat === selectedCategory) return;

    const subConfig = config.subcategories.find(c => c.title === cat);
    if (subConfig && subConfig.redirect) {
      window.location.hash = subConfig.redirect;
      return;
    }

    const newHash = cat === 'All'
      ? `#collection/${collection}`
      : `#collection/${collection}?cat=${encodeURIComponent(cat)}`;
    window.location.hash = newHash;
  };

  return (
    <div className="bg-cream min-h-screen pt-20">

      {/* Hero Section */}
      <section className="relative h-[60vh] overflow-hidden">
        <div className="absolute inset-0 bg-black/20 z-10"></div>
        <img src={config.heroImage} alt={config.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
          <FadeIn>
            <h1 className="font-serif text-5xl md:text-7xl text-white mb-4 drop-shadow-lg">
              {selectedCategory === 'All' ? config.title : selectedCategory}
            </h1>
            <p className="font-sans text-white/90 text-xs md:text-sm uppercase tracking-[0.3em]">
              {selectedCategory === 'All' ? config.subtitle : `Curated ${selectedCategory} Selection`}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* --- LEVEL 1: ROOT CATEGORIES (Asymmetrical Grid) --- */}
      {isRootView && config.subcategories.length > 0 && (
        <section className="px-6 py-20 md:py-32">
          <div className="container mx-auto">
            <FadeIn className="text-center mb-16">
              <h2 className="font-serif text-4xl text-earth mb-4">Explore {config.title}</h2>
              <p className="text-xs uppercase tracking-widest text-earth/50">Select a category to begin</p>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-[minmax(300px,auto)]">
              {config.subcategories.map((cat, idx) => (
                <FadeIn
                  key={cat.id || idx}
                  delay={idx * 100}
                  className={`group cursor-pointer relative overflow-hidden rounded-[2.5rem] shadow-sm border border-earth/5 ${idx === 0 ? 'md:row-span-2 h-[500px] md:h-auto' : 'h-[300px] md:h-[400px]'
                    }`}
                >
                  <div
                    onClick={() => handleCategoryChange(cat.title)}
                    className="w-full h-full relative"
                  >
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 flex flex-col justify-end items-start transform transition-transform duration-500 group-hover:-translate-y-2">
                      {cat.caption && (
                        <span className="text-[10px] uppercase tracking-[0.3em] text-white/80 mb-2">{cat.caption}</span>
                      )}
                      <div className="flex items-center justify-between w-full">
                        <h3 className="font-serif text-3xl md:text-5xl text-white leading-none">{cat.title}</h3>
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                          <ArrowUpRight className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- LEVEL 3: PRODUCT GRID (Leaf View) --- */}
      {(!isRootView || config.subcategories.length === 0) && (
        <>
          {/* Filter & Toolbar */}
          <div className="sticky top-[73px] z-30 bg-cream/95 backdrop-blur-md border-b border-earth/10 px-6 py-4 transition-all duration-300">
            <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                <button
                  onClick={() => handleCategoryChange('All')}
                  className="whitespace-nowrap text-[10px] uppercase tracking-widest text-earth/50 hover:text-earth flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`whitespace-nowrap text-[10px] uppercase tracking-widest transition-colors ${selectedCategory === cat ? 'text-earth border-b border-bronze font-medium' : 'text-earth/50 hover:text-earth'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto md:ml-0">
                <span className="text-[10px] uppercase tracking-widest text-earth/50">Sort By:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-transparent text-[10px] uppercase tracking-widest text-earth focus:outline-none cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          <section className="px-6 py-12 md:py-20 min-h-[60vh]">
            <div className="container mx-auto">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 animate-fade-in-up">
                  <p className="font-serif text-2xl text-earth/50 mb-4">No products found in {selectedCategory}.</p>
                  <p className="text-xs uppercase tracking-widest text-earth/30">Check back soon for new arrivals.</p>
                  {selectedCategory !== 'All' && (
                    <button onClick={() => handleCategoryChange('All')} className="mt-8 text-xs uppercase tracking-widest text-bronze border-b border-bronze pb-1 hover:text-earth hover:border-earth transition-colors">
                      View All {config.title}
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                  {filteredProducts.map((product, idx) => (
                    <FadeIn key={product.id} delay={idx * 50} className="group cursor-pointer">
                      <div
                        className="relative aspect-[3/4] overflow-hidden bg-white mb-4 rounded-sm"
                        onClick={() => setSelectedProduct(product)}
                      >
                        {product.isNew && (
                          <span className="absolute top-3 left-3 bg-white/90 px-2 py-1 text-[9px] uppercase tracking-widest text-earth z-10 rounded-sm">
                            New
                          </span>
                        )}
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <button className="w-full bg-white/90 backdrop-blur-sm text-earth py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-earth hover:text-white transition-colors shadow-lg">
                            Quick View
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-serif text-lg text-earth leading-tight mb-1 group-hover:text-bronze transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-[10px] uppercase tracking-widest text-earth/50">{product.category}</p>
                        </div>
                        <span className="font-serif italic text-earth text-lg">${product.price}</span>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>

          <div className="bg-cream w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-sm shadow-2xl relative flex flex-col md:flex-row overflow-hidden animate-fade-in-up">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-earth" />
            </button>
            <div className="w-full md:w-1/2 bg-white h-1/2 md:h-auto overflow-hidden relative group">
              <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-cover" />
            </div>
            <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto bg-cream flex flex-col">
              <div className="mb-auto">
                <div className="flex items-center gap-3 mb-4 text-[10px] uppercase tracking-widest text-earth/50">
                  <span>{config.title}</span>
                  <span className="w-1 h-1 bg-bronze rounded-full"></span>
                  <span>{selectedProduct.category}</span>
                </div>
                <h2 className="font-serif text-3xl md:text-5xl text-earth mb-4 leading-tight">{selectedProduct.name}</h2>
                <p className="font-serif text-2xl italic text-bronze mb-8">${selectedProduct.price}</p>
                <div className="h-px w-full bg-earth/10 mb-8"></div>
                <p className="font-sans text-earth/70 leading-loose mb-8 text-sm">{selectedProduct.description}</p>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <span className="w-2 h-2 rounded-full bg-green-600"></span>
                    {selectedProduct.inStock ? 'In Stock & Ready to Ship' : 'Made to Order'}
                  </div>
                </div>
              </div>
              <AddToCartButton product={selectedProduct} className="mt-8" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
