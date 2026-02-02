
import React, { useState, useMemo } from 'react';
import { FadeIn } from './FadeIn';
import { useSite } from '../contexts/BlogContext';
import { Product, CollectionType, ProductVariant, Category } from '../types';
import { ArrowLeft, X, ArrowUpRight, ShoppingBag } from 'lucide-react';
import { AddToCartButton } from './cart';

interface StorePageProps {
  collection: CollectionType;
  initialCategory?: string;
}

// View levels for hierarchical navigation
type ViewLevel = 'ROOT' | 'CATEGORY' | 'PRODUCT';

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
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);

  // Reset variant when changing product
  const handleSelectProduct = (product: Product | null) => {
    setSelectedProduct(product);
    setSelectedVariant(undefined);
  };

  // Compute the view level based on selected category and available data
  const viewLevel = useMemo<ViewLevel>(() => {
    if (selectedCategory === 'All') {
      return 'ROOT';
    }

    // Check if selectedCategory is a main category with children
    const isMainCategory = config.subcategories.some(
      sub => sub.title === selectedCategory && sub.isMainCategory
    );
    const hasChildren = config.subcategories.some(
      sub => sub.parentCategory === selectedCategory
    );

    if (isMainCategory && hasChildren) {
      return 'CATEGORY';
    }

    return 'PRODUCT';
  }, [selectedCategory, config.subcategories]);

  // Get main categories (for ROOT view)
  // Fallback: if no categories have isMainCategory flag, show all subcategories
  const mainCategories = useMemo(() => {
    const flagged = config.subcategories.filter(sub => sub.isMainCategory);
    return flagged.length > 0 ? flagged : config.subcategories;
  }, [config.subcategories]);

  // Get child categories of the selected main category (for CATEGORY view)
  const childCategories = useMemo(() => {
    if (viewLevel !== 'CATEGORY') return [];
    return config.subcategories.filter(sub => sub.parentCategory === selectedCategory);
  }, [config.subcategories, selectedCategory, viewLevel]);

  // Filter products by collection
  const collectionProducts = useMemo(() => {
    return products.filter(p => p.collection === collection);
  }, [products, collection]);

  // Get products for a specific category (for previews and product grid)
  const getProductsForCategory = (categoryTitle: string, limit?: number) => {
    const filtered = collectionProducts.filter(p =>
      p.category === categoryTitle ||
      p.category.startsWith(categoryTitle + ' ')
    );
    return limit ? filtered.slice(0, limit) : filtered;
  };

  // Filter and Sort for PRODUCT view
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

  // Get back destination based on current view
  const getBackDestination = () => {
    if (viewLevel === 'CATEGORY') {
      return 'All'; // Go back to collection root
    }
    // For PRODUCT view, check if we came from a main category
    const parentCat = config.subcategories.find(sub => sub.title === selectedCategory)?.parentCategory;
    return parentCat || 'All';
  };

  // Render a product card (reusable for both preview and full grid)
  const ProductCard: React.FC<{ product: Product; index: number; compact?: boolean }> = ({ product, index, compact }) => (
    <FadeIn delay={index * 50} className="group cursor-pointer">
      <div
        className={`relative ${compact ? 'aspect-square' : 'aspect-[3/4]'} overflow-hidden bg-white mb-3 rounded-lg`}
        onClick={() => handleSelectProduct(product)}
      >
        {product.isNew && !compact && (
          <span className="absolute top-2 left-2 bg-white/90 px-2 py-1 text-[8px] uppercase tracking-widest text-earth z-10 rounded-sm">
            New
          </span>
        )}
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
        {!compact && (
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button className="w-full bg-white/90 backdrop-blur-sm text-earth py-2 text-[9px] uppercase tracking-[0.15em] hover:bg-earth hover:text-white transition-colors shadow-lg rounded">
              Quick View
            </button>
          </div>
        )}
      </div>

      <div className={compact ? 'px-1' : ''}>
        <h3 className={`font-serif ${compact ? 'text-sm' : 'text-base'} text-earth leading-tight mb-1 group-hover:text-bronze transition-colors truncate`}>
          {product.name}
        </h3>
        <span className={`font-serif italic text-earth/80 ${compact ? 'text-sm' : 'text-base'}`}>${product.price}</span>
      </div>
    </FadeIn>
  );

  // Subcategory box with product previews
  const SubcategoryWithPreviews: React.FC<{ category: Category; index: number }> = ({ category, index }) => {
    const previewProducts = getProductsForCategory(category.title, 4);

    // Only render if there are products to show, or if we want to show empty categories too
    // Taking the user's "product displays" requirement literally, empty categories might be hidden or just show "Coming Soon"

    return (
      <FadeIn delay={index * 100} className="mb-16">
        {/* Clean Section Header */}
        <div className="flex items-center justify-between mb-6 border-b border-earth/10 pb-2">
          <div
            className="group cursor-pointer flex items-center gap-3"
            onClick={() => handleCategoryChange(category.title)}
          >
            <h3 className="font-serif text-2xl md:text-3xl text-earth transition-colors group-hover:text-bronze">
              {category.title}
            </h3>
            <ArrowUpRight className="w-5 h-5 text-earth/30 transition-all group-hover:text-bronze group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>

          <button
            onClick={() => handleCategoryChange(category.title)}
            className="hidden md:flex items-center gap-2 text-xs uppercase tracking-widest text-earth/50 hover:text-earth transition-colors"
          >
            View All
          </button>
        </div>

        {/* Product Previews */}
        {previewProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {previewProducts.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} compact />
            ))}
          </div>
        ) : (
          <div className="bg-white/50 rounded-lg p-10 text-center border border-dashed border-earth/10">
            <p className="text-earth/40 text-sm italic font-serif">New arrivals coming to {category.title} soon.</p>
          </div>
        )}
      </FadeIn>
    );
  };

  return (
    <div className="bg-cream min-h-screen pt-20">

      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <div className="absolute inset-0 bg-black/20 z-10"></div>
        <img src={config.heroImage} alt={config.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
          <FadeIn>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white mb-4 drop-shadow-lg">
              {selectedCategory === 'All' ? config.title : selectedCategory}
            </h1>
            <p className="font-sans text-white/90 text-xs md:text-sm uppercase tracking-[0.3em]">
              {selectedCategory === 'All' ? config.subtitle : `Curated ${selectedCategory} Selection`}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* --- LEVEL 1: ROOT VIEW - Main Categories Only --- */}
      {viewLevel === 'ROOT' && config.subcategories.length > 0 && (
        <section className="px-4 md:px-8 py-16 md:py-24">
          <div className="container mx-auto">
            <FadeIn className="text-center mb-12 md:mb-16">
              <h2 className="font-serif text-3xl md:text-4xl text-earth mb-4">Explore {config.title}</h2>
              <p className="text-xs uppercase tracking-widest text-earth/50">Select a category to begin</p>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:auto-rows-[minmax(300px,auto)]">
              {mainCategories.map((cat, idx) => (
                <FadeIn
                  key={cat.id || idx}
                  delay={idx * 100}
                  className={`group cursor-pointer relative overflow-hidden rounded-[2rem] shadow-sm border border-earth/5 aspect-[4/3] md:aspect-auto ${idx === 0 ? 'md:row-span-2 md:h-auto' : 'md:h-[350px]'}`}
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
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col justify-end items-start transform transition-transform duration-500 group-hover:-translate-y-2">
                      {cat.caption && (
                        <span className="text-[10px] uppercase tracking-[0.3em] text-white/80 mb-2">{cat.caption}</span>
                      )}
                      <div className="flex items-center justify-between w-full">
                        <h3 className="font-serif text-2xl md:text-4xl text-white leading-none">{cat.title}</h3>
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

      {/* --- LEVEL 2: CATEGORY VIEW - Subcategories with Product Previews --- */}
      {viewLevel === 'CATEGORY' && (
        <>
          {/* Back Button & Shop All Section */}
          <div className="sticky top-[73px] z-30 bg-cream/95 backdrop-blur-md border-b border-earth/10 px-4 md:px-8 py-4">
            <div className="container mx-auto flex items-center justify-between">
              <button
                onClick={() => handleCategoryChange(getBackDestination())}
                className="text-[10px] uppercase tracking-widest text-earth/50 hover:text-earth flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back to {config.title}
              </button>
              <button
                onClick={() => {
                  // Scroll to products or show all products for this category
                  const el = document.getElementById('all-products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-[10px] uppercase tracking-widest text-bronze hover:text-earth transition-colors"
              >
                Shop All {selectedCategory}
              </button>
            </div>
          </div>

          {/* Subcategory Boxes with Previews */}
          <section className="px-4 md:px-8 py-12 md:py-16">
            <div className="container mx-auto">
              <FadeIn className="text-center mb-10 md:mb-14">
                <h2 className="font-serif text-2xl md:text-3xl text-earth mb-2">Shop {selectedCategory}</h2>
                <p className="text-xs uppercase tracking-widest text-earth/50">Browse our curated categories</p>
              </FadeIn>

              {childCategories.map((cat, idx) => (
                <SubcategoryWithPreviews key={cat.id} category={cat} index={idx} />
              ))}
            </div>
          </section>

          {/* All Products for this Category */}
          <section id="all-products-section" className="px-4 md:px-8 py-12 md:py-16 bg-white">
            <div className="container mx-auto">
              <FadeIn className="text-center mb-10">
                <h2 className="font-serif text-2xl md:text-3xl text-earth mb-2">All {selectedCategory}</h2>
                <p className="text-xs uppercase tracking-widest text-earth/50">{filteredProducts.length} Items</p>
              </FadeIn>

              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {filteredProducts.map((product, idx) => (
                    <ProductCard key={product.id} product={product} index={idx} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="font-serif text-xl text-earth/50 mb-4">No products found in {selectedCategory}.</p>
                  <p className="text-xs uppercase tracking-widest text-earth/30">Check back soon for new arrivals.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* --- LEVEL 3: PRODUCT VIEW - Full Product Grid --- */}
      {viewLevel === 'PRODUCT' && (
        <>
          {/* Filter & Toolbar */}
          <div className="sticky top-[73px] z-30 bg-cream/95 backdrop-blur-md border-b border-earth/10 px-4 md:px-8 py-4 transition-all duration-300">
            <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                <button
                  onClick={() => handleCategoryChange(getBackDestination())}
                  className="whitespace-nowrap text-[10px] uppercase tracking-widest text-earth/50 hover:text-earth flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                {categories.slice(0, 8).map(cat => (
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

          <section className="px-4 md:px-8 py-12 md:py-16 min-h-[60vh]">
            <div className="container mx-auto">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 animate-fade-in-up">
                  <p className="font-serif text-2xl text-earth/50 mb-4">No products found in {selectedCategory}.</p>
                  <p className="text-xs uppercase tracking-widest text-earth/30">Check back soon for new arrivals.</p>
                  <button onClick={() => handleCategoryChange(getBackDestination())} className="mt-8 text-xs uppercase tracking-widest text-bronze border-b border-bronze pb-1 hover:text-earth hover:border-earth transition-colors">
                    Go Back
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
                  {filteredProducts.map((product, idx) => (
                    <FadeIn key={product.id} delay={idx * 50} className="group cursor-pointer">
                      <div
                        className="relative aspect-[3/4] overflow-hidden bg-white mb-4 rounded-sm"
                        onClick={() => handleSelectProduct(product)}
                      >
                        {product.isNew && (
                          <span className="absolute top-3 left-3 bg-white/90 px-2 py-1 text-[9px] uppercase tracking-widest text-earth z-10 rounded-sm">
                            New
                          </span>
                        )}
                        {product.variants && product.variants.length > 0 && (
                          <span className="absolute top-3 right-3 bg-bronze/90 px-2 py-1 text-[9px] uppercase tracking-widest text-white z-10 rounded-sm">
                            Multiple Options
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => handleSelectProduct(null)}></div>

          <div className="bg-cream w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-sm shadow-2xl relative flex flex-col md:flex-row overflow-hidden animate-fade-in-up">
            <button
              onClick={() => handleSelectProduct(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-earth" />
            </button>
            <div className="w-full md:w-1/2 bg-white h-1/2 md:h-auto overflow-hidden relative group">
              <img
                src={selectedVariant?.image || selectedProduct.images[0]}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto bg-cream flex flex-col">
              <div className="mb-auto">
                <div className="flex items-center gap-3 mb-4 text-[10px] uppercase tracking-widest text-earth/50">
                  <span>{config.title}</span>
                  <span className="w-1 h-1 bg-bronze rounded-full"></span>
                  <span>{selectedProduct.category}</span>
                </div>
                <h2 className="font-serif text-2xl md:text-4xl text-earth mb-4 leading-tight">{selectedProduct.name}</h2>
                <p className="font-serif text-xl md:text-2xl italic text-bronze mb-6">
                  ${(selectedProduct.price + (selectedVariant?.priceAdjustment || 0)).toFixed(2)}
                </p>
                <div className="h-px w-full bg-earth/10 mb-6"></div>

                {/* Variant Selector */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="mb-6">
                    <span className="text-[10px] uppercase tracking-widest text-earth/50 block mb-3">Select Option</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.variants.map(v => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v.id === selectedVariant?.id ? undefined : v)}
                          disabled={!v.inStock}
                          className={`px-4 py-2 text-xs uppercase tracking-wider border transition-all ${selectedVariant?.id === v.id
                            ? 'border-earth bg-earth text-cream'
                            : v.inStock
                              ? 'border-earth/20 text-earth hover:border-earth'
                              : 'border-earth/10 text-earth/30 cursor-not-allowed line-through'
                            }`}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="font-sans text-earth/70 leading-relaxed mb-6 text-sm">{selectedProduct.description}</p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <span className="w-2 h-2 rounded-full bg-green-600"></span>
                    {selectedProduct.inStock ? 'In Stock & Ready to Ship' : 'Made to Order'}
                  </div>
                </div>
              </div>
              <AddToCartButton
                product={selectedProduct}
                selectedVariant={selectedVariant}
                variantRequired={!!(selectedProduct.variants && selectedProduct.variants.length > 0)}
                className="mt-6"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
