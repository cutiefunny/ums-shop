export const categoryData = [
  { name: 'health-wellness', code: 'HEA', subCategories: ['Herbal Extracts & Supplements', 'Beauty & Health Devices', 'General Health & Supplements'] },
  { name: 'food-beverages', code: 'FOO / BEV / MFO / MEI', subCategories: ['Subcategory 1', 'Subcategory 2'] },
  { name: 'fashion-lifestyle', code: 'FAS', subCategories: ['Subcategory A', 'Subcategory B'] },
  { name: 'electronics-gadgets', code: 'ELE', subCategories: [] },
  { name: 'tech-communication', code: 'TEC', subCategories: [] },
  { name: 'personal-care-grooming', code: 'PER / COS', subCategories: [] },
  { name: 'kids-essentials', code: 'KID', subCategories: [] },
  { name: 'outdoor-sports-leisure', code: 'OUT / SPO', subCategories: [] },
  { name: 'cabin-care-home-comforts', code: 'CLC', subCategories: [] },
  { name: 'korean-souvenirs-gifts', code: 'GIF', subCategories: [] },
];

// 텍스트를 URL slug 형식으로 변환하는 헬퍼 함수
export const slugify = (text) => text.toLowerCase().replace(/ & /g, ' ').replace(/_/g, ' ').replace(/\s+/g, '-');

export const mockProducts = [
  { id: 1, name: 'set1', price: 129.99, discount: 30, image: '/images/placeholder1.jpeg', slug: 'set1-product-slug' },
  { id: 2, name: 'set2', price: 98.99, discount: 30, image: '/images/placeholder2.jpeg', slug: 'set2-product-slug' },
  { id: 3, name: 'set3', price: 59.99, discount: 30, image: '/images/placeholder3.jpeg', slug: 'set3-product-slug' },
  { id: 4, name: 'set4', price: 189.99, discount: 30, image: '/images/placeholder4.jpeg', slug: 'set4-product-slug' },
];

export const devices = [
  { id: 101, name: 'device1', price: 129.99, discount: 30, image: '/images/device1.jpeg', slug: 'device1-product-slug' },
  { id: 102, name: 'device2', price: 98.99, discount: 30, image: '/images/device2.jpeg', slug: 'device2-product-slug' },
  { id: 103, name: 'device3', price: 59.99, discount: 30, image: '/images/device3.jpeg', slug: 'device3-product-slug' },
  { id: 104, name: 'device4', price: 189.99, discount: 30, image: '/images/device4.jpeg', slug: 'device4-product-slug' },
];

export const generals = [
  { id: 201, name: 'general1', price: 129.99, discount: 30, image: '/images/general1.jpeg', slug: 'general1-product-slug' },
  { id: 202, name: 'general2', price: 98.99, discount: 30, image: '/images/general2.jpeg', slug: 'general2-product-slug' },
  { id: 203, name: 'general3', price: 59.99, discount: 30, image: '/images/general3.jpeg', slug: 'general3-product-slug' },
  { id: 204, name: 'general4', price: 189.99, discount: 30, image: '/images/general4.jpeg', slug: 'general4-product-slug' },
];

export const wishlist = [
  1, 3, 102
];