# 🛒 SmartVendr - Intelligent Point of Sale System

A complete, production-ready multi-tenant Point of Sale (POS) system with smart features for modern businesses. Sell smarter, not harder.

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- 5 user roles: Super Admin, Business Owner, Manager, Cashier, Inventory Staff
- Protected routes with middleware
- Session persistence

### 💼 Multi-Tenant Architecture
- Complete data isolation per business
- Tenant-based queries and operations
- Subscription management system
- Business-specific settings

### 🛒 Smart POS Terminal
- Modern, responsive selling interface
- Real-time stock validation
- Multiple payment methods (Cash, Card, Split)
- Discount system
- Tax calculation
- Cart management with Zustand
- Barcode search support
- Auto stock deduction

### 📦 Inventory Management
- Product CRUD operations
- Category management
- Stock tracking
- Low stock alerts
- Out-of-stock detection
- SKU auto-generation
- Barcode support

### 📊 Analytics Dashboard
- Real-time sales metrics
- Revenue tracking
- Profit calculation
- Top products analysis
- Employee performance tracking
- Customer insights
- Period-based filtering (Today, Week, Month, Year)

### 👥 Customer Management
- Auto-creation during checkout
- Purchase history tracking
- Lifetime value calculation
- Visit frequency tracking
- Customer search

### 👤 Employee Management
- Add/manage employees
- Role assignment
- Activity tracking
- Performance metrics

### 🔄 Real-time Updates
- Socket.io integration
- Live sales notifications
- Instant dashboard updates
- Multi-device synchronization

### 🎨 Modern UI/UX
- Glassmorphism design
- Dark/Light mode
- Fully responsive (Mobile, Tablet, Desktop)
- Smooth animations with Framer Motion
- Toast notifications
- Loading states

### 📈 Subscription System
- Starter, Professional, Enterprise plans
- Feature limitations per plan
- Trial period support
- Subscription status tracking

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: TailwindCSS 4
- **State Management**: Zustand
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, bcryptjs
- **Real-time**: Socket.io
- **UI Components**: Custom components with Lucide icons
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or remote)
- npm or yarn

## 🚀 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd smartvendr
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and configure:
```env
MONGODB_URI=mongodb://localhost:27017/smartvendr
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

4. **Start MongoDB**
```bash
# If using local MongoDB
mongod
```

5. **Seed the database**
```bash
npm run seed
```

6. **Run the development server**
```bash
npm run dev
```

7. **Open your browser**
```
http://localhost:3000
```

## 👤 Demo Credentials

After seeding, use these credentials to login:

**Business Owner:**
- Email: `owner@demo.com`
- Password: `password123`

**Manager:**
- Email: `manager@demo.com`
- Password: `password123`

**Cashier:**
- Email: `cashier@demo.com`
- Password: `password123`

## 📁 Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── products/          # Product management
│   │   ├── sales/             # Sales operations
│   │   ├── categories/        # Category management
│   │   ├── customers/         # Customer management
│   │   ├── employees/         # Employee management
│   │   └── analytics/         # Analytics endpoints
│   ├── dashboard/             # Dashboard pages
│   │   ├── pos/              # POS Terminal
│   │   ├── products/         # Product management UI
│   │   ├── sales/            # Sales history
│   │   ├── customers/        # Customer list
│   │   ├── employees/        # Employee management
│   │   └── reports/          # Reports & analytics
│   ├── login/                 # Login page
│   ├── register/              # Registration page
│   └── layout.tsx             # Root layout
├── components/
│   ├── ui/                    # Reusable UI components
│   └── providers/             # Context providers
├── lib/
│   ├── db.ts                  # Database connection
│   ├── auth.ts                # Authentication utilities
│   ├── rbac.ts                # Role-based access control
│   ├── utils.ts               # Helper functions
│   └── socket.ts              # Socket.io setup
├── models/                    # Mongoose models
│   ├── User.ts
│   ├── Business.ts
│   ├── Product.ts
│   ├── Category.ts
│   ├── Sale.ts
│   ├── Customer.ts
│   └── ActivityLog.ts
├── store/                     # Zustand stores
│   ├── useAuthStore.ts
│   ├── useCartStore.ts
│   └── useThemeStore.ts
├── scripts/
│   └── seed.ts                # Database seeding
└── middleware.ts              # Route protection
```

## 🔑 Key Features Explained

### Multi-Tenant System
Every business gets isolated data using `tenantId`. All queries automatically filter by tenant to ensure data privacy.

### Role-Based Access Control
```typescript
Permissions by Role:
- Super Admin: Full system access
- Business Owner: Manage business, users, products, sales, reports
- Manager: Manage products, inventory, sales, reports
- Cashier: Process sales, manage customers
- Inventory Staff: Manage products and inventory
```

### POS Terminal
- Desktop: Product grid + Cart sidebar
- Tablet: Touch-optimized layout
- Mobile: Swipe-based interface
- Features: Search, barcode scan, quantity adjustment, discounts, multiple payment methods

### Real-time Updates
When a sale is created:
1. Saved to MongoDB
2. Socket.io event emitted
3. All connected dashboards update instantly

### Subscription Plans

**Starter:**
- 5 employees max
- 1 branch
- Basic features

**Professional:**
- 20 employees max
- 3 branches
- Analytics access

**Enterprise:**
- Unlimited employees
- Unlimited branches
- Full analytics
- Priority support

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token authentication
- HTTP-only cookies
- CSRF protection
- Input validation
- SQL injection prevention (MongoDB)
- XSS protection

## 📱 Responsive Design

- Mobile: Optimized for phones (320px+)
- Tablet: Touch-friendly interface (768px+)
- Desktop: Full-featured dashboard (1024px+)
- POS Touchscreen: Large touch targets

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new business
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/[id]` - Get product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### Sales
- `GET /api/sales` - List sales
- `POST /api/sales` - Create sale

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category

### Customers
- `GET /api/customers` - List customers

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-secret-key
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Recommended Hosting
- **Frontend**: Vercel, Netlify
- **Database**: MongoDB Atlas
- **Socket.io**: Separate Node.js server or integrated

## 🔧 Development

### Run Development Server
```bash
npm run dev
```

### Lint Code
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

## 📝 Future Enhancements

- [ ] Offline mode with IndexedDB
- [ ] Receipt printing
- [ ] Email notifications
- [ ] SMS integration
- [ ] Advanced reporting with charts
- [ ] Multi-branch support
- [ ] Inventory forecasting
- [ ] Loyalty program
- [ ] Gift cards
- [ ] Returns/refunds management
- [ ] Supplier management
- [ ] Purchase orders
- [ ] Barcode generation
- [ ] Export to CSV/PDF
- [ ] Mobile app (React Native)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the MIT License.

## 💬 Support

For support, email support@smartvendr.com or open an issue on GitHub.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- MongoDB for the database
- Socket.io for real-time capabilities
- All open-source contributors

---

Built with ❤️ by SmartVendr Team | Making businesses smarter, one sale at a time 🚀
