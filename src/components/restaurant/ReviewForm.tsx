'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { StarRating } from '@/components/shared/StarRating';
import { validateImages } from '@/lib/validators';
import { RED_TAGS, BLACK_TAGS } from '@/lib/constants';
import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReviewFormProps {
  restaurantId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({ restaurantId, onSuccess, onCancel }: ReviewFormProps) {
  const { user, profile } = useAuth();
  const [listType, setListType] = useState<'red' | 'black'>('red');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const tags = listType === 'red' ? RED_TAGS : BLACK_TAGS;

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
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
      const { data, error } = await supabase.storage
        .from('review-images')
        .upload(fileName, img);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('review-images')
        .getPublicUrl(data.path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('请先登录'); return; }
    if (rating === 0) { toast.error('请评分'); return; }

    setSubmitting(true);
    try {
      const imageUrls = await uploadImages();
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        restaurant_id: restaurantId,
        rating,
        list_type: listType,
        title: title || null,
        content: content || null,
        images: imageUrls,
      });
      if (error) throw error;

      // Update restaurant stats
      await supabase.rpc('update_restaurant_stats', { restaurant_id: restaurantId });

      toast.success('评价发布成功');
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '发布失败';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="font-semibold text-gray-900 mb-4">发布评价</h3>

      {/* List type toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setListType('red')}
          className={cn(
            'flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors',
            listType === 'red'
              ? 'bg-green-500 text-white'
              : 'bg-gray-50 text-gray-500 hover:bg-green-50'
          )}
        >
          👍 红榜推荐
        </button>
        <button
          type="button"
          onClick={() => setListType('black')}
          className={cn(
            'flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors',
            listType === 'black'
              ? 'bg-red-500 text-white'
              : 'bg-gray-50 text-gray-500 hover:bg-red-50'
          )}
        >
          👎 黑榜避雷
        </button>
      </div>

      {/* Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">评分</label>
        <StarRating rating={rating} interactive onChange={setRating} size="lg" showValue />
      </div>

      {/* Title */}
      <div className="mb-4">
        <input
          type="text" value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="评价标题（选填）"
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="分享你的用餐体验..."
          rows={4}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
        />
      </div>

      {/* Tags */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {listType === 'red' ? '推荐标签' : '避雷标签'}
        </label>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <button
              key={tag} type="button"
              onClick={() => handleTagToggle(tag)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                selectedTags.includes(tag)
                  ? listType === 'red'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Image upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">上传图片（选填，最多6张）</label>
        <div className="flex flex-wrap gap-2">
          {imagePreviews.map((url, i) => (
            <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < 6 && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors">
              <ImagePlus className="h-5 w-5" />
              <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit" disabled={submitting}
          className={cn(
            'flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors',
            listType === 'red' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600',
            submitting && 'opacity-50'
          )}
        >
          {submitting ? '发布中...' : '发布评价'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            取消
          </button>
        )}
      </div>
    </form>
  );
}
