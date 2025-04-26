import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './firebase';
import { Product, Store, Order, User, Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Products

export async function getProducts(storeId?: string) {
  let productsQuery;
  if (storeId) {
    productsQuery = query(
      collection(db, 'products'),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    );
  } else {
    productsQuery = query(
      collection(db, 'products'),
      orderBy('createdAt', 'desc')
    );
  }
  
  const snapshot = await getDocs(productsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Product[];
}

export async function getProduct(productId: string) {
  const docRef = doc(db, 'products', productId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error(`Product with ID ${productId} not found`);
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data()
  } as Product;
}

export async function createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const newProduct = {
    ...product,
    createdAt: now,
    updatedAt: now
  };
  
  const docRef = await addDoc(collection(db, 'products'), newProduct);
  return {
    id: docRef.id,
    ...newProduct
  } as Product;
}

export async function updateProduct(productId: string, updatedData: Partial<Omit<Product, 'id' | 'createdAt'>>) {
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, {
    ...updatedData,
    updatedAt: new Date().toISOString()
  });
  
  return getProduct(productId);
}

export async function deleteProduct(productId: string) {
  const productRef = doc(db, 'products', productId);
  await deleteDoc(productRef);
  return true;
}

// Upload images

export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const extension = file.name.split('.').pop();
  const fileName = `${productId}/${uuidv4()}.${extension}`;
  const storageRef = ref(storage, `products/${fileName}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
}

// Orders

export async function getOrders(storeId?: string) {
  let ordersQuery;
  if (storeId) {
    ordersQuery = query(
      collection(db, 'orders'),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    );
  } else {
    ordersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );
  }
  
  const snapshot = await getDocs(ordersQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Order[];
}

export async function getOrder(orderId: string) {
  const docRef = doc(db, 'orders', orderId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error(`Order with ID ${orderId} not found`);
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data()
  } as Order;
}

export async function updateOrderStatus(orderId: string, status: Order['status']) {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    status,
    updatedAt: new Date().toISOString()
  });
  
  return getOrder(orderId);
}

// Stores

export async function getStores() {
  const storesQuery = query(
    collection(db, 'stores'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(storesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Store[];
}

export async function getStore(storeId: string) {
  const docRef = doc(db, 'stores', storeId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error(`Store with ID ${storeId} not found`);
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data()
  } as Store;
}

export async function createStore(store: Omit<Store, 'id' | 'createdAt' | 'isVerified' | 'rating'>) {
  const newStore = {
    ...store,
    isVerified: false,
    rating: 0,
    createdAt: new Date().toISOString()
  };
  
  const docRef = await addDoc(collection(db, 'stores'), newStore);
  
  // Update the user with the store ID
  const userRef = doc(db, 'users', store.ownerId);
  await updateDoc(userRef, {
    storeId: docRef.id
  });
  
  return {
    id: docRef.id,
    ...newStore
  } as Store;
}

export async function updateStore(storeId: string, updatedData: Partial<Omit<Store, 'id' | 'createdAt'>>) {
  const storeRef = doc(db, 'stores', storeId);
  await updateDoc(storeRef, updatedData);
  
  return getStore(storeId);
}

// Users

export async function getUsers(role?: User['role']) {
  let usersQuery;
  
  if (role) {
    usersQuery = query(
      collection(db, 'users'),
      where('role', '==', role)
    );
  } else {
    usersQuery = query(collection(db, 'users'));
  }
  
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as User[];
}

export async function getUser(userId: string) {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error(`User with ID ${userId} not found`);
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data()
  } as User;
}

// Dashboard data

export async function getDashboardData(storeId?: string) {
  // Fetch orders for sales data
  const orders = await getOrders(storeId);
  
  // Calculate total sales
  const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  
  // Get recent orders
  const recentOrders = orders.slice(0, 5);
  
  // Get total orders count
  const totalOrders = orders.length;
  
  // Get total products
  const products = await getProducts(storeId);
  const totalProducts = products.length;
  
  // Calculate sales by day for the chart (last 7 days)
  const salesByDay = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Format the date as YYYY-MM-DD for comparison
    const formattedDate = date.toISOString().split('T')[0];
    
    // Sum orders for this day
    const dayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.toISOString().split('T')[0] === formattedDate;
    });
    
    const dayTotal = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    salesByDay.push({
      date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date),
      amount: dayTotal
    });
  }
  
  return {
    totalSales,
    totalOrders,
    totalProducts,
    recentOrders,
    salesByDay,
  };
}

// Categories

export async function getCategories() {
  const categoriesQuery = query(
    collection(db, 'categories'),
    orderBy('name')
  );
  
  const snapshot = await getDocs(categoriesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Category[];
}

export async function getCategory(categoryId: string) {
  const docRef = doc(db, 'categories', categoryId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error(`Category with ID ${categoryId} not found`);
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data()
  } as Category;
}

export async function createCategory(category: Omit<Category, 'id'>) {
  const docRef = await addDoc(collection(db, 'categories'), category);
  
  return {
    id: docRef.id,
    ...category
  } as Category;
}

export async function updateCategory(categoryId: string, updatedData: Partial<Omit<Category, 'id'>>) {
  const categoryRef = doc(db, 'categories', categoryId);
  await updateDoc(categoryRef, updatedData);
  
  return getCategory(categoryId);
}

export async function deleteCategory(categoryId: string) {
  const categoryRef = doc(db, 'categories', categoryId);
  await deleteDoc(categoryRef);
  return true;
} 