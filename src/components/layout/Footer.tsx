import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{APP_NAME}</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              记录每一餐的真实体验，<br />分享美食红黑榜单。
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">浏览</h4>
            <div className="flex flex-col gap-1.5">
              <Link href="/red-list" className="text-xs text-gray-500 hover:text-green-600">美食红榜</Link>
              <Link href="/gray-list" className="text-xs text-gray-500 hover:text-gray-700">灰榜记录</Link>
              <Link href="/black-list" className="text-xs text-gray-500 hover:text-red-600">避雷黑榜</Link>
              <Link href="/map" className="text-xs text-gray-500 hover:text-blue-600">美食地图</Link>
              <Link href="/stats" className="text-xs text-gray-500 hover:text-purple-600">数据统计</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">功能</h4>
            <div className="flex flex-col gap-1.5">
              <Link href="/add-restaurant" className="text-xs text-gray-500 hover:text-gray-900">添加餐厅</Link>
              <Link href="/search" className="text-xs text-gray-500 hover:text-gray-900">搜索美食</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">声明</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              本站为个人使用，<br />
              所有评价仅代表个人观点。<br />
              数据来自用户贡献，仅供参考。
            </p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-50 text-center text-xs text-gray-400">
          本站仅供个人使用 · 观点仅代表个人 · © {new Date().getFullYear()} {APP_NAME}
        </div>
      </div>
    </footer>
  );
}
