import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedRedList } from '@/components/home/FeaturedList';
import { FeaturedBlackList } from '@/components/home/FeaturedList';
import { SearchBar } from '@/components/home/SearchBar';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedRedList />
      <FeaturedBlackList />
      {/* CTA */}
      <section className="py-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-2xl font-bold text-gray-900">加入美食红黑榜</h2>
          <p className="mt-3 text-gray-500">分享你的真实用餐体验，帮助更多人找到好味道，避开踩坑店。</p>
          <div className="mt-6">
            <a
              href="/add-restaurant"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              开始贡献
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
