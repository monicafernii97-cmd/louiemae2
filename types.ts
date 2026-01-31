
export type CollectionType = string; // Was 'furniture' | 'decor' | ... now dynamic

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  category: string;
  collection: CollectionType;
  isNew?: boolean;
  inStock?: boolean;
  variants?: ProductVariant[];  // Optional - for products with color/size options
}

export interface Category {
  id: string;
  title: string;
  image: string;
  caption?: string;
  collection?: CollectionType;
  redirect?: string; // For cross-linking (e.g. Decor > Accent Chairs -> Furniture)
}

export interface CollectionConfig {
  id: string; // e.g., 'furniture'
  title: string;
  subtitle: string;
  heroImage: string;
  subcategories: Category[]; // Defines the sub-menu and filter options
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  image: string;
  category: string;
  status: 'published' | 'draft';
}

export interface NavLink {
  label: string;
  href: string;
  children?: NavLink[];
}

export interface SectionItem {
  image?: string;
  title?: string;
  subtitle?: string;
  link?: string;
}

export interface PageSection {
  id: string;
  type: 'hero' | 'text' | 'image-text' | 'manifesto' | 'grid' | 'full-image' | 'product-feature';
  heading?: string;
  subheading?: string;
  content?: string;
  image?: string;
  items?: SectionItem[]; // For grids
  productId?: string; // For product features
  layout?: 'left' | 'right' | 'center';
}

export interface HomePageContent {
  hero: {
    image: string;
    pretitle: string;
    titleLine1: string;
    titleLine2: string;
    buttonText: string;
  };
  intro: {
    text: string;
  };
  categoryImages: {
    furniture: string;
    decor: string;
    fashion: string;
    kids: string;
    journal: string;
  };
  brand: {
    image: string;
  };
  sections: PageSection[]; // Dynamic sections added via admin
}

export interface StoryPageContent {
  hero: {
    image: string;
    title: string;
    subtitle: string;
  };
  prologue: {
    quote: string;
    subtext: string;
  };
  chapters: {
    oneTitle: string;
    oneText: string;
    twoTitle: string;
    twoText: string;
    threeTitle: string;
    threeText: string;
    fourTitle: string;
    fourText: string;
  };
  sections?: PageSection[]; // Dynamic sections added via admin
}

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  sections: PageSection[];
}

export interface SiteContent {
  navLinks: NavLink[];
  collections: CollectionConfig[];
  home: HomePageContent;
  story: StoryPageContent;
  customPages: CustomPage[];
}

// --- Newsletter Types ---

export interface Subscriber {
  id: string;
  email: string;
  firstName?: string;
  dateSubscribed: string;
  status: 'active' | 'unsubscribed';
  tags: string[]; // e.g. 'vip', 'cart-abandoned', 'welcome-series'
  openRate: number; // Mocked percentage 0-100
}

export interface EmailCampaign {
  id: string;
  subject: string;
  previewText: string;
  content: string; // HTML or Markdown
  status: 'draft' | 'scheduled' | 'sent';
  sentDate?: string;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
  };
  type: 'newsletter' | 'promotion' | 'automation';
}

// --- AliExpress API Types ---

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Color: Cream" or "Size: M"
  image?: string;
  priceAdjustment: number; // +/- from base price
  inStock: boolean;
}

export interface AliExpressProduct extends Product {
  aliExpressId: string;
  originalPrice: number;
  salePrice: number;
  shippingInfo: {
    freeShipping: boolean;
    estimatedDays: string;
    cost: number;
  };
  seller: {
    id: string;
    name: string;
    rating: number;
    feedbackScore: number;
  };
  variants: ProductVariant[];
  reviewCount: number;
  averageRating: number;
  productUrl: string;
}

export interface AliExpressSearchOptions {
  query: string;
  page?: number;
  pageSize?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'orders' | 'rating';
  categoryId?: string;
}

export interface AliExpressSearchResult {
  products: AliExpressProduct[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface ImportedProduct extends Product {
  aliExpressId: string;
  originalCost: number;
  markup: number;
  importedAt: string;
  lastSyncedAt: string;
  autoSync: boolean;
}
