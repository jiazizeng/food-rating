'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { CUISINE_TYPES } from '@/lib/constants';
import { validateImage } from '@/lib/validators';
import { useState } from 'react';
import { ImagePlus, X, MapPin, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export function RestaurantForm() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const supabase = createClient();

  const [listType, setListType] = useState<'red' | 'black'>('red');
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '中国',
    cuisine: '',
    category: '',
    price_range: '',
    avg_price: '',
    business_hours: '',
    description: '',
    phone: '',
    website: '',
    latitude: '',
    longitude: '',
  });

  const [geocoding, setGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImage(file);
    if (!validation.valid) { toast.error(validation.error!); return; }
    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleGeocode = async () => {
    if (!form.address) { toast.error('请先填写地址'); return; }
    setGeocoding(true);
    setGeoStatus('idle');
    try {
      const query = [form.name, form.city, form.address].filter(Boolean).join(' ');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        setForm(prev => ({
          ...prev,
          latitude: data[0].lat,
          longitude: data[0].lon,
        }));
        setGeoStatus('success');
        toast.success('坐标获取成功！');
      } else {
        setGeoStatus('failed');
        toast.error('未找到坐标，请尝试更详细的地址或手动输入');
      }
    } catch {
      setGeoStatus('failed');
      toast.error('地理编码服务不可用，请手动输入坐标');
    } finally {
      setGeocoding(false);
    }
  };

  const uploadCover = async (): Promise<string | null> => {
    if (!coverImage) return null;
    const fileName = `${user!.id}/restaurants/${Date.now()}-${coverImage.name}`;
    const { data, error } = await supabase.storage
      .from('restaurant-images')
      .upload(fileName, coverImage);
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('请先登录'); return; }
    if (!form.name.trim()) { toast.error('请输入餐厅名称'); return; }

    setSubmitting(true);
    try {
      const coverUrl = await uploadCover();

      const lat = form.latitude ? parseFloat(form.latitude) : null;
      const lng = form.longitude ? parseFloat(form.longitude) : null;

      const { data, error } = await supabase.from('restaurants').insert({
        name: form.name.trim(),
        address: form.address || null,
        city: form.city || null,
        country: form.country,
        cuisine: form.cuisine || null,
        category: form.category || null,
        price_range: form.price_range || null,
        avg_price: form.avg_price ? parseFloat(form.avg_price) : null,
        business_hours: form.business_hours || null,
        description: form.description || null,
        phone: form.phone || null,
        website: form.website || null,
        cover_image: coverUrl,
        latitude: lat,
        longitude: lng,
        created_by: user.id,
        list_type: listType,
        status: profile?.role === 'admin' ? 'approved' : 'pending',
      }).select('id').single();

      if (error) throw error;
      toast.success('餐厅添加成功！等待审核通过后即可展示');
      router.push(`/restaurant/${data.id}`);
    } catch (err: unknown) {
      let message = '添加失败';
      if (err instanceof Error) {
        message = err.message;
      } else if (err && typeof err === 'object' && 'message' in err) {
        message = String((err as { message: unknown }).message);
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-3">请先登录后再添加餐厅</p>
        <a href="/login" className="text-orange-600 font-medium hover:underline">前往登录</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5">
      {/* Red/Black toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">红黑榜分类 *</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setListType('red')}
            className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${
              listType === 'red'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-green-200'
            }`}
          >
            <span className="text-2xl">👍</span>
            <p className={`text-sm font-bold mt-1 ${listType === 'red' ? 'text-green-700' : 'text-gray-500'}`}>红榜推荐</p>
            <p className="text-[10px] text-gray-400 mt-0.5">推荐好餐厅</p>
          </button>
          <button
            type="button"
            onClick={() => setListType('black')}
            className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${
              listType === 'black'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 bg-white hover:border-red-200'
            }`}
          >
            <span className="text-2xl">👎</span>
            <p className={`text-sm font-bold mt-1 ${listType === 'black' ? 'text-red-700' : 'text-gray-500'}`}>黑榜避雷</p>
            <p className="text-[10px] text-gray-400 mt-0.5">帮大家避坑</p>
          </button>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">餐厅名称 *</label>
        <input name="name" value={form.name} onChange={handleChange} required
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          placeholder="例如：海底捞火锅" />
      </div>

      {/* Cover image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">封面图片</label>
        {coverPreview ? (
          <div className="relative h-48 rounded-lg overflow-hidden bg-gray-100">
            <img src={coverPreview} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => { setCoverImage(null); setCoverPreview(null); }}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors">
            <div className="text-center">
              <ImagePlus className="mx-auto h-8 w-8 mb-1" />
              <span className="text-sm">点击上传封面图</span>
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
          <input name="city" value={form.city} onChange={handleChange}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            placeholder="例如：北京" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
          <input name="address" value={form.address} onChange={handleChange}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            placeholder="详细地址" />
        </div>
      </div>

      {/* Coordinates for navigation */}
      <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">坐标定位（用于地图导航）</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          填写地址后点击「自动获取」，或手动输入经纬度。有了坐标才能在详情页使用高德/百度地图一键导航。
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] text-gray-500 mb-0.5">纬度 (Latitude)</label>
            <input
              name="latitude"
              value={form.latitude}
              onChange={handleChange}
              type="number"
              step="any"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="例如：39.9042"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-0.5">经度 (Longitude)</label>
            <input
              name="longitude"
              value={form.longitude}
              onChange={handleChange}
              type="number"
              step="any"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="例如：116.4074"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGeocode}
            disabled={geocoding}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            自动获取坐标
          </button>
          {geoStatus === 'success' && (
            <span className="text-xs text-green-600 font-medium">✅ 已获取</span>
          )}
          {geoStatus === 'failed' && (
            <span className="text-xs text-amber-600">
              ⚠️ 获取失败，请手动输入或从
              <a href="https://lbs.amap.com/tools/picker" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mx-0.5">高德坐标拾取</a>
              复制
            </span>
          )}
          {geoStatus === 'idle' && (
            <a
              href="https://lbs.amap.com/tools/picker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-blue-600 underline"
            >
              手动拾取坐标 →
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">菜系</label>
          <select name="cuisine" value={form.cuisine} onChange={handleChange}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none">
            <option value="">选择菜系</option>
            {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">人均消费</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">¥</span>
            <input name="avg_price" type="number" value={form.avg_price} onChange={handleChange}
              className="w-full rounded-lg border border-gray-200 pl-7 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              placeholder="0" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">营业时间</label>
        <input name="business_hours" value={form.business_hours} onChange={handleChange}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          placeholder="例如：11:00-22:00" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
          <input name="phone" value={form.phone} onChange={handleChange}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            placeholder="联系电话" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">网站</label>
          <input name="website" value={form.website} onChange={handleChange}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            placeholder="官网链接" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={3}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
          placeholder="简单介绍一下这家餐厅..." />
      </div>

      <button type="submit" disabled={submitting}
        className="w-full rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors">
        {submitting ? '提交中...' : '添加餐厅'}
      </button>
    </form>
  );
}
