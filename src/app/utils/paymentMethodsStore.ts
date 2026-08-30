// Centralized online payment-method store.
// Admin manages the list (name, account holder, account number, QR image);
// customers see only ACTIVE methods. Persisted to localStorage.

export type PaymentMethodType = {
  id: string;
  name: string; // display name, e.g. "GCash", "Maya"
  accountName: string; // account / account-holder name
  accountNumber: string; // account or payment number
  qrCode?: string; // data URL of the uploaded QR image
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type Subscriber = () => void;

const STORAGE_KEY = 'docufy_payment_methods_v1';
const STORAGE_VERSION = '1.0';

// Placeholder QR (same SVG look as the original prototype's fake GCash QR).
const GCASH_PLACEHOLDER_QR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IndoaXRlIi8+PGcgZmlsbD0iYmxhY2siPjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgeD0iMjAiIHk9IjIwIi8+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiB4PSI0MCIgeT0iMjAiLz48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHg9IjUwIiB5PSIyMCIvPjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgeD0iNjAiIHk9IjIwIi8+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiB4PSI4MCIgeT0iMjAiLz48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHg9IjExMCIgeT0iMjAiLz48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHg9IjE0MCIgeT0iMjAiLz48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHg9IjE1MCIgeT0iMjAiLz48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHg9IjE2MCIgeT0iMjAiLz48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHg9IjE3MCIgeT0iMjAiLz48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHg9IjIwIiB5PSIzMCIvPjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgeD0iODAiIHk9IjMwIi8+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiB4PSIxNDAiIHk9IjMwIi8+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiB4PSIxNzAiIHk9IjMwIi8+PC9nPjwvc3ZnPg==';

// Deterministic pseudo-QR placeholder SVG (differs per label) so every
// online method still has something scannable-looking to display/download.
function makePlaceholderQR(label: string): string {
  const cells: boolean[] = [];
  let seed = label.length * 73 + 11;
  for (let i = 0; i < 64; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    cells.push(seed / 233280 > 0.48);
  }
  const rects = cells
    .map((c, i) =>
      c
        ? `<rect width="10" height="10" x="${16 + (i % 8) * 21}" y="${16 + Math.floor(i / 8) * 21}"/>`
        : ''
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="white"/><g fill="black">${rects}<rect x="176" y="16" width="12" height="12" fill="black"/><rect x="16" y="168" width="12" height="12" fill="black"/></g><text x="100" y="194" font-family="sans-serif" font-size="9" fill="#888" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function defaultMethods(): PaymentMethodType[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'pm-gcash',
      name: 'GCash',
      accountName: 'Docufy Printing Services',
      accountNumber: '0917 123 4567',
      qrCode: GCASH_PLACEHOLDER_QR,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'pm-maya',
      name: 'Maya',
      accountName: 'Docufy Printing Services',
      accountNumber: '0918 765 4321',
      qrCode: makePlaceholderQR('Maya'),
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

class PaymentMethodsStore {
  private methods: PaymentMethodType[] = [];
  private subscribers: Set<Subscriber> = new Set();
  private initialized = false;

  constructor() {
    this.load();
  }

  private load(): void {
    if (this.initialized) return;
    try {
      const storedVersion = localStorage.getItem(`${STORAGE_KEY}_version`);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored || storedVersion !== STORAGE_VERSION) {
        this.methods = defaultMethods();
        localStorage.setItem(`${STORAGE_KEY}_version`, STORAGE_VERSION);
        this.save();
      } else {
        const parsed = JSON.parse(stored);
        this.methods = Array.isArray(parsed) ? parsed : defaultMethods();
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      this.methods = defaultMethods();
    }
    this.initialized = true;
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.methods));
    } catch (error) {
      console.error('Failed to save payment methods:', error);
    }
  }

  private notify(): void {
    this.subscribers.forEach((listener) => listener());
  }

  subscribe(listener: Subscriber): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  getAllPaymentMethods(): PaymentMethodType[] {
    this.load();
    return [...this.methods];
  }

  // Only methods customers can currently use
  getPaymentMethods(): PaymentMethodType[] {
    return this.getAllPaymentMethods().filter((m) => m.active);
  }

  findById(id: string): PaymentMethodType | undefined {
    return this.getAllPaymentMethods().find((m) => m.id === id);
  }

  findByName(name: string): PaymentMethodType | undefined {
    const normalized = (name || '').toLowerCase();
    return this.getAllPaymentMethods().find(
      (m) => m.name.toLowerCase() === normalized,
    );
  }

  nameExists(name: string, excludeId?: string): boolean {
    const normalized = (name || '').trim().toLowerCase();
    return this.getAllPaymentMethods().some(
      (m) => m.id !== excludeId && m.name.toLowerCase() === normalized,
    );
  }

  addPaymentMethod(data: {
    name: string;
    accountName: string;
    accountNumber: string;
    qrCode?: string;
  }): PaymentMethodType {
    const now = new Date().toISOString();
    const method: PaymentMethodType = {
      id: `pm-${Date.now().toString(36)}`,
      name: data.name.trim(),
      accountName: data.accountName.trim(),
      accountNumber: data.accountNumber.trim(),
      qrCode: data.qrCode || makePlaceholderQR(data.name.trim()),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.methods = [...this.methods, method];
    this.save();
    this.notify();
    return method;
  }

  updatePaymentMethod(
    id: string,
    updates: Partial<
      Pick<PaymentMethodType, 'name' | 'accountName' | 'accountNumber' | 'qrCode' | 'active'>
    >,
  ): boolean {
    const index = this.methods.findIndex((m) => m.id === id);
    if (index === -1) return false;
    const current = this.methods[index];
    const updated: PaymentMethodType = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.methods = this.methods.map((m) => (m.id === id ? updated : m));
    this.save();
    this.notify();
    return true;
  }

  setActive(id: string, active: boolean): boolean {
    return this.updatePaymentMethod(id, { active });
  }

  deletePaymentMethod(id: string): boolean {
    const next = this.methods.filter((m) => m.id !== id);
    if (next.length === this.methods.length) return false;
    this.methods = next;
    this.save();
    this.notify();
    return true;
  }
}

export const paymentMethodsStore = new PaymentMethodsStore();

// Trigger a client-side download of the method's QR image (data URL).
export function downloadQRCode(
  qrCode: string | undefined,
  filename: string,
): boolean {
  if (!qrCode) return false;
  const link = document.createElement('a');
  link.href = qrCode;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

export function methodQRFilename(method: PaymentMethodType): string {
  return `${method.name.toLowerCase().replace(/\s+/g, '-')}-qr-code`;
}