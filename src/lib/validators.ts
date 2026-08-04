import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, MAX_IMAGES_PER_REVIEW } from './constants';

export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export function validateRestaurant(data: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('餐厅名称不能为空');
  }
  if (data.name && typeof data.name === 'string' && data.name.trim().length > 100) {
    errors.push('餐厅名称不能超过100个字符');
  }
  if (data.description && typeof data.description === 'string' && data.description.length > 2000) {
    errors.push('描述不能超过2000个字符');
  }
  return { valid: errors.length === 0, errors };
}

export function validateReview(data: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.restaurant_id || typeof data.restaurant_id !== 'string') {
    errors.push('请选择餐厅');
  }
  if (!data.rating || typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
    errors.push('评分必须在1-5之间');
  }
  if (!data.list_type || !['red', 'black', 'gray'].includes(data.list_type as string)) {
    errors.push('请选择红榜或黑榜');
  }
  if (data.content && typeof data.content === 'string' && data.content.length > 5000) {
    errors.push('评价内容不能超过5000个字符');
  }
  return { valid: errors.length === 0, errors };
}

export function validateImage(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: '不支持的图片格式，请上传 JPG/PNG/WebP 格式' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: '图片大小不能超过 5MB' };
  }
  return { valid: true };
}

export function validateImages(files: File[]): { valid: boolean; error?: string } {
  if (files.length > MAX_IMAGES_PER_REVIEW) {
    return { valid: false, error: `最多上传 ${MAX_IMAGES_PER_REVIEW} 张图片` };
  }
  for (const file of files) {
    const result = validateImage(file);
    if (!result.valid) return result;
  }
  return { valid: true };
}
