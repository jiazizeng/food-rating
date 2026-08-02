'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { CUISINE_TYPES, PRICE_RANGES } from '@/lib/constants';
import { validateImage } from '@/lib/validators';
import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
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
  });

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

      // Geocode address to get lat/lng
      let lat: number | null = null;
      let lng: number | null = null;
      if (form.address) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}&limit=1`
          );
          const data = await res.json();
          if (data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
          }
        } catch {}
      }

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
      const message = err instanceof Error ? err.message : '添加失败';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-3">请先登录后再添加餐厅</p>
        <a href="/login" className="text-indigo-600 font-medium hover:underline">前往登录</a>
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
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
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
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="例如：北京" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
          <input name="address" value={form.address} onChange={handleChange}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="详细地址" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">菜系</label>
          <select name="cuisine" value={form.cuisine} onChange={handleChange}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="">选择菜系</option>
            {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">人均消费</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">¥</span>
            <input name="avg_price" type="number" value={form.avg_price} onChange={handleChange}
              className="w-full rounded-lg border border-gray-200 pl-7 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="0" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">营业时间</label>
        <input name="business_hours" value={form.business_hours} onChange={handleChange}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          placeholder="例如：11:00-22:00" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
          <input name="phone" value={form.phone} onChange={handleChange}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="联系电话" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">网站</label>
          <input name="website" value={form.website} onChange={handleChange}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="官网链接" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={3}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
          placeholder="简单介绍一下这家餐厅..." />
      </div>

      <button type="submit" disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
        {submitting ? '提交中...' : '添加餐厅'}
      </button>
    </form>
  );
}
