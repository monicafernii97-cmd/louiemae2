
import React, { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useSite } from '../contexts/BlogContext';
import { RichTextEditor } from './RichTextEditor';
import { useNewsletter } from '../contexts/NewsletterContext';
import { FadeIn } from './FadeIn';
import { Plus, Edit3, Trash2, LogOut, Save, X, Image as ImageIcon, Layout, ArrowLeft, PenTool, BookOpen, Home, Settings, Sparkles, Loader2, FileText, ShoppingBag, Tag, Box, Shirt, Baby, Sofa, Gamepad2, Bed, Wand2, ChevronDown, List, Layers, Link as LinkIcon, Menu, Upload, Grid, Maximize, Type, Mail, Users, Send, TrendingUp, BarChart2, Package, Lock, ChevronLeft } from 'lucide-react';
import { BlogPost, SiteContent, CustomPage, PageSection, Product, CollectionType, CollectionConfig, NavLink, SectionItem, EmailCampaign } from '../types';
import { generatePageStructure, suggestProductCategory, generateEmailSubject, generateEmailBody, generateProductName, generateProductDescription } from '../services/geminiService';
import { AdminOrders } from './AdminOrders';
import { NewsletterStudio } from './NewsletterStudio';
import { ProductStudio } from './ProductStudio';
import { ProductImport } from './ProductImport';
import { CJSettings } from './CJSettings';

// --- Image Uploader Component ---
const ImageUploader: React.FC<{
   currentImage?: string;
   onImageChange: (val: string) => void;
   label?: string;
   className?: string;
   aspectRatio?: string;
}> = ({ currentImage = '', onImageChange, label = 'Image', className = '', aspectRatio = 'aspect-[3/4]' }) => {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [isUploading, setIsUploading] = useState(false);
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const generateUploadUrl = useMutation(api.files.generateUploadUrl);
   const saveFile = useMutation(api.files.saveFile);

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
         alert('Image must be less than 5MB');
         return;
      }

      setIsUploading(true);

      // Show immediate preview from local file
      const reader = new FileReader();
      reader.onloadend = () => {
         setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      try {
         // Upload to Convex file storage
         const uploadUrl = await generateUploadUrl();
         const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
         });

         if (!response.ok) throw new Error('Upload failed');

         const { storageId } = await response.json();

         // Get the public URL via server-side mutation
         const result = await saveFile({
            storageId,
            fileName: file.name,
            fileType: file.type,
            purpose: 'blog',
         });

         if (result.url) {
            onImageChange(result.url);
         } else {
            throw new Error('No URL returned from storage');
         }
      } catch (error) {
         console.error('Upload error:', error);
         // Fallback to base64 if upload fails
         if (previewUrl) {
            onImageChange(previewUrl);
         }
         alert('Image upload to cloud failed. Image saved locally as fallback.');
      } finally {
         setIsUploading(false);
      }
   };

   const displayImage = previewUrl || currentImage;

   return (
      <div className={className}>
         <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">{label}</label>
         <div className="flex gap-6 items-start">
            <div
               className={`w-32 ${aspectRatio} bg-cream/50 border border-earth/10 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity rounded-sm shadow-sm flex-shrink-0 relative group`}
               onClick={() => !isUploading && fileInputRef.current?.click()}
            >
               {isUploading ? (
                  <Loader2 className="w-6 h-6 text-bronze animate-spin" />
               ) : displayImage ? (
                  <img src={displayImage} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                  <ImageIcon className="w-8 h-8 text-earth/20" />
               )}
               {!isUploading && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                     <Upload className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
               )}
            </div>
            <div className="flex-1 space-y-3 pt-2">
               <div className="flex flex-col gap-2">
                  <button
                     onClick={() => !isUploading && fileInputRef.current?.click()}
                     disabled={isUploading}
                     className="w-full sm:w-auto text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 bg-white border border-earth/10 px-4 py-3 hover:bg-earth hover:text-white transition-colors shadow-sm disabled:opacity-50"
                  >
                     {isUploading ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</>
                     ) : (
                        <><Upload className="w-3 h-3" /> Upload Photo from Computer</>
                     )}
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
   const { isAuthenticated, isAuthLoading, signIn, logout, posts, addPost, updatePost, deletePost, siteContent, updateSiteContent, addCustomPage, updateCustomPage, deleteCustomPage, products, addProduct, updateProduct, deleteProduct, addCollection, updateCollection, deleteCollection, updateNavigation } = useSite();
   const { subscribers, campaigns, createCampaign, updateCampaign, sendCampaign, deleteCampaign, stats } = useNewsletter();

   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [error, setError] = useState('');
   const [isSigningIn, setIsSigningIn] = useState(false);
   const [authFlow, setAuthFlow] = useState<'signIn' | 'signUp'>('signIn');

   // Navigation State
   const [activeTab, setActiveTabState] = useState<'dashboard' | 'journal' | 'pages' | 'products' | 'structure' | 'newsletter' | 'orders' | 'import' | 'cj-settings'>(() => {
      const saved = localStorage.getItem('admin-active-tab');
      const validTabs = ['dashboard', 'journal', 'pages', 'products', 'structure', 'newsletter', 'orders', 'import', 'cj-settings'];
      return (saved && validTabs.includes(saved) ? saved : 'dashboard') as any;
   });
   const setActiveTab = (tab: typeof activeTab) => {
      setActiveTabState(tab);
      localStorage.setItem('admin-active-tab', tab);
   };
   const [newsletterSubTab, setNewsletterSubTab] = useState<'overview' | 'campaigns' | 'subscribers'>('overview');
   const [sidebarOpen, setSidebarOpen] = useState(false);

   const [activePageEditor, setActivePageEditor] = useState<'home' | 'story' | string | null>(null);
   const [filterCollection, setFilterCollection] = useState<CollectionType | 'all'>('all');
   const [filterCategory, setFilterCategory] = useState<string | null>(null);

   // Expanded Menus State in Sidebar
   const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});

   // Blog Editor State
   const [isEditingPost, setIsEditingPost] = useState(false);
   const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
   const [excerptGenerating, setExcerptGenerating] = useState(false);
   const [excerptOptions, setExcerptOptions] = useState<any[]>([]);

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
   const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsSigningIn(true);
      try {
         await signIn(email, password, authFlow);
         // Auth state will update automatically via useConvexAuth
      } catch (err: any) {
         setError(err.message || 'Authentication failed. Please try again.');
      } finally {
         setIsSigningIn(false);
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
      if (isAuthLoading) {
         return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
               <Loader2 className="w-8 h-8 text-bronze animate-spin" />
            </div>
         );
      }
      return (
         <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center px-6 relative overflow-hidden font-sans">
            {/* Animated Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
               <div className="absolute top-0 -left-4 w-[600px] h-[600px] bg-bronze/5 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob" />
               <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sand/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000" />
            </div>

            <FadeIn className="w-full max-w-lg relative z-10">
               <div className="bg-white/40 backdrop-blur-3xl p-12 shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-3xl text-center border border-white/60 relative overflow-hidden">

                  {/* Decorative Header */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-bronze/30 to-transparent" />

                  <div className="mb-10">
                     <span className="text-bronze text-[10px] uppercase tracking-[0.4em] mb-4 block font-medium">Internal Portal</span>
                     <h1 className="font-serif text-5xl text-earth italic">The Atelier</h1>
                     <div className="w-12 h-0.5 bg-earth/10 mx-auto mt-6" />
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                     <div className="relative group">
                        <Mail className="absolute left-0 top-3 w-5 h-5 text-earth/30 group-focus-within:text-bronze transition-colors" />
                        <input
                           type="email"
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           placeholder="Access ID (Email)"
                           className="w-full bg-transparent border-b border-earth/10 py-3 pl-8 text-earth placeholder:text-earth/30 focus:outline-none focus:border-bronze transition-colors text-sm tracking-wide"
                           required
                        />
                     </div>
                     <div className="relative group">
                        <Lock className="absolute left-0 top-3 w-5 h-5 text-earth/30 group-focus-within:text-bronze transition-colors" />
                        <input
                           type="password"
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           placeholder="Passkey"
                           className="w-full bg-transparent border-b border-earth/10 py-3 pl-8 text-earth placeholder:text-earth/30 focus:outline-none focus:border-bronze transition-colors text-sm tracking-wide"
                           required
                        />
                     </div>

                     {error && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-red-50/50 rounded-lg border border-red-100/50">
                           <span className="text-red-800 text-[10px] tracking-widest uppercase">{error}</span>
                        </div>
                     )}

                     <button
                        type="submit"
                        disabled={isSigningIn}
                        className="w-full bg-earth text-cream py-4 rounded-xl text-[10px] uppercase tracking-[0.25em] hover:bg-bronze hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-2 mt-8"
                     >
                        {isSigningIn ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Authenticate'}
                     </button>
                  </form>

                  <div className="mt-8 pt-6 border-t border-earth/5">
                     <button onClick={handleReturnToSite} className="text-[9px] uppercase tracking-[0.2em] text-earth/30 hover:text-bronze transition-colors flex items-center justify-center gap-2 mx-auto">
                        <ChevronLeft className="w-3 h-3" /> Return to Storefront
                     </button>
                  </div>
               </div>
            </FadeIn>
         </div>
      );
   }

   // Helper to switch tabs and close mobile sidebar
   const switchTab = (tab: typeof activeTab, extra?: () => void) => {
      setActiveTab(tab);
      setSidebarOpen(false);
      extra?.();
   };

   // --- MAIN ADMIN INTERFACE ---
   return (
      <div className="min-h-screen bg-[#F5F2EB] relative overflow-hidden flex font-sans text-earth selection:bg-bronze/20">
         {/* Animated Background */}
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-0 -left-4 w-[800px] h-[800px] bg-bronze/5 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob" />
            <div className="absolute top-0 -right-4 w-[600px] h-[600px] bg-sand/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-[600px] h-[600px] bg-cream-dark/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-4000" />
         </div>

         {/* Mobile Top Bar */}
         <div className="fixed top-0 left-0 right-0 h-14 z-[60] md:hidden bg-earth/95 backdrop-blur-xl flex items-center justify-between px-4 border-b border-white/10">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-cream/80 hover:text-cream transition-colors">
               <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-serif text-xl text-cream italic">The Atelier</h2>
            <div className="w-10" /> {/* spacer for centering */}
         </div>

         {/* Mobile Sidebar Backdrop */}
         {sidebarOpen && (
            <div
               className="fixed inset-0 z-[190] bg-black/50 backdrop-blur-sm md:hidden"
               onClick={() => setSidebarOpen(false)}
            />
         )}

         {/* Glassmorphic Sidebar */}
         <aside className={`w-72 fixed h-[96vh] top-[2vh] left-4 z-[200] flex flex-col rounded-3xl overflow-hidden border border-white/40 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] backdrop-blur-2xl bg-earth/95 text-cream transition-all duration-500 ${sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)]'} md:translate-x-0`}>
            {/* Header */}
            <div className="p-8 border-b border-white/5 bg-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-bronze/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
               <h2 className="font-serif text-3xl italic tracking-wide relative z-10">The Atelier</h2>
               <div className="flex items-center gap-2 mt-2 opacity-60">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                  <p className="text-[9px] uppercase tracking-[0.25em] relative z-10">Admin Console</p>
               </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
               {/* Dashboard */}
               <button
                  onClick={() => switchTab('dashboard', () => setActivePageEditor(null))}
                  className={`relative group w-full text-left px-5 py-3.5 text-xs uppercase tracking-[0.15em] flex items-center gap-4 rounded-xl transition-all mb-2 overflow-hidden ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
               >
                  <Home className={`w-4 h-4 transition-transform duration-500 ${activeTab === 'dashboard' ? 'scale-110 text-bronze' : 'group-hover:scale-110'}`} />
                  <span className="relative z-10 font-medium">Dashboard</span>
                  {activeTab === 'dashboard' && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-100" />}
               </button>

               {/* Newsletter */}
               <button
                  onClick={() => switchTab('newsletter', () => { setNewsletterSubTab('overview'); setActivePageEditor(null); })}
                  className={`relative group w-full text-left px-5 py-3.5 text-xs uppercase tracking-[0.15em] flex items-center gap-4 rounded-xl transition-all mb-2 overflow-hidden ${activeTab === 'newsletter' ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
               >
                  <Mail className={`w-4 h-4 transition-transform duration-500 ${activeTab === 'newsletter' ? 'scale-110 text-bronze' : 'group-hover:scale-110'}`} />
                  <span className="relative z-10 font-medium">Newsletter</span>
               </button>

               {/* Orders */}
               <button
                  onClick={() => switchTab('orders', () => setActivePageEditor(null))}
                  className={`relative group w-full text-left px-5 py-3.5 text-xs uppercase tracking-[0.15em] flex items-center gap-4 rounded-xl transition-all mb-2 overflow-hidden ${activeTab === 'orders' ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
               >
                  <Package className={`w-4 h-4 transition-transform duration-500 ${activeTab === 'orders' ? 'scale-110 text-bronze' : 'group-hover:scale-110'}`} />
                  <span className="relative z-10 font-medium">Orders</span>
               </button>

               {/* Separator */}
               <div className="px-4 pt-6 pb-2">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
                  <span className="text-[9px] uppercase tracking-[0.3em] text-bronze/70 font-bold block mb-2 shimmer-text">Store Management</span>
               </div>

               {/* Structure */}
               <button
                  onClick={() => switchTab('structure', () => setActivePageEditor(null))}
                  className={`relative group w-full text-left px-5 py-3.5 text-xs uppercase tracking-[0.15em] flex items-center gap-4 rounded-xl transition-all mb-2 overflow-hidden ${activeTab === 'structure' ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
               >
                  <Layers className={`w-4 h-4 transition-transform duration-500 ${activeTab === 'structure' ? 'scale-110 text-bronze' : 'group-hover:scale-110'}`} />
                  <span className="relative z-10 font-medium">Structure</span>
               </button>

               {/* Import */}
               <button
                  onClick={() => switchTab('import', () => setActivePageEditor(null))}
                  className={`relative group w-full text-left px-5 py-3.5 text-xs uppercase tracking-[0.15em] flex items-center gap-4 rounded-xl transition-all mb-2 overflow-hidden ${activeTab === 'import' ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
               >
                  <Upload className={`w-4 h-4 transition-transform duration-500 ${activeTab === 'import' ? 'scale-110 text-bronze' : 'group-hover:scale-110'}`} />
                  <span className="relative z-10 font-medium">Import</span>
               </button>

               {/* CJ Settings */}
               <button
                  onClick={() => switchTab('cj-settings', () => setActivePageEditor(null))}
                  className={`relative group w-full text-left px-5 py-3.5 text-xs uppercase tracking-[0.15em] flex items-center gap-4 rounded-xl transition-all mb-2 overflow-hidden ${activeTab === 'cj-settings' ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
               >
                  <Settings className={`w-4 h-4 transition-transform duration-500 ${activeTab === 'cj-settings' ? 'scale-110 text-bronze' : 'group-hover:scale-110'}`} />
                  <span className="relative z-10 font-medium">CJ Settings</span>
               </button>


               {/* Collections Loop */}
               <div className="px-4 pt-6 pb-2">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
                  <span className="text-[9px] uppercase tracking-[0.3em] text-bronze/70 font-bold block mb-2 shimmer-text">Collections</span>
               </div>

               {siteContent.collections.map(collection => (
                  <div className="mb-1" key={collection.id}>
                     <button
                        onClick={() => toggleCollectionExpand(collection.id)}
                        className={`w-full text-left px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] flex items-center justify-between rounded-lg transition-all ${activeTab === 'products' && filterCollection === collection.id ? 'text-white' : 'text-white/50 hover:text-white'}`}
                     >
                        <div className="flex items-center gap-3">
                           <span className={`w-1 h-1 rounded-full ${activeTab === 'products' && filterCollection === collection.id ? 'bg-bronze shadow-[0_0_8px_rgba(168,140,119,0.8)]' : 'bg-white/20'}`} />
                           {collection.title}
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${expandedCollections[collection.id] ? 'rotate-180 text-white' : 'text-white/20'}`} />
                     </button>

                     <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedCollections[collection.id] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="pl-4 space-y-0.5 mt-1 ml-4 border-l border-white/5">
                           <button
                              onClick={() => switchTab('products', () => { setFilterCollection(collection.id); setFilterCategory(null); setIsEditingProduct(false); setActivePageEditor(null); })}
                              className={`w-full text-left px-3 py-2 text-[9px] uppercase tracking-[0.15em] rounded-r-lg transition-all hover:pl-5 duration-300 ${activeTab === 'products' && filterCollection === collection.id && !filterCategory ? 'text-bronze font-bold bg-white/5' : 'text-white/40 hover:text-white'}`}
                           >
                              View All
                           </button>
                           {collection.subcategories.map(cat => (
                              <button
                                 key={cat.id}
                                 onClick={() => switchTab('products', () => { setFilterCollection(collection.id); setFilterCategory(cat.title); setIsEditingProduct(false); setActivePageEditor(null); })}
                                 className={`w-full text-left px-3 py-2 text-[9px] uppercase tracking-[0.15em] rounded-r-lg transition-all hover:pl-5 duration-300 ${activeTab === 'products' && filterCollection === collection.id && filterCategory === cat.title ? 'text-white font-bold bg-white/5' : 'text-white/40 hover:text-white'}`}
                              >
                                 {cat.title.replace(collection.title + ' ', '')}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
               ))}

               {/* Content Section */}
               <div className="px-4 pt-6 pb-2">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
                  <span className="text-[9px] uppercase tracking-[0.3em] text-bronze/70 font-bold block mb-2 shimmer-text">Content</span>
               </div>

               <button
                  onClick={() => switchTab('journal', () => setActivePageEditor(null))}
                  className={`relative group w-full text-left px-5 py-3.5 text-xs uppercase tracking-[0.15em] flex items-center gap-4 rounded-xl transition-all mb-2 overflow-hidden ${activeTab === 'journal' ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
               >
                  <BookOpen className={`w-4 h-4 transition-transform duration-500 ${activeTab === 'journal' ? 'scale-110 text-bronze' : 'group-hover:scale-110'}`} />
                  <span className="relative z-10 font-medium">Journal</span>
               </button>

               <button
                  onClick={() => switchTab('pages', () => setActivePageEditor(null))}
                  className={`relative group w-full text-left px-5 py-3.5 text-xs uppercase tracking-[0.15em] flex items-center gap-4 rounded-xl transition-all mb-2 overflow-hidden ${activeTab === 'pages' ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
               >
                  <Layout className={`w-4 h-4 transition-transform duration-500 ${activeTab === 'pages' ? 'scale-110 text-bronze' : 'group-hover:scale-110'}`} />
                  <span className="relative z-10 font-medium">Pages</span>
               </button>

            </nav>

            {/* User Profile / Exit */}
            <div className="p-4 bg-black/20 backdrop-blur-md border-t border-white/5 mt-auto">
               <button onClick={() => { logout(); handleReturnToSite(); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-[0.2em] text-red-300/60 hover:text-red-300 hover:bg-red-900/10 rounded-lg transition-all group">
                  <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>Exit Studio</span>
               </button>
            </div>
         </aside>

         {/* Main Content Area */}
         <main className="ml-0 md:ml-80 flex-1 p-4 md:p-8 pt-24 md:pt-8 h-screen overflow-y-auto no-scrollbar relative">

            {/* DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
               <FadeIn>
                  {/* Premium Header */}
                  <div className="mb-10 md:mb-16 relative mt-2 md:mt-0">
                     <div className="absolute -left-4 md:-left-10 -top-4 md:-top-10 w-32 md:w-40 h-32 md:h-40 bg-bronze/10 rounded-full blur-3xl mix-blend-multiply opacity-50 animate-blob" />
                     <span className="text-bronze text-[10px] uppercase tracking-[0.4em] mb-3 md:mb-4 block font-medium relative z-10 pl-1">Executive Overview</span>
                     <h1 className="font-serif text-4xl md:text-5xl text-earth relative z-10 tracking-tight leading-tight md:leading-tight">
                        Welcome Back,<br className="md:hidden" /> <span className="italic text-bronze/80">Monica.</span>
                     </h1>
                  </div>

                  {/* Glass Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-10 md:mb-16">

                     {/* Products Card */}
                     <div
                        onClick={() => { setActiveTab('products'); setFilterCollection('all'); setFilterCategory(null); }}
                        className="group relative bg-white/40 backdrop-blur-xl border border-white/40 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden"
                     >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 scale-125 group-hover:scale-150 transform origin-top-right">
                           <ShoppingBag className="w-24 h-24 rotate-12" />
                        </div>

                        <div className="relative z-10">
                           <div className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/50">
                              <ShoppingBag className="w-7 h-7 text-bronze" />
                           </div>
                           <h3 className="font-serif text-4xl text-earth mb-2">{products.length}</h3>
                           <p className="text-xs uppercase tracking-[0.2em] text-earth/60 font-medium">Active Products</p>
                        </div>
                     </div>

                     {/* Collections Card */}
                     <div
                        onClick={() => setActiveTab('structure')}
                        className="group relative bg-white/40 backdrop-blur-xl border border-white/40 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden"
                     >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 scale-125 group-hover:scale-150 transform origin-top-right">
                           <Layers className="w-24 h-24 rotate-12" />
                        </div>

                        <div className="relative z-10">
                           <div className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/50">
                              <Layers className="w-7 h-7 text-bronze" />
                           </div>
                           <h3 className="font-serif text-4xl text-earth mb-2">{siteContent.collections.length}</h3>
                           <p className="text-xs uppercase tracking-[0.2em] text-earth/60 font-medium">Collections</p>
                        </div>
                     </div>

                     {/* Pages Card */}
                     <div
                        onClick={() => setActiveTab('pages')}
                        className="group relative bg-white/40 backdrop-blur-xl border border-white/40 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden"
                     >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 scale-125 group-hover:scale-150 transform origin-top-right">
                           <Layout className="w-24 h-24 rotate-12" />
                        </div>

                        <div className="relative z-10">
                           <div className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/50">
                              <Layout className="w-7 h-7 text-bronze" />
                           </div>
                           <h3 className="font-serif text-4xl text-earth mb-2">{2 + siteContent.customPages.length}</h3>
                           <p className="text-xs uppercase tracking-[0.2em] text-earth/60 font-medium">Content Pages</p>
                        </div>
                     </div>
                  </div>

                  {/* Quick Actions Row */}
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                     <button onClick={handleCreateProduct} className="group relative overflow-hidden bg-earth text-cream rounded-2xl p-4 md:p-6 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10 flex flex-col items-center text-center gap-3">
                           <div className="p-3 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500"><Plus className="w-6 h-6" /></div>
                           <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Add Product</span>
                        </div>
                     </button>

                     <button onClick={handleCreateNewPost} className="group relative overflow-hidden bg-cream-dark/50 border border-earth/5 rounded-2xl p-4 md:p-6 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 hover:bg-cream-dark/80">
                        <div className="relative z-10 flex flex-col items-center text-center gap-3">
                           <div className="p-3 bg-white/50 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-500"><PenTool className="w-6 h-6 text-earth" /></div>
                           <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-earth">Write Journal</span>
                        </div>
                     </button>

                     <button onClick={() => { setActiveTab('newsletter'); setNewsletterSubTab('campaigns'); handleCreateCampaign(); }} className="group relative overflow-hidden bg-cream-dark/50 border border-earth/5 rounded-2xl p-4 md:p-6 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 hover:bg-cream-dark/80">
                        <div className="relative z-10 flex flex-col items-center text-center gap-3">
                           <div className="p-3 bg-white/50 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-500"><Send className="w-6 h-6 text-earth" /></div>
                           <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-earth">Send Email</span>
                        </div>
                     </button>

                     <button onClick={() => { setActiveTab('cj-settings'); }} className="group relative overflow-hidden bg-cream-dark/50 border border-earth/5 rounded-2xl p-4 md:p-6 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 hover:bg-cream-dark/80">
                        <div className="relative z-10 flex flex-col items-center text-center gap-3">
                           <div className="p-3 bg-white/50 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-500"><Settings className="w-6 h-6 text-earth" /></div>
                           <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-earth">Integration</span>
                        </div>
                     </button>
                  </div>

               </FadeIn>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
               <FadeIn>
                  <AdminOrders />
               </FadeIn>
            )}

            {/* IMPORT TAB */}
            {activeTab === 'import' && (
               <FadeIn>
                  <ProductImport
                     collections={siteContent.collections}
                     onImportProducts={async (productsToImport) => {
                        // Import each product and submit for CJ sourcing
                        const results = await Promise.all(
                           productsToImport.map(async (product) => {
                              const productId = await addProduct(product);
                              // If product has source URL and was created successfully, submit for CJ sourcing
                              if (productId && product.sourceUrl && product.cjSourcingStatus === 'pending') {
                                 // CJ sourcing will be triggered by the cron job or manual check
                                 // The product is already marked as pending in the database
                                 return { id: productId, pending: true };
                              }
                              return { id: productId, pending: false };
                           })
                        );
                        const pendingCount = results.filter(r => r.pending).length;
                        const successMessage = pendingCount > 0
                           ? `Successfully imported ${productsToImport.length} products! ${pendingCount} products submitted for CJ sourcing.`
                           : `Successfully imported ${productsToImport.length} products!`;
                        alert(successMessage);
                     }}
                  />
               </FadeIn>
            )}

            {/* CJ SETTINGS TAB */}
            {activeTab === 'cj-settings' && (
               <FadeIn>
                  <CJSettings />
               </FadeIn>
            )}

            {/* NEWSLETTER TAB */}
            {activeTab === 'newsletter' && (
               <FadeIn>
                  <div className="mb-12 border-b border-earth/10 pb-6 flex flex-col md:flex-row gap-4 md:gap-0 justify-between md:items-end">
                     <div>
                        <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Communications</span>
                        <h1 className="font-serif text-2xl md:text-4xl text-earth">The Mae Letter</h1>
                     </div>
                     <div className="flex flex-wrap gap-2 md:gap-4">
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
                     <div className="overflow-x-auto bg-white border border-earth/5">
                        <table className="w-full text-left text-sm text-earth/70 min-w-[500px]">
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

               </FadeIn>
            )}

            {/* STRUCTURE TAB */}
            {activeTab === 'structure' && (
               <FadeIn>
                  <div className="mb-12">
                     <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Site Configuration</span>
                     <h1 className="font-serif text-2xl md:text-4xl text-earth">Structure & Navigation</h1>
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
                        <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-2xl shadow-2xl relative animate-fade-in-up">
                           <button onClick={() => setEditingCollection(null)} className="absolute top-4 right-4 text-earth/30 hover:text-earth"><X className="w-5 h-5" /></button>
                           <h2 className="font-serif text-3xl text-earth mb-8">{editingCollection.id ? 'Edit Collection' : 'New Collection'}</h2>

                           <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                  <div className="flex flex-col md:flex-row gap-3 md:gap-0 justify-between md:items-end mb-8 md:mb-12 border-b border-earth/10 pb-4 md:pb-6">
                     <div>
                        <span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">{getCollectionTitle(filterCollection)}</span>
                        <h1 className="font-serif text-2xl md:text-4xl text-earth">{filterCategory || 'All Items'}</h1>
                     </div>
                     <button onClick={handleCreateProduct} className="bg-earth text-cream px-5 md:px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-all shadow-lg flex items-center gap-2 rounded-lg w-fit">
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
                           <div key={product.id} className="bg-white p-4 border border-earth/5 flex gap-4 md:gap-6 items-center group hover:shadow-md transition-all">
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
                              <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
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
                  <div className="flex flex-col md:flex-row gap-3 md:gap-0 justify-between md:items-end mb-8 md:mb-12 border-b border-earth/10 pb-4 md:pb-6">
                     <div><span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Content Marketing</span><h1 className="font-serif text-2xl md:text-4xl text-earth">Simply Mae Journal</h1></div>
                     <button onClick={handleCreateNewPost} className="bg-earth text-cream px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-all shadow-lg flex items-center gap-2"><Plus className="w-3 h-3" /> New Story</button>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                     {posts.map(post => (
                        <div key={post.id} className="bg-white p-4 md:p-6 border border-earth/5 flex gap-4 md:gap-8 items-start group hover:shadow-md transition-all">
                           <div className="w-20 md:w-32 aspect-[3/4] bg-cream flex-shrink-0"><img src={post.image} className="w-full h-full object-cover" /></div>
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
                  <div className="flex flex-col md:flex-row gap-3 md:gap-0 justify-between md:items-end mb-8 md:mb-12 border-b border-earth/10 pb-4 md:pb-6">
                     <div><span className="text-bronze text-xs uppercase tracking-[0.4em] mb-2 block">Site Design</span><h1 className="font-serif text-2xl md:text-4xl text-earth">Select Page to Edit</h1></div>
                     <button onClick={() => setShowPageGenerator(true)} className="bg-earth text-cream px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-all shadow-lg flex items-center gap-2"><Sparkles className="w-3 h-3" /> AI New Page</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
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
               <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"><div className="bg-white w-full max-w-lg p-8 rounded-2xl shadow-2xl relative animate-fade-in-up"><button onClick={() => setShowPageGenerator(false)} className="absolute top-4 right-4 text-earth/30 hover:text-earth"><X className="w-5 h-5" /></button><div className="text-center mb-8"><h2 className="font-serif text-2xl text-earth">Design AI Concierge</h2></div><div className="space-y-6"><div><label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Page Title</label><input type="text" value={generatorPrompt.title} onChange={(e) => setGeneratorPrompt({ ...generatorPrompt, title: e.target.value })} className="w-full p-3 border border-earth/10 bg-cream/20 text-earth focus:border-bronze focus:outline-none rounded-lg" /></div><div><label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Description</label><textarea value={generatorPrompt.description} onChange={(e) => setGeneratorPrompt({ ...generatorPrompt, description: e.target.value })} className="w-full p-3 border border-earth/10 bg-cream/20 text-earth focus:border-bronze focus:outline-none h-32 rounded-lg" /></div><button onClick={handleGeneratePage} disabled={isGenerating} className="w-full bg-earth text-cream py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-colors flex items-center justify-center gap-2 disabled:opacity-70 rounded-lg">{isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{isGenerating ? 'Designing...' : 'Generate Page'}</button></div></div></div>
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

            {/* SECTION BUILDER MODAL */}
            {showSectionPicker && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                  <div className="bg-white w-full max-w-lg md:max-w-4xl p-6 md:p-8 rounded-2xl shadow-2xl relative animate-fade-in-up">
                     <button onClick={() => setShowSectionPicker(false)} className="absolute top-4 right-4 text-earth/30 hover:text-earth"><X className="w-6 h-6" /></button>
                     <div className="mb-8 text-center">
                        <span className="text-bronze text-xs uppercase tracking-[0.3em] block mb-2">Section Builder</span>
                        <h2 className="font-serif text-3xl text-earth">Choose Content Block</h2>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
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

         {/* CAMPAIGN STUDIO — rendered outside <main> for full viewport centering */}
         <NewsletterStudio
            isOpen={!!editingCampaign}
            onClose={() => setEditingCampaign(null)}
            initialCampaign={editingCampaign}
            onSave={(campaign) => {
               if (campaign.id) {
                  updateCampaign(campaign.id, campaign);
               } else {
                  createCampaign(campaign as any);
               }
               // If status is sent, trigger send logic
               if (campaign.status === 'sent' && campaign.id) {
                  sendCampaign(campaign.id);
               }
               setEditingCampaign(null);
            }}
         />

         {/* PRODUCT STUDIO — rendered outside <main> for full viewport centering */}
         <ProductStudio
            isOpen={isEditingProduct}
            onClose={() => { setIsEditingProduct(false); setEditingProduct(null); }}
            initialProduct={editingProduct}
            onSave={async (prod) => {
               if (prod.id) {
                  // Updating existing product - just update
                  await updateProduct(prod.id, prod);
               } else {
                  // New product - set CJ sourcing status if it has a source URL
                  const productWithSourcing = {
                     ...prod,
                     // Mark for CJ sourcing if product has a source URL (from AliExpress etc)
                     cjSourcingStatus: prod.sourceUrl ? 'pending' as const : 'none' as const,
                  };
                  await addProduct(productWithSourcing as Omit<Product, 'id'>);

                  // If marked as pending, the CJ cron job will handle submission
                  if (prod.sourceUrl) {
                     alert('Product saved! It has been submitted for CJ sourcing approval and will appear on your site once approved.');
                  }
               }
               setIsEditingProduct(false);
               setEditingProduct(null);
            }}
            siteContent={siteContent}
         />

         {/* POST EDITOR MODAL — rendered outside <main> to avoid z-10 stacking context clipping */}
         {isEditingPost && editingPost && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
               <div className="bg-white w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col rounded-2xl shadow-2xl relative animate-fade-in-up">
                  {/* Sticky Header */}
                  <div className="flex items-center justify-between px-4 md:px-8 pt-6 md:pt-8 pb-4 border-b border-earth/5 flex-shrink-0">
                     <h2 className="font-serif text-2xl md:text-3xl text-earth">{editingPost.id ? 'Edit Story' : 'New Story'}</h2>
                     <button onClick={() => setIsEditingPost(false)} className="text-earth/30 hover:text-earth"><X className="w-6 h-6" /></button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="overflow-y-auto flex-1 px-4 md:px-8 py-6">
                     <div className="space-y-6">
                        <ImageUploader label="Cover Image" currentImage={editingPost.image} onImageChange={(val) => setEditingPost({ ...editingPost, image: val })} aspectRatio="aspect-[21/9]" />

                        <div>
                           <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Title</label>
                           <input type="text" value={editingPost.title} onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 font-serif text-2xl" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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

                        {/* Excerpt Section with AI Generator */}
                        <div>
                           <div className="flex items-center justify-between mb-2">
                              <label className="block text-[10px] uppercase tracking-widest text-earth/40">Excerpt</label>
                              {editingPost.content && editingPost.content.length > 50 && (
                                 <button
                                    type="button"
                                    onClick={async () => {
                                       setExcerptGenerating(true);
                                       setExcerptOptions([]);
                                       try {
                                          const plainText = editingPost.content.replace(/<[^>]*>/g, '').trim();
                                          const { GoogleGenAI } = await import('@google/genai');
                                          const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
                                          const response = await genAI.models.generateContent({
                                             model: 'gemini-2.0-flash',
                                             contents: `You are an editorial assistant for a premium lifestyle and faith blog called "Simply Mae." Generate exactly 4 excerpt options for this blog post. Each excerpt should be 1-2 sentences that entice readers to click and read the full post.

The 4 styles are:
1. THE HOOK — provocative, challenges assumptions, draws you in
2. THE HEART — personal, speaks directly to the reader, makes them feel seen
3. THE THESIS — clear and bold, summarizes the core message
4. THE REFRAME — offers a surprising perspective or reframes a common belief

Return ONLY a JSON array of 4 objects with "style" and "text" fields. No markdown formatting, no code blocks, just the raw JSON array.

Blog post content:
${plainText.slice(0, 3000)}`,
                                          });
                                          const text = response?.text || '';
                                          const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                                          const options = JSON.parse(cleaned);
                                          setExcerptOptions(options);
                                       } catch (err) {
                                          console.error('Excerpt generation failed:', err);
                                          alert('Failed to generate excerpts. Please try again.');
                                       } finally {
                                          setExcerptGenerating(false);
                                       }
                                    }}
                                    disabled={excerptGenerating}
                                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-bronze hover:text-earth transition-colors disabled:opacity-50"
                                 >
                                    {excerptGenerating ? (
                                       <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                                    ) : (
                                       <><Sparkles className="w-3 h-3" /> Generate Excerpts</>
                                    )}
                                 </button>
                              )}
                           </div>
                           <textarea value={editingPost.excerpt} onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })} className="w-full bg-cream/30 p-3 border border-earth/10 h-24" />

                           {/* AI Excerpt Options */}
                           {excerptOptions.length > 0 && (
                              <div className="mt-3 space-y-2">
                                 <p className="text-[9px] uppercase tracking-widest text-earth/30 mb-2">Choose an excerpt:</p>
                                 {excerptOptions.map((opt: any, idx: number) => (
                                    <button
                                       key={idx}
                                       type="button"
                                       onClick={() => {
                                          setEditingPost({ ...editingPost, excerpt: opt.text });
                                          setExcerptOptions([]);
                                       }}
                                       className="w-full text-left p-3 border border-earth/10 rounded-lg hover:border-bronze/40 hover:bg-cream/30 transition-all group"
                                    >
                                       <span className="text-[9px] uppercase tracking-widest text-bronze/60 group-hover:text-bronze block mb-1">{opt.style}</span>
                                       <span className="font-serif text-sm text-earth/80 leading-relaxed">{opt.text}</span>
                                    </button>
                                 ))}
                              </div>
                           )}
                        </div>

                        <div>
                           <label className="block text-[10px] uppercase tracking-widest text-earth/40 mb-2">Content</label>
                           <RichTextEditor
                              value={editingPost.content || ''}
                              onChange={(html) => setEditingPost({ ...editingPost, content: html })}
                              placeholder="Start writing your story..."
                           />
                        </div>
                     </div>
                  </div>

                  {/* Sticky Save Button */}
                  <div className="px-4 md:px-8 py-4 border-t border-earth/10 bg-white flex-shrink-0 rounded-b-2xl">
                     <button onClick={handleSavePost} className="w-full bg-earth text-cream py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-bronze transition-colors rounded-lg">Save Story</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
