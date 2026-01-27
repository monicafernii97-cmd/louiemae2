
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { BlogPost, SiteContent, CustomPage, Product, NavLink, CollectionConfig } from '../types';
import { BLOG_POSTS as INITIAL_POSTS, INITIAL_SITE_CONTENT, PRODUCTS as INITIAL_PRODUCTS } from '../constants';

interface SiteContextType {
  posts: BlogPost[];
  products: Product[];
  siteContent: SiteContent;
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  // Blog Actions
  addPost: (post: Omit<BlogPost, 'id' | 'date'>) => void;
  updatePost: (id: string, post: Partial<BlogPost>) => void;
  deletePost: (id: string) => void;
  getPost: (id: string) => BlogPost | undefined;
  // Product Actions
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  // Site Content Actions
  updateSiteContent: (section: keyof SiteContent, data: Partial<SiteContent[keyof SiteContent]>) => void;
  // Custom Page Actions
  addCustomPage: (page: CustomPage) => void;
  updateCustomPage: (id: string, page: Partial<CustomPage>) => void;
  deleteCustomPage: (id: string) => void;
  getCustomPage: (slug: string) => CustomPage | undefined;
  // Navigation & Collection Actions
  updateNavigation: (navLinks: NavLink[]) => void;
  addCollection: (collection: CollectionConfig) => void;
  updateCollection: (id: string, collection: Partial<CollectionConfig>) => void;
  deleteCollection: (id: string) => void;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from LocalStorage or Fallback to Constants
  const [posts, setPosts] = useState<BlogPost[]>(() => {
     const saved = localStorage.getItem('lm_posts');
     return saved ? JSON.parse(saved) : INITIAL_POSTS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
     const saved = localStorage.getItem('lm_products');
     return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [siteContent, setSiteContent] = useState<SiteContent>(() => {
     const saved = localStorage.getItem('lm_content');
     return saved ? JSON.parse(saved) : INITIAL_SITE_CONTENT;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
     return localStorage.getItem('lm_auth') === 'true';
  });

  // --- Persistence Effects ---
  useEffect(() => {
     localStorage.setItem('lm_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
     localStorage.setItem('lm_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
     localStorage.setItem('lm_content', JSON.stringify(siteContent));
  }, [siteContent]);

  useEffect(() => {
     localStorage.setItem('lm_auth', String(isAuthenticated));
  }, [isAuthenticated]);


  const login = (password: string) => {
    // Mock authentication - In a real app, this would verify with a backend
    if (password === 'louiemae') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  // --- Blog Actions ---
  const addPost = (newPostData: Omit<BlogPost, 'id' | 'date'>) => {
    const newPost: BlogPost = {
      ...newPostData,
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const updatePost = (id: string, updatedData: Partial<BlogPost>) => {
    setPosts(prev => prev.map(post => post.id === id ? { ...post, ...updatedData } : post));
  };

  const deletePost = (id: string) => {
    setPosts(prev => prev.filter(post => post.id !== id));
  };

  const getPost = (id: string) => {
    return posts.find(post => post.id === id);
  };

  // --- Product Actions ---
  const addProduct = (newProductData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...newProductData,
      id: Date.now().toString(),
    };
    setProducts(prev => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, updatedData: Partial<Product>) => {
    setProducts(prev => prev.map(prod => prod.id === id ? { ...prod, ...updatedData } : prod));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(prod => prod.id !== id));
  };

  // --- Site Content Actions ---
  const updateSiteContent = (section: keyof SiteContent, data: Partial<SiteContent[keyof SiteContent]>) => {
    setSiteContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...data
      }
    }));
  };

  // --- Custom Page Actions ---
  const addCustomPage = (page: CustomPage) => {
    setSiteContent(prev => ({
      ...prev,
      customPages: [...prev.customPages, page]
    }));
  };

  const updateCustomPage = (id: string, pageData: Partial<CustomPage>) => {
    setSiteContent(prev => ({
      ...prev,
      customPages: prev.customPages.map(p => p.id === id ? { ...p, ...pageData } : p)
    }));
  };

  const deleteCustomPage = (id: string) => {
    setSiteContent(prev => ({
      ...prev,
      customPages: prev.customPages.filter(p => p.id !== id)
    }));
  };

  const getCustomPage = (slug: string) => {
    return siteContent.customPages.find(p => p.slug === slug);
  };

  // --- Navigation & Collection Actions ---
  const updateNavigation = (navLinks: NavLink[]) => {
    setSiteContent(prev => ({ ...prev, navLinks }));
  };

  const addCollection = (collection: CollectionConfig) => {
    setSiteContent(prev => ({ ...prev, collections: [...prev.collections, collection] }));
  };

  const updateCollection = (id: string, collectionData: Partial<CollectionConfig>) => {
    setSiteContent(prev => ({
      ...prev,
      collections: prev.collections.map(c => c.id === id ? { ...c, ...collectionData } : c)
    }));
  };

  const deleteCollection = (id: string) => {
    setSiteContent(prev => ({
      ...prev,
      collections: prev.collections.filter(c => c.id !== id)
    }));
  };

  return (
    <SiteContext.Provider value={{ 
      posts, 
      products,
      siteContent,
      isAuthenticated, 
      login, 
      logout, 
      addPost, 
      updatePost, 
      deletePost,
      getPost,
      addProduct,
      updateProduct,
      deleteProduct,
      updateSiteContent,
      addCustomPage,
      updateCustomPage,
      deleteCustomPage,
      getCustomPage,
      updateNavigation,
      addCollection,
      updateCollection,
      deleteCollection
    }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
};

export const useBlog = useSite;
