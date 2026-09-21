import { supabase } from '../supabaseClient';
import { dataUrlToBlob } from '../../app/utils/supabaseAvatar';

// Storage buckets used across the backend integration. Public buckets serve
// anonymous reads; private buckets require an authenticated token (or a signed
// URL) to read.
export const BUCKETS = {
  orderFiles: 'order-files',
  paymentProofs: 'payment-proofs',
  brandAssets: 'brand-assets',
  shopPhotos: 'shop-photos',
  jobApplications: 'job-applications',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export function getStoragePublicUrl(bucket: BucketName, path: string): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export interface UploadInput {
  bucket: BucketName;
  // Folder within the bucket, e.g. `orders/<uuid>` or `${userId}/…`. The RLS
  // storage policies for the private buckets expect the FIRST folder segment
  // to be the owner's user id (foldername(name)[1] = auth.uid()).
  folder: string;
  file: Blob;
  fileName?: string;
  contentType?: string;
}

// Upload a Blob to the bucket, returning the storage path (not the URL).
export async function uploadObjectAndGetPath(input: UploadInput): Promise<string> {
  const ext = (input.fileName?.split('.').pop() || '').toLowerCase();
  const safeExt = /^[a-z0-9]{1,10}$/.test(ext) ? ext : 'bin';
  const path = `${input.folder.replace(/^\/+|\/+$/g, '')}/${Date.now()}.${safeExt}`;
  const { error } = await supabase.storage
    .from(input.bucket)
    .upload(path, input.file, {
      contentType: input.contentType || input.file.type || 'application/octet-stream',
      upsert: true,
    });
  if (error) throw error;
  return path;
}

// Convenience: a data URL → storage path in one call (reuses the avatar
// converter). `fileName` drives the extension.
export async function uploadDataUrlAndGetPath(
  bucket: BucketName,
  folder: string,
  dataUrl: string,
  fileName = 'image.png',
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  return uploadObjectAndGetPath({ bucket, folder, file: blob, fileName, contentType: blob.type });
}

// Remove one or more objects by storage path. Failures are logged, not thrown
// (best-effort cleanup).
export async function removeObjectsIfPresent(bucket: BucketName, paths: Array<string | null | undefined>): Promise<void> {
  const present = paths.filter((p): p is string => Boolean(p));
  if (present.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(present);
  if (error) {
    console.warn(`[storage] failed to remove ${present.length} object(s) from ${bucket}:`, error);
  }
}

// Resolve a stored storage path to its public URL (private buckets: only works
// while a session is authenticated — prototype-acceptable for staff/admin).
export function resolveStorageUrl(bucket: BucketName, storagePath: string | null | undefined): string | null {
  return storagePath ? getStoragePublicUrl(bucket, storagePath) : null;
}