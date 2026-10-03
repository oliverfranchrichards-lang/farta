"use server";

import { createClient } from '@/lib/supabase/server';

export type Banner = {
  id: string;
  storage_object_path: string;
  mime_type: string;
  byte_size: number;
  alt_text: string;
  title: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function bannerError(error: { message?: string } | null | undefined, fallback: string) {
  const message = error?.message ?? '';
  const known = message.match(/(FORBIDDEN|INVALID_BANNER|BANNER_ALREADY_EXISTS|BANNER_NOT_FOUND)/)?.[1];
  const messages: Record<string, string> = {
    FORBIDDEN: 'Acesso não autorizado.',
    INVALID_BANNER: 'Revise os dados do banner e tente novamente.',
    BANNER_ALREADY_EXISTS: 'Este arquivo já está cadastrado.',
    BANNER_NOT_FOUND: 'Banner não encontrado.',
  };
  return known ? messages[known] : fallback;
}

async function signedBanners(rows: Banner[]) {
  const supabase = await createClient();
  const paths = rows.map(row => row.storage_object_path).filter(path => !/^https?:\/\//i.test(path));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from('catalog-banners').createSignedUrls(paths, 3600);
    for (const item of data ?? []) if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
  }
  return rows.map(row => ({ ...row, imageUrl: /^https?:\/\//i.test(row.storage_object_path) ? row.storage_object_path : signed.get(row.storage_object_path) ?? null }));
}

export async function listActiveBanners() {
  const { data, error } = await (await createClient()).from('banners').select('*').eq('status', 'ACTIVE').order('sort_order').order('created_at');
  if (error) return { ok: false as const, banners: [], message: 'Não foi possível carregar os destaques.' };
  return { ok: true as const, banners: await signedBanners((data ?? []) as Banner[]) };
}

export async function listAdminBanners() {
  const { data, error } = await (await createClient()).rpc('admin_list_banners');
  if (error) return { ok: false as const, banners: [] as Banner[], message: bannerError(error, 'Não foi possível carregar os banners.') };
  return { ok: true as const, banners: await signedBanners((data ?? []) as Banner[]) };
}

export async function createAdminBanner(input: { altText: string; title: string; sortOrder: number; status: 'ACTIVE' | 'INACTIVE'; file: File }) {
  const allowed = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
  const extension = allowed.get(input.file.type);
  if (!extension || input.file.size < 1 || input.file.size > 5 * 1024 * 1024 || !input.altText.trim() || input.sortOrder < 0) {
    return { ok: false as const, message: 'Arquivo inválido. Use JPEG, PNG ou WebP de até 5 MB e informe o texto alternativo.' };
  }
  const supabase = await createClient();
  const path = `banners/${crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from('catalog-banners').upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (upload.error) return { ok: false as const, message: 'Não foi possível armazenar o banner.' };
  const { data, error } = await supabase.rpc('admin_create_banner', { p_storage_object_path: path, p_mime_type: input.file.type, p_byte_size: input.file.size, p_alt_text: input.altText.trim(), p_title: input.title.trim() || undefined, p_sort_order: input.sortOrder, p_status: input.status });
  if (error) {
    await supabase.storage.from('catalog-banners').remove([path]);
    return { ok: false as const, message: bannerError(error, 'Não foi possível cadastrar o banner.') };
  }
  return { ok: true as const, banner: data as Banner };
}

export async function updateAdminBanner(input: { id: string; altText: string; title: string; sortOrder: number; status: 'ACTIVE' | 'INACTIVE' }) {
  const { data, error } = await (await createClient()).rpc('admin_update_banner', { p_banner_id: input.id, p_alt_text: input.altText.trim(), p_title: input.title.trim() || undefined, p_sort_order: input.sortOrder, p_status: input.status });
  if (error) return { ok: false as const, message: bannerError(error, 'Não foi possível atualizar o banner.') };
  return { ok: true as const, banner: data as Banner };
}
