export type InventoryItem = {
  id: string;
  // Vital info
  itemName?: string;
  companyName?: string; // brand
  manufacturer?: string;
  category?: string;
  // Inventory
  purchaseDate?: string;
  warrantyExpiry?: string;
  status?: string;
  notes?: string;
  // Price & stock (these are what customers see and order)
  sellingPrice?: number | null;
  quantity?: number | null;
  // Compliance
  countryOfOrigin?: string;
  gstRate?: number | null;
  warranty?: string;
  packerDetails?: string;
  // Images
  imageUrls?: string[];
  mainImage?: string | null;
  // Store visibility. Items with published === false are hidden from customers.
  published?: boolean;
  // Meta
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
};

export type Role = "seller" | "buyer";

// Placed = waiting for the store, Confirmed = store accepted (stock reduced), Delivered, Cancelled
export type OrderStatus = "Placed" | "Confirmed" | "Delivered" | "Cancelled";

export type OrderLine = {
  itemId: string;
  name: string;
  brand?: string;
  image?: string;
  price: number; // GST-inclusive unit price
  quantity: number;
  lineTotal: number;
  gstRate?: number;
};

export type Order = {
  id: string;
  orderNo: string;
  invoiceNo?: string;
  status: OrderStatus;
  companyName?: string; // the company this order is placed with
  gstin?: string;
  email?: string;
  customerName: string; // contact person
  phone: string;
  address: string;
  notes?: string;
  paymentMethod: string;
  items: OrderLine[];
  totalItems: number;
  total: number;
  buyerId: string; // uid of the customer who placed it
  buyerEmail?: string;
  createdAt: number;
  updatedAt?: number;
};
