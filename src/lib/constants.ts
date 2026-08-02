export const APP_NAME = '美食红黑榜';
export const APP_DESCRIPTION = '记录美食体验，分享红黑榜单';

export const CUISINE_TYPES = [
  '中餐', '日料', '韩餐', '西餐', '东南亚菜',
  '火锅', '烧烤', '海鲜', '小吃', '甜品',
  '咖啡', '酒吧', '快餐', '自助', '其他',
] as const;

export const PRICE_RANGES = [
  { label: '¥50以下', value: 'low' },
  { label: '¥50-100', value: 'medium' },
  { label: '¥100-200', value: 'high' },
  { label: '¥200以上', value: 'luxury' },
] as const;

export const RED_TAGS = [
  '味道好', '性价比高', '服务好', '环境佳',
  '分量足', '食材新鲜', '有特色', '适合约会',
  '适合聚餐', '适合一人食', '网红打卡', '老字号',
] as const;

export const BLACK_TAGS = [
  '味道差', '服务差', '性价比低', '环境差',
  '不卫生', '分量少', '食材不新鲜', '等位太久',
  '态度恶劣', '虚假宣传', '价格虚高',
] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGES_PER_REVIEW = 6;

export const ITEMS_PER_PAGE = 12;

export const MAP_DEFAULT_CENTER: [number, number] = [39.9042, 116.4074]; // Beijing
export const MAP_DEFAULT_ZOOM = 12;
