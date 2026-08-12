import { supabase } from '../supabaseClient';

/**
 * Converte uma string Base64 (data:image/jpeg;base64,...) em um Blob para upload.
 */
export function base64ToBlob(base64Str: string): Blob {
  const parts = base64Str.split(';base64,');
  const contentType = parts[0].replace('data:', '') || 'image/jpeg';
  const raw = window.atob(parts[1] || parts[0]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Realiza o upload de uma foto (Base64 ou Blob) para o Supabase Storage.
 * Se a foto já for uma URL (começar com http/https), ela é retornada sem alterações.
 * Se o upload falhar ou o dispositivo estiver offline, a imagem em Base64 é retornada como fallback seguro.
 */
export async function uploadPhotoToStorage(
  photoStr: string,
  subFolder: 'inspection-photos' | 'rdo-photos' | 'signatures',
  recordId: string,
  index: number = 0
): Promise<string> {
  // Se já for uma URL da web, não precisa fazer upload novamente
  if (!photoStr || photoStr.startsWith('http://') || photoStr.startsWith('https://')) {
    return photoStr;
  }

  // Se não for Base64 (data:), retorna o original
  if (!photoStr.startsWith('data:')) {
    return photoStr;
  }

  try {
    const blob = base64ToBlob(photoStr);
    const cleanRecordId = (recordId || 'temp').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanRecordId}_${Date.now()}_${index}.jpg`;
    const filePath = `${subFolder}/${cleanRecordId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('assets')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.warn(`[StorageService] Upload falhou para ${filePath}: ${error.message}. Mantendo fallback em Base64.`);
      return photoStr;
    }

    const { data: publicUrlData } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      console.log(`[StorageService] Upload concluído com sucesso: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;
    }

    return photoStr;
  } catch (err) {
    console.warn('[StorageService] Exceção ao processar upload:', err);
    return photoStr;
  }
}

/**
 * Processa um array de fotos (que pode conter Base64 e/ou URLs), convertendo
 * todas as strings Base64 para URLs no Storage.
 */
export async function processPhotosArray(
  photos: string[] | undefined,
  subFolder: 'inspection-photos' | 'rdo-photos' | 'signatures',
  recordId: string
): Promise<string[]> {
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return [];
  }

  const processed: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const url = await uploadPhotoToStorage(photos[i], subFolder, recordId, i);
    processed.push(url);
  }
  return processed;
}
