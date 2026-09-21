import { supabase } from '../../lib/supabaseClient';

// Public Supabase Storage bucket that holds profile pictures. Reads work via a
// plain public URL (no auth token); writes are gated by the bucket's RLS
// policies (only the signed-in user can upload/replace/delete).
export const AVATAR_BUCKET = 'profile-images';

export function isDataUrl(value: string): boolean {
  return /^data:image\//.test(value);
}

export function isSupabaseAvatarUrl(value: string): boolean {
  return value.includes(`/object/public/${AVATAR_BUCKET}/`);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const separator = dataUrl.indexOf(',');
  const header = separator >= 0 ? dataUrl.slice(0, separator) : '';
  const base64 = separator >= 0 ? dataUrl.slice(separator + 1) : dataUrl;
  const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export function getAvatarPublicUrl(path: string): string {
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function pathFromPublicUrl(url: string): string {
  const marker = `/object/public/${AVATAR_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : '';
}

export async function uploadAvatar(userId: string, dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const baseType = blob.type.split('/')[1] || 'png';
  const ext = baseType === 'jpeg' ? 'jpg' : baseType;
  const fileName = `avatars/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(fileName, blob, { contentType: blob.type, upsert: true });
  if (error) throw error;
  return fileName;
}

export async function deleteAvatar(urlOrPath: string): Promise<void> {
  const path = urlOrPath.startsWith('avatars/') ? urlOrPath : pathFromPublicUrl(urlOrPath);
  if (!path) return;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) {
    console.warn('Failed to remove old avatar:', error);
  }
}