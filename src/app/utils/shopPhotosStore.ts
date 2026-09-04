// Centralized shop-location photo store.
// Admin uploads up to MAX_PHOTOS (3) photos of the shop's physical location;
// customers see them on the Shop Location dialog (landing page + dashboard).
// Persisted to localStorage as data URLs (mirrors paymentMethodsStore pattern).

export const MAX_PHOTOS = 3;

export type ShopPhoto = {
  id: string;
  dataUrl: string; // uploaded image data URL
  createdBy: string; // name of the admin who uploaded it
  createdAt: string;
};

type Subscriber = () => void;

const STORAGE_KEY = 'docufy_shop_photos_v1';
const STORAGE_VERSION = '1.0';

class ShopPhotosStore {
  private photos: ShopPhoto[] = [];
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
        this.photos = [];
        localStorage.setItem(`${STORAGE_KEY}_version`, STORAGE_VERSION);
        this.save();
      } else {
        const parsed = JSON.parse(stored);
        this.photos = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Failed to load shop photos:', error);
      this.photos = [];
    }
    this.initialized = true;
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.photos));
    } catch (error) {
      console.error('Failed to save shop photos:', error);
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

  getPhotos(): ShopPhoto[] {
    this.load();
    return [...this.photos];
  }

  get remainingSlots(): number {
    return Math.max(0, MAX_PHOTOS - this.photos.length);
  }

  addPhoto(dataUrl: string, createdBy: string): boolean {
    if (this.photos.length >= MAX_PHOTOS) return false;
    const photo: ShopPhoto = {
      id: `shop-photo-${Date.now().toString(36)}`,
      dataUrl,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    this.photos = [...this.photos, photo];
    this.save();
    this.notify();
    return true;
  }

  removePhoto(id: string): boolean {
    const next = this.photos.filter((p) => p.id !== id);
    if (next.length === this.photos.length) return false;
    this.photos = next;
    this.save();
    this.notify();
    return true;
  }
}

export const shopPhotosStore = new ShopPhotosStore();
