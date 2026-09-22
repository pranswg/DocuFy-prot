import { supabase } from '../supabaseClient';
import { DEFAULT_MATRIX, pricingStore } from '../../app/utils/pricingStore';
import type {
  PricingSettingsRow,
  MatrixCellInsert,
  StaffRecordInsert,
} from './types';

// Phase 0 bootstrap: guarantee the single-row settings tables and the pricing
// matrix cells exist so every later phase has a stable source of truth. This is
// BEST-EFFORT: RLS may forbid the calling role from inserting (customers), and
// the tables may already be seeded by the admin. Failed attempts degrade
// quietly — nothing here may crash the app startup.

let started = false;

export function startBootstrap(): void {
  if (started) return;
  started = true;
  void runAll().catch((err) => {
    console.warn('[bootstrap] aborted:', err);
  });
}

async function runAll(): Promise<void> {
  await ensurePricingSettings();
  await ensureMatrixCells();
  await ensurePaymentMethods();
  await ensureStaffRecords();
}

// Seed `staff_records` directory rows for the DEMO roster so attendance sync
// has an identity to attach to (the roster members have no Supabase auth
// accounts — only the real staff@test.com account does, and its staff_records
// row gets linked to the existing `profiles.id` by email). The SQL migration
// also seeds these; this is a best-effort runtime counterpart for when the
// migration hasn't been run yet. Idempotent: rows are matched by email.
const DEMO_STAFF_SEEDS: Array<{
  fullName: string;
  email: string;
  employeeCode: string;
}> = [
  { fullName: 'Heaven Rica', email: 'staff@test.com', employeeCode: 'EMP-001' },
  { fullName: 'Robert Chen', email: 'robert.chen@docufy.com', employeeCode: 'EMP-002' },
  { fullName: 'Katie Perry', email: 'katie.perry@docufy.com', employeeCode: 'EMP-003' },
  { fullName: 'Miguel Santos', email: 'miguel.santos@docufy.com', employeeCode: 'EMP-004' },
  { fullName: 'Ana Dela Cruz', email: 'ana.delacruz@docufy.com', employeeCode: 'EMP-005' },
];

async function ensureStaffRecords(): Promise<void> {
  try {
    for (const seed of DEMO_STAFF_SEEDS) {
      const email = seed.email.toLowerCase();
      const { data: existing } = await supabase
        .from('staff_records')
        .select('id, profile_id')
        .eq('email', email)
        .maybeSingle();
      if (existing) continue;

      // Link the real auth account (staff@test.com) to its profiles.id row so
      // clock-ins made while signed in as that user land on its profile_id.
      let profileId: string | null = null;
      if (email === 'staff@test.com') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (profile) profileId = profile.id;
      }

      const insert: StaffRecordInsert = {
        profile_id: profileId,
        employee_code: seed.employeeCode,
        full_name: seed.fullName,
        email,
        role: 'staff',
        status: 'active',
        attendance_status: 'active',
        on_leave_reason: seed.email === 'staff@test.com'
          ? 'On scheduled annual leave'
          : null,
        join_date: '2026-09-01',
        skills_message: null,
        portfolio_link: null,
        permissions: ['attendance'],
        salary: 0,
      };
      const { error: insertError } = await supabase.from('staff_records').insert(insert);
      if (insertError) throw insertError;
    }
  } catch (err) {
    console.warn('[bootstrap] staff_records seed skipped (RLS or offline):', err);
  }
}

// Seed the two demo online payment methods (GCash / Maya) when the table is
// empty, matching the old localStorage prototype defaults. Best-effort: RLS
// only lets staff/admin insert, so customers simply skip this.
async function ensurePaymentMethods(): Promise<void> {
  try {
    const { count, error } = await supabase
      .from('payment_methods')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    if (count && count > 0) return;
    const { error: insertError } = await supabase.from('payment_methods').insert([
      {
        name: 'GCash',
        account_name: 'Docufy Printing Services',
        account_number: '0917 123 4567',
        qr_storage_path: null,
        active: true,
      },
      {
        name: 'Maya',
        account_name: 'Docufy Printing Services',
        account_number: '0918 765 4321',
        qr_storage_path: null,
        active: true,
      },
    ]);
    if (insertError) throw insertError;
  } catch (err) {
    console.warn('[bootstrap] payment_methods seed skipped (RLS or offline):', err);
  }
}

function defaultPricingSettings(): Omit<PricingSettingsRow, 'updated_by' | 'updated_at'> {
  const p = pricingStore.getPricing();
  return {
    id: true,
    bw: p.bw,
    color_low: p.colorLow,
    color_high: p.colorHigh,
    size_long_legal_folio: p.sizeLongLegalFolio,
    size_a3: p.sizeA3,
    duplex_savings: p.duplexSavings,
    down_payment_threshold: p.downPaymentThreshold,
    full_payment_threshold: p.fullPaymentThreshold,
    cash_payment_window_seconds: p.cashPickupPaymentWindowSeconds,
    online_payment_window_seconds: p.onlinePaymentVerificationWindowSeconds,
  };
}

async function ensurePricingSettings(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('pricing_settings')
      .select('id')
      .eq('id', true)
      .maybeSingle();
    if (error) throw error;
    if (data) return; // already seeded
    const { error: insertError } = await supabase.from('pricing_settings').insert(defaultPricingSettings());
    if (insertError) throw insertError;
  } catch (err) {
    console.warn('[bootstrap] pricing_settings seed skipped (RLS or offline):', err);
  }
}

function defaultMatrixCells(): MatrixCellInsert[] {
  const cells: MatrixCellInsert[] = [];
  const sizes = ['short', 'a4', 'long'] as const;
  const tiers = ['bw', 'partial', 'full'] as const;
  const contents = ['text', 'textWithImage', 'imageOnly'] as const;

  for (const ct of contents) {
    for (const tier of tiers) {
      for (const size of sizes) {
        cells.push({
          service_type: 'document',
          content_type: ct,
          color_tier: tier,
          paper_size: size,
          photo_size: null,
          price: DEFAULT_MATRIX.document[ct][tier][size],
          minimum_quantity: null,
        });
      }
    }
  }

  for (const tier of tiers) {
    for (const size of sizes) {
      cells.push({
        service_type: 'vellum',
        content_type: null,
        color_tier: tier,
        paper_size: size,
        photo_size: null,
        price: DEFAULT_MATRIX.vellum[tier][size],
        minimum_quantity: null,
      });
    }
  }

  for (const tier of tiers) {
    cells.push({
      service_type: 'sticker',
      content_type: null,
      color_tier: tier,
      paper_size: null,
      photo_size: null,
      price: DEFAULT_MATRIX.sticker[tier],
      minimum_quantity: null,
    });
  }

  for (const [photoSize, cfg] of Object.entries(DEFAULT_MATRIX.photo)) {
    cells.push({
      service_type: 'photo',
      content_type: null,
      color_tier: null,
      paper_size: null,
      photo_size: photoSize,
      price: cfg.price,
      minimum_quantity: cfg.minQty,
    });
  }

  return cells;
}

async function ensureMatrixCells(): Promise<void> {
  try {
    const { count, error } = await supabase
      .from('pricing_matrix_cells')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    if (count && count > 0) return;
    const cells = defaultMatrixCells();
    // Insert in chunks to stay well under request body limits.
    for (let i = 0; i < cells.length; i += 50) {
      const { error: insertError } = await supabase
        .from('pricing_matrix_cells')
        .insert(cells.slice(i, i + 50));
      if (insertError) throw insertError;
    }
  } catch (err) {
    console.warn('[bootstrap] pricing matrix cells seed skipped (RLS or offline):', err);
  }
}

startBootstrap();