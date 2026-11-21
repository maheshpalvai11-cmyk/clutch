/**
 * Curated high-resolution food image catalog with intelligent keyword matching.
 * Caches image matches and prevents broken URLs or web scraping.
 */

interface FoodImageCatalogItem {
  keywords: string[];
  url: string;
}

const FOOD_IMAGE_CATALOG: FoodImageCatalogItem[] = [
  {
    keywords: ['chicken biryani', 'chicken briyani', 'hyderabadi biryani', 'murgh biryani'],
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['veg biryani', 'veg briyani', 'vegetable biryani', 'paneer biryani'],
    url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['mutton biryani', 'dum biryani', 'biryani', 'briyani'],
    url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['chicken fried rice', 'fried rice chicken', 'schezwan chicken rice'],
    url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['veg fried rice', 'fried rice', 'schezwan rice', 'egg fried rice', 'rice'],
    url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['chicken noodles', 'hakka noodles', 'schezwan noodles', 'chowmein', 'noodles', 'maggi'],
    url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['paneer butter masala', 'paneer tikka masala', 'shahi paneer', 'kadai paneer', 'paneer', 'palak paneer'],
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['butter chicken', 'chicken curry', 'chicken tikka masala', 'kadai chicken', 'chicken masala'],
    url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['meals', 'thali', 'south indian meals', 'veg meals', 'sambar rice'],
    url: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['burger', 'chicken burger', 'cheeseburger', 'veg burger', 'crispy burger'],
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['pizza', 'margherita', 'pepperoni', 'cheese pizza'],
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['sandwich', 'grilled sandwich', 'club sandwich', 'paneer sandwich', 'toast'],
    url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['shawarma', 'chicken shawarma', 'roll', 'kathi roll', 'wrap', 'frankie'],
    url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['parotta', 'paratha', 'naan', 'roti', 'chapati'],
    url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['dosa', 'masala dosa', 'ghee roast', 'idli', 'vada'],
    url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['samosa', 'pakora', 'cutlet', 'french fries', 'fries', 'snack'],
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['cold coffee', 'iced coffee', 'frappe', 'milkshake', 'shake', 'chocolate shake'],
    url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['tea', 'chai', 'hot coffee', 'cappuccino', 'latte', 'espresso'],
    url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['lime soda', 'mojito', 'juice', 'fresh juice', 'orange juice', 'lemonade', 'cooler'],
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['ice cream', 'dessert', 'brownie', 'gulab jamun', 'pastry', 'cake'],
    url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['chicken 65', 'chilli chicken', 'crispy chicken', 'wings'],
    url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80',
  },
];

// Fallback appetizing food platter image
export const DEFAULT_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80';

// In-memory cache for fast repeated lookups
const imageCache = new Map<string, string>();

/**
 * Automatically finds a suitable high-resolution food image based on the food name.
 * Normalizes input, matches against the curated catalog keywords, and returns a verified URL.
 */
export function getFoodImage(foodName: string): string {
  if (!foodName || !foodName.trim()) {
    return DEFAULT_FOOD_IMAGE;
  }

  const query = foodName.trim().toLowerCase();

  if (imageCache.has(query)) {
    return imageCache.get(query)!;
  }

  // 1. Try exact keyword match first
  for (const item of FOOD_IMAGE_CATALOG) {
    for (const kw of item.keywords) {
      if (query === kw) {
        imageCache.set(query, item.url);
        return item.url;
      }
    }
  }

  // 2. Try phrase containment (e.g. "Chicken Biryani (Spicy)" contains "chicken biryani")
  for (const item of FOOD_IMAGE_CATALOG) {
    for (const kw of item.keywords) {
      if (query.includes(kw)) {
        imageCache.set(query, item.url);
        return item.url;
      }
    }
  }

  // 3. Try individual words match
  const words = query.split(/\s+/).filter((w) => w.length > 2);
  for (const word of words) {
    for (const item of FOOD_IMAGE_CATALOG) {
      for (const kw of item.keywords) {
        if (kw.split(/\s+/).includes(word)) {
          imageCache.set(query, item.url);
          return item.url;
        }
      }
    }
  }

  // 4. Fallback default image
  imageCache.set(query, DEFAULT_FOOD_IMAGE);
  return DEFAULT_FOOD_IMAGE;
}
