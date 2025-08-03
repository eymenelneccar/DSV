var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  customers: () => customers,
  insertCustomerSchema: () => insertCustomerSchema,
  insertProductSchema: () => insertProductSchema,
  insertSupplierSchema: () => insertSupplierSchema,
  insertTransactionItemSchema: () => insertTransactionItemSchema,
  insertTransactionSchema: () => insertTransactionSchema,
  products: () => products,
  sessions: () => sessions,
  suppliers: () => suppliers,
  transactionItems: () => transactionItems,
  transactions: () => transactions,
  users: () => users
});
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("employee"),
  // admin, employee
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  sku: varchar("sku").unique().notNull(),
  barcode: varchar("barcode").unique(),
  category: varchar("category"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  currency: varchar("currency").default("TRY"),
  // TRY, USD
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  quantity: integer("quantity").default(0),
  minQuantity: integer("min_quantity").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionNumber: varchar("transaction_number").unique().notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  customerName: varchar("customer_name").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status").default("completed"),
  // completed, pending, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var transactionItems = pgTable("transaction_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").references(() => transactions.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  productName: varchar("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull()
});
var insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  transactionNumber: true,
  createdAt: true,
  updatedAt: true
});
var insertTransactionItemSchema = createInsertSchema(transactionItems).omit({
  id: true
});
var suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  contactPerson: varchar("contact_person"),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  taxNumber: varchar("tax_number"),
  paymentTerms: varchar("payment_terms"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, sql as sql2, like, and } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  async getProducts(search) {
    if (search) {
      return await db.select().from(products).where(
        sql2`${products.name} ILIKE ${`%${search}%`} OR ${products.sku} ILIKE ${`%${search}%`} OR ${products.barcode} ILIKE ${`%${search}%`}`
      ).orderBy(desc(products.createdAt));
    }
    return await db.select().from(products).orderBy(desc(products.createdAt));
  }
  async getProductByBarcode(barcode) {
    const [product] = await db.select().from(products).where(eq(products.barcode, barcode));
    return product;
  }
  async getProduct(id) {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }
  async createProduct(product) {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }
  async updateProduct(id, product) {
    const [updatedProduct] = await db.update(products).set({ ...product, updatedAt: /* @__PURE__ */ new Date() }).where(eq(products.id, id)).returning();
    return updatedProduct;
  }
  async deleteProduct(id) {
    await db.delete(products).where(eq(products.id, id));
  }
  async getLowStockProducts() {
    return await db.select().from(products).where(sql2`${products.quantity} <= ${products.minQuantity}`).orderBy(products.quantity);
  }
  async getCustomers(search) {
    if (search) {
      return await db.select().from(customers).where(like(customers.name, `%${search}%`)).orderBy(desc(customers.createdAt));
    }
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }
  async getCustomer(id) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }
  async createCustomer(customer) {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }
  async updateCustomer(id, customer) {
    const [updatedCustomer] = await db.update(customers).set({ ...customer, updatedAt: /* @__PURE__ */ new Date() }).where(eq(customers.id, id)).returning();
    return updatedCustomer;
  }
  async deleteCustomer(id) {
    await db.delete(customers).where(eq(customers.id, id));
  }
  async getSuppliers(search) {
    if (search) {
      return await db.select().from(suppliers).where(like(suppliers.name, `%${search}%`)).orderBy(desc(suppliers.createdAt));
    }
    return await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  }
  async getSupplier(id) {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }
  async createSupplier(supplier) {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }
  async updateSupplier(id, supplier) {
    const [updatedSupplier] = await db.update(suppliers).set({ ...supplier, updatedAt: /* @__PURE__ */ new Date() }).where(eq(suppliers.id, id)).returning();
    return updatedSupplier;
  }
  async deleteSupplier(id) {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }
  async getSupplierProducts(supplierId) {
    return await db.select().from(products).where(and(
      eq(products.supplierId, supplierId),
      eq(products.isActive, true)
    )).orderBy(desc(products.createdAt));
  }
  async getTransactions(limit = 10, offset = 0, search) {
    if (search) {
      return await db.select().from(transactions).where(like(transactions.transactionNumber, `%${search}%`)).orderBy(desc(transactions.createdAt)).limit(limit).offset(offset);
    }
    return await db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(limit).offset(offset);
  }
  async getTransaction(id) {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }
  async createTransaction(transactionData) {
    const lastTransaction = await db.select({ number: transactions.transactionNumber }).from(transactions).orderBy(desc(transactions.createdAt)).limit(1);
    let newNumber = 1;
    if (lastTransaction.length > 0) {
      const lastNumber = parseInt(
        lastTransaction[0].number?.replace("INV-", "") || "0",
        10
      );
      newNumber = lastNumber + 1;
    }
    const transactionNumber = `INV-${newNumber.toString().padStart(3, "0")}`;
    const [transaction] = await db.insert(transactions).values({
      transactionNumber,
      ...transactionData,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return transaction;
  }
  async createTransactionItem(item) {
    const [newItem] = await db.insert(transactionItems).values(item).returning();
    return newItem;
  }
  async updateTransaction(id, transaction) {
    const [updatedTransaction] = await db.update(transactions).set({ ...transaction, updatedAt: /* @__PURE__ */ new Date() }).where(eq(transactions.id, id)).returning();
    return updatedTransaction;
  }
  async getDashboardMetrics() {
    const totalSalesResult = await db.select({ total: sql2`COALESCE(SUM(${transactions.total}), 0)` }).from(transactions).where(
      and(
        eq(transactions.status, "completed"),
        sql2`EXTRACT(MONTH FROM ${transactions.createdAt}) = EXTRACT(MONTH FROM CURRENT_DATE)`
      )
    );
    const totalOrdersResult = await db.select({ count: sql2`count(*)` }).from(transactions);
    const activeProductsResult = await db.select({ count: sql2`count(*)` }).from(products).where(eq(products.isActive, true));
    const newCustomersResult = await db.select({ count: sql2`count(*)` }).from(customers).where(sql2`EXTRACT(MONTH FROM ${customers.createdAt}) = EXTRACT(MONTH FROM CURRENT_DATE)`);
    const lowStockResult = await db.select({ count: sql2`count(*)` }).from(products).where(sql2`${products.quantity} <= ${products.minQuantity}`);
    const pendingOrdersResult = await db.select({ count: sql2`count(*)` }).from(transactions).where(eq(transactions.status, "pending"));
    const activeCustomersResult = await db.select({ count: sql2`count(DISTINCT ${transactions.customerId})` }).from(transactions).where(sql2`EXTRACT(MONTH FROM ${transactions.createdAt}) = EXTRACT(MONTH FROM CURRENT_DATE)`);
    const returnsResult = await db.select({ count: sql2`count(*)` }).from(transactions).where(eq(transactions.status, "cancelled"));
    return {
      totalSales: totalSalesResult[0]?.total || 0,
      totalOrders: totalOrdersResult[0]?.count || 0,
      activeProducts: activeProductsResult[0]?.count || 0,
      newCustomers: newCustomersResult[0]?.count || 0,
      lowStockCount: lowStockResult[0]?.count || 0,
      pendingOrders: pendingOrdersResult[0]?.count || 0,
      activeCustomers: activeCustomersResult[0]?.count || 0,
      returns: returnsResult[0]?.count || 0
    };
  }
};
var storage = new DatabaseStorage();

// server/replitAuth.ts
import session from "express-session";
import connectPg from "connect-pg-simple";
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: "local-dev-secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: sessionTtl
    }
  });
}
async function setupAuth(app2) {
  app2.use(getSession());
}
var isAuthenticated = (req, res, next) => {
  return next();
};

// server/routes.ts
import { z } from "zod";
async function registerRoutes(app2) {
  await setupAuth(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/dashboard/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });
  app2.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const search = req.query.search;
      const products2 = await storage.getProducts(search);
      res.json(products2);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  app2.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });
  app2.post("/api/products", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating product with data:", req.body);
      const processedData = {
        ...req.body,
        price: req.body.price ? parseFloat(req.body.price) : void 0,
        cost: req.body.cost ? parseFloat(req.body.cost) : void 0,
        quantity: req.body.quantity ? parseInt(req.body.quantity) : 0,
        minQuantity: req.body.minQuantity ? parseInt(req.body.minQuantity) : 5
      };
      const productData = insertProductSchema.parse(processedData);
      console.log("Validated product data:", productData);
      const product = await storage.createProduct(productData);
      console.log("Created product:", product);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({
          message: "Invalid product data",
          errors: error.errors,
          receivedData: req.body
        });
      }
      console.error("Error creating product:", error);
      res.status(500).json({
        message: "Failed to create product",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : void 0
      });
    }
  });
  app2.put("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });
  app2.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });
  app2.get("/api/products/barcode/:barcode", isAuthenticated, async (req, res) => {
    try {
      const product = await storage.getProductByBarcode(req.params.barcode);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product by barcode:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });
  app2.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const search = req.query.search;
      const customers2 = await storage.getCustomers(search);
      res.json(customers2);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });
  app2.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });
  app2.put("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, customerData);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });
  app2.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });
  app2.get("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const search = req.query.search;
      const suppliers2 = await storage.getSuppliers(search);
      res.json(suppliers2);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });
  app2.get("/api/suppliers/:id/products", isAuthenticated, async (req, res) => {
    try {
      const products2 = await storage.getSupplierProducts(req.params.id);
      res.json(products2);
    } catch (error) {
      console.error("Error fetching supplier products:", error);
      res.status(500).json({ message: "Failed to fetch supplier products" });
    }
  });
  app2.post("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid supplier data", errors: error.errors });
      }
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });
  app2.get("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });
  app2.put("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(req.params.id, supplierData);
      res.json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid supplier data", errors: error.errors });
      }
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });
  app2.delete("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });
  app2.get("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      const search = req.query.search;
      const transactions2 = await storage.getTransactions(limit, offset, search);
      res.json(transactions2);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });
  app2.post("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const { transaction, items } = req.body;
      const now = /* @__PURE__ */ new Date();
      const transactionNumber = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const transactionData = insertTransactionSchema.parse({
        ...transaction,
        transactionNumber
      });
      const newTransaction = await storage.createTransaction(transactionData);
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          await storage.createTransactionItem({
            ...item,
            transactionId: newTransaction.id
          });
        }
      }
      res.status(201).json(newTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid transaction data",
          errors: error.errors
        });
      }
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "localhost", () => {
    log(`serving on http://localhost:${port}`);
  });
})();
