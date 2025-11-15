import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Users table - supports customer, pharmacy, and delivery roles
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  role: text('role').notNull(), // 'customer', 'pharmacy', 'delivery'
  address: text('address'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Pharmacies table - pharmacy details with geolocation
export const pharmacies = sqliteTable('pharmacies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  pharmacyName: text('pharmacy_name').notNull(),
  licenseNumber: text('license_number').notNull().unique(),
  address: text('address').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  openingTime: text('opening_time'),
  closingTime: text('closing_time'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  rating: real('rating').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Medicines table - medicine catalog with categories
export const medicines = sqliteTable('medicines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  brand: text('brand').notNull(),
  saltComposition: text('salt_composition').notNull(),
  category: text('category').notNull(), // 'prescription', 'otc', 'supplement', 'device', 'first_aid', 'baby_care', 'personal_care'
  description: text('description'),
  manufacturer: text('manufacturer'),
  unit: text('unit').notNull(),
  price: real('price').notNull(),
  requiresPrescription: integer('requires_prescription', { mode: 'boolean' }).default(false),
  imageUrl: text('image_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Inventory table - pharmacy-specific medicine stock
export const inventory = sqliteTable('inventory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pharmacyId: integer('pharmacy_id').references(() => pharmacies.id).notNull(),
  medicineId: integer('medicine_id').references(() => medicines.id).notNull(),
  quantity: integer('quantity').notNull().default(0),
  price: real('price').notNull(),
  discountPercentage: real('discount_percentage').default(0),
  isAvailable: integer('is_available', { mode: 'boolean' }).default(true),
  lastUpdated: text('last_updated').notNull(),
});

// Orders table - customer orders with delivery details
export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  pharmacyId: integer('pharmacy_id').references(() => pharmacies.id).notNull(),
  orderNumber: text('order_number').notNull().unique(),
  status: text('status').notNull(), // 'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'
  totalAmount: real('total_amount').notNull(),
  deliveryFee: real('delivery_fee').default(0),
  deliveryAddress: text('delivery_address').notNull(),
  deliveryLatitude: real('delivery_latitude'),
  deliveryLongitude: real('delivery_longitude'),
  estimatedDeliveryTime: integer('estimated_delivery_time'),
  prescriptionRequired: integer('prescription_required', { mode: 'boolean' }).default(false),
  prescriptionVerified: integer('prescription_verified', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Order Items table - items within each order
export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  medicineId: integer('medicine_id').references(() => medicines.id).notNull(),
  quantity: integer('quantity').notNull(),
  price: real('price').notNull(),
  discount: real('discount').default(0),
  subtotal: real('subtotal').notNull(),
});

// Delivery table - delivery tracking and assignment
export const delivery = sqliteTable('delivery', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').references(() => orders.id).notNull().unique(),
  deliveryPersonId: integer('delivery_person_id').references(() => users.id),
  status: text('status').notNull(), // 'assigned', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'failed'
  currentLatitude: real('current_latitude'),
  currentLongitude: real('current_longitude'),
  assignedAt: text('assigned_at'),
  pickedUpAt: text('picked_up_at'),
  deliveredAt: text('delivered_at'),
  notes: text('notes'),
});

// Prescriptions table - prescription uploads and verification
export const prescriptions = sqliteTable('prescriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  orderId: integer('order_id').references(() => orders.id),
  prescriptionUrl: text('prescription_url').notNull(),
  verifiedBy: integer('verified_by').references(() => pharmacies.id),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
  verificationNotes: text('verification_notes'),
  uploadedAt: text('uploaded_at').notNull(),
  verifiedAt: text('verified_at'),
});


// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});