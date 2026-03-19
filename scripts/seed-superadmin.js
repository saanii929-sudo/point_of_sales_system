const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-pos-system';

// Super Admin credentials
const SUPER_ADMIN = {
  name: 'Super Admin',
  email: 'admin@saaspos.com',
  password: 'Admin@123456', // Change this in production!
  role: 'super_admin',
  phone: '+1 (555) 000-0000',
  tenantId: null, // Super admin doesn't belong to any tenant
  isActive: true
};

// User Schema (simplified for seeding)
const userSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: false },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super_admin', 'business_owner', 'manager', 'cashier', 'inventory_staff'],
    default: 'cashier'
  },
  phone: String,
  avatar: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function seedSuperAdmin() {
  try {
    console.log('🌱 Starting Super Admin seed...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if super admin already exists
    console.log('🔍 Checking for existing super admin...');
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });

    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists!');
      console.log('📧 Email:', existingSuperAdmin.email);
      console.log('👤 Name:', existingSuperAdmin.name);
      console.log('\n💡 If you want to reset the password, delete the existing super admin first.\n');
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, 10);

    // Create super admin
    console.log('👤 Creating super admin user...');
    const superAdmin = await User.create({
      name: SUPER_ADMIN.name,
      email: SUPER_ADMIN.email,
      password: hashedPassword,
      role: SUPER_ADMIN.role,
      phone: SUPER_ADMIN.phone,
      tenantId: SUPER_ADMIN.tenantId,
      isActive: SUPER_ADMIN.isActive
    });

    console.log('\n✅ Super admin created successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('📋 SUPER ADMIN CREDENTIALS');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:    ', SUPER_ADMIN.email);
    console.log('🔑 Password: ', SUPER_ADMIN.password);
    console.log('👤 Name:     ', SUPER_ADMIN.name);
    console.log('📱 Phone:    ', SUPER_ADMIN.phone);
    console.log('🆔 ID:       ', superAdmin._id);
    console.log('═══════════════════════════════════════\n');
    console.log('⚠️  IMPORTANT: Change the password after first login!\n');
    console.log('🌐 Login at: http://localhost:3000/login\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding super admin:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the seed function
seedSuperAdmin();
