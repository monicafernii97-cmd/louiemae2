
import { Product, Category, BlogPost, SiteContent, NavLink, CollectionConfig } from './types';

export const HERO_IMAGE = "/lm3.jpg";

// --- Initial Products ---
export const PRODUCTS: Product[] = [
  // Furniture
  {
    id: '1',
    name: 'Black Buffet Sideboard',
    category: 'Side Storage Cabinets',
    collection: 'furniture',
    price: 850,
    description: 'A stunning statement piece featuring natural rattan doors contrasting against a sleek black frame. Perfect for dining rooms or entryways.',
    images: ['https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800&auto=format&fit=crop'],
    isNew: true,
    inStock: true
  },
  {
    id: '2',
    name: 'Linen Accent Chair',
    category: 'Accent Chairs',
    collection: 'furniture',
    price: 420,
    description: 'Upholstered in premium Belgian linen, this accent chair brings soft texture and comfort to any corner of your home.',
    images: ['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?q=80&w=800&auto=format&fit=crop'],
    inStock: true
  },
  {
    id: '3',
    name: 'Organic Cotton Romper',
    category: 'Girls Rompers',
    collection: 'kids',
    price: 45,
    description: 'Soft, breathable organic cotton romper for everyday play.',
    images: ['https://images.unsplash.com/photo-1522771753035-1a5b6562f329?q=80&w=800&auto=format&fit=crop'],
    inStock: true
  },
  {
    id: '4',
    name: 'Artisan Ceramic Vase',
    category: 'Vases',
    collection: 'decor',
    price: 85,
    description: 'Hand-thrown ceramic vase with a matte, earthy texture.',
    images: ['https://images.unsplash.com/photo-1612196808214-b7e239e5f6b7?q=80&w=800&auto=format&fit=crop'],
    inStock: true
  }
];

export const FASHION_CATEGORIES: Category[] = [
  { id: 'dresses', title: 'Dresses', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800', collection: 'fashion', caption: 'Effortless Elegance' },
  { id: 'outfits', title: 'Outfits & Sets', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800', collection: 'fashion', caption: 'Coordinated Style' },
  { id: 'tops', title: 'Tops', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800', collection: 'fashion', caption: 'Everyday Essentials' },
  { id: 'bottoms', title: 'Bottoms', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800', collection: 'fashion', caption: 'Perfect Fit' },
];

export const KIDS_CATEGORIES: Category[] = [
  { id: 'girls', title: 'Girls', caption: 'Little Ladies', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', collection: 'kids' },
  { id: 'boys', title: 'Boys', caption: 'Little Gentlemen', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', collection: 'kids' },
  { id: 'nursery', title: 'Nursery Furniture', caption: 'The Dreamiest Space', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800', collection: 'kids' },
  { id: 'toys', title: 'Toys', caption: 'Play & Learn', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800', collection: 'kids' },
  { id: 'playroom', title: 'Playroom Furniture', caption: 'Create & Explore', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800', collection: 'kids' },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'The Art of Slow Living',
    excerpt: 'Embracing the quiet moments in a world that never stops.',
    content: "In a world that constantly demands our attention...",
    date: 'October 12, 2023',
    image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2000',
    category: 'Lifestyle',
    status: 'published'
  },
];

// --- INITIAL DATA STRUCTURES ---

const INITIAL_NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '#', children: [{ label: 'Our Story', href: '#story' }] },
  { label: 'Simply By Mae', href: '#', children: [{ label: 'Simply Mae', href: '#blog' }] },
  {
    label: 'Louie Kids & Co.',
    href: '#collection/kids',
    children: [
      { label: 'Shop All', href: '#collection/kids' },
      { label: 'Girls', href: '#collection/kids?cat=Girls' },
      { label: 'Boys', href: '#collection/kids?cat=Boys' },
      { label: 'Nursery Furniture', href: '#collection/kids?cat=Nursery Furniture' },
      { label: 'Toys', href: '#collection/kids?cat=Toys' },
      { label: 'Playroom Furniture', href: '#collection/kids?cat=Playroom Furniture' },
    ]
  },
  {
    label: 'The Mae Collective',
    href: '#collection/fashion',
    children: [
      { label: 'Shop All', href: '#collection/fashion' },
      { label: 'Womens Tops', href: '#collection/fashion?cat=Womens Tops' },
      { label: 'Womens Bottoms', href: '#collection/fashion?cat=Womens Bottoms' },
      { label: 'Womens Dresses', href: '#collection/fashion?cat=Womens Dresses' },
    ]
  },
  {
    label: 'Furniture',
    href: '#collection/furniture',
    children: [
      { label: 'Shop All', href: '#collection/furniture' },
      { label: 'Accent Chairs', href: '#collection/furniture?cat=Accent Chairs' },
      { label: 'Dining Tables', href: '#collection/furniture?cat=Dining Tables' },
      { label: 'Side Storage Cabinets', href: '#collection/furniture?cat=Side Storage Cabinets' },
    ]
  },
  {
    label: 'Home Decor',
    href: '#collection/decor',
    children: [
      { label: 'Shop All', href: '#collection/decor' },
      { label: 'Accent Chairs', href: '#collection/furniture?cat=Accent Chairs' }, // Cross-link
      { label: 'Vases', href: '#collection/decor?cat=Vases' },
      { label: 'Rugs', href: '#collection/decor?cat=Rugs' },
    ]
  },
];

const INITIAL_COLLECTIONS: CollectionConfig[] = [
  {
    id: 'furniture',
    title: 'Furniture',
    subtitle: 'Curated pieces for a timeless home',
    heroImage: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=2000&auto=format&fit=crop',
    subcategories: [
      { id: 'accent-chairs', title: 'Accent Chairs', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?q=80&w=800', caption: 'Sit & Stay Awhile' },
      { id: 'barstools', title: 'Barstools', image: 'https://images.unsplash.com/photo-1594226372073-672ce3467332?q=80&w=800', caption: 'Kitchen Comforts' },
      { id: 'dining-tables', title: 'Dining Tables', image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=800', caption: 'Gather Together' },
      { id: 'side-storage-cabinets', title: 'Side Storage Cabinets', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800', caption: 'Functional Beauty' },
      { id: 'nursery-furniture', title: 'Nursery Furniture', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800', redirect: '#collection/kids?cat=Nursery Furniture', caption: 'For Little Ones' },
    ]
  },
  {
    id: 'decor',
    title: 'Home Decor',
    subtitle: 'The details that tell your story',
    heroImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=2000&auto=format&fit=crop',
    subcategories: [
      { id: 'accent-chairs', title: 'Accent Chairs', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?q=80&w=800', redirect: '#collection/furniture?cat=Accent Chairs', caption: 'Statement Pieces' },
      { id: 'decor-items', title: 'Decor Items', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800', caption: 'Finishing Touches' },
      { id: 'table-lamps', title: 'Table Lamps', image: 'https://images.unsplash.com/photo-1513506003011-3b03c8b063ca?q=80&w=800', caption: 'Warm Glow' },
      { id: 'vases', title: 'Vases', image: 'https://images.unsplash.com/photo-1612196808214-b7e239e5f6b7?q=80&w=800', caption: 'Artisan Crafted' },
      { id: 'rugs', title: 'Rugs', image: 'https://images.unsplash.com/photo-1599694239849-012b68328761?q=80&w=800', caption: 'Textured Layers' },
    ]
  },
  {
    id: 'fashion',
    title: 'The Mae Collective',
    subtitle: 'Effortless style for the modern woman',
    heroImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2000&auto=format&fit=crop',
    subcategories: [
      { id: 'dresses', title: 'Dresses', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800', caption: 'Effortless Elegance' },
      { id: 'outfits', title: 'Outfits & Sets', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800', caption: 'Coordinated Style' },
      { id: 'tops', title: 'Tops', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800', caption: 'Everyday Essentials' },
      { id: 'bottoms', title: 'Bottoms', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800', caption: 'Perfect Fit' },
    ]
  },
  {
    id: 'kids',
    title: 'Louie Kids & Co.',
    subtitle: 'Heirloom quality for little ones',
    heroImage: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?q=80&w=2000&auto=format&fit=crop',
    subcategories: [
      { id: 'girls', title: 'Girls', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Little Ladies' },
      { id: 'boys', title: 'Boys', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', caption: 'Little Gentlemen' },
      { id: 'nursery', title: 'Nursery Furniture', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800', caption: 'The Dreamiest Space' },
      { id: 'toys', title: 'Toys', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800', caption: 'Play & Learn' },
      { id: 'playroom', title: 'Playroom Furniture', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800', caption: 'Create & Explore' },
    ]
  }
];

export const INITIAL_SITE_CONTENT: SiteContent = {
  navLinks: INITIAL_NAV_LINKS,
  collections: INITIAL_COLLECTIONS,
  home: {
    hero: {
      image: "/lm3.jpg",
      pretitle: "Welcome to Louie Mae",
      titleLine1: "Live the life you love.",
      titleLine2: "Love the life you live.",
      buttonText: "Shop Now"
    },
    intro: {
      text: "From Timeless Artistry to Unique Finds. Create your own Curated Style with Well-Made, Authentic Pieces."
    },
    categoryImages: {
      furniture: "https://images.unsplash.com/photo-1533090368676-1fd25485db88?q=80&w=1200&auto=format&fit=crop",
      decor: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop",
      fashion: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop",
      kids: "https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?q=80&w=1000&auto=format&fit=crop",
      journal: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1000&auto=format&fit=crop"
    },
    brand: {
      image: "https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=2000&auto=format&fit=crop"
    },
    sections: [] // Initial empty dynamic sections for home
  },
  story: {
    hero: {
      image: "https://images.unsplash.com/photo-1556020685-ae41abfc9365?q=80&w=2000&auto=format&fit=crop",
      title: "Discover",
      subtitle: "Our Journey"
    },
    prologue: {
      quote: "\"Welcome to Louie Mae—where purpose meets creativity, and every piece tells a story.\"",
      subtext: "A NARRATIVE OF FAITH, CRAFTSMANSHIP, AND CALLING"
    },
    chapters: {
      oneTitle: "The Heart Behind the Name",
      oneText: "L.O.U.I.E. is more than a name...",
      twoTitle: "From Garage Sparks to Boutique Dreams",
      twoText: "Louie Mae didn't begin as a business...",
      threeTitle: "A New Chapter: Love & Legacy",
      threeText: "Two years later, I met my husband...",
      fourTitle: "A Pause That Prepared Me",
      fourText: "Now, I'm returning—refreshed..."
    },
    sections: [] // Initialize sections
  },
  customPages: []
};
