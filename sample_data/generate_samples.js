const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Generate Category Sample
function generateCategorySample() {
  console.log('Generating category sample file...');
  
  // Sample categories (parents first, then subcategories)
  const categories = [
    {
      name: 'Electronics',
      description: 'Electronic devices and gadgets',
      parentId: '' // Empty means it's a top-level category
    },
    {
      name: 'Clothing',
      description: 'Apparel and fashion items',
      parentId: ''
    },
    {
      name: 'Home & Kitchen',
      description: 'Home appliances and kitchenware',
      parentId: ''
    },
    {
      name: 'Books',
      description: 'Books and printed media',
      parentId: ''
    },
    // Subcategories
    {
      name: 'Smartphones',
      description: 'Mobile phones and accessories',
      parentId: 'ELECTRONICS_ID' // Replace with actual ID after import
    },
    {
      name: 'Laptops',
      description: 'Portable computers and accessories',
      parentId: 'ELECTRONICS_ID' // Replace with actual ID after import
    },
    {
      name: 'Men\'s Clothing',
      description: 'Clothing for men',
      parentId: 'CLOTHING_ID' // Replace with actual ID after import
    },
    {
      name: 'Women\'s Clothing',
      description: 'Clothing for women',
      parentId: 'CLOTHING_ID' // Replace with actual ID after import
    },
    {
      name: 'Cookware',
      description: 'Pots, pans, and cooking utensils',
      parentId: 'HOME_KITCHEN_ID' // Replace with actual ID after import
    },
    {
      name: 'Fiction',
      description: 'Fictional books and novels',
      parentId: 'BOOKS_ID' // Replace with actual ID after import
    }
  ];

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(categories);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories');
  
  // Write to file
  XLSX.writeFile(workbook, path.join(__dirname, 'sample_categories.xlsx'));
  console.log('Category sample file created: sample_categories.xlsx');
}

// Generate Product Sample
function generateProductSample() {
  console.log('Generating product sample file...');
  
  // Sample products
  const products = [
    {
      name: 'iPhone 14 Pro',
      description: 'Latest Apple iPhone with advanced features',
      price: 999,
      stock: 50,
      category: 'ELECTRONICS_ID', // Replace with actual ID after import
      subcategory: 'SMARTPHONES_ID', // Replace with actual ID after import
      discountPrice: 949,
      features: 'A16 Bionic Chip,Dynamic Island,48MP Camera',
      specifications: 'Color:Midnight,Storage:128GB,Display:6.1 inch'
    },
    {
      name: 'MacBook Air M2',
      description: 'Ultra-thin laptop with Apple M2 chip',
      price: 1199,
      stock: 30,
      category: 'ELECTRONICS_ID', // Replace with actual ID after import
      subcategory: 'LAPTOPS_ID', // Replace with actual ID after import
      discountPrice: 1099,
      features: 'M2 Chip,13.6-inch Display,MagSafe Charging',
      specifications: 'Color:Silver,RAM:8GB,Storage:256GB'
    },
    {
      name: 'Men\'s Casual Shirt',
      description: 'Comfortable cotton casual shirt for men',
      price: 49.99,
      stock: 100,
      category: 'CLOTHING_ID', // Replace with actual ID after import
      subcategory: 'MENS_CLOTHING_ID', // Replace with actual ID after import
      discountPrice: 39.99,
      features: 'Cotton,Button-down,Machine Washable',
      specifications: 'Color:Blue,Size:Medium,Material:100% Cotton'
    },
    {
      name: 'Women\'s Summer Dress',
      description: 'Lightweight summer dress for women',
      price: 59.99,
      stock: 80,
      category: 'CLOTHING_ID', // Replace with actual ID after import
      subcategory: 'WOMENS_CLOTHING_ID', // Replace with actual ID after import
      discountPrice: 49.99,
      features: 'Floral Pattern,Sleeveless,Adjustable Straps',
      specifications: 'Color:White,Size:Small,Material:Polyester'
    },
    {
      name: 'Non-stick Frying Pan',
      description: 'Premium non-stick frying pan for everyday cooking',
      price: 34.99,
      stock: 60,
      category: 'HOME_KITCHEN_ID', // Replace with actual ID after import
      subcategory: 'COOKWARE_ID', // Replace with actual ID after import
      discountPrice: 29.99,
      features: 'Non-stick,Dishwasher Safe,Ergonomic Handle',
      specifications: 'Size:10 inch,Material:Aluminum,Induction Compatible:Yes'
    },
    {
      name: 'The Great Gatsby',
      description: 'Classic novel by F. Scott Fitzgerald',
      price: 12.99,
      stock: 200,
      category: 'BOOKS_ID', // Replace with actual ID after import
      subcategory: 'FICTION_ID', // Replace with actual ID after import
      discountPrice: 9.99,
      features: 'Paperback,Classic Novel,Annotated Edition',
      specifications: 'Author:F. Scott Fitzgerald,Pages:180,Language:English'
    }
  ];

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(products);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  
  // Write to file
  XLSX.writeFile(workbook, path.join(__dirname, 'sample_products.xlsx'));
  console.log('Product sample file created: sample_products.xlsx');
}

// Generate both samples
generateCategorySample();
generateProductSample();

console.log('\nIMPORTANT INSTRUCTIONS:');
console.log('1. First upload the category sample file through the bulk upload feature');
console.log('2. After uploading categories, note the IDs of each category');
console.log('3. Update the product sample file with the correct category and subcategory IDs');
console.log('4. Then upload the updated product sample file'); 