import type { Database } from '../database.types';

type Tables = Database['public']['Tables'];

export type AppRole = Database['public']['Enums']['app_role'];
export type OrderStatus = Database['public']['Enums']['order_status'];
export type OrderSource = Database['public']['Enums']['order_source'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];

export type OrderRow = Tables['orders']['Row'];
export type OrderInsert = Tables['orders']['Insert'];
export type OrderUpdate = Tables['orders']['Update'];

export type OrderFileRow = Tables['order_files']['Row'];
export type OrderFileInsert = Tables['order_files']['Insert'];

export type OrderAddonRow = Tables['order_addons']['Row'];
export type OrderAddonInsert = Tables['order_addons']['Insert'];

export type CostBreakdownRow = Tables['order_cost_breakdowns']['Row'];
export type CostBreakdownInsert = Tables['order_cost_breakdowns']['Insert'];

export type StatusHistoryRow = Tables['order_status_history']['Row'];
export type StatusHistoryInsert = Tables['order_status_history']['Insert'];

export type PaymentRow = Tables['payments']['Row'];
export type PaymentInsert = Tables['payments']['Insert'];
export type PaymentUpdate = Tables['payments']['Update'];

export type PaymentMethodRow = Tables['payment_methods']['Row'];
export type PaymentMethodInsert = Tables['payment_methods']['Insert'];
export type PaymentMethodUpdate = Tables['payment_methods']['Update'];

export type PricingSettingsRow = Tables['pricing_settings']['Row'];
export type MatrixCellRow = Tables['pricing_matrix_cells']['Row'];
export type MatrixCellInsert = Tables['pricing_matrix_cells']['Insert'];

// ── Domain DTOs (decoupled from the row shapes so consumers never touch raw
// ── DB rows) ────────────────────────────────────────────────────────────────

export interface OrderFileDto {
  id: string;
  storagePath: string | null;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  pageCount: number | null;
  printType: string | null;
  contentType: string | null;
  paperSize: string | null;
  copies: number;
  colorMode: string | null;
  pageRange: string | null;
  specificPages: string | null;
  pagesPerSheet: string | null;
  orientation: string | null;
  twoSided: string | null;
  margins: string | null;
  scale: string | null;
  customScale: number | null;
  photoSize: string | null;
  photoQuantity: number | null;
  notes: string | null;
  createdAt: Date;
}

export interface OrderAddonDto {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CostBreakdownDto {
  printingCost: number;
  addonsCost: number;
  total: number;
}

export interface PaymentDto {
  id: string;
  orderId: string;
  methodId: string | null;
  methodName: string;
  amount: number;
  referenceNumber: string | null;
  proofStoragePath: string | null;
  status: PaymentStatus;
  rejectionReason: string | null;
  submittedBy: string | null;
  verifiedBy: string | null;
  submittedAt: Date;
  verifiedAt: Date | null;
}

export interface OrderDto {
  id: string;
  orderNumber: number;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  orderSource: OrderSource;
  customerType: string | null;
  subtotal: number;
  addonsTotal: number;
  total: number;
  manualTotal: number | null;
  holdReason: string | null;
  cancellationReason: string | null;
  paymentDeadline: Date | null;
  downPaymentRequired: boolean;
  downPaymentAmount: number | null;
  downPaymentVerified: boolean;
  fullPaymentRequired: boolean;
  fullPaymentAmount: number | null;
  fullPaymentVerified: boolean;
  paymentAmountPaid: number;
  expectedPaperUsage: { size: string; sheets: number }[] | null;
  paperDeductedOnCreate: boolean;
  paperConfirmed: boolean;
  errorUsage: { noErrors: boolean; reason?: string; wastedSheets: number } | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  statusUpdatedAt: Date;
  files: OrderFileDto[];
  addons: OrderAddonDto[];
  costBreakdown: CostBreakdownDto | null;
  payments: PaymentDto[];
}

// Display ID helper: the DB sequence lives in `order_number` (identity), and
// the human-facing ID is derived on read: ORD-0001 … ORD-9999…
export function formatOrderNumber(orderNumber: number): string {
  return `ORD-${String(orderNumber).padStart(4, '0')}`;
}