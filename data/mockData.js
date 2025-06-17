export const categoryData = [
  { name: 'Health_Wellness', code: 'HEA', subCategories: ['Herbal Extracts & Supplements', 'Beauty & Health Devices', 'General Health & Supplements'] },
  { name: 'Food_Beverages', code: 'FOO / BEV / MFO / MEI', subCategories: ['Subcategory 1', 'Subcategory 2'] },
  { name: 'Fashion_Lifestyle', code: 'FAS', subCategories: ['Subcategory A', 'Subcategory B'] },
  { name: 'Electronics_Gadgets', code: 'ELE', subCategories: [] },
  { name: 'Tech_Communication', code: 'TEC', subCategories: [] },
  { name: 'Personal Care_Grooming', code: 'PER / COS', subCategories: [] },
  { name: 'Kids\' Essentials', code: 'KID', subCategories: [] },
  { name: 'Outdoor, Sports_Leisure', code: 'OUT / SPO', subCategories: [] },
  { name: 'Cabin Care_Home Comforts', code: 'CLC', subCategories: [] },
  { name: 'Korean Souvenirs_Gifts', code: 'GIF', subCategories: [] },
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
  { id: 1, name: 'device1', price: 129.99, discount: 30, image: '/images/device1.jpeg', slug: 'device1-product-slug' },
  { id: 2, name: 'device2', price: 98.99, discount: 30, image: '/images/device2.jpeg', slug: 'device2-product-slug' },
  { id: 3, name: 'device3', price: 59.99, discount: 30, image: '/images/device3.jpeg', slug: 'device3-product-slug' },
  { id: 4, name: 'device4', price: 189.99, discount: 30, image: '/images/device4.jpeg', slug: 'device4-product-slug' },
];

export const generals = [
  { id: 1, name: 'general1', price: 129.99, discount: 30, image: '/images/general1.jpeg', slug: 'general1-product-slug' },
  { id: 2, name: 'general2', price: 98.99, discount: 30, image: '/images/general2.jpeg', slug: 'general2-product-slug' },
  { id: 3, name: 'general3', price: 59.99, discount: 30, image: '/images/general3.jpeg', slug: 'general3-product-slug' },
  { id: 4, name: 'general4', price: 189.99, discount: 30, image: '/images/general4.jpeg', slug: 'general4-product-slug' },
];