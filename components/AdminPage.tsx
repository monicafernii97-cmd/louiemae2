
import React, { useState, useRef } from 'react';
import { useSite } from '../contexts/BlogContext';
import { useNewsletter } from '../contexts/NewsletterContext';
import { FadeIn } from './FadeIn';
import { Plus, Edit3, Trash2, LogOut, Save, X, Image as ImageIcon, Layout, ArrowLeft, PenTool, BookOpen, Home, Settings, Sparkles, Loader2, FileText, ShoppingBag, Tag, Box, Shirt, Baby, Sofa, Gamepad2, Bed, Wand2, ChevronDown, List, Layers, Link as LinkIcon, Menu, Upload, Grid, Maximize, Type, Mail, Users, Send, TrendingUp, BarChart2 } from 'lucide-react';
import { BlogPost, SiteContent, CustomPage, PageSection, Product, CollectionType, CollectionConfig, NavLink, SectionItem, EmailCampaign } from '../types';
import { generatePageStructure, suggestProductCategory, generateEmailSubject, generateEmailBody } from '../services/geminiService';

// --- Image Uploader Component ---
const ImageUploader: React.FC<{
   currentImage?: string;
   onImageChange: (val: string) => void;
   label?: string;
   className?: string;
   aspectRatio?: string;
}> = ({ currentImage = '', onImageChange, label = 'Image', className = '', aspectRatio = 'aspect-[3/4]' }) => {
   const fileInputRef = useRef<HTMLInputElement>(null);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onloadend = () => {
            onImageChange(reader.result as string);
         };
         reader.readAsDataURL(file);
      }
   };

   return (
      <div className={className}>
         <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">{label}</label>
         <div className="flex gap-6 items-start">
            <div
               className={`w-32 ${aspectRatio} bg-cream/50 border border-earth/10 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity rounded-sm shadow-sm flex-shrink-0 relative group`}
               onClick={() => fileInputRef.current?.click()}
            >
               {currentImage ? (
                  <img src={currentImage} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                  <ImageIcon className="w-8 h-8 text-earth/20" />
               )}
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Upload className="w-6 h-6 text-white drop-shadow-md" />
               </div>
            </div>
            <div className="flex-1 space-y-3 pt-2">
               <div className="flex flex-col gap-2">
                  <button
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full sm:w-auto text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 bg-white border border-earth/10 px-4 py-3 hover:bg-earth hover:text-white transition-colors shadow-sm"
                  >
                     <Upload className="w-3 h-3" /> Upload Photo from Computer
                  </button>
                  <input
                     type="file"
                     ref={fileInputRef}
                     className="hidden"
                     accept="image/*"
                     onChange={handleFileChange}
                  />
               </div>
               <div className="relative">
                  <span className="absolute top-1/2 -translate-y-1/2 left-0 text-[9px] uppercase tracking-widest text-earth/30">OR</span>
                  <input
                     type="text"
                     value={currentImage}
                     onChange={(e) => onImageChange(e.target.value)}
                     className="w-full bg-transparent border-b border-earth/10 py-2 pl-8 text-xs font-mono text-earth/60 focus:outline-none focus:border-bronze placeholder:text-earth/20"
                     placeholder="Paste Image URL"
                  />
               </div>
            </div>
         </div>
      </div>
   );
};

export const AdminPage: React.FC = () => {
   const { isAuthenticated, login, logout, posts, addPost, updatePost, deletePost, siteContent, updateSiteContent, addCustomPage, updateCustomPage, deleteCustomPage, products, addProduct, updateProduct, deleteProduct, addCollection, updateCollection, deleteCollection, updateNavigation } = useSite();
   const { subscribers, campaigns, createCampaign, updateCampaign, sendCampaign, deleteCampaign, stats } = useNewsletter();

   const [password, setPassword] = useState('');
   const [error, setError] = useState('');

   // Navigation State
   const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'pages' | 'products' | 'structure' | 'newsletter'>('dashboard');
   const [newsletterSubTab, setNewsletterSubTab] = useState<'overview' | 'campaigns' | 'subscribers'>('overview');

   const [activePageEditor, setActivePageEditor] = useState<'home' | 'story' | string | null>(null);
   const [filterCollection, setFilterCollection] = useState<CollectionType | 'all'>('all');
   const [filterCategory, setFilterCategory] = useState<string | null>(null);

   // Expanded Menus State in Sidebar
   const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});

   // Blog Editor State
   const [isEditingPost, setIsEditingPost] = useState(false);
   const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);

   // Product Editor State
   const [isEditingProduct, setIsEditingProduct] = useState(false);
   const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
   const [isCategorizing, setIsCategorizing] = useState(false);

   // Structure/Collection Editor State
   const [editingCollection, setEditingCollection] = useState<Partial<CollectionConfig> | null>(null);
   const [editingNav, setEditingNav] = useState<NavLink[] | null>(null);

   // Newsletter Editor State
   const [editingCampaign, setEditingCampaign] = useState<Partial<EmailCampaign> | null>(null);
   const [aiGenerating, setAiGenerating] = useState<'subject' | 'body' | null>(null);

   // New Page Generation State
   const [showPageGenerator, setShowPageGenerator] = useState(false);
   const [generatorPrompt, setGeneratorPrompt] = useState({ title: '', description: '' });
   const [isGenerating, setIsGenerating] = useState(false);

   // Section Picker State
   const [showSectionPicker, setShowSectionPicker] = useState(false);

   // Login Handler
   const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (login(password)) {
         setError('');
      } else {
         setError('Incorrect password. Please try again.');
      }
   };

   const handleReturnToSite = () => {
      window.location.hash = '';
   };

   const toggleCollectionExpand = (id: string) => {
      setExpandedCollections(prev => ({ ...prev, [id]: !prev[id] }));
   };

   // --- HELPER: ADD SECTION ---
   const handleAddSection = (type: PageSection['type']) => {
      const newSection: PageSection = {
         id: Date.now().toString(),
         type,
         heading: type === 'product-feature' ? undefined : 'New Section',
         content: type === 'text' || type === 'image-text' ? 'Add your content here...' : undefined,
         image: (type === 'hero' || type === 'image-text' || type === 'full-image') ? 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800' : undefined,
         items: type === 'grid' ? [
            { title: 'Item 1', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800', link: '#' },
            { title: 'Item 2', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800', link: '#' },
         ] : undefined,
         productId: type === 'product-feature' ? products[0]?.id : undefined
      };

      if (activePageEditor === 'home') {
         updateSiteContent('home', { sections: [...(siteContent.home.sections || []), newSection] });
      } else if (activePageEditor === 'story') {
         updateSiteContent('story', { sections: [...(siteContent.story.sections || []), newSection] });
      } else if (activePageEditor && activePageEditor !== 'story') {
         const page = siteContent.customPages.find(p => p.id === activePageEditor);
         if (page) {
            updateCustomPage(page.id, { sections: [...page.sections, newSection] });
         }
      }
      setShowSectionPicker(false);
   };

   // --- NEWSLETTER HANDLERS ---
   const handleCreateCampaign = () => {
      setEditingCampaign({
         subject: '',
         previewText: '',
         content: '<p>Dear Subscriber,</p><p>...</p>',
         type: 'newsletter',
         status: 'draft'
      });
   };

   const handleSaveCampaign = () => {
      if (!editingCampaign?.subject || !editingCampaign?.content) return;

      if (editingCampaign.id) {
         updateCampaign(editingCampaign.id, editingCampaign);
      } else {
         createCampaign(editingCampaign as any);
      }
      setEditingCampaign(null);
   };

   const handleGenerateSubject = async () => {
      if (!editingCampaign?.content) return alert("Write some content first for context.");
      setAiGenerating('subject');
      const subjects = await generateEmailSubject(editingCampaign.content.substring(0, 100)); // Use first 100 chars as topic
      if (subjects.length > 0) {
         setEditingCampaign(prev => prev ? ({ ...prev, subject: subjects[0] }) : null);
      }
      setAiGenerating(null);
   };

   const handleGenerateBody = async (topic: string) => {
      setAiGenerating('body');
      const body = await generateEmailBody(topic, editingCampaign?.type as any || 'newsletter');
      setEditingCampaign(prev => prev ? ({ ...prev, content: body }) : null);
      setAiGenerating(null);
   };

   // --- BLOG HANDLERS ---
   const handleCreateNewPost = () => {
      setEditingPost({
         title: '',
         category: 'Lifestyle',
         excerpt: '',
         content: '',
         image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2000&auto=format&fit=crop',
         status: 'draft'
      });
      setIsEditingPost(true);
   };

   const handleEditPost = (post: BlogPost) => {
      setEditingPost(post);
      setIsEditingPost(true);
   };

   const handleSavePost = () => {
      if (!editingPost?.title || !editingPost?.content) return;
      if (editingPost.id) {
         updatePost(editingPost.id, editingPost);
      } else {
         addPost(editingPost as Omit<BlogPost, 'id' | 'date'>);
      }
      setIsEditingPost(false);
      setEditingPost(null);
   };

   const handleDeletePost = (id: string) => {
      if (confirm('Are you sure you want to delete this story? This cannot be undone.')) {
         deletePost(id);
      }
   };

   // --- PRODUCT HANDLERS ---
   const handleCreateProduct = () => {
      // Default to first collection if any
      const defaultCollection = siteContent.collections.length > 0 ? siteContent.collections[0].id : 'furniture';

      setEditingProduct({
         name: '',
         price: 0,
         description: '',
         images: ['https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800'],
         // Auto-select collection based on current view
         collection: filterCollection === 'all' ? defaultCollection : filterCollection,
         // Auto-select category if we are in a specific filter
         category: filterCategory || '',
         isNew: false,
         inStock: true
      });
      setIsEditingProduct(true);
   };

   const handleEditProduct = (prod: Product) => {
      setEditingProduct(prod);
      setIsEditingProduct(true);
   };

   const handleSaveProduct = () => {
      if (!editingProduct?.name || !editingProduct?.price) return;
      if (editingProduct.id) {
         updateProduct(editingProduct.id, editingProduct);
      } else {
         addProduct(editingProduct as Omit<Product, 'id'>);
      }
      setIsEditingProduct(false);
      setEditingProduct(null);
   };

   const handleDeleteProduct = (id: string) => {
      if (confirm('Delete this product?')) deleteProduct(id);
   };

   const handleAutoCategorize = async () => {
      if (!editingProduct?.name) return;
      setIsCategorizing(true);
      const category = await suggestProductCategory(editingProduct.name, editingProduct.description || '');
      if (category) {
         setEditingProduct(prev => prev ? ({ ...prev, category }) : null);
      }
      setIsCategorizing(false);
   };

   // --- STRUCTURE HANDLERS ---
   const handleCreateCollection = () => {
      setEditingCollection({
         id: '',
         title: '',
         subtitle: 'Curated Collection',
         heroImage: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=2000',
         subcategories: []
      });
   };

   const handleSaveCollection = () => {
      if (!editingCollection?.id || !editingCollection?.title) {
         alert('ID and Title are required');
         return;
      }

      const exists = siteContent.collections.find(c => c.id === editingCollection.id);
      if (exists) {
         updateCollection(editingCollection.id, editingCollection);
      } else {
         addCollection(editingCollection as CollectionConfig);
      }
      setEditingCollection(null);
   };

   const handleDeleteCollection = (id: string) => {
      if (confirm(`Delete collection "${id}"? Products in this collection will remain but be uncategorized.`)) {
         deleteCollection(id);
      }
   };

   // --- PAGE GENERATION HANDLERS ---
   const handleGeneratePage = async () => {
      if (!generatorPrompt.title || !generatorPrompt.description) return;

      setIsGenerating(true);
      try {
         const generatedContent = await generatePageStructure(generatorPrompt.description, generatorPrompt.title);

         const newPage: CustomPage = {
            id: Date.now().toString(),
            slug: generatorPrompt.title.toLowerCase().replace(/\s+/g, '-'),
            title: generatedContent.title,
            sections: generatedContent.sections as any
         };

         addCustomPage(newPage);
         setShowPageGenerator(false);
         setGeneratorPrompt({ title: '', description: '' });
         setActivePageEditor(newPage.id);
      } catch (e) {
         alert("Failed to generate page. Please try again.");
      } finally {
         setIsGenerating(false);
      }
   };

   const handleDeleteCustomPage = (id: string) => {
      if (confirm('Are you sure you want to delete this entire page?')) {
         deleteCustomPage(id);
         setActivePageEditor(null);
      }
   };

   // Helper to get collection title
   const getCollectionTitle = (id: string) => {
      if (id === 'all') return 'All Inventory';
      return siteContent.collections.find(c => c.id === id)?.title || id;
   };

   // Filter products
   const filteredProducts = products.filter(p => {
      const matchCollection = filterCollection === 'all' ? true : p.collection === filterCollection;
      const matchCategory = filterCategory ? p.category === filterCategory : true;
      return matchCollection && matchCategory;
   });

   // --- LOGIN SCREEN ---
   if (!isAuthenticated) {
      return (
         <div className="min-h-screen bg-cream flex items-center justify-center px-6">
            <FadeIn className="w-full max-w-md">
               <div className="bg-white p-12 shadow-[0_20px_50px_-12px_rgba(74,59,50,0.1)] rounded-sm text-center border border-earth/5">
                  <span className="text-bronze text-[10px] uppercase tracking-[0.3em] mb-4 block">Restricted Access</span>
                  <h1 className="font-serif text-4xl text-earth mb-2">The Atelier</h1>
                  <p className="text-earth/50 text-xs uppercase tracking-widest mb-10">Backend Management</p>
                  <form onSubmit={handleLogin} className="space-y-8">
                     <div className="relative">
                        <input
                           type="password"
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           placeholder="Enter Passkey"
                           className="w-full text-center border-b border-earth/20 py-3 text-earth placeholder:text-earth/20 focus:outline-none focus:border-bronze transition-colors font-serif text-xl bg-transparent"
                        />
                     </div>
                     {error && <p className="text-red-800 text-xs tracking-widest uppercase">{error}</p>}
                     <button type="submit" className="w-full bg-earth text-cream py-4 text-[10px] uppercase tracking-[0.25em] hover:bg-bronze transition-all duration-500">
                        Enter Studio
                     </button>
                  </form>
                  <button onClick={handleReturnToSite} className="mt-8 text-[10px] uppercase tracking-[0.2em] text-earth/30 hover:text-earth transition-colors">
                     Return to Site
                  </button>
               </div>
            </FadeIn>
         </div>
      );
   }

   // --- MAIN ADMIN INTERFACE ---
   return (
      <div className="min-h-screen bg-[#F9F7F2] flex">
         {/* Sidebar Navigation */}
         <aside className="w-64 bg-earth text-cream fixed h-full z-20 flex flex-col border-r border-white/5 shadow-2xl overflow-y-auto no-scrollbar">
            <div className="p-8 border-b border-white/10">
               <h2 className="font-serif text-2xl italic tracking-wide">The Atelier</h2>
               <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mt-1">Admin Console</p>
            </div>

            <nav className="flex-1 py-8 px-4 space-y-1">
               <button
                  onClick={() => { setActiveTab('dashboard'); setActivePageEditor(null); }}
                  className={`w-full text-left px-4 py-3 text-xs uppercase tracking-[0.2em] flex items-center gap-3 rounded-sm transition-all mb-4 ${activeTab === 'dashboard' ? 'bg-cream/10 text-white' : 'text-white/50 hover:text-white hover:bg-cream/5'}`}
               >
                  <Home className="w-4 h-4" /> Dashboard
               </button>

               <button
                  onClick={() => { setActiveTab('newsletter'); setNewsletterSubTab('overview'); setActivePageEditor(null); }}
                  className={`w-full text-left px-4 py-3 text-xs uppercase tracking-[0.2em] flex items-center gap-3 rounded-sm transition-all mb-4 ${activeTab === 'newsletter' ? 'bg-cream/10 text-white' : 'text-white/50 hover:text-white hover:bg-cream/5'}`}
               >
                  <Mail className="w-4 h-4" /> Newsletter
               </button>

               <button
                  onClick={() => { setActiveTab('structure'); setActivePageEditor(null); }}
                  className={`w-full text-left px-4 py-3 text-xs uppercase tracking-[0.2em] flex items-center gap-3 rounded-sm transition-all mb-4 ${activeTab === 'structure' ? 'bg-cream/10 text-white' : 'text-white/50 hover:text-white hover:bg-cream/5'}`}
               >
                  <Layers className="w-4 h-4" /> Site Structure
               </button>

               <div className="px-4 pt-4 pb-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-semibold">Collections</span>
               </div>

               {/* Dynamic Collection Menu */}
               {siteContent.collections.map(collection => (
                  <div className="mb-2" key={collection.id}>
                     <button
                        onClick={() => toggleCollectionExpand(collection.id)}
                        className={`w-full text-left px-4 py-3 text-xs uppercase tracking-[0.2em] flex items-center justify-between rounded-sm transition-all ${activeTab === 'products' && filterCollection === collection.id ? 'bg-cream/10 text-white' : 'text-white/50 hover:text-white hover:bg-cream/5'}`}
                     >
                        <div className="flex items-center gap-3">
                           {/* Simple logic for icons based on ID, fallback to Box */}
                           {collection.id === 'furniture' ? <Sofa className="w-4 h-4" /> :
                              collection.id === 'fashion' ? <Shirt className="w-4 h-4" /> :
                                 collection.id === 'kids' ? <Baby className="w-4 h-4" /> :
                                    <Box className="w-4 h-4" />}
                           {collection.title}
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedCollections[collection.id] ? 'rotate-180' : ''}`} />
                     </button>

                     {expandedCollections[collection.id] && (
                        <div className="pl-4 space-y-0.5 mt-1 border-l border-white/10 ml-6">
                           <button
                              onClick={() => { setActiveTab('products'); setFilterCollection(collection.id); setFilterCategory(null); setIsEditingProduct(false); setActivePageEditor(null); }}
                              className={`w-full text-left px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] rounded-sm transition-all ${activeTab === 'products' && filterCollection === collection.id && !filterCategory ? 'bg-cream/10 text-white' : 'text-white/50 hover:text-white hover:bg-cream/5'}`}
                           >
                              All {collection.title}
                           </button>
                           {collection.subcategories.map(cat => (
                              <button
                                 key={cat.id}
                                 onClick={() => { setActiveTab('products'); setFilterCollection(collection.id); setFilterCategory(cat.title); setIsEditingProduct(false); setActivePageEditor(null); }}
                                 className={`w-full text-left px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] rounded-sm transition-all ${activeTab === 'products' && filterCollection === collection.id && filterCategory === cat.title ? 'bg-cream/10 text-white' : 'text-white/50 hover:text-white hover:bg-cream/5'}`}
                              >
                                 {cat.title.replace(collection.title + ' ', '')}
                              </button>
                           ))}
                        </div>
                     )}
                  </div>
               ))}

               <div className="px-4 pt-6 pb-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-semibold">Content</span>
               </div>

               <button
                  onClick={() => { setActiveTab('journal'); setActivePageEditor(null); }}
                  className={`w-full text-left px-4 py-3 text-xs uppercase tracking-[0.2em] flex items-center gap-3 rounded-sm transition-all ${activeTab === 'journal' ? 'bg-cream/10 text-white' : 'text-white/50 hover:text-white hover:bg-cream/5'}`}
               >
                  <BookOpen className="w-4 h-4" /> Journal
               </button>

               <button
                  onClick={() => { setActiveTab('pages'); setActivePageEditor(null); }}
                  className={`w-full text-left px-4 py-3 text-xs uppercase tracking-[0.2em] flex items-center gap-3 rounded-sm transition-all ${activeTab === 'pages' ? 'bg-cream/10 text-white' : 'text-white/50 hover:text-white hover:bg-cream/5'}`}
               >
                  <Layout className="w-4 h-4" /> Page Editor
               </button>
            </nav>

            <div className="p-4 border-t border-white/10 mt-auto">
               <button onClick={() => { logout(); handleReturnToSite(); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
                  <LogOut className="w-4 h-4" /> Exit Studio
               </button>
            </div>
         </aside>

         {/* Main Content Area */}
         <main className="ml-64 flex-1 p-12 overflow-y-auto">

            {/* DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
               <FadeIn>
                  <div className="mb-12">
                     <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Overview</span>
                     <h1 className="font-serif text-4xl text-earth">Welcome Back, Monica.</h1>
                  </div>

                  <div className="grid grid-cols-3 gap-8 mb-16">
                     <div onClick={() => { setActiveTab('products'); setFilterCollection('all'); setFilterCategory(null); }} className="bg-white p-8 border border-earth/5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <ShoppingBag className="w-6 h-6 text-bronze mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="font-serif text-2xl text-earth mb-2">{products.length} Products</h3>
                        <p className="text-xs text-earth/50">Total inventory across all collections</p>
                     </div>
                     <div onClick={() => setActiveTab('structure')} className="bg-white p-8 border border-earth/5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <Layers className="w-6 h-6 text-bronze mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="font-serif text-2xl text-earth mb-2">{siteContent.collections.length} Collections</h3>
                        <p className="text-xs text-earth/50">Manage menus & structure</p>
                     </div>
                     <div onClick={() => setActiveTab('pages')} className="bg-white p-8 border border-earth/5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <Layout className="w-6 h-6 text-bronze mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="font-serif text-2xl text-earth mb-2">{2 + siteContent.customPages.length} Pages</h3>
                        <p className="text-xs text-earth/50">Customize site content</p>
                     </div>
                  </div>
               </FadeIn>
            )}

            {/* NEWSLETTER TAB */}
            {activeTab === 'newsletter' && (
               <FadeIn>
                  <div className="mb-12 border-b border-earth/10 pb-6 flex justify-between items-end">
                     <div>
                        <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Communications</span>
                        <h1 className="font-serif text-4xl text-earth">The Mae Letter</h1>
                     </div>
                     <div className="flex gap-4">
                        <button
                           onClick={() => setNewsletterSubTab('overview')}
                           className={`px-4 py-2 text-xs uppercase tracking-widest ${newsletterSubTab === 'overview' ? 'text-earth border-b border-earth' : 'text-earth/40 hover:text-earth'}`}
                        >
                           Overview
                        </button>
                        <button
                           onClick={() => setNewsletterSubTab('campaigns')}
                           className={`px-4 py-2 text-xs uppercase tracking-widest ${newsletterSubTab === 'campaigns' ? 'text-earth border-b border-earth' : 'text-earth/40 hover:text-earth'}`}
                        >
                           Campaigns
                        </button>
                        <button
                           onClick={() => setNewsletterSubTab('subscribers')}
                           className={`px-4 py-2 text-xs uppercase tracking-widest ${newsletterSubTab === 'subscribers' ? 'text-earth border-b border-earth' : 'text-earth/40 hover:text-earth'}`}
                        >
                           Subscribers
                        </button>
                     </div>
                  </div>

                  {/* NEWSLETTER: OVERVIEW */}
                  {newsletterSubTab === 'overview' && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 border border-earth/5 shadow-sm">
                           <Users className="w-6 h-6 text-bronze mb-4" />
                           <h3 className="font-serif text-3xl text-earth mb-1">{stats.totalSubscribers}</h3>
                           <p className="text-xs uppercase tracking-widest text-earth/50">Total Subscribers</p>
                        </div>
                        <div className="bg-white p-8 border border-earth/5 shadow-sm">
                           <BarChart2 className="w-6 h-6 text-bronze mb-4" />
                           <h3 className="font-serif text-3xl text-earth mb-1">{stats.avgOpenRate}%</h3>
                           <p className="text-xs uppercase tracking-widest text-earth/50">Avg. Open Rate</p>
                        </div>
                        <div className="bg-white p-8 border border-earth/5 shadow-sm">
                           <Send className="w-6 h-6 text-bronze mb-4" />
                           <h3 className="font-serif text-3xl text-earth mb-1">{stats.totalEmailsSent}</h3>
                           <p className="text-xs uppercase tracking-widest text-earth/50">Emails Sent</p>
                        </div>
                     </div>
                  )}

                  {/* NEWSLETTER: SUBSCRIBERS */}
                  {newsletterSubTab === 'subscribers' && (
                     <div className="bg-white border border-earth/5">
                        <table className="w-full text-left text-sm text-earth/70">
                           <thead className="bg-cream/50 text-xs uppercase tracking-widest text-earth/40">
                              <tr>
                                 <th className="px-6 py-4 font-normal">Email</th>
                                 <th className="px-6 py-4 font-normal">Joined</th>
                                 <th className="px-6 py-4 font-normal">Tags</th>
                                 <th className="px-6 py-4 font-normal">Status</th>
                              </tr>
                           </thead>
                           <tbody>
                              {subscribers.map(sub => (
                                 <tr key={sub.id} className="border-t border-earth/5 hover:bg-cream/20">
                                    <td className="px-6 py-4 font-serif text-lg text-earth">{sub.email}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{sub.dateSubscribed}</td>
                                    <td className="px-6 py-4">
                                       <div className="flex gap-2">
                                          {sub.tags.map(tag => (
                                             <span key={tag} className="bg-earth/5 px-2 py-1 text-[9px] uppercase tracking-widest rounded-sm">
                                                {tag}
                                             </span>
                                          ))}
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <span className={`text-[9px] uppercase tracking-widest px-2 py-1 ${sub.status === 'active' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                          {sub.status}
                                       </span>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}

                  {/* NEWSLETTER: CAMPAIGNS */}
                  {newsletterSubTab === 'campaigns' && (
                     <div>
                        <div className="flex justify-end mb-8">
                           <button onClick={() => { handleCreateCampaign(); setEditingCampaign({ subject: '', content: '', status: 'draft', type: 'newsletter' }); }} className="bg-earth text-cream px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-all shadow-lg flex items-center gap-2">
                              <Plus className="w-3 h-3" /> New Campaign
                           </button>
                        </div>

                        <div className="space-y-4">
                           {campaigns.map(camp => (
                              <div key={camp.id} className="bg-white p-6 border border-earth/5 flex justify-between items-center group">
                                 <div>
                                    <div className="flex items-center gap-3 mb-2">
                                       <span className={`w-2 h-2 rounded-full ${camp.status === 'sent' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                       <h3 className="font-serif text-xl text-earth">{camp.subject}</h3>
                                    </div>
                                    <div className="flex gap-6 text-xs text-earth/50">
                                       <span>{camp.status === 'sent' ? `Sent: ${camp.sentDate}` : 'Draft'}</span>
                                       {camp.status === 'sent' && (
                                          <>
                                             <span>Sent: {camp.stats.sent}</span>
                                             <span>Opened: {camp.stats.opened}</span>
                                             <span>Clicked: {camp.stats.clicked}</span>
                                          </>
                                       )}
                                    </div>
                                 </div>
                                 <div className="flex gap-2">
                                    {camp.status === 'draft' && (
                                       <button onClick={() => setEditingCampaign(camp)} className="p-2 hover:bg-earth/10 rounded-full text-earth"><Edit3 className="w-4 h-4" /></button>
                                    )}
                                    <button onClick={() => deleteCampaign(camp.id)} className="p-2 hover:bg-red-50 text-red-800 rounded-full"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* CAMPAIGN EDITOR MODAL */}
                  {editingCampaign && (
                     <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-6xl h-[90vh] rounded-sm shadow-2xl relative animate-fade-in-up flex overflow-hidden">
                           {/* Left: Editor */}
                           <div className="w-1/2 p-8 border-r border-earth/10 overflow-y-auto">
                              <div className="flex justify-between items-center mb-8">
                                 <h2 className="font-serif text-3xl text-earth">Compose</h2>
                                 <button onClick={() => setEditingCampaign(null)} className="text-earth/30 hover:text-earth"><X className="w-5 h-5" /></button>
                              </div>

                              <div className="space-y-6">
                                 <div>
                                    <div className="flex justify-between mb-2">
                                       <label className="block text-[10px] uppercase tracking-widest text-earth/40">Subject Line</label>
                                       <button onClick={handleGenerateSubject} disabled={aiGenerating === 'subject'} className="text-[10px] uppercase text-bronze hover:text-earth flex items-center gap-1">
                                          {aiGenerating === 'subject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                          AI Suggest
                                       </button>
                                    </div>
                                    <input type="text" value={editingCampaign.subject} onChange={(e) => setEditingCampaign({ ...editingCampaign, subject: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 font-serif text-lg" placeholder="Enter subject line..." />
                                 </div>

                                 <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Preview Text</label>
                                    <input type="text" value={editingCampaign.previewText} onChange={(e) => setEditingCampaign({ ...editingCampaign, previewText: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 text-sm" placeholder="Snippet that appears in inbox..." />
                                 </div>

                                 <div className="flex gap-4">
                                    <button onClick={() => handleGenerateBody('New Collection Launch')} className="text-xs bg-cream border border-earth/10 px-3 py-1 text-earth/60 hover:text-earth">Template: Launch</button>
                                    <button onClick={() => handleGenerateBody('Weekly Digest')} className="text-xs bg-cream border border-earth/10 px-3 py-1 text-earth/60 hover:text-earth">Template: Digest</button>
                                    <button onClick={() => handleGenerateBody('Subscriber Exclusive Sale')} className="text-xs bg-cream border border-earth/10 px-3 py-1 text-earth/60 hover:text-earth">Template: Sale</button>
                                 </div>

                                 <div>
                                    <div className="flex justify-between mb-2">
                                       <label className="block text-[10px] uppercase tracking-widest text-earth/40">Content (HTML Supported)</label>
                                       {aiGenerating === 'body' && <span className="text-[10px] text-bronze flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Writing...</span>}
                                    </div>
                                    <textarea value={editingCampaign.content} onChange={(e) => setEditingCampaign({ ...editingCampaign, content: e.target.value })} className="w-full bg-cream/30 p-4 border border-earth/10 h-[400px] font-mono text-sm leading-relaxed" />
                                 </div>
                              </div>
                           </div>

                           {/* Right: Preview */}
                           <div className="w-1/2 bg-[#F2F2F2] p-12 overflow-y-auto flex justify-center">
                              <div className="bg-white w-full max-w-md shadow-lg min-h-[600px] flex flex-col">
                                 {/* Email Header */}
                                 <div className="p-6 text-center border-b border-gray-100">
                                    <h1 className="font-serif text-2xl text-earth">Louie Mae</h1>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-bronze mt-1">The Letter</p>
                                 </div>

                                 {/* Email Body */}
                                 <div className="p-8 flex-1">
                                    <div className="prose prose-sm prose-p:font-sans prose-headings:font-serif prose-headings:font-normal text-earth/80" dangerouslySetInnerHTML={{ __html: editingCampaign.content || '' }}></div>
                                 </div>

                                 {/* Email Footer */}
                                 <div className="bg-cream p-6 text-center text-xs text-earth/40">
                                    <p className="mb-4">Timeless Artistry. Curated Living.</p>
                                    <div className="flex justify-center gap-4 mb-4">
                                       <span>Instagram</span>
                                       <span>Pinterest</span>
                                       <span>Website</span>
                                    </div>
                                    <p>Unsubscribe | Manage Preferences</p>
                                 </div>
                              </div>
                           </div>

                           {/* Actions Footer */}
                           <div className="absolute bottom-0 left-0 w-1/2 bg-white border-t border-earth/10 p-4 flex justify-between items-center">
                              <button onClick={() => setEditingCampaign(null)} className="text-xs uppercase tracking-widest text-earth/50 hover:text-earth">Cancel</button>
                              <div className="flex gap-4">
                                 <button onClick={handleSaveCampaign} className="px-6 py-3 border border-earth/20 text-xs uppercase tracking-widest hover:bg-cream">Save Draft</button>
                                 <button onClick={() => { handleSaveCampaign(); if (editingCampaign.id) sendCampaign(editingCampaign.id); }} className="bg-earth text-cream px-6 py-3 text-xs uppercase tracking-widest hover:bg-bronze">Send Now</button>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </FadeIn>
            )}

            {/* STRUCTURE TAB */}
            {activeTab === 'structure' && (
               <FadeIn>
                  <div className="mb-12">
                     <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Site Configuration</span>
                     <h1 className="font-serif text-4xl text-earth">Structure & Navigation</h1>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                     {/* COLLECTIONS MANAGER */}
                     <div className="bg-white p-8 border border-earth/5 shadow-sm">
                        <div className="flex justify-between items-center mb-6 border-b border-earth/10 pb-4">
                           <h3 className="font-serif text-2xl text-earth">Collections</h3>
                           <button onClick={handleCreateCollection} className="text-[10px] uppercase tracking-[0.2em] bg-earth text-cream px-4 py-2 hover:bg-bronze transition-colors flex items-center gap-2">
                              <Plus className="w-3 h-3" /> New
                           </button>
                        </div>

                        <div className="space-y-4">
                           {siteContent.collections.map(col => (
                              <div key={col.id} className="bg-cream/30 p-4 border border-earth/10 flex justify-between items-center group">
                                 <div>
                                    <h4 className="font-serif text-lg text-earth">{col.title}</h4>
                                    <p className="text-[10px] uppercase tracking-widest text-earth/40">{col.subcategories.length} Subcategories</p>
                                 </div>
                                 <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingCollection(col)} className="p-2 hover:bg-earth/10 rounded-full"><Edit3 className="w-4 h-4 text-earth" /></button>
                                    <button onClick={() => handleDeleteCollection(col.id)} className="p-2 hover:bg-red-50 text-red-800 rounded-full"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* NAVIGATION MANAGER (Simple view) */}
                     <div className="bg-white p-8 border border-earth/5 shadow-sm opacity-70 relative">
                        {/* Overlay for "Coming Soon" or simplified editor */}
                        <div className="flex justify-between items-center mb-6 border-b border-earth/10 pb-4">
                           <h3 className="font-serif text-2xl text-earth">Main Menu</h3>
                        </div>
                        <div className="space-y-2">
                           {siteContent.navLinks.map((link, i) => (
                              <div key={i} className="p-3 border-b border-earth/5 font-serif text-lg text-earth/60 flex justify-between">
                                 {link.label}
                                 <span className="text-xs font-sans text-earth/30">{link.href}</span>
                              </div>
                           ))}
                        </div>
                        <div className="mt-6 text-center text-xs text-earth/40 italic">
                           Menu structure is currently managed via code constants for stability.
                        </div>
                     </div>

                  </div>

                  {/* COLLECTION EDITOR MODAL */}
                  {editingCollection && (
                     <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-sm shadow-2xl relative animate-fade-in-up">
                           <button onClick={() => setEditingCollection(null)} className="absolute top-4 right-4 text-earth/30 hover:text-earth"><X className="w-5 h-5" /></button>
                           <h2 className="font-serif text-3xl text-earth mb-8">{editingCollection.id ? 'Edit Collection' : 'New Collection'}</h2>

                           <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                 <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">ID (URL Slug)</label>
                                    <input type="text" value={editingCollection.id} onChange={(e) => setEditingCollection({ ...editingCollection, id: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 font-mono text-sm" placeholder="e.g. furniture" />
                                 </div>
                                 <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Title</label>
                                    <input type="text" value={editingCollection.title} onChange={(e) => setEditingCollection({ ...editingCollection, title: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 font-serif text-lg" />
                                 </div>
                              </div>

                              <div>
                                 <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Subtitle</label>
                                 <input type="text" value={editingCollection.subtitle} onChange={(e) => setEditingCollection({ ...editingCollection, subtitle: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10" />
                              </div>

                              <ImageUploader label="Hero Image" currentImage={editingCollection.heroImage} onImageChange={(val) => setEditingCollection({ ...editingCollection, heroImage: val })} aspectRatio="aspect-[21/9]" />

                              {/* Subcategories Editor */}
                              <div className="border-t border-earth/10 pt-6">
                                 <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-4">Subcategories</label>
                                 <div className="space-y-4">
                                    {editingCollection.subcategories?.map((sub, idx) => (
                                       <div key={idx} className="flex gap-4 items-start bg-cream/20 p-3 border border-earth/5">
                                          <div className="w-16 h-16 bg-white flex-shrink-0 relative">
                                             <img src={sub.image} className="w-full h-full object-cover" />
                                          </div>
                                          <div className="flex-1 space-y-2">
                                             <input value={sub.title} onChange={(e) => {
                                                const newSubs = [...(editingCollection.subcategories || [])];
                                                newSubs[idx] = { ...newSubs[idx], title: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '-') };
                                                setEditingCollection({ ...editingCollection, subcategories: newSubs });
                                             }} className="w-full bg-white p-1 border border-earth/10 text-xs font-bold" placeholder="Title" />
                                             <input value={sub.caption || ''} onChange={(e) => {
                                                const newSubs = [...(editingCollection.subcategories || [])];
                                                newSubs[idx] = { ...newSubs[idx], caption: e.target.value };
                                                setEditingCollection({ ...editingCollection, subcategories: newSubs });
                                             }} className="w-full bg-white p-1 border border-earth/10 text-xs" placeholder="Caption" />
                                          </div>
                                          <button onClick={() => {
                                             const newSubs = editingCollection.subcategories?.filter((_, i) => i !== idx);
                                             setEditingCollection({ ...editingCollection, subcategories: newSubs });
                                          }} className="text-red-800"><Trash2 className="w-4 h-4" /></button>
                                       </div>
                                    ))}
                                    <button onClick={() => setEditingCollection({
                                       ...editingCollection,
                                       subcategories: [...(editingCollection.subcategories || []), { id: 'new', title: 'New Category', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800', caption: 'Description' }]
                                    })} className="text-[10px] uppercase text-bronze hover:underline">+ Add Subcategory</button>
                                 </div>
                              </div>

                              <button onClick={handleSaveCollection} className="w-full bg-earth text-cream py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-colors">Save Collection</button>
                           </div>
                        </div>
                     </div>
                  )}
               </FadeIn>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
               <FadeIn>
                  <div className="flex justify-between items-end mb-12 border-b border-earth/10 pb-6">
                     <div>
                        <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">{getCollectionTitle(filterCollection)}</span>
                        <h1 className="font-serif text-4xl text-earth">{filterCategory || 'All Items'}</h1>
                     </div>
                     <button onClick={handleCreateProduct} className="bg-earth text-cream px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-all shadow-lg flex items-center gap-2">
                        <Plus className="w-3 h-3" /> Add Product
                     </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     {filteredProducts.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-earth/5">
                           <p className="font-serif text-2xl text-earth/40">No products found in this collection.</p>
                           <button onClick={handleCreateProduct} className="mt-4 text-bronze underline text-xs uppercase tracking-widest">Add your first item</button>
                        </div>
                     ) : (
                        filteredProducts.map(product => (
                           <div key={product.id} className="bg-white p-4 border border-earth/5 flex gap-6 items-center group hover:shadow-md transition-all">
                              <div className="w-16 h-16 bg-cream flex-shrink-0">
                                 <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                 <h4 className="font-serif text-lg text-earth">{product.name}</h4>
                                 <div className="flex gap-4 text-[10px] uppercase tracking-widest text-earth/50">
                                    <span>{product.category}</span>
                                    <span>${product.price}</span>
                                    <span className={product.inStock ? 'text-green-700' : 'text-red-700'}>{product.inStock ? 'In Stock' : 'Out of Stock'}</span>
                                 </div>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleEditProduct(product)} className="p-2 hover:bg-earth/10 rounded-full"><Edit3 className="w-4 h-4 text-earth" /></button>
                                 <button onClick={() => handleDeleteProduct(product.id)} className="p-2 hover:bg-red-50 text-red-800 rounded-full"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </FadeIn>
            )}

            {/* JOURNAL TAB */}
            {activeTab === 'journal' && (
               <FadeIn>
                  <div className="flex justify-between items-end mb-12 border-b border-earth/10 pb-6">
                     <div><span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Content Marketing</span><h1 className="font-serif text-4xl text-earth">Simply Mae Journal</h1></div>
                     <button onClick={handleCreateNewPost} className="bg-earth text-cream px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-all shadow-lg flex items-center gap-2"><Plus className="w-3 h-3" /> New Story</button>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                     {posts.map(post => (
                        <div key={post.id} className="bg-white p-6 border border-earth/5 flex gap-8 items-start group hover:shadow-md transition-all">
                           <div className="w-32 aspect-[3/4] bg-cream flex-shrink-0"><img src={post.image} className="w-full h-full object-cover" /></div>
                           <div className="flex-1">
                              <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-bronze mb-2"><span>{post.category}</span><span className="w-1 h-1 rounded-full bg-bronze/40"></span><span>{post.date}</span></div>
                              <h3 className="font-serif text-2xl text-earth mb-3">{post.title}</h3>
                              <p className="font-sans text-sm text-earth/60 line-clamp-2 mb-4">{post.excerpt}</p>
                              <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{post.status}</span>
                           </div>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditPost(post)} className="p-2 hover:bg-earth/10 rounded-full"><Edit3 className="w-4 h-4 text-earth" /></button>
                              <button onClick={() => handleDeletePost(post.id)} className="p-2 hover:bg-red-50 text-red-800 rounded-full"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </div>
                     ))}
                  </div>
               </FadeIn>
            )}

            {/* PAGES TAB */}
            {activeTab === 'pages' && !activePageEditor && (
               <FadeIn>
                  <div className="flex justify-between items-end mb-12 border-b border-earth/10 pb-6">
                     <div><span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Site Design</span><h1 className="font-serif text-4xl text-earth">Select Page to Edit</h1></div>
                     <button onClick={() => setShowPageGenerator(true)} className="bg-earth text-cream px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-all shadow-lg flex items-center gap-2"><Sparkles className="w-3 h-3" /> AI New Page</button>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                     <div onClick={() => setActivePageEditor('home')} className="bg-white p-10 border border-earth/5 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col items-center text-center group"><div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mb-6 group-hover:bg-earth group-hover:text-cream transition-colors"><Home className="w-8 h-8 text-earth group-hover:text-cream" /></div><h3 className="font-serif text-2xl text-earth mb-2">Home Page</h3></div>
                     <div onClick={() => setActivePageEditor('story')} className="bg-white p-10 border border-earth/5 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col items-center text-center group"><div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mb-6 group-hover:bg-earth group-hover:text-cream transition-colors"><BookOpen className="w-8 h-8 text-earth group-hover:text-cream" /></div><h3 className="font-serif text-2xl text-earth mb-2">Our Story</h3></div>
                     {siteContent.customPages.map(page => (
                        <div key={page.id} onClick={() => setActivePageEditor(page.id)} className="bg-white p-10 border border-earth/5 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col items-center text-center group relative"><div className="absolute top-4 right-4 z-10"><button onClick={(e) => { e.stopPropagation(); handleDeleteCustomPage(page.id); }} className="p-2 hover:bg-red-50 text-earth/20 hover:text-red-800 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button></div><div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mb-6 group-hover:bg-earth group-hover:text-cream transition-colors"><FileText className="w-8 h-8 text-earth group-hover:text-cream" /></div><h3 className="font-serif text-2xl text-earth mb-2">{page.title}</h3></div>
                     ))}
                  </div>
               </FadeIn>
            )}

            {/* Existing AI Page Generator Modal */}
            {showPageGenerator && (
               <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6"><div className="bg-white w-full max-w-lg p-8 rounded-sm shadow-2xl relative"><button onClick={() => setShowPageGenerator(false)} className="absolute top-4 right-4 text-earth/30 hover:text-earth"><X className="w-5 h-5" /></button><div className="text-center mb-8"><h2 className="font-serif text-2xl text-earth">Design AI Concierge</h2></div><div className="space-y-6"><div><label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Page Title</label><input type="text" value={generatorPrompt.title} onChange={(e) => setGeneratorPrompt({ ...generatorPrompt, title: e.target.value })} className="w-full p-3 border border-earth/10 bg-cream/20 text-earth focus:border-bronze focus:outline-none" /></div><div><label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Description</label><textarea value={generatorPrompt.description} onChange={(e) => setGeneratorPrompt({ ...generatorPrompt, description: e.target.value })} className="w-full p-3 border border-earth/10 bg-cream/20 text-earth focus:border-bronze focus:outline-none h-32" /></div><button onClick={handleGeneratePage} disabled={isGenerating} className="w-full bg-earth text-cream py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-colors flex items-center justify-center gap-2 disabled:opacity-70">{isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{isGenerating ? 'Designing...' : 'Generate Page'}</button></div></div></div>
            )}

            {/* --- UNIFIED PAGE EDITOR (Home or Custom) --- */}
            {activeTab === 'pages' && typeof activePageEditor === 'string' && activePageEditor !== 'story' && (() => {
               // Determine which sections to edit: CustomPage or Home
               let sections: PageSection[] = [];
               let title = '';
               let updateFunc: (newSections: PageSection[]) => void = () => { };

               if (activePageEditor === 'home') {
                  sections = siteContent.home.sections || [];
                  title = 'Home Page';
                  updateFunc = (newSections) => updateSiteContent('home', { sections: newSections });
               } else {
                  const page = siteContent.customPages.find(p => p.id === activePageEditor);
                  if (!page) return null;
                  sections = page.sections;
                  title = page.title;
                  updateFunc = (newSections) => updateCustomPage(page.id, { sections: newSections });
               }

               return (
                  <div className="max-w-4xl mx-auto pb-20">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                           <button onClick={() => setActivePageEditor(null)} className="p-2 hover:bg-earth/5 rounded-full"><ArrowLeft className="w-5 h-5 text-earth/50" /></button>
                           <h1 className="font-serif text-3xl text-earth">{title} Editor</h1>
                        </div>
                     </div>

                     {/* Home Page Static Fields (Only show if editing home) */}
                     {activePageEditor === 'home' && (
                        <div className="mb-12 space-y-8 bg-cream/30 p-8 border border-earth/5">
                           <h3 className="font-serif text-xl text-earth mb-4 italic">Core Homepage Elements</h3>
                           <div className="space-y-6">
                              <ImageUploader label="Hero Image" currentImage={siteContent.home.hero.image} onImageChange={(val) => updateSiteContent('home', { hero: { ...siteContent.home.hero, image: val } })} aspectRatio="aspect-[21/9]" />
                              <div className="grid grid-cols-2 gap-6"><div><label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Main Title Line 1</label><input type="text" value={siteContent.home.hero.titleLine1} onChange={(e) => updateSiteContent('home', { hero: { ...siteContent.home.hero, titleLine1: e.target.value } })} className="w-full bg-cream/30 p-3 border border-earth/10 font-serif text-xl" /></div></div>
                           </div>
                           <p className="text-xs text-earth/40 italic">Note: Core category grids and features are fixed. Add dynamic sections below to expand the page.</p>
                        </div>
                     )}

                     <div className="space-y-6">
                        {sections.map((section, idx) => (
                           <div key={section.id} className="bg-white border border-earth/5 shadow-sm p-6 relative group transition-all hover:shadow-md">
                              <div className="flex justify-between items-center mb-6 pb-4 border-b border-earth/5">
                                 <div className="flex items-center gap-3">
                                    <span className="p-2 bg-cream rounded-sm text-earth/50">
                                       {section.type === 'hero' && <ImageIcon className="w-4 h-4" />}
                                       {section.type === 'full-image' && <Maximize className="w-4 h-4" />}
                                       {section.type === 'text' && <Type className="w-4 h-4" />}
                                       {section.type === 'grid' && <Grid className="w-4 h-4" />}
                                       {section.type === 'product-feature' && <Tag className="w-4 h-4" />}
                                       {section.type === 'image-text' && <Layout className="w-4 h-4" />}
                                       {section.type === 'manifesto' && <FileText className="w-4 h-4" />}
                                    </span>
                                    <span className="text-xs uppercase tracking-widest text-bronze font-bold">{section.type.replace('-', ' ')}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <button onClick={() => {
                                       if (idx > 0) {
                                          const newSections = [...sections];
                                          [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
                                          updateFunc(newSections);
                                       }
                                    }} className="p-2 hover:bg-earth/5 text-earth/30 hover:text-earth disabled:opacity-20" disabled={idx === 0}>↑</button>
                                    <button onClick={() => {
                                       if (idx < sections.length - 1) {
                                          const newSections = [...sections];
                                          [newSections[idx + 1], newSections[idx]] = [newSections[idx], newSections[idx + 1]];
                                          updateFunc(newSections);
                                       }
                                    }} className="p-2 hover:bg-earth/5 text-earth/30 hover:text-earth disabled:opacity-20" disabled={idx === sections.length - 1}>↓</button>
                                    <button onClick={() => { const newSections = sections.filter(s => s.id !== section.id); updateFunc(newSections); }} className="p-2 hover:bg-red-50 text-earth/20 hover:text-red-800 transition-colors ml-2"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>

                              <div className="space-y-4">
                                 {/* COMMON FIELDS */}
                                 {(section.type !== 'manifesto') && (
                                    <div><label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-1">Heading</label><input type="text" value={section.heading || ''} onChange={(e) => { const newSections = [...sections]; newSections[idx] = { ...section, heading: e.target.value }; updateFunc(newSections); }} className="w-full bg-cream/30 p-2 border border-earth/10 text-sm font-serif text-lg" /></div>
                                 )}

                                 {(section.type === 'text' || section.type === 'image-text' || section.type === 'manifesto') && (
                                    <div><label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-1">Content</label><textarea value={section.content || ''} onChange={(e) => { const newSections = [...sections]; newSections[idx] = { ...section, content: e.target.value }; updateFunc(newSections); }} className="w-full bg-cream/30 p-2 border border-earth/10 text-sm h-24" /></div>
                                 )}

                                 {(section.type === 'hero' || section.type === 'image-text' || section.type === 'full-image') && (
                                    <ImageUploader label="Section Image" currentImage={section.image} onImageChange={(val) => { const newSections = [...sections]; newSections[idx] = { ...section, image: val }; updateFunc(newSections); }} aspectRatio={section.type === 'image-text' ? 'aspect-[3/4]' : 'aspect-[21/9]'} />
                                 )}

                                 {/* PRODUCT FEATURE SPECIFIC */}
                                 {section.type === 'product-feature' && (
                                    <div>
                                       <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-1">Select Product</label>
                                       <select
                                          value={section.productId || ''}
                                          onChange={(e) => { const newSections = [...sections]; newSections[idx] = { ...section, productId: e.target.value }; updateFunc(newSections); }}
                                          className="w-full bg-cream/30 p-3 border border-earth/10 text-sm"
                                       >
                                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                       </select>
                                    </div>
                                 )}

                                 {/* GRID SPECIFIC */}
                                 {section.type === 'grid' && (
                                    <div className="mt-4 pt-4 border-t border-earth/5">
                                       <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Grid Items</label>
                                       <div className="space-y-4">
                                          {section.items?.map((item, iIdx) => (
                                             <div key={iIdx} className="flex gap-4 items-start bg-cream/20 p-3 border border-earth/5">
                                                <div className="w-16 h-16 bg-white flex-shrink-0 relative group">
                                                   <img src={item.image} className="w-full h-full object-cover" />
                                                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                                                      const file = e.target.files?.[0];
                                                      if (file) {
                                                         const reader = new FileReader();
                                                         reader.onloadend = () => {
                                                            const newSections = [...sections];
                                                            newSections[idx].items![iIdx].image = reader.result as string;
                                                            updateFunc(newSections);
                                                         };
                                                         reader.readAsDataURL(file);
                                                      }
                                                   }} />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                   <input value={item.title} onChange={(e) => { const newSections = [...sections]; newSections[idx].items![iIdx].title = e.target.value; updateFunc(newSections); }} className="w-full bg-white p-1 border border-earth/10 text-xs" placeholder="Title" />
                                                   <input value={item.subtitle} onChange={(e) => { const newSections = [...sections]; newSections[idx].items![iIdx].subtitle = e.target.value; updateFunc(newSections); }} className="w-full bg-white p-1 border border-earth/10 text-xs" placeholder="Subtitle" />
                                                   <input value={item.link} onChange={(e) => { const newSections = [...sections]; newSections[idx].items![iIdx].link = e.target.value; updateFunc(newSections); }} className="w-full bg-white p-1 border border-earth/10 text-xs font-mono" placeholder="Link (#)" />
                                                </div>
                                                <button onClick={() => { const newSections = [...sections]; newSections[idx].items = section.items?.filter((_, n) => n !== iIdx); updateFunc(newSections); }} className="text-red-800"><Trash2 className="w-4 h-4" /></button>
                                             </div>
                                          ))}
                                          <button onClick={() => { const newSections = [...sections]; newSections[idx].items = [...(section.items || []), { title: 'New Item', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800', link: '#' }]; updateFunc(newSections); }} className="text-[10px] uppercase text-bronze hover:underline">+ Add Grid Item</button>
                                       </div>
                                    </div>
                                 )}

                                 {/* LAYOUT OPTIONS */}
                                 {(section.type === 'text') && (
                                    <div className="flex gap-4">
                                       <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="radio" name={`layout-${section.id}`} checked={section.layout === 'center' || !section.layout} onChange={() => { const newSections = [...sections]; newSections[idx] = { ...section, layout: 'center' }; updateFunc(newSections); }} />
                                          <span className="text-[10px] uppercase tracking-widest text-earth/60">Center</span>
                                       </label>
                                       <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="radio" name={`layout-${section.id}`} checked={section.layout === 'left'} onChange={() => { const newSections = [...sections]; newSections[idx] = { ...section, layout: 'left' }; updateFunc(newSections); }} />
                                          <span className="text-[10px] uppercase tracking-widest text-earth/60">Left</span>
                                       </label>
                                    </div>
                                 )}
                              </div>
                           </div>
                        ))}

                        <button
                           onClick={() => setShowSectionPicker(true)}
                           className="w-full py-8 border-2 border-dashed border-earth/20 text-earth/40 hover:text-earth hover:border-earth/40 hover:bg-white/40 transition-all flex flex-col items-center justify-center gap-2"
                        >
                           <Plus className="w-6 h-6" />
                           <span className="text-xs uppercase tracking-widest">Add Content Section</span>
                        </button>
                     </div>
                  </div>
               );
            })()}

            {/* STORY PAGE EDITOR */}
            {activeTab === 'pages' && activePageEditor === 'story' && (() => {
               const sections = siteContent.story.sections || [];
               const updateFunc = (newSections: PageSection[]) => updateSiteContent('story', { sections: newSections });

               return (
                  <div className="max-w-4xl mx-auto pb-20">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                           <button onClick={() => setActivePageEditor(null)} className="p-2 hover:bg-earth/5 rounded-full"><ArrowLeft className="w-5 h-5 text-earth/50" /></button>
                           <h1 className="font-serif text-3xl text-earth">Our Story Editor</h1>
                        </div>
                     </div>

                     <div className="space-y-8 mb-12">
                        {/* Hero Section */}
                        <div className="bg-white p-8 border border-earth/5 shadow-sm">
                           <h3 className="font-serif text-xl text-earth mb-6 border-b border-earth/10 pb-2">Hero Section</h3>
                           <div className="space-y-6">
                              <ImageUploader
                                 label="Hero Image"
                                 currentImage={siteContent.story.hero.image}
                                 onImageChange={(val) => updateSiteContent('story', { hero: { ...siteContent.story.hero, image: val } })}
                                 aspectRatio="aspect-[21/9]"
                              />
                              <div className="grid grid-cols-2 gap-6">
                                 <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Title</label>
                                    <input
                                       type="text"
                                       value={siteContent.story.hero.title}
                                       onChange={(e) => updateSiteContent('story', { hero: { ...siteContent.story.hero, title: e.target.value } })}
                                       className="w-full bg-cream/30 p-3 border border-earth/10 font-serif text-xl"
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Subtitle</label>
                                    <input
                                       type="text"
                                       value={siteContent.story.hero.subtitle}
                                       onChange={(e) => updateSiteContent('story', { hero: { ...siteContent.story.hero, subtitle: e.target.value } })}
                                       className="w-full bg-cream/30 p-3 border border-earth/10 font-serif text-xl italic"
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Prologue Section */}
                        <div className="bg-white p-8 border border-earth/5 shadow-sm">
                           <h3 className="font-serif text-xl text-earth mb-6 border-b border-earth/10 pb-2">Prologue</h3>
                           <div className="space-y-6">
                              <div>
                                 <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Main Quote</label>
                                 <textarea
                                    value={siteContent.story.prologue.quote}
                                    onChange={(e) => updateSiteContent('story', { prologue: { ...siteContent.story.prologue, quote: e.target.value } })}
                                    className="w-full bg-cream/30 p-3 border border-earth/10 font-serif text-lg h-24"
                                 />
                              </div>
                              <div>
                                 <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Subtext</label>
                                 <input
                                    type="text"
                                    value={siteContent.story.prologue.subtext}
                                    onChange={(e) => updateSiteContent('story', { prologue: { ...siteContent.story.prologue, subtext: e.target.value } })}
                                    className="w-full bg-cream/30 p-3 border border-earth/10 text-xs uppercase tracking-widest"
                                 />
                              </div>
                           </div>
                        </div>

                        {/* Chapters Section */}
                        <div className="bg-white p-8 border border-earth/5 shadow-sm">
                           <h3 className="font-serif text-xl text-earth mb-6 border-b border-earth/10 pb-2">Chapters</h3>
                           <div className="space-y-8">
                              {/* Chapter I */}
                              <div className="bg-cream/20 p-6 border border-earth/5">
                                 <span className="text-bronze font-serif italic mb-4 block">Chapter I</span>
                                 <div className="space-y-4">
                                    <input
                                       type="text"
                                       value={siteContent.story.chapters.oneTitle}
                                       onChange={(e) => updateSiteContent('story', { chapters: { ...siteContent.story.chapters, oneTitle: e.target.value } })}
                                       className="w-full bg-white p-3 border border-earth/10 font-serif text-lg"
                                       placeholder="Title"
                                    />
                                    <textarea
                                       value={siteContent.story.chapters.oneText}
                                       onChange={(e) => updateSiteContent('story', { chapters: { ...siteContent.story.chapters, oneText: e.target.value } })}
                                       className="w-full bg-white p-3 border border-earth/10 h-32 text-sm leading-relaxed"
                                       placeholder="Content"
                                    />
                                 </div>
                              </div>

                              {/* Chapter II */}
                              <div className="bg-cream/20 p-6 border border-earth/5">
                                 <span className="text-bronze font-serif italic mb-4 block">Chapter II</span>
                                 <div className="space-y-4">
                                    <input
                                       type="text"
                                       value={siteContent.story.chapters.twoTitle}
                                       onChange={(e) => updateSiteContent('story', { chapters: { ...siteContent.story.chapters, twoTitle: e.target.value } })}
                                       className="w-full bg-white p-3 border border-earth/10 font-serif text-lg"
                                       placeholder="Title"
                                    />
                                    <textarea
                                       value={siteContent.story.chapters.twoText}
                                       onChange={(e) => updateSiteContent('story', { chapters: { ...siteContent.story.chapters, twoText: e.target.value } })}
                                       className="w-full bg-white p-3 border border-earth/10 h-32 text-sm leading-relaxed"
                                       placeholder="Content"
                                    />
                                 </div>
                              </div>

                              {/* Chapter III */}
                              <div className="bg-cream/20 p-6 border border-earth/5">
                                 <span className="text-bronze font-serif italic mb-4 block">Chapter III</span>
                                 <div className="space-y-4">
                                    <input
                                       type="text"
                                       value={siteContent.story.chapters.threeTitle}
                                       onChange={(e) => updateSiteContent('story', { chapters: { ...siteContent.story.chapters, threeTitle: e.target.value } })}
                                       className="w-full bg-white p-3 border border-earth/10 font-serif text-lg"
                                       placeholder="Title"
                                    />
                                    <textarea
                                       value={siteContent.story.chapters.threeText}
                                       onChange={(e) => updateSiteContent('story', { chapters: { ...siteContent.story.chapters, threeText: e.target.value } })}
                                       className="w-full bg-white p-3 border border-earth/10 h-32 text-sm leading-relaxed"
                                       placeholder="Content"
                                    />
                                 </div>
                              </div>

                              {/* Chapter IV */}
                              <div className="bg-cream/20 p-6 border border-earth/5">
                                 <span className="text-bronze font-serif italic mb-4 block">Chapter IV</span>
                                 <div className="space-y-4">
                                    <input
                                       type="text"
                                       value={siteContent.story.chapters.fourTitle}
                                       onChange={(e) => updateSiteContent('story', { chapters: { ...siteContent.story.chapters, fourTitle: e.target.value } })}
                                       className="w-full bg-white p-3 border border-earth/10 font-serif text-lg"
                                       placeholder="Title"
                                    />
                                    <textarea
                                       value={siteContent.story.chapters.fourText}
                                       onChange={(e) => updateSiteContent('story', { chapters: { ...siteContent.story.chapters, fourText: e.target.value } })}
                                       className="w-full bg-white p-3 border border-earth/10 h-32 text-sm leading-relaxed"
                                       placeholder="Content"
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* DYNAMIC SECTIONS UI */}
                     <div className="space-y-6 pt-12 border-t border-earth/10">
                        <h3 className="font-serif text-2xl text-earth mb-6">Additional Content Sections</h3>
                        {sections.map((section, idx) => (
                           <div key={section.id} className="bg-white border border-earth/5 shadow-sm p-6 relative group transition-all hover:shadow-md">
                              <div className="flex justify-between items-center mb-6 pb-4 border-b border-earth/5">
                                 <div className="flex items-center gap-3">
                                    <span className="p-2 bg-cream rounded-sm text-earth/50">
                                       {section.type === 'hero' && <ImageIcon className="w-4 h-4" />}
                                       {section.type === 'full-image' && <Maximize className="w-4 h-4" />}
                                       {section.type === 'text' && <Type className="w-4 h-4" />}
                                       {section.type === 'grid' && <Grid className="w-4 h-4" />}
                                       {section.type === 'product-feature' && <Tag className="w-4 h-4" />}
                                       {section.type === 'image-text' && <Layout className="w-4 h-4" />}
                                       {section.type === 'manifesto' && <FileText className="w-4 h-4" />}
                                    </span>
                                    <span className="text-xs uppercase tracking-widest text-bronze font-bold">{section.type.replace('-', ' ')}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <button onClick={() => {
                                       if (idx > 0) {
                                          const newSections = [...sections];
                                          [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
                                          updateFunc(newSections);
                                       }
                                    }} className="p-2 hover:bg-earth/5 text-earth/30 hover:text-earth disabled:opacity-20" disabled={idx === 0}>↑</button>
                                    <button onClick={() => {
                                       if (idx < sections.length - 1) {
                                          const newSections = [...sections];
                                          [newSections[idx + 1], newSections[idx]] = [newSections[idx], newSections[idx + 1]];
                                          updateFunc(newSections);
                                       }
                                    }} className="p-2 hover:bg-earth/5 text-earth/30 hover:text-earth disabled:opacity-20" disabled={idx === sections.length - 1}>↓</button>
                                    <button onClick={() => { const newSections = sections.filter(s => s.id !== section.id); updateFunc(newSections); }} className="p-2 hover:bg-red-50 text-earth/20 hover:text-red-800 transition-colors ml-2"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>

                              <div className="space-y-4">
                                 {/* COMMON FIELDS */}
                                 {(section.type !== 'manifesto') && (
                                    <div><label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-1">Heading</label><input type="text" value={section.heading || ''} onChange={(e) => { const newSections = [...sections]; newSections[idx] = { ...section, heading: e.target.value }; updateFunc(newSections); }} className="w-full bg-cream/30 p-2 border border-earth/10 text-sm font-serif text-lg" /></div>
                                 )}

                                 {(section.type === 'text' || section.type === 'image-text' || section.type === 'manifesto') && (
                                    <div><label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-1">Content</label><textarea value={section.content || ''} onChange={(e) => { const newSections = [...sections]; newSections[idx] = { ...section, content: e.target.value }; updateFunc(newSections); }} className="w-full bg-cream/30 p-2 border border-earth/10 text-sm h-24" /></div>
                                 )}

                                 {(section.type === 'hero' || section.type === 'image-text' || section.type === 'full-image') && (
                                    <ImageUploader label="Section Image" currentImage={section.image} onImageChange={(val) => { const newSections = [...sections]; newSections[idx] = { ...section, image: val }; updateFunc(newSections); }} aspectRatio={section.type === 'image-text' ? 'aspect-[3/4]' : 'aspect-[21/9]'} />
                                 )}

                                 {/* PRODUCT FEATURE SPECIFIC */}
                                 {section.type === 'product-feature' && (
                                    <div>
                                       <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-1">Select Product</label>
                                       <select
                                          value={section.productId || ''}
                                          onChange={(e) => { const newSections = [...sections]; newSections[idx] = { ...section, productId: e.target.value }; updateFunc(newSections); }}
                                          className="w-full bg-cream/30 p-3 border border-earth/10 text-sm"
                                       >
                                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                       </select>
                                    </div>
                                 )}

                                 {/* GRID SPECIFIC */}
                                 {section.type === 'grid' && (
                                    <div className="mt-4 pt-4 border-t border-earth/5">
                                       <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Grid Items</label>
                                       <div className="space-y-4">
                                          {section.items?.map((item, iIdx) => (
                                             <div key={iIdx} className="flex gap-4 items-start bg-cream/20 p-3 border border-earth/5">
                                                <div className="w-16 h-16 bg-white flex-shrink-0 relative group">
                                                   <img src={item.image} className="w-full h-full object-cover" />
                                                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                                                      const file = e.target.files?.[0];
                                                      if (file) {
                                                         const reader = new FileReader();
                                                         reader.onloadend = () => {
                                                            const newSections = [...sections];
                                                            newSections[idx].items![iIdx].image = reader.result as string;
                                                            updateFunc(newSections);
                                                         };
                                                         reader.readAsDataURL(file);
                                                      }
                                                   }} />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                   <input value={item.title} onChange={(e) => { const newSections = [...sections]; newSections[idx].items![iIdx].title = e.target.value; updateFunc(newSections); }} className="w-full bg-white p-1 border border-earth/10 text-xs" placeholder="Title" />
                                                   <input value={item.subtitle} onChange={(e) => { const newSections = [...sections]; newSections[idx].items![iIdx].subtitle = e.target.value; updateFunc(newSections); }} className="w-full bg-white p-1 border border-earth/10 text-xs" placeholder="Subtitle" />
                                                   <input value={item.link} onChange={(e) => { const newSections = [...sections]; newSections[idx].items![iIdx].link = e.target.value; updateFunc(newSections); }} className="w-full bg-white p-1 border border-earth/10 text-xs font-mono" placeholder="Link (#)" />
                                                </div>
                                                <button onClick={() => { const newSections = [...sections]; newSections[idx].items = section.items?.filter((_, n) => n !== iIdx); updateFunc(newSections); }} className="text-red-800"><Trash2 className="w-4 h-4" /></button>
                                             </div>
                                          ))}
                                          <button onClick={() => { const newSections = [...sections]; newSections[idx].items = [...(section.items || []), { title: 'New Item', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800', link: '#' }]; updateFunc(newSections); }} className="text-[10px] uppercase text-bronze hover:underline">+ Add Grid Item</button>
                                       </div>
                                    </div>
                                 )}

                                 {/* LAYOUT OPTIONS */}
                                 {(section.type === 'text') && (
                                    <div className="flex gap-4">
                                       <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="radio" name={`layout-${section.id}`} checked={section.layout === 'center' || !section.layout} onChange={() => { const newSections = [...sections]; newSections[idx] = { ...section, layout: 'center' }; updateFunc(newSections); }} />
                                          <span className="text-[10px] uppercase tracking-widest text-earth/60">Center</span>
                                       </label>
                                       <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="radio" name={`layout-${section.id}`} checked={section.layout === 'left'} onChange={() => { const newSections = [...sections]; newSections[idx] = { ...section, layout: 'left' }; updateFunc(newSections); }} />
                                          <span className="text-[10px] uppercase tracking-widest text-earth/60">Left</span>
                                       </label>
                                    </div>
                                 )}
                              </div>
                           </div>
                        ))}

                        <button
                           onClick={() => setShowSectionPicker(true)}
                           className="w-full py-8 border-2 border-dashed border-earth/20 text-earth/40 hover:text-earth hover:border-earth/40 hover:bg-white/40 transition-all flex flex-col items-center justify-center gap-2"
                        >
                           <Plus className="w-6 h-6" />
                           <span className="text-xs uppercase tracking-widest">Add Content Section</span>
                        </button>
                     </div>
                  </div>
               );
            })()}

            {/* PRODUCT EDITOR MODAL */}
            {isEditingProduct && editingProduct && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                  <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 rounded-sm shadow-2xl relative animate-fade-in-up">
                     <button onClick={() => setIsEditingProduct(false)} className="absolute top-4 right-4 text-earth/30 hover:text-earth"><X className="w-6 h-6" /></button>
                     <div className="flex justify-between items-start mb-8">
                        <h2 className="font-serif text-3xl text-earth">{editingProduct.id ? 'Edit Product' : 'New Product'}</h2>
                        {editingProduct.name && (
                           <button onClick={handleAutoCategorize} disabled={isCategorizing} className="text-[10px] uppercase tracking-widest flex items-center gap-2 text-bronze hover:text-earth disabled:opacity-50">
                              {isCategorizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              Suggest Category
                           </button>
                        )}
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                           <div>
                              <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Product Name</label>
                              <input type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 font-serif text-lg" />
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Price ($)</label>
                                 <input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} className="w-full bg-cream/30 p-3 border border-earth/10" />
                              </div>
                              <div>
                                 <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Collection</label>
                                 <select value={editingProduct.collection} onChange={(e) => setEditingProduct({ ...editingProduct, collection: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 text-sm">
                                    {siteContent.collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                 </select>
                              </div>
                           </div>

                           <div>
                              <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Category</label>
                              <input type="text" value={editingProduct.category} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10" placeholder="e.g. Accent Chairs" />
                           </div>

                           <div>
                              <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Description</label>
                              <textarea value={editingProduct.description} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 h-32 text-sm leading-relaxed" />
                           </div>

                           <div className="flex gap-8 pt-4">
                              <label className="flex items-center gap-3 cursor-pointer">
                                 <input type="checkbox" checked={editingProduct.isNew} onChange={(e) => setEditingProduct({ ...editingProduct, isNew: e.target.checked })} className="accent-earth w-4 h-4" />
                                 <span className="text-xs uppercase tracking-widest text-earth/70">New Arrival</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                 <input type="checkbox" checked={editingProduct.inStock} onChange={(e) => setEditingProduct({ ...editingProduct, inStock: e.target.checked })} className="accent-earth w-4 h-4" />
                                 <span className="text-xs uppercase tracking-widest text-earth/70">In Stock</span>
                              </label>
                           </div>
                        </div>

                        <div className="space-y-6">
                           <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Product Images</label>
                           {editingProduct.images?.map((img, idx) => (
                              <div key={idx} className="relative group">
                                 <ImageUploader
                                    currentImage={img}
                                    onImageChange={(val) => {
                                       const newImages = [...(editingProduct.images || [])];
                                       newImages[idx] = val;
                                       setEditingProduct({ ...editingProduct, images: newImages });
                                    }}
                                    aspectRatio="aspect-square"
                                    label={`Image ${idx + 1}`}
                                 />
                                 {idx > 0 && (
                                    <button onClick={() => {
                                       const newImages = editingProduct.images?.filter((_, i) => i !== idx);
                                       setEditingProduct({ ...editingProduct, images: newImages });
                                    }} className="absolute top-0 right-0 p-2 text-red-800 bg-white/80 hover:bg-red-50 rounded-bl-sm"><Trash2 className="w-4 h-4" /></button>
                                 )}
                              </div>
                           ))}
                           <button onClick={() => setEditingProduct({ ...editingProduct, images: [...(editingProduct.images || []), ''] })} className="w-full py-3 border border-dashed border-earth/20 text-xs uppercase tracking-widest text-earth/50 hover:text-earth hover:border-earth/40 transition-colors">
                              + Add Another Image
                           </button>
                        </div>
                     </div>

                     <div className="mt-8 pt-8 border-t border-earth/10 flex justify-end gap-4">
                        <button onClick={() => setIsEditingProduct(false)} className="px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-earth/50 hover:text-earth transition-colors">Cancel</button>
                        <button onClick={handleSaveProduct} className="bg-earth text-cream px-8 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-colors">Save Product</button>
                     </div>
                  </div>
               </div>
            )}

            {/* POST EDITOR MODAL */}
            {isEditingPost && editingPost && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                  <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 rounded-sm shadow-2xl relative animate-fade-in-up">
                     <button onClick={() => setIsEditingPost(false)} className="absolute top-4 right-4 text-earth/30 hover:text-earth"><X className="w-6 h-6" /></button>
                     <h2 className="font-serif text-3xl text-earth mb-8">{editingPost.id ? 'Edit Story' : 'New Story'}</h2>

                     <div className="space-y-6">
                        <ImageUploader label="Cover Image" currentImage={editingPost.image} onImageChange={(val) => setEditingPost({ ...editingPost, image: val })} aspectRatio="aspect-[21/9]" />

                        <div>
                           <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Title</label>
                           <input type="text" value={editingPost.title} onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 font-serif text-2xl" />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                           <div>
                              <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Category</label>
                              <select value={editingPost.category} onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10">
                                 <option>Lifestyle</option>
                                 <option>Design</option>
                                 <option>Faith</option>
                                 <option>Motherhood</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Status</label>
                              <select value={editingPost.status} onChange={(e) => setEditingPost({ ...editingPost, status: e.target.value as any })} className="w-full bg-cream/30 p-3 border border-earth/10">
                                 <option value="draft">Draft</option>
                                 <option value="published">Published</option>
                              </select>
                           </div>
                        </div>

                        <div>
                           <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Excerpt</label>
                           <textarea value={editingPost.excerpt} onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 h-24" />
                        </div>

                        <div>
                           <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Content</label>
                           <textarea value={editingPost.content} onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 h-64 font-serif text-lg leading-relaxed" />
                        </div>

                        <button onClick={handleSavePost} className="w-full bg-earth text-cream py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-colors">Save Story</button>
                     </div>
                  </div>
               </div>
            )}

            {/* SECTION BUILDER MODAL */}
            {showSectionPicker && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                  <div className="bg-white w-full max-w-4xl p-8 rounded-sm shadow-2xl relative animate-fade-in-up">
                     <button onClick={() => setShowSectionPicker(false)} className="absolute top-4 right-4 text-earth/30 hover:text-earth"><X className="w-6 h-6" /></button>
                     <div className="mb-8 text-center">
                        <span className="text-bronze text-xs uppercase tracking-[0.3em] block mb-2">Section Builder</span>
                        <h2 className="font-serif text-3xl text-earth">Choose Content Block</h2>
                     </div>
                     <div className="grid grid-cols-3 gap-6">
                        <button onClick={() => handleAddSection('text')} className="p-8 border border-earth/10 hover:border-earth/30 hover:bg-cream/30 transition-all text-center group">
                           <Type className="w-8 h-8 mx-auto mb-4 text-earth/60 group-hover:text-bronze" />
                           <h3 className="font-serif text-xl text-earth mb-1">Text Block</h3>
                           <p className="text-[10px] uppercase tracking-widest text-earth/40">Headings & Paragraphs</p>
                        </button>
                        <button onClick={() => handleAddSection('image-text')} className="p-8 border border-earth/10 hover:border-earth/30 hover:bg-cream/30 transition-all text-center group">
                           <Layout className="w-8 h-8 mx-auto mb-4 text-earth/60 group-hover:text-bronze" />
                           <h3 className="font-serif text-xl text-earth mb-1">Image + Text</h3>
                           <p className="text-[10px] uppercase tracking-widest text-earth/40">Split Layout</p>
                        </button>
                        <button onClick={() => handleAddSection('hero')} className="p-8 border border-earth/10 hover:border-earth/30 hover:bg-cream/30 transition-all text-center group">
                           <ImageIcon className="w-8 h-8 mx-auto mb-4 text-earth/60 group-hover:text-bronze" />
                           <h3 className="font-serif text-xl text-earth mb-1">Hero Image</h3>
                           <p className="text-[10px] uppercase tracking-widest text-earth/40">Large Banner</p>
                        </button>
                        <button onClick={() => handleAddSection('full-image')} className="p-8 border border-earth/10 hover:border-earth/30 hover:bg-cream/30 transition-all text-center group">
                           <Maximize className="w-8 h-8 mx-auto mb-4 text-earth/60 group-hover:text-bronze" />
                           <h3 className="font-serif text-xl text-earth mb-1">Full Screen Image</h3>
                           <p className="text-[10px] uppercase tracking-widest text-earth/40">Immersive Visual</p>
                        </button>
                        <button onClick={() => handleAddSection('grid')} className="p-8 border border-earth/10 hover:border-earth/30 hover:bg-cream/30 transition-all text-center group">
                           <Grid className="w-8 h-8 mx-auto mb-4 text-earth/60 group-hover:text-bronze" />
                           <h3 className="font-serif text-xl text-earth mb-1">Grid</h3>
                           <p className="text-[10px] uppercase tracking-widest text-earth/40">Category Boxes</p>
                        </button>
                        <button onClick={() => handleAddSection('product-feature')} className="p-8 border border-earth/10 hover:border-earth/30 hover:bg-cream/30 transition-all text-center group">
                           <Tag className="w-8 h-8 mx-auto mb-4 text-earth/60 group-hover:text-bronze" />
                           <h3 className="font-serif text-xl text-earth mb-1">Featured Product</h3>
                           <p className="text-[10px] uppercase tracking-widest text-earth/40">Highlight Item</p>
                        </button>
                        <button onClick={() => handleAddSection('manifesto')} className="p-8 border border-earth/10 hover:border-earth/30 hover:bg-cream/30 transition-all text-center group">
                           <FileText className="w-8 h-8 mx-auto mb-4 text-earth/60 group-hover:text-bronze" />
                           <h3 className="font-serif text-xl text-earth mb-1">Manifesto</h3>
                           <p className="text-[10px] uppercase tracking-widest text-earth/40">Quote Box</p>
                        </button>
                     </div>
                  </div>
               </div>
            )}

         </main>
      </div>
   );
};
