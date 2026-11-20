import fs from 'node:fs/promises';
import path from 'node:path';
const dir = path.resolve('backend/src/main/resources/static/media/catalog');
await fs.mkdir(dir, { recursive: true });
const products = [
  {
    sku: 'NV-MON-27',
    name: 'View 27” 4K Monitor',
    category: 'Monitors',
    price: 329,
    compareAtPrice: 399,
    stock: 36,
    featured: true,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1000&q=85&fit=crop',
    specifications:
      'Display: 27-inch IPS, 3840 × 2160|Refresh rate: 60 Hz|Connectivity: USB-C, HDMI, DisplayPort|Finish: Silver',
    description:
      'A sharper perspective on your everyday work. A spacious 4K display, natural colors, and a single USB-C connection keep your desk focused.',
  },
  {
    sku: 'NV-AUD-MAX',
    name: 'Apple AirPods Max',
    category: 'Audio',
    price: 449,
    compareAtPrice: 549,
    stock: 28,
    featured: true,
    dummy: 101,
    specifications:
      'Audio: Active noise cancellation|Battery: Up to 20 hours|Connectivity: Bluetooth|Finish: Silver',
    description:
      'Over-ear listening with immersive sound, a comfortable knit-mesh canopy, and active noise cancellation. Make a little room for your favorite music.',
  },
  {
    sku: 'NV-KEY-75',
    name: 'Form Mechanical Keyboard',
    category: 'Keyboards',
    price: 129,
    compareAtPrice: 159,
    stock: 8,
    featured: true,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900&q=85&fit=crop',
    specifications:
      'Layout: Compact 75%|Switches: Tactile, hot-swappable|Connection: USB-C and Bluetooth|Battery: 4,000 mAh',
    description:
      'A satisfying tactile feel in a compact layout. Switch between your laptop and desktop, and make every keystroke part of a better working day.',
  },
  {
    sku: 'NV-MSE-01',
    name: 'Arc Wireless Mouse',
    category: 'Mice',
    price: 69,
    compareAtPrice: 89,
    stock: 52,
    featured: true,
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=900&q=85&fit=crop',
    specifications:
      'Sensor: 4,000 DPI optical|Connection: Bluetooth and USB receiver|Battery: Rechargeable USB-C|Weight: 95 g',
    description:
      'Precise tracking, a sculpted profile, and quiet clicks. A wireless mouse designed to move easily between the workday and everything after.',
  },
  {
    sku: 'NV-LAP-MBP14',
    name: 'MacBook Pro 14”',
    category: 'Laptops',
    price: 1599,
    compareAtPrice: 1799,
    stock: 18,
    featured: true,
    dummy: 78,
    specifications:
      'Display: 14.2-inch Liquid Retina XDR|Memory: 16 GB|Storage: 512 GB SSD|Finish: Space gray',
    description:
      'A capable creative companion with a detailed Retina display, responsive performance, and a generous battery. Built for projects that deserve your full attention.',
  },
  {
    sku: 'NV-LAP-XPS13',
    name: 'Dell XPS 13',
    category: 'Laptops',
    price: 1099,
    compareAtPrice: 1299,
    stock: 15,
    featured: false,
    dummy: 82,
    specifications: 'Display: 13.4-inch FHD+|Memory: 16 GB|Storage: 512 GB SSD|Weight: 1.2 kg',
    description:
      'An edge-to-edge display in a remarkably portable aluminum body. The XPS 13 keeps a full workday light, whether you are at your desk or on the move.',
  },
  {
    sku: 'NV-AUD-PODS',
    name: 'Apple AirPods',
    category: 'Audio',
    price: 129,
    compareAtPrice: 149,
    stock: 45,
    featured: false,
    dummy: 100,
    specifications: 'Fit: In-ear wireless|Case: Charging case included|Connectivity: Bluetooth|Finish: White',
    description:
      'Easy everyday listening with a pocket-sized charging case. Pair quickly, take a call, and get back to the music.',
  },
  {
    sku: 'NV-AUD-FLEX',
    name: 'Beats Flex',
    category: 'Audio',
    price: 49,
    compareAtPrice: 69,
    stock: 6,
    featured: false,
    dummy: 107,
    specifications: 'Design: Magnetic earbuds|Battery: Up to 12 hours|Charging: USB-C|Connection: Bluetooth',
    description:
      'Lightweight wireless earphones with a flexible neckband and magnetic earbuds. Made for the commute, a quick walk, and the rest of your day.',
  },
  {
    sku: 'NV-ACC-HOME',
    name: 'HomePod mini',
    category: 'Accessories',
    price: 99,
    compareAtPrice: null,
    stock: 32,
    featured: false,
    dummy: 103,
    specifications:
      'Audio: 360-degree sound|Connectivity: Wi-Fi and Bluetooth|Size: 8.4 cm tall|Finish: Space gray',
    description:
      'Room-filling audio in a compact form. A small speaker that brings music, podcasts, and a little more atmosphere to your desk.',
  },
  {
    sku: 'NV-ACC-CHG',
    name: 'USB-C Power Adapter',
    category: 'Accessories',
    price: 29,
    compareAtPrice: null,
    stock: 65,
    featured: false,
    dummy: 104,
    specifications: 'Power: 20 W|Port: USB-C|Input: 100–240 V|Cable: Sold separately',
    description:
      'A compact adapter for your daily charging routine. Keep one in your bag and another at your desk.',
  },
  {
    sku: 'NV-LAP-YOGA',
    name: 'Lenovo Yoga 920',
    category: 'Laptops',
    price: 899,
    compareAtPrice: 1099,
    stock: 4,
    featured: false,
    dummy: 81,
    specifications: 'Display: 13.9-inch touch|Memory: 16 GB|Storage: 512 GB SSD|Design: Convertible hinge',
    description:
      'A flexible notebook for notes, presentations, and the occasional change of perspective. Fold the touchscreen into the position that suits your work.',
  },
  {
    sku: 'NV-TAB-MINI',
    name: 'iPad mini',
    category: 'Accessories',
    price: 399,
    compareAtPrice: 499,
    stock: 24,
    featured: false,
    dummy: 159,
    specifications: 'Display: 8.3-inch Liquid Retina|Storage: 64 GB|Connectivity: Wi-Fi|Finish: Starlight',
    description:
      'Ideas travel well. A crisp, compact tablet for reading, sketching, and keeping your next project within reach.',
  },
];
const credits = [];
await Promise.all(
  products.map(async (p, index) => {
    let urls;
    if (p.dummy) {
      const response = await fetch(`https://dummyjson.com/products/${p.dummy}`);
      if (!response.ok) throw Error(response.status);
      const data = await response.json();
      urls = data.images.slice(0, 3);
      credits.push(
        `${p.name}: DummyJSON product image fixtures, https://dummyjson.com/products/${p.dummy}. Demonstration use; verify product-image rights before commercial deployment.`,
      );
    } else {
      urls = [p.image];
      credits.push(
        `${p.name}: ${p.image} (Unsplash demonstration photography; illustrative product styling).`,
      );
    }
    p.images = [];
    for (let i = 0; i < urls.length; i++) {
      const response = await fetch(urls[i]);
      if (!response.ok) throw Error(`${urls[i]}: ${response.status}`);
      const ext = urls[i].includes('.webp') ? 'webp' : 'jpg';
      const name = `${p.sku.toLowerCase()}-${i}.${ext}`;
      await fs.writeFile(path.join(dir, name), Buffer.from(await response.arrayBuffer()));
      p.images.push(`/media/catalog/${name}`);
    }
    p.sortOrder = index;
    delete p.image;
    delete p.dummy;
  }),
);
const hero = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&q=90&fit=crop';
const response = await fetch(hero);
if (!response.ok) throw Error('Hero image unavailable');
await fs.writeFile(path.join(dir, 'workspace.jpg'), Buffer.from(await response.arrayBuffer()));
credits.push(`Workspace hero: ${hero}, Unsplash. Displayed as an illustrative workspace.`);
await fs.writeFile('backend/src/main/resources/catalog-seed.json', JSON.stringify(products, null, 2));
await fs.writeFile(
  'docs/ASSETS.md',
  '# Demo imagery\n\nAll photographs are served locally. Photos illustrate a fictional electronics retailer; specifications and prices are demonstration merchandising data. Replace or license brand imagery for public commercial use.\n\n' +
    credits.map((x) => '- ' + x).join('\n') +
    '\n\nDM Sans font: Google Fonts / Fontsource, SIL Open Font License. Lucide icons: ISC license.\n',
);
console.log(`Saved ${products.length} products and local photography.`);
