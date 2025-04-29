const XLSX = require('xlsx');

// Fruit product data
const fruits = [
  'Apple', 'Banana', 'Orange', 'Strawberry', 'Blueberry', 
  'Raspberry', 'Blackberry', 'Mango', 'Pineapple', 'Watermelon',
  'Kiwi', 'Grape', 'Cherry', 'Peach', 'Pear', 
  'Plum', 'Apricot', 'Nectarine', 'Pomegranate', 'Fig',
  'Papaya', 'Guava', 'Lychee', 'Dragonfruit', 'Passion Fruit',
  'Avocado', 'Coconut', 'Lemon', 'Lime', 'Grapefruit',
  'Mandarin', 'Tangerine', 'Clementine', 'Cantaloupe', 'Honeydew',
  'Starfruit', 'Persimmon', 'Date', 'Jackfruit', 'Rambutan',
  'Durian', 'Mangosteen', 'Kiwano', 'Tamarind', 'Quince',
  'Kumquat', 'Elderberry', 'Cranberry', 'Gooseberry', 'Currant'
];

// Category ID for fruits - this should match a valid category ID in your Firestore database
const fruitCategoryId = "3eohzRkyZgqC6HOSXl74"; // Replace with actual fruits category ID

// Generate product data
const products = fruits.map((fruit, index) => {
  const price = Math.floor(Math.random() * 150) + 50; // Random price between 50 and 200
  const discountPrice = Math.random() > 0.3 ? Math.floor(price * 0.85) : null; // 70% chance of having discount
  const stock = Math.floor(Math.random() * 100) + 10; // Random stock between 10 and 110
  
  // Generate random features
  const features = [];
  const allFeatures = ['Organic', 'Fresh', 'Imported', 'Local', 'Sweet', 'Sour', 'Juicy', 'Ripe', 'Hand-picked', 'Natural'];
  const featureCount = Math.floor(Math.random() * 4) + 2; // 2-5 features
  
  for (let i = 0; i < featureCount; i++) {
    const randomFeature = allFeatures[Math.floor(Math.random() * allFeatures.length)];
    if (!features.includes(randomFeature)) {
      features.push(randomFeature);
    }
  }
  
  // Generate random specifications
  const specOptions = {
    'Origin': ['USA', 'Mexico', 'Brazil', 'Spain', 'Italy', 'India', 'China', 'Thailand', 'Australia', 'South Africa'],
    'Storage': ['Room temperature', 'Refrigerated', 'Cool dry place'],
    'Taste': ['Sweet', 'Sour', 'Tangy', 'Mild', 'Rich'],
    'Packaging': ['Box', 'Bag', 'Plastic container', 'Loose'],
    'Color': ['Red', 'Yellow', 'Green', 'Orange', 'Purple', 'Blue', 'Pink', 'Brown', 'White']
  };
  
  const specs = {};
  const specKeys = Object.keys(specOptions);
  const specCount = Math.floor(Math.random() * 3) + 2; // 2-4 specs
  
  for (let i = 0; i < specCount; i++) {
    const randomKey = specKeys[Math.floor(Math.random() * specKeys.length)];
    if (!specs[randomKey]) {
      const valueOptions = specOptions[randomKey];
      specs[randomKey] = valueOptions[Math.floor(Math.random() * valueOptions.length)];
    }
  }
  
  // Format specs as string for Excel
  const specsString = Object.entries(specs)
    .map(([key, value]) => `${key}:${value}`)
    .join(',');
  
  return {
    name: fruit,
    description: `Fresh, high-quality ${fruit.toLowerCase()} sourced from the best farms. Our ${fruit.toLowerCase()} is carefully selected to ensure the best flavor, texture, and nutritional value. Perfect for snacking, cooking, or adding to your favorite recipes.`,
    price: price,
    stock: stock,
    category: fruitCategoryId,
    subcategory: '',
    discountPrice: discountPrice,
    features: features.join(','),
    specifications: specsString
  };
});

// Create Excel workbook
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(products);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Fruit Products');

// Save to file
XLSX.writeFile(workbook, 'fruit-products.xlsx');

console.log('Generated Excel file with 50 fruit products: fruit-products.xlsx'); 