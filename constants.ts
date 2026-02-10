
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
  { id: 'girls', title: 'Girls', caption: 'Little Ladies', image: '/images/brand/girls-dress.png', collection: 'kids' },
  { id: 'boys', title: 'Boys', caption: 'Little Gentlemen', image: '/images/brand/boys-category.png', collection: 'kids' },
  { id: 'nursery', title: 'Nursery Furniture', caption: 'The Dreamiest Space', image: '/images/brand/nursery-category.png', collection: 'kids' },
  { id: 'toys', title: 'Toys', caption: 'Play & Learn', image: '/images/brand/toys-category.png', collection: 'kids' },
  { id: 'playroom', title: 'Playroom Furniture', caption: 'Create & Explore', image: '/images/brand/playroom-scene-v2.png', collection: 'kids' },
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
      {
        label: 'Girls',
        href: '#collection/kids?cat=Girls',
        children: [
          { label: 'Shop All Girls', href: '#collection/kids?cat=Girls' },
          { label: 'Dresses', href: '#collection/kids?cat=Girls Dresses' },
          { label: 'Outfits & Sets', href: '#collection/kids?cat=Girls Outfits & Sets' },
          { label: 'Rompers', href: '#collection/kids?cat=Girls Rompers' },
          { label: 'Tops', href: '#collection/kids?cat=Girls Tops' },
          { label: 'Layers', href: '#collection/kids?cat=Girls Layers' },
          {
            label: 'Bottoms',
            href: '#collection/kids?cat=Girls Bottoms',
            children: [
              { label: 'Leggings', href: '#collection/kids?cat=Girls Leggings' },
              { label: 'Shorts', href: '#collection/kids?cat=Girls Shorts' },
              { label: 'Pants', href: '#collection/kids?cat=Girls Pants' },
              { label: 'Skirts', href: '#collection/kids?cat=Girls Skirts' },
            ]
          },
          { label: 'Footwear', href: '#collection/kids?cat=Girls Footwear' },
        ]
      },
      {
        label: 'Boys',
        href: '#collection/kids?cat=Boys',
        children: [
          { label: 'Shop All Boys', href: '#collection/kids?cat=Boys' },
          { label: 'Tops', href: '#collection/kids?cat=Boys Tops' },
          {
            label: 'Bottoms',
            href: '#collection/kids?cat=Boys Bottoms',
            children: [
              { label: 'Shorts', href: '#collection/kids?cat=Boys Shorts' },
              { label: 'Pants', href: '#collection/kids?cat=Boys Pants' },
              { label: 'Joggers', href: '#collection/kids?cat=Boys Joggers' },
            ]
          },
          { label: 'Outfits & Sets', href: '#collection/kids?cat=Boys Outfits & Sets' },
          { label: 'Layers', href: '#collection/kids?cat=Boys Layers' },
          { label: 'Overalls', href: '#collection/kids?cat=Boys Overalls' },
          { label: 'Footwear', href: '#collection/kids?cat=Boys Footwear' },
        ]
      },
      { label: 'Toys', href: '#collection/kids?cat=Toys' },
      {
        label: 'Nursery Furniture',
        href: '#collection/kids?cat=Nursery Furniture',
        children: [
          {
            label: 'Furniture',
            href: '#collection/kids?cat=Nursery Furniture',
            children: [
              { label: 'Cribs & Sleep Solutions', href: '#collection/kids?cat=Cribs & Sleep Solutions' },
              { label: 'Dressers & Changing Tables', href: '#collection/kids?cat=Dressers & Changing Tables' },
              { label: 'Side Tables & Nightstands', href: '#collection/kids?cat=Nursery Side Tables' },
            ]
          },
          {
            label: 'Storage & Organization',
            href: '#collection/kids?cat=Nursery Storage',
            children: [
              { label: 'Storage Units', href: '#collection/kids?cat=Nursery Storage Units' },
              { label: 'Storage Benches', href: '#collection/kids?cat=Nursery Storage Benches' },
              { label: 'Storage Ottomans', href: '#collection/kids?cat=Nursery Storage Ottomans' },
              { label: 'Shelving & Wall Storage', href: '#collection/kids?cat=Nursery Shelving' },
            ]
          },
          {
            label: 'Decor & Styling',
            href: '#collection/kids?cat=Nursery Decor',
            children: [
              { label: 'Nursery Decor', href: '#collection/kids?cat=Nursery Decor' },
              { label: 'Nursery Themes', href: '#collection/kids?cat=Nursery Themes' },
            ]
          },
        ]
      },
      {
        label: 'Playroom Furniture',
        href: '#collection/kids?cat=Playroom Furniture',
        children: [
          {
            label: 'Furniture',
            href: '#collection/kids?cat=Playroom Furniture',
            children: [
              { label: 'Tables & Seating', href: '#collection/kids?cat=Playroom Tables & Seating' },
              { label: 'Soft Play & Cozy Lounge', href: '#collection/kids?cat=Playroom Soft Play' },
              { label: 'Art & Activity Furniture', href: '#collection/kids?cat=Playroom Art Furniture' },
              { label: 'Pretend & Imaginative Play', href: '#collection/kids?cat=Playroom Pretend Play' },
            ]
          },
          {
            label: 'Storage & Organization',
            href: '#collection/kids?cat=Playroom Storage',
            children: [
              { label: 'Toy Storage & Organization', href: '#collection/kids?cat=Toy Storage' },
              { label: 'Shelving & Wall Storage', href: '#collection/kids?cat=Playroom Shelving' },
            ]
          },
        ]
      },
    ]
  },
  {
    label: 'The Mae Collective',
    href: '#collection/fashion',
    children: [
      { label: 'Shop All', href: '#collection/fashion' },
      {
        label: 'Dresses',
        href: '#collection/fashion?cat=Dresses',
        children: [
          { label: 'Everyday Dresses', href: '#collection/fashion?cat=Everyday Dresses' },
          { label: 'Formal Dresses', href: '#collection/fashion?cat=Formal Dresses' },
        ]
      },
      {
        label: 'Tops',
        href: '#collection/fashion?cat=Tops',
        children: [
          { label: 'Blouses', href: '#collection/fashion?cat=Blouses' },
          { label: 'Casual Tops', href: '#collection/fashion?cat=Casual Tops' },
        ]
      },
      {
        label: 'Bottoms',
        href: '#collection/fashion?cat=Bottoms',
        children: [
          { label: 'Pants', href: '#collection/fashion?cat=Pants' },
          { label: 'Skirts', href: '#collection/fashion?cat=Skirts' },
          { label: 'Denim', href: '#collection/fashion?cat=Denim' },
        ]
      },
      {
        label: 'Blazers & Layers',
        href: '#collection/fashion?cat=Blazers & Layers',
        children: [
          { label: 'Blazers', href: '#collection/fashion?cat=Blazers' },
          { label: 'Layers', href: '#collection/fashion?cat=Layers' },
        ]
      },
      {
        label: 'Active & Lounge',
        href: '#collection/fashion?cat=Active & Lounge',
        children: [
          { label: 'Active', href: '#collection/fashion?cat=Active' },
          { label: 'Lounge', href: '#collection/fashion?cat=Lounge' },
        ]
      },
      {
        label: 'Outfits & Sets',
        href: '#collection/fashion?cat=Outfits & Sets',
        children: [
          { label: 'Formal Outfits', href: '#collection/fashion?cat=Formal Outfits' },
          { label: 'Casual Sets', href: '#collection/fashion?cat=Casual Sets' },
        ]
      },
      { label: 'Vacation Edit', href: '#collection/fashion?cat=Vacation Edit' },
    ]
  },
  {
    label: 'Furniture',
    href: '#collection/furniture',
    children: [
      { label: 'Shop All', href: '#collection/furniture' },
      { label: 'Accent Chairs', href: '#collection/furniture?cat=Accent Chairs' },
      { label: 'Barstools', href: '#collection/furniture?cat=Barstools' },
      { label: 'Counterstools', href: '#collection/furniture?cat=Counterstools' },
      { label: 'Side Storage Cabinets', href: '#collection/furniture?cat=Side Storage Cabinets' },
      { label: 'Dining Chairs', href: '#collection/furniture?cat=Dining Chairs' },
      { label: 'Dining Tables', href: '#collection/furniture?cat=Dining Tables' },
      { label: 'Entryway Tables', href: '#collection/furniture?cat=Entryway Tables' },
      { label: 'Nightstands', href: '#collection/furniture?cat=Nightstands' },
      {
        label: 'Nursery Furniture',
        href: '#collection/furniture?cat=Nursery Furniture',
        children: [
          {
            label: 'Furniture',
            href: '#collection/furniture?cat=Nursery Furniture',
            children: [
              { label: 'Cribs & Sleep Solutions', href: '#collection/furniture?cat=Cribs & Sleep Solutions' },
              { label: 'Dressers & Changing Tables', href: '#collection/furniture?cat=Dressers & Changing Tables' },
              { label: 'Side Tables & Nightstands', href: '#collection/furniture?cat=Nursery Side Tables' },
            ]
          },
          {
            label: 'Storage & Organization',
            href: '#collection/furniture?cat=Nursery Storage',
            children: [
              { label: 'Storage Units', href: '#collection/furniture?cat=Nursery Storage Units' },
              { label: 'Storage Benches', href: '#collection/furniture?cat=Nursery Storage Benches' },
              { label: 'Storage Ottomans', href: '#collection/furniture?cat=Nursery Storage Ottomans' },
              { label: 'Shelving & Wall Storage', href: '#collection/furniture?cat=Nursery Shelving' },
            ]
          },
          {
            label: 'Decor & Styling',
            href: '#collection/furniture?cat=Nursery Decor',
            children: [
              { label: 'Nursery Decor', href: '#collection/furniture?cat=Nursery Decor' },
              { label: 'Nursery Themes', href: '#collection/furniture?cat=Nursery Themes' },
            ]
          },
        ]
      },
      {
        label: 'Playroom Furniture',
        href: '#collection/furniture?cat=Playroom Furniture',
        children: [
          {
            label: 'Furniture',
            href: '#collection/furniture?cat=Playroom Furniture',
            children: [
              { label: 'Tables & Seating', href: '#collection/furniture?cat=Playroom Tables & Seating' },
              { label: 'Soft Play & Cozy Lounge', href: '#collection/furniture?cat=Playroom Soft Play' },
              { label: 'Art & Activity Furniture', href: '#collection/furniture?cat=Playroom Art Furniture' },
              { label: 'Pretend & Imaginative Play', href: '#collection/furniture?cat=Playroom Pretend Play' },
            ]
          },
          {
            label: 'Storage & Organization',
            href: '#collection/furniture?cat=Playroom Storage',
            children: [
              { label: 'Toy Storage & Organization', href: '#collection/furniture?cat=Toy Storage' },
              { label: 'Shelving & Wall Storage', href: '#collection/furniture?cat=Playroom Shelving' },
            ]
          },
        ]
      },
    ]
  },
  {
    label: 'Home Decor',
    href: '#collection/decor',
    children: [
      { label: 'Shop All', href: '#collection/decor' },
      { label: 'Decor Items', href: '#collection/decor?cat=Decor Items' },
      { label: 'Table Lamps', href: '#collection/decor?cat=Table Lamps' },
      { label: 'Vases', href: '#collection/decor?cat=Vases' },
      { label: 'Floor Lamps', href: '#collection/decor?cat=Floor Lamps' },
      { label: 'Rugs', href: '#collection/decor?cat=Rugs' },
      { label: 'Accent Chairs', href: '#collection/furniture?cat=Accent Chairs' }, // Cross-link
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
      { id: 'accent-chairs', title: 'Accent Chairs', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?q=80&w=800', caption: 'Statement Pieces' },
      { id: 'barstools', title: 'Barstools', image: 'https://images.unsplash.com/photo-1594226372073-672ce3467332?q=80&w=800', caption: 'Kitchen Seating' },
      { id: 'counterstools', title: 'Counterstools', image: 'https://images.unsplash.com/photo-1594226372073-672ce3467332?q=80&w=800', caption: 'Counter Height' },
      { id: 'side-storage-cabinets', title: 'Side Storage Cabinets', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800', caption: 'Stylish Storage' },
      { id: 'dining-chairs', title: 'Dining Chairs', image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=800', caption: 'Dining Comfort' },
      { id: 'dining-tables', title: 'Dining Tables', image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=800', caption: 'Gather Together' },
      { id: 'entryway-tables', title: 'Entryway Tables', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800', caption: 'First Impressions' },
      { id: 'nightstands', title: 'Nightstands', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800', caption: 'Bedside Essentials' },
      { id: 'nursery-furniture', title: 'Nursery Furniture', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800', caption: 'For Little Ones', redirect: '#collection/kids?cat=Nursery Furniture' },
      { id: 'playroom-furniture', title: 'Playroom Furniture', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800', caption: 'Create & Explore', redirect: '#collection/kids?cat=Playroom Furniture' },
    ]
  },
  {
    id: 'decor',
    title: 'Home Decor',
    subtitle: 'The details that tell your story',
    heroImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=2000&auto=format&fit=crop',
    subcategories: [
      // Main Parent Category - triggers swimlane view when selected
      { id: 'home-decor', title: 'Home Decor', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800', caption: 'Curated Accents', isMainCategory: true },
      // Child Categories - displayed as swimlanes with product cards
      { id: 'decor-items', title: 'Decor Items', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800', caption: 'Curated Objects', parentCategory: 'Home Decor' },
      { id: 'table-lamps', title: 'Table Lamps', image: 'https://images.unsplash.com/photo-1513506003011-3b03c8b063ca?q=80&w=800', caption: 'Ambient Light', parentCategory: 'Home Decor' },
      { id: 'vases', title: 'Vases', image: 'https://images.unsplash.com/photo-1612196808214-b7e239e5f6b7?q=80&w=800', caption: 'Ceramic & Glass', parentCategory: 'Home Decor' },
      { id: 'floor-lamps', title: 'Floor Lamps', image: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?q=80&w=800', caption: 'Corner Brightening', parentCategory: 'Home Decor' },
      { id: 'rugs', title: 'Rugs', image: 'https://images.unsplash.com/photo-1599694239849-012b68328761?q=80&w=800', caption: 'Grounding Textures', parentCategory: 'Home Decor' },
      { id: 'accent-chairs', title: 'Accent Chairs', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?q=80&w=800', caption: 'Statement Seating', parentCategory: 'Home Decor' },
    ]
  },
  {
    id: 'fashion',
    title: 'The Mae Collective',
    subtitle: 'Effortless style for the modern woman',
    heroImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2000&auto=format&fit=crop',
    subcategories: [
      // Main Categories
      { id: 'dresses-main', title: 'Dresses', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800', caption: 'Effortless Elegance', isMainCategory: true },
      { id: 'tops-main', title: 'Tops', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800', caption: 'Everyday Essentials', isMainCategory: true },
      { id: 'bottoms-main', title: 'Bottoms', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800', caption: 'Perfect Fit', isMainCategory: true },
      { id: 'blazers-layers-main', title: 'Blazers & Layers', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800', caption: 'Polished Layers', isMainCategory: true },
      { id: 'active-lounge-main', title: 'Active & Lounge', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800', caption: 'Comfy Chic', isMainCategory: true },
      { id: 'outfits-sets-main', title: 'Outfits & Sets', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800', caption: 'Coordinated Style', isMainCategory: true },
      { id: 'vacation-edit', title: 'Vacation Edit', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800', caption: 'Travel in Style', isMainCategory: true },
      // Subcategories
      { id: 'everyday-dresses', title: 'Everyday Dresses', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800', caption: 'Daily Style', parentCategory: 'Dresses' },
      { id: 'formal-dresses', title: 'Formal Dresses', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800', caption: 'Special Occasions', parentCategory: 'Dresses' },
      { id: 'blouses', title: 'Blouses', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800', caption: 'Refined Style', parentCategory: 'Tops' },
      { id: 'casual-tops', title: 'Casual Tops', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800', caption: 'Easy Everyday', parentCategory: 'Tops' },
      { id: 'pants', title: 'Pants', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800', caption: 'Tailored Comfort', parentCategory: 'Bottoms' },
      { id: 'skirts', title: 'Skirts', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800', caption: 'Feminine Flow', parentCategory: 'Bottoms' },
      { id: 'denim', title: 'Denim', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800', caption: 'Classic & Versatile', parentCategory: 'Bottoms' },
      { id: 'blazers', title: 'Blazers', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800', caption: 'Power Pieces', parentCategory: 'Blazers & Layers' },
      { id: 'layers', title: 'Layers', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800', caption: 'Seasonal Essentials', parentCategory: 'Blazers & Layers' },
      { id: 'active', title: 'Active', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800', caption: 'Move Freely', parentCategory: 'Active & Lounge' },
      { id: 'lounge', title: 'Lounge', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800', caption: 'Relaxed Living', parentCategory: 'Active & Lounge' },
      { id: 'formal-outfits', title: 'Formal Outfits', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800', caption: 'Elevated Looks', parentCategory: 'Outfits & Sets' },
      { id: 'casual-sets', title: 'Casual Sets', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800', caption: 'Effortless Matching', parentCategory: 'Outfits & Sets' },
    ]
  },
  {
    id: 'kids',
    title: 'Louie Kids & Co.',
    subtitle: 'Heirloom quality for little ones',
    heroImage: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?q=80&w=2000&auto=format&fit=crop',
    subcategories: [
      // Main Categories (shown on collection landing)
      { id: 'girls', title: 'Girls', image: '/images/brand/girls-dress.png', caption: 'Little Ladies', isMainCategory: true },
      { id: 'boys', title: 'Boys', image: '/images/brand/boys-category.png', caption: 'Little Gentlemen', isMainCategory: true },
      { id: 'toys', title: 'Toys', image: '/images/brand/toys-category.png', caption: 'Play & Learn', isMainCategory: true },
      { id: 'nursery-furniture', title: 'Nursery Furniture', image: '/images/brand/nursery-category.png', caption: 'The Dreamiest Space', isMainCategory: true },
      { id: 'playroom-furniture', title: 'Playroom Furniture', image: '/images/brand/playroom-scene-v2.png', caption: 'Create & Explore', isMainCategory: true },

      // Girls Subcategories
      { id: 'girls-dresses', title: 'Girls Dresses', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Pretty Dresses', parentCategory: 'Girls' },
      { id: 'girls-outfits-sets', title: 'Girls Outfits & Sets', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Coordinated Looks', parentCategory: 'Girls' },
      { id: 'girls-rompers', title: 'Girls Rompers', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Playful Style', parentCategory: 'Girls' },
      { id: 'girls-tops', title: 'Girls Tops', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Cute Tops', parentCategory: 'Girls' },
      { id: 'girls-layers', title: 'Girls Layers', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Sweet Layers', parentCategory: 'Girls' },
      { id: 'girls-bottoms', title: 'Girls Bottoms', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Comfy Bottoms', parentCategory: 'Girls' },
      { id: 'girls-leggings', title: 'Girls Leggings', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Stretchy Fun', parentCategory: 'Girls' },
      { id: 'girls-shorts', title: 'Girls Shorts', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Summer Ready', parentCategory: 'Girls' },
      { id: 'girls-pants', title: 'Girls Pants', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Everyday Pants', parentCategory: 'Girls' },
      { id: 'girls-skirts', title: 'Girls Skirts', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Twirly Skirts', parentCategory: 'Girls' },
      { id: 'girls-footwear', title: 'Girls Footwear', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?q=80&w=800', caption: 'Little Steps', parentCategory: 'Girls' },

      // Boys Subcategories
      { id: 'boys-tops', title: 'Boys Tops', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', caption: 'Cool Tops', parentCategory: 'Boys' },
      { id: 'boys-bottoms', title: 'Boys Bottoms', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', caption: 'Comfy Bottoms', parentCategory: 'Boys' },
      { id: 'boys-shorts', title: 'Boys Shorts', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', caption: 'Active Shorts', parentCategory: 'Boys' },
      { id: 'boys-pants', title: 'Boys Pants', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', caption: 'Sturdy Pants', parentCategory: 'Boys' },
      { id: 'boys-joggers', title: 'Boys Joggers', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', caption: 'Comfy Joggers', parentCategory: 'Boys' },
      { id: 'boys-outfits-sets', title: 'Boys Outfits & Sets', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', caption: 'Matching Sets', parentCategory: 'Boys' },
      { id: 'boys-layers', title: 'Boys Layers', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', caption: 'Layered Up', parentCategory: 'Boys' },
      { id: 'boys-overalls', title: 'Boys Overalls', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', caption: 'Classic Overalls', parentCategory: 'Boys' },
      { id: 'boys-footwear', title: 'Boys Footwear', image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800', caption: 'Little Steps', parentCategory: 'Boys' },

      // Nursery Furniture Subcategories
      { id: 'cribs-sleep', title: 'Cribs & Sleep Solutions', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800', caption: 'Sweet Dreams', parentCategory: 'Nursery Furniture' },
      { id: 'dressers-changing', title: 'Dressers & Changing Tables', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800', caption: 'Organized Nursery', parentCategory: 'Nursery Furniture' },
      { id: 'nursery-side-tables', title: 'Nursery Side Tables', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800', caption: 'Bedside Essentials', parentCategory: 'Nursery Furniture' },
      { id: 'nursery-storage', title: 'Nursery Storage', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800', caption: 'Organized Space', parentCategory: 'Nursery Furniture' },
      { id: 'nursery-decor', title: 'Nursery Decor', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800', caption: 'Sweet Details', parentCategory: 'Nursery Furniture' },
      { id: 'nursery-themes', title: 'Nursery Themes', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800', caption: 'Theme Inspiration', parentCategory: 'Nursery Furniture' },

      // Playroom Furniture Subcategories
      { id: 'playroom-tables-seating', title: 'Playroom Tables & Seating', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800', caption: 'Activity Stations', parentCategory: 'Playroom Furniture' },
      { id: 'playroom-soft-play', title: 'Playroom Soft Play', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800', caption: 'Cozy Corners', parentCategory: 'Playroom Furniture' },
      { id: 'playroom-art-furniture', title: 'Playroom Art Furniture', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800', caption: 'Creative Spaces', parentCategory: 'Playroom Furniture' },
      { id: 'playroom-pretend-play', title: 'Playroom Pretend Play', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800', caption: 'Imaginary Worlds', parentCategory: 'Playroom Furniture' },
      { id: 'toy-storage', title: 'Toy Storage', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800', caption: 'Organized Play', parentCategory: 'Playroom Furniture' },
      { id: 'playroom-shelving', title: 'Playroom Shelving', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800', caption: 'Wall Storage', parentCategory: 'Playroom Furniture' },
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
      furniture: "/images/brand/hero-living-organic.png",
      decor: "/images/brand/rustic-bench.png",
      fashion: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop",
      kids: "/images/brand/kids-category.png",
      journal: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1000&auto=format&fit=crop"
    },
    brand: {
      image: "/images/brand/hero-dining-wide.png"
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
