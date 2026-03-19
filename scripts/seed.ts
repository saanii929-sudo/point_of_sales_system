import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-pos-system';

// Define schemas inline for seeding
const BusinessSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
  subscriptionPlan: String,
  subscriptionStatus: String,
  subscriptionExpiry: Date,
  settings: {
    currency: String,
    taxRate: Number,
    timezone: String
  },
  limits: {
    maxEmployees: Number,
    maxBranches: Number,
    hasAnalytics: Boolean
  },
  isActive: Boolean
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  tenantId: mongoose.Schema.Types.ObjectId,
  email: String,
  password: String,
  name: String,
  role: String,
  phone: String,
  isActive: Boolean,
  lastLogin: Date
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  tenantId: mongoose.Schema.Types.ObjectId,
  name: String,
  description: String,
  color: String,
  isActive: Boolean
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  tenantId: mongoose.Schema.Types.ObjectId,
  name: String,
  sku: String,
  barcode: String,
  description: String,
  category: mongoose.Schema.Types.ObjectId,
  price: Number,
  cost: Number,
  stock: Number,
  lowStockThreshold: Number,
  isActive: Boolean,
  salesCount: Number
}, { timestamps: true });

const Business = mongoose.models.Business || mongoose.model('Business', BusinessSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Business.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});

    // Create demo business
    console.log('Creating demo business...');
    const business = await Business.create({
      name: 'Demo Store',
      email: 'demo@store.com',
      phone: '+1234567890',
      address: '123 Main Street, City, State',
      subscriptionPlan: 'professional',
      subscriptionStatus: 'active',
      subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      settings: {
        currency: 'USD',
        taxRate: 8.5,
        timezone: 'UTC'
      },
      limits: {
        maxEmployees: 20,
        maxBranches: 3,
        hasAnalytics: true
      },
      isActive: true
    });

    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const owner = await User.create({
      tenantId: business._id,
      email: 'owner@demo.com',
      password: hashedPassword,
      name: 'John Owner',
      role: 'business_owner',
      phone: '+1234567890',
      isActive: true
    });

    await User.create({
      tenantId: business._id,
      email: 'manager@demo.com',
      password: hashedPassword,
      name: 'Sarah Manager',
      role: 'manager',
      phone: '+1234567891',
      isActive: true
    });

    await User.create({
      tenantId: business._id,
      email: 'cashier@demo.com',
      password: hashedPassword,
      name: 'Mike Cashier',
      role: 'cashier',
      phone: '+1234567892',
      isActive: true
    });

    // Create categories
    console.log('Creating categories...');
    const electronics = await Category.create({
      tenantId: business._id,
      name: 'Electronics',
      description: 'Electronic devices and accessories',
      color: '#3B82F6',
      isActive: true
    });

    const clothing = await Category.create({
      tenantId: business._id,
      name: 'Clothing',
      description: 'Apparel and fashion items',
      color: '#8B5CF6',
      isActive: true
    });

    const food = await Category.create({
      tenantId: business._id,
      name: 'Food & Beverages',
      description: 'Food items and drinks',
      color: '#10B981',
      isActive: true
    });

    const home = await Category.create({
      tenantId: business._id,
      name: 'Home & Garden',
      description: 'Home improvement and garden supplies',
      color: '#F59E0B',
      isActive: true
    });

    // Create products
    console.log('Creating products...');
    const products = [
      { name: 'Wireless Mouse', category: electronics._id, price: 29.99, cost: 15.00, stock: 50, barcode: '1234567890123' },
      { name: 'USB Cable', category: electronics._id, price: 9.99, cost: 3.00, stock: 100, barcode: '1234567890124' },
      { name: 'Bluetooth Speaker', category: electronics._id, price: 49.99, cost: 25.00, stock: 30, barcode: '1234567890125' },
      { name: 'Phone Case', category: electronics._id, price: 19.99, cost: 8.00, stock: 75, barcode: '1234567890126' },
      { name: 'T-Shirt', category: clothing._id, price: 24.99, cost: 10.00, stock: 60, barcode: '1234567890127' },
      { name: 'Jeans', category: clothing._id, price: 59.99, cost: 30.00, stock: 40, barcode: '1234567890128' },
      { name: 'Sneakers', category: clothing._id, price: 79.99, cost: 40.00, stock: 25, barcode: '1234567890129' },
      { name: 'Coffee Beans', category: food._id, price: 14.99, cost: 6.00, stock: 80, barcode: '1234567890130' },
      { name: 'Energy Drink', category: food._id, price: 2.99, cost: 1.00, stock: 150, barcode: '1234567890131' },
      { name: 'Chocolate Bar', category: food._id, price: 1.99, cost: 0.50, stock: 200, barcode: '1234567890132' },
      { name: 'Plant Pot', category: home._id, price: 12.99, cost: 5.00, stock: 45, barcode: '1234567890133' },
      { name: 'LED Bulb', category: home._id, price: 8.99, cost: 3.50, stock: 90, barcode: '1234567890134' },
      { name: 'Garden Tools Set', category: home._id, price: 34.99, cost: 18.00, stock: 20, barcode: '1234567890135' },
    ];

    for (const product of products) {
      await Product.create({
        tenantId: business._id,
        ...product,
        sku: `SKU-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        description: `High quality ${product.name.toLowerCase()}`,
        lowStockThreshold: 10,
        isActive: true,
        salesCount: 0
      });
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Business Owner:');
    console.log('  Email: owner@demo.com');
    console.log('  Password: password123');
    console.log('\nManager:');
    console.log('  Email: manager@demo.com');
    console.log('  Password: password123');
    console.log('\nCashier:');
    console.log('  Email: cashier@demo.com');
    console.log('  Password: password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
