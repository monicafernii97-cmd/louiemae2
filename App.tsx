
import React, { useState, useEffect } from 'react';
import { Menu, Search, X, Instagram, Facebook, Twitter, ChevronDown, ArrowRight, ChevronRight, ChevronLeft } from 'lucide-react';
import { AiConcierge } from './components/AiConcierge';
import { NavLink } from './types';
import { HomePage } from './components/HomePage';
import { StoryPage } from './components/StoryPage';
import { BlogPage } from './components/BlogPage';
import { AdminPage } from './components/AdminPage';
import { DynamicPage } from './components/DynamicPage';
import { StorePage } from './components/StorePage';
import { ShopLandingPage } from './components/ShopLandingPage';
import { NewsletterPopup } from './components/NewsletterPopup';
import { SiteProvider, useSite } from './contexts/BlogContext';
import { NewsletterProvider } from './contexts/NewsletterContext';
import { CartProvider } from './contexts/CartContext';
import { CartIcon, CartDrawer } from './components/cart';
import { CheckoutSuccess, CheckoutCancel } from './components/checkout';
import { SearchModal } from './components/SearchModal';
import AliExpressTest from './components/AliExpressTest';

interface MobileNavLinkProps {
  link: NavLink;
  handleNavigation: (href: string) => void;
  depth?: number;
}

// Recursively render mobile navigation links
const MobileNavLink: React.FC<MobileNavLinkProps> = ({ link, handleNavigation, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = link.children && link.children.length > 0;

  return (
    <div className="w-full">
      <div className={`flex items-center justify-between group w-full ${depth > 0 ? 'pl-4' : ''}`}>
        <button
          onClick={() => {
            if (hasChildren) {
              setIsOpen(!isOpen);
            } else {
              handleNavigation(link.href);
            }
          }}
          className={`flex-1 text-left font-serif text-earth transition-all duration-300 group-hover:text-bronze ${depth === 0 ? 'text-4xl md:text-5xl' : 'text-xl md:text-2xl mt-4'}`}
        >
          {link.label}
        </button>
        {hasChildren && (
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-earth/50">
            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {hasChildren && (
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className={`flex flex-col space-y-2 mt-2 border-l border-bronze/20 ml-2 ${depth > 0 ? 'pl-2' : ''}`}>
            {/* Clickable Parent Link inside submenu if it has separate destination */}
            <button
              onClick={() => handleNavigation(link.href)}
              className="block text-left text-xs uppercase tracking-[0.25em] text-earth/60 hover:text-bronze transition-colors py-2 pl-4 italic"
            >
              View All {link.label}
            </button>
            {link.children!.map(child => (
              <MobileNavLink key={child.label} link={child} handleNavigation={handleNavigation} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// We need a wrapper component to use the context inside App
const AppContent = () => {
  const { siteContent } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState<string>('home');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    // Lock body scroll when menu is open
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Hash handler
    const handleHash = () => {
      const fullHash = window.location.hash;
      // Split query params to determine main route
      const [baseHash] = fullHash.split('?');

      if (baseHash === '#admin') setActivePage('admin');
      else if (baseHash === '#blog') setActivePage('blog');
      else if (baseHash === '#story') setActivePage('story');
      else if (baseHash === '#shop') setActivePage('shop');
      else if (baseHash === '#aliexpress-test') setActivePage('aliexpress-test');
      else if (baseHash === '#checkout/success') setActivePage('checkout-success');
      else if (baseHash === '#checkout/cancel') setActivePage('checkout-cancel');
      else if (baseHash.startsWith('#pages/')) setActivePage(baseHash);
      else if (baseHash.startsWith('#collection/')) setActivePage(fullHash); // Pass full hash to parse query later
      else setActivePage('home');
    };

    handleHash(); // Initial check
    window.addEventListener('hashchange', handleHash);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHash);
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleNavigation = (href: string) => {
    setMobileMenuOpen(false);
    window.location.hash = href;

    // Fallback if hashchange doesn't fire immediately
    const [baseHash] = href.split('?');
    if (baseHash === '#story') setActivePage('story');
    else if (baseHash === '#blog') setActivePage('blog');
    else if (baseHash === '#admin') setActivePage('admin');
    else if (baseHash === '#shop') setActivePage('shop');
    else if (baseHash.startsWith('#pages/')) setActivePage(baseHash);
    else if (baseHash.startsWith('#collection/')) setActivePage(href);
    else setActivePage('home');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Merge dynamic custom pages into links if needed, or allow them to be manually added in admin
  const extendedNavLinks = siteContent.navLinks;

  // Determine which component to render
  let CurrentComponent: React.FC = HomePage;
  let dynamicPageData = null;

  if (activePage === 'admin') CurrentComponent = AdminPage;
  else if (activePage === 'blog') CurrentComponent = BlogPage;
  else if (activePage === 'story') CurrentComponent = StoryPage;
  else if (activePage === 'shop') CurrentComponent = ShopLandingPage;
  else if (activePage === 'aliexpress-test') CurrentComponent = AliExpressTest;
  else if (activePage === 'checkout-success') CurrentComponent = CheckoutSuccess;
  else if (activePage === 'checkout-cancel') CurrentComponent = CheckoutCancel;
  else if (activePage.startsWith('#pages/')) {
    const slug = activePage.replace('#pages/', '');
    dynamicPageData = siteContent.customPages.find(p => p.slug === slug);
    if (dynamicPageData) CurrentComponent = () => <DynamicPage page={dynamicPageData!} />;
    else CurrentComponent = HomePage; // Fallback
  }
  else if (activePage.startsWith('#collection/')) {
    const [path, query] = activePage.split('?');
    const type = path.replace('#collection/', '');
    const params = new URLSearchParams(query);
    const category = params.get('cat');

    // Check if the type exists in our dynamic collections
    const collectionExists = siteContent.collections.some(c => c.id === type);

    if (collectionExists) {
      CurrentComponent = () => <StorePage collection={type as any} initialCategory={category || 'All'} />;
    } else {
      CurrentComponent = HomePage;
    }
  }

  return (
    <div className="min-h-screen bg-cream font-sans selection:bg-bronze selection:text-white overflow-x-hidden">

      {/* Only show Header/Footer if NOT in admin mode */}
      {activePage !== 'admin' && (
        <>
          {/* Mobile Menu Overlay */}
          <div
            className={`fixed inset-0 z-50 flex flex-col bg-[#F9F7F2] transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-[20px] pointer-events-none'
              }`}
          >
            {/* Mobile Header */}
            <div className="flex justify-between items-center px-6 py-6 md:px-12">
              <div className="flex flex-col">
                <span className="font-serif text-2xl text-earth italic tracking-tight">Louie Mae</span>
                <span className="text-[0.5rem] uppercase tracking-[0.3em] text-bronze/70">Navigation</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="group relative w-10 h-10 flex items-center justify-center rounded-full border border-earth/10 hover:border-earth/30 transition-all duration-300"
              >
                <X className="w-5 h-5 text-earth group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>

            {/* Mobile Links */}
            <div className="flex-1 flex flex-col px-8 md:px-16 overflow-y-auto no-scrollbar">
              <div className="space-y-6 md:space-y-8 flex flex-col items-start max-w-lg mx-auto w-full py-10">
                {extendedNavLinks.map((link) => (
                  <MobileNavLink key={link.label} link={link} handleNavigation={handleNavigation} />
                ))}
              </div>
            </div>

            {/* Mobile Footer */}
            <div className="px-8 py-8 md:px-12 border-t border-earth/5">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-earth/40">Connect</p>
                  <div className="flex gap-6">
                    <Instagram className="w-5 h-5 text-earth/60 hover:text-earth transition-colors" />
                    <Facebook className="w-5 h-5 text-earth/60 hover:text-earth transition-colors" />
                    <Twitter className="w-5 h-5 text-earth/60 hover:text-earth transition-colors" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button onClick={() => handleNavigation('#admin')} className="text-[10px] uppercase tracking-[0.2em] text-earth/40 hover:text-bronze transition-colors">
                    Admin Portal
                  </button>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-earth/30">Est. 2021</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <header
            className={`fixed top-0 left-0 right-0 z-40 transition-all duration-700 border-b ${scrolled ? 'bg-cream/90 backdrop-blur-md py-3 border-sand/40 shadow-sm' : 'bg-transparent py-6 border-transparent'
              }`}
          >
            <div className="w-full px-6 md:px-12 relative flex justify-between items-center min-h-[50px]">
              {/* Mobile Menu Icon */}
              <button
                className="lg:hidden text-earth z-50 p-2 -ml-2 hover:opacity-70 transition-opacity"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Desktop Navigation & Logo */}
              <div className="hidden lg:flex absolute inset-0 justify-center items-center pointer-events-none">
                <div className="flex items-center gap-10 xl:gap-14 pointer-events-auto bg-transparent">
                  <nav className="flex gap-6 xl:gap-9">
                    {extendedNavLinks.slice(0, 3).map(link => (
                      <div key={link.label} className="relative group">
                        <button
                          onClick={() => handleNavigation(link.href)}
                          className="text-[0.65rem] uppercase tracking-[0.15em] text-earth/80 hover:text-bronze transition-colors font-medium whitespace-nowrap py-2 flex items-center gap-1"
                        >
                          {link.label}
                          {link.children && <ChevronDown className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity" />}
                        </button>

                        {/* Level 1 Dropdown */}
                        {link.children && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200">
                            <div className="bg-cream/95 backdrop-blur-xl border border-white/60 py-4 px-4 shadow-[0_10px_30px_-10px_rgba(74,59,50,0.15)] rounded-lg min-w-[220px] max-h-[75vh] overflow-y-auto">
                              <div className="flex flex-col gap-0.5">
                                {link.children.map(child => (
                                  <div key={child.label} className="w-full">
                                    {/* Category Header */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNavigation(child.href);
                                      }}
                                      className="w-full text-left text-[0.7rem] uppercase tracking-[0.15em] text-earth font-medium py-2 px-2 hover:text-bronze transition-colors rounded-md hover:bg-white/40"
                                    >
                                      {child.label}
                                    </button>

                                    {/* Subcategories - Always visible */}
                                    {child.children && (
                                      <div className="ml-3 mb-2 border-l border-bronze/15 pl-2">
                                        {child.children.map(subChild => (
                                          <div key={subChild.label}>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleNavigation(subChild.href); }}
                                              className="w-full text-left text-[0.6rem] uppercase tracking-[0.12em] text-earth/70 py-1.5 px-2 hover:text-bronze transition-colors rounded hover:bg-white/30"
                                            >
                                              {subChild.label}
                                            </button>

                                            {/* Deep items - Always visible */}
                                            {subChild.children && (
                                              <div className="ml-3 border-l border-bronze/10 pl-2">
                                                {subChild.children.map(deepChild => (
                                                  <button
                                                    key={deepChild.label}
                                                    onClick={(e) => { e.stopPropagation(); handleNavigation(deepChild.href); }}
                                                    className="w-full text-left text-[0.55rem] uppercase tracking-[0.1em] text-earth/60 py-1.5 px-2 hover:text-bronze transition-colors rounded hover:bg-white/20"
                                                  >
                                                    {deepChild.label}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </nav>

                  <div className="text-center px-6 cursor-pointer" onClick={() => handleNavigation('#')}>
                    <p className={`text-[0.55rem] uppercase tracking-[0.3em] text-bronze mb-1 transition-all duration-500 ${scrolled ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                      Est. 2021
                    </p>
                    <h1 className={`font-serif text-earth tracking-tight whitespace-nowrap transition-all duration-500 ${scrolled ? 'text-2xl' : 'text-3xl xl:text-4xl'}`}>
                      Louie Mae
                    </h1>
                  </div>

                  <nav className="flex gap-6 xl:gap-9">
                    {extendedNavLinks.slice(3).map(link => (
                      <div key={link.label} className="relative group">
                        <button
                          onClick={() => handleNavigation(link.href)}
                          className="text-[0.65rem] uppercase tracking-[0.15em] text-earth/80 hover:text-bronze transition-colors font-medium whitespace-nowrap py-2 flex items-center gap-1"
                        >
                          {link.label}
                          {link.children && <ChevronDown className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity" />}
                        </button>

                        {/* Level 1 Dropdown - Static mega-menu layout */}
                        {link.children && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200">
                            <div className="bg-cream/95 backdrop-blur-xl border border-white/60 py-4 px-4 shadow-[0_10px_30px_-10px_rgba(74,59,50,0.15)] rounded-lg min-w-[220px] max-h-[75vh] overflow-y-auto">
                              <div className="flex flex-col gap-0.5">
                                {link.children.map(child => (
                                  <div key={child.label} className="w-full">
                                    {/* Category Header */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNavigation(child.href);
                                      }}
                                      className="w-full text-left text-[0.7rem] uppercase tracking-[0.15em] text-earth font-medium py-2 px-2 hover:text-bronze transition-colors rounded-md hover:bg-white/40"
                                    >
                                      {child.label}
                                    </button>

                                    {/* Subcategories - Always visible */}
                                    {child.children && (
                                      <div className="ml-3 mb-2 border-l border-bronze/15 pl-2">
                                        {child.children.map(subChild => (
                                          <div key={subChild.label}>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleNavigation(subChild.href); }}
                                              className="w-full text-left text-[0.6rem] uppercase tracking-[0.12em] text-earth/70 py-1.5 px-2 hover:text-bronze transition-colors rounded hover:bg-white/30"
                                            >
                                              {subChild.label}
                                            </button>

                                            {/* Deep items - Always visible */}
                                            {subChild.children && (
                                              <div className="ml-3 border-l border-bronze/10 pl-2">
                                                {subChild.children.map(deepChild => (
                                                  <button
                                                    key={deepChild.label}
                                                    onClick={(e) => { e.stopPropagation(); handleNavigation(deepChild.href); }}
                                                    className="w-full text-left text-[0.55rem] uppercase tracking-[0.1em] text-earth/60 py-1.5 px-2 hover:text-bronze transition-colors rounded hover:bg-white/20"
                                                  >
                                                    {deepChild.label}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Mobile Logo */}
              <div
                className="lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-40 pointer-events-auto cursor-pointer"
                onClick={() => handleNavigation('#')}
              >
                <p className={`text-[0.45rem] uppercase tracking-[0.25em] text-bronze mb-0.5 transition-all ${scrolled ? 'hidden' : 'block'}`}>
                  Est. 2021
                </p>
                <h1 className="font-serif text-2xl text-earth tracking-tight whitespace-nowrap">
                  Louie Mae
                </h1>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 md:gap-6 ml-auto z-50 pl-4">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="text-earth hover:text-bronze transition-colors p-1"
                >
                  <Search className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <CartIcon />
              </div>
            </div>
          </header>
        </>
      )}

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onProductClick={(productId) => {
          setSelectedProductId(productId);
          setSearchOpen(false);
        }}
      />

      {/* Main Content Area */}
      <CurrentComponent />

      {/* Footer (Hidden on Admin) */}
      {activePage !== 'admin' && (
        <footer className="bg-earth text-cream pt-20 pb-10 px-6">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div>
              <h4 className="font-serif text-2xl mb-6">Louie Mae</h4>
              <p className="text-sm text-sand/70 font-sans leading-relaxed">
                Curating a life you love through timeless design and authentic living.
              </p>
            </div>
            <div>
              <h4 className="font-serif text-xl mb-6">Shop</h4>
              <ul className="space-y-3 text-sm text-sand/70">
                <li><button onClick={() => handleNavigation('#shop')} className="hover:text-white transition-colors text-left">New Arrivals</button></li>
                <li><button onClick={() => handleNavigation('#collection/furniture')} className="hover:text-white transition-colors text-left">Furniture</button></li>
                <li><button onClick={() => handleNavigation('#collection/decor')} className="hover:text-white transition-colors text-left">Decor</button></li>
                <li><button onClick={() => handleNavigation('#collection/kids')} className="hover:text-white transition-colors text-left">Kids</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-xl mb-6">Support</h4>
              <ul className="space-y-3 text-sm text-sand/70">
                <li><a href="#" className="hover:text-white transition-colors">Shipping & Returns</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-xl mb-6">Follow Us</h4>
              <div className="flex gap-4">
                <Instagram className="w-5 h-5 text-sand hover:text-white cursor-pointer transition-colors" />
                <Facebook className="w-5 h-5 text-sand hover:text-white cursor-pointer transition-colors" />
                <Twitter className="w-5 h-5 text-sand hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex justify-between items-center text-xs text-sand/50 uppercase tracking-widest">
            <span>© 2024 Louie Mae Collective.</span>
            <button onClick={() => handleNavigation('#admin')} className="hover:text-bronze transition-colors">Admin</button>
          </div>
        </footer>
      )}

      {/* Floating AI Concierge & Newsletter Popup (Hidden on Admin) */}
      {activePage !== 'admin' && (
        <>
          <AiConcierge />
          <NewsletterPopup />
        </>
      )}

    </div>
  );
};

export default function App() {
  return (
    <SiteProvider>
      <NewsletterProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </NewsletterProvider>
    </SiteProvider>
  );
}
