'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { validateImages } from '@/lib/validators';
import { RED_TAGS, BLACK_TAGS } from '@/lib/constants';
import { useState } from 'react';
import { ImagePlus, X, ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReviewFormProps {
  restaurantId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type DimKey = 'taste' | 'environment' | 'service' | 'value';
const DIM_LABELS: Record<DimKey, { label: string; desc: string }> = {
  taste: { label: '味道', desc: '口味好不好吃' },
  environment: { label: '环境', desc: '就餐环境舒适度' },
  service: { label: '服务', desc: '店员服务态度' },
  value: { label: '性价比', desc: '值不值得这个价' },
};

export function ReviewForm({ restaurantId, onSuccess, onCancel }: ReviewFormProps) {
  const { user } = useAuth();
  const [listType, setListType] = useState<'red' | 'black'>('red');
  const [dims, setDims] = useState<Record<DimKey, number>>({ taste: 0, environment: 0, service: 0, value: 0 });
  const [wouldRevisit, setWouldRevisit] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const tags = listType === 'red' ? RED_TAGS : BLACK_TAGS;

  const getTagClass = (tag: string) => {
    if (selectedTags.includes(tag)) {
      return listType === 'red'
        ? 'bg-green-100 text-green-700 border border-green-300'
        : 'bg-red-100 text-red-700 border border-red-300';
    }
    return 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100';
  };

  const calcOverall = () => {
    const vals = Object.values(dims).filter(v => v > 0);
    if (vals.length === 0) return 0;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round(sum / vals.length / 2); // 1-10 scale → 1-5 stars
  };

  const setDim = (key: DimKey, value: number) => {
    setDims(prev => ({ ...prev, [key]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allFiles = [...images, ...files];
    const validation = validateImages(allFiles);
    if (!validation.valid) { toast.error(validation.error!); return; }
    setImages(allFiles);
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    const urls: string[] = [];
    for (const img of images) {
      const fileName = `${user!.id}/${Date.now()}-${img.name}`;
      const { data, error } = await supabase.storage.from('review-images').upload(fileName, img);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('review-images').getPublicUrl(data.path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('请先登录'); return; }
    const hasRating = Object.values(dims).some(v => v > 0);
    if (!hasRating) { toast.error('请至少给一个维度打分'); return; }

    setSubmitting(true);
    const overall = calcOverall();
    try {
      const imageUrls = await uploadImages();
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        restaurant_id: restaurantId,
        rating: overall || 3,
        taste_rating: dims.taste || null,
        environment_rating: dims.environment || null,
        service_rating: dims.service || null,
        value_rating: dims.value || null,
        would_revisit: wouldRevisit,
        list_type: listType,
        title: title || null,
        content: content || null,
        images: imageUrls,
      });
      if (error) throw error;
      await supabase.rpc('update_restaurant_stats', { restaurant_id: restaurantId });
      toast.success('评价发布成功');
      onSuccess?.();
    } catch (err: unknown) {
      let message = '发布失败';
      if (err && typeof err === 'object' && 'message' in err) {
        message = String((err as { message: unknown }).message);
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const DimSlider = ({ dim }: { dim: DimKey }) => {
    const val = dims[dim];
    const { label, desc } = DIM_LABELS[dim];
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-xs text-gray-400">{desc}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setDim(dim, n)}
              className={cn(
                'flex-1 h-7 rounded-md text-[10px] font-medium transition-all',
                n <= val
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <h3 className="font-bold text-gray-900 text-lg mb-5">发布评价</h3>

      {/* List type */}
      <div className="flex gap-3 mb-5">
        <button type="button" onClick={() => setListType('red')}
          className={cn('flex-1 rounded-xl border-2 p-4 text-center transition-all',
            listType === 'red' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-green-200')}>
          <ThumbsUp className={cn('mx-auto h-6 w-6', listType === 'red' ? 'text-green-600' : 'text-gray-300')} />
          <p className={cn('text-sm font-bold mt-1', listType === 'red' ? 'text-green-700' : 'text-gray-500')}>红榜推荐</p>
        </button>
        <button type="button" onClick={() => setListType('black')}
          className={cn('flex-1 rounded-xl border-2 p-4 text-center transition-all',
            listType === 'black' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-red-200')}>
          <ThumbsDown className={cn('mx-auto h-6 w-6', listType === 'black' ? 'text-red-600' : 'text-gray-300')} />
          <p className={cn('text-sm font-bold mt-1', listType === 'black' ? 'text-red-700' : 'text-gray-500')}>黑榜避雷</p>
        </button>
      </div>

      {/* Multi-dimension ratings */}
      <div className="mb-5 p-4 rounded-xl bg-gray-50/50">
        <p className="text-sm font-medium text-gray-700 mb-3">多维评分（1-10分）</p>
        <DimSlider dim="taste" />
        <DimSlider dim="environment" />
        <DimSlider dim="service" />
        <DimSlider dim="value" />
        {calcOverall() > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-sm text-gray-500">综合评分：</span>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className={cn('h-5 w-5', n <= calcOverall() ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
              ))}
            </div>
            <span className="text-sm font-bold text-amber-600">{calcOverall()}/5</span>
          </div>
        )}
      </div>

      {/* Would revisit */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">是否愿意再来？</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setWouldRevisit(true)}
            className={cn('flex-1 rounded-lg py-2.5 text-sm font-medium transition-all',
              wouldRevisit ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-green-50')}>
            👍 愿意再来
          </button>
          <button type="button" onClick={() => setWouldRevisit(false)}
            className={cn('flex-1 rounded-lg py-2.5 text-sm font-medium transition-all',
              !wouldRevisit ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-50')}>
            👎 不再来了
          </button>
        </div>
      </div>

      {/* Title & Content */}
      <input type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="评价标题（选填）" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none mb-3" />
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
        placeholder="分享你的真实用餐体验..." className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none resize-none mb-4" />

      {/* Tags */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">{listType === 'red' ? '推荐标签' : '避雷标签'}</label>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
              className={cn('rounded-full px-3 py-1.5 text-xs font-medium transition-colors', getTagClass(tag))}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="mb-5">
        <div className="flex flex-wrap gap-2">
          {imagePreviews.map((url, i) => (
            <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < 6 && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300 transition-colors">
              <ImagePlus className="h-5 w-5" />
              <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting}
          className={cn('flex-1 rounded-xl py-3 text-sm font-bold text-white transition-all',
            listType === 'red' ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' : 'bg-red-500 hover:bg-red-600',
            submitting && 'opacity-50')}>
          {submitting ? '发布中...' : '发布评价'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">取消</button>
        )}
      </div>
    </form>
  );
}
