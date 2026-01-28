
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
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
  // --- Convex Queries ---
  const convexPosts = useQuery(api.blogPosts.list);
  const convexProducts = useQuery(api.products.list);
  const convexSiteContent = useQuery(api.siteContent.get);
  const convexCustomPages = useQuery(api.customPages.list);

  // --- Convex Mutations ---
  const createPost = useMutation(api.blogPosts.create);
  const updatePostMutation = useMutation(api.blogPosts.update);
  const removePost = useMutation(api.blogPosts.remove);

  const createProduct = useMutation(api.products.create);
  const updateProductMutation = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);

  const updateSiteContentMutation = useMutation(api.siteContent.update);
  const seedSiteContent = useMutation(api.siteContent.seed);

  const createCustomPage = useMutation(api.customPages.create);
  const updateCustomPageMutation = useMutation(api.customPages.update);
  const removeCustomPage = useMutation(api.customPages.remove);

  // --- Auth State (kept in localStorage for simplicity) ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('lm_auth') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('lm_auth', String(isAuthenticated));
  }, [isAuthenticated]);

  // --- Seed initial data if Convex is empty ---
  useEffect(() => {
    if (convexSiteContent === null) {
      // No site content exists, seed it
      seedSiteContent({
        navLinks: INITIAL_SITE_CONTENT.navLinks,
        collections: INITIAL_SITE_CONTENT.collections,
        home: INITIAL_SITE_CONTENT.home,
        story: INITIAL_SITE_CONTENT.story,
      });
    }
  }, [convexSiteContent, seedSiteContent]);

  useEffect(() => {
    if (convexProducts !== undefined && convexProducts.length === 0) {
      // Seed initial products
      INITIAL_PRODUCTS.forEach(product => {
        const { id, ...productData } = product;
        createProduct(productData);
      });
    }
  }, [convexProducts, createProduct]);

  useEffect(() => {
    if (convexPosts !== undefined && convexPosts.length === 0) {
      // Seed initial posts
      INITIAL_POSTS.forEach(post => {
        const { id, date, ...postData } = post;
        createPost(postData);
      });
    }
  }, [convexPosts, createPost]);

  // --- Transform Convex data to match existing types ---
  const posts: BlogPost[] = (convexPosts ?? []).map(p => ({
    ...p,
    id: p._id,
  }));

  const products: Product[] = (convexProducts ?? []).map(p => ({
    ...p,
    id: p._id,
  }));

  const customPages: CustomPage[] = (convexCustomPages ?? []).map(p => ({
    ...p,
    id: p._id,
  }));

  const siteContent: SiteContent = convexSiteContent
    ? {
      navLinks: convexSiteContent.navLinks ?? INITIAL_SITE_CONTENT.navLinks,
      collections: convexSiteContent.collections ?? INITIAL_SITE_CONTENT.collections,
      home: convexSiteContent.home ?? INITIAL_SITE_CONTENT.home,
      story: convexSiteContent.story ?? INITIAL_SITE_CONTENT.story,
      customPages,
    }
    : { ...INITIAL_SITE_CONTENT, customPages };

  // --- Auth ---
  const login = (password: string) => {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'louiemae';
    if (password === adminPassword) {
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
    createPost(newPostData);
  };

  const updatePost = (id: string, updatedData: Partial<BlogPost>) => {
    const { id: _, date, ...updates } = updatedData as any;
    updatePostMutation({ id: id as Id<"blogPosts">, ...updates });
  };

  const deletePost = (id: string) => {
    removePost({ id: id as Id<"blogPosts"> });
  };

  const getPost = (id: string) => {
    return posts.find(post => post.id === id);
  };

  // --- Product Actions ---
  const addProduct = (newProductData: Omit<Product, 'id'>) => {
    createProduct(newProductData);
  };

  const updateProduct = (id: string, updatedData: Partial<Product>) => {
    const { id: _, ...updates } = updatedData as any;
    updateProductMutation({ id: id as Id<"products">, ...updates });
  };

  const deleteProduct = (id: string) => {
    removeProduct({ id: id as Id<"products"> });
  };

  // --- Site Content Actions ---
  const updateSiteContentAction = (section: keyof SiteContent, data: Partial<SiteContent[keyof SiteContent]>) => {
    if (section === 'customPages') return; // Handled separately

    const currentValue = siteContent[section];
    const updatedValue = { ...currentValue, ...data };

    updateSiteContentMutation({ [section]: updatedValue } as any);
  };

  // --- Custom Page Actions ---
  const addCustomPage = (page: CustomPage) => {
    const { id, ...pageData } = page;
    createCustomPage(pageData);
  };

  const updateCustomPageAction = (id: string, pageData: Partial<CustomPage>) => {
    const { id: _, ...updates } = pageData as any;
    updateCustomPageMutation({ id: id as Id<"customPages">, ...updates });
  };

  const deleteCustomPageAction = (id: string) => {
    removeCustomPage({ id: id as Id<"customPages"> });
  };

  const getCustomPage = (slug: string) => {
    return customPages.find(p => p.slug === slug);
  };

  // --- Navigation & Collection Actions ---
  const updateNavigation = (navLinks: NavLink[]) => {
    updateSiteContentMutation({ navLinks });
  };

  const addCollection = (collection: CollectionConfig) => {
    const newCollections = [...siteContent.collections, collection];
    updateSiteContentMutation({ collections: newCollections });
  };

  const updateCollection = (id: string, collectionData: Partial<CollectionConfig>) => {
    const updatedCollections = siteContent.collections.map(c =>
      c.id === id ? { ...c, ...collectionData } : c
    );
    updateSiteContentMutation({ collections: updatedCollections });
  };

  const deleteCollection = (id: string) => {
    const filteredCollections = siteContent.collections.filter(c => c.id !== id);
    updateSiteContentMutation({ collections: filteredCollections });
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
      updateSiteContent: updateSiteContentAction,
      addCustomPage,
      updateCustomPage: updateCustomPageAction,
      deleteCustomPage: deleteCustomPageAction,
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
