-- 美食红黑榜 - 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行此文件

-- ===== 1. Profiles 用户资料表 =====
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自动创建 profile 的 trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===== 2. Restaurants 餐厅表 =====
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  country TEXT DEFAULT '中国',
  city TEXT,
  category TEXT,
  cuisine TEXT,
  price_range TEXT,
  avg_price DECIMAL(10,2),
  business_hours TEXT,
  description TEXT,
  phone TEXT,
  website TEXT,
  cover_image TEXT,
  images TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  is_approved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  list_type TEXT CHECK (list_type IN ('red', 'black')),
  eaten_status TEXT CHECK (eaten_status IN ('eaten', 'not_eaten')),
  reviewed_by UUID REFERENCES auth.users(id),
  red_list_count INTEGER DEFAULT 0,
  black_list_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_avg_rating ON restaurants(avg_rating DESC);
CREATE INDEX idx_restaurants_created_at ON restaurants(created_at DESC);
CREATE INDEX idx_restaurants_location ON restaurants(latitude, longitude);

-- ===== 3. Foods 菜品表 =====
CREATE TABLE foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  image TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_foods_restaurant ON foods(restaurant_id);

-- ===== 4. Reviews 评价表 =====
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  food_id UUID REFERENCES foods(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  taste_rating INTEGER CHECK (taste_rating >= 1 AND taste_rating <= 10),
  environment_rating INTEGER CHECK (environment_rating >= 1 AND environment_rating <= 10),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 10),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 10),
  would_revisit BOOLEAN DEFAULT true,
  list_type TEXT CHECK (list_type IN ('red', 'black')),
  title TEXT,
  content TEXT,
  images TEXT[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT true,
  eaten_status TEXT CHECK (eaten_status IN ('eaten', 'not_eaten')),
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_list_type ON reviews(list_type);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- ===== 5. Comments 评论回复表 =====
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_review ON comments(review_id);

-- ===== 6. Favorites 收藏表 =====
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ===== 7. Review Likes 点赞表 =====
CREATE TABLE review_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

CREATE INDEX idx_review_likes_review ON review_likes(review_id);

-- ===== 8. Tags 标签表 =====
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('cuisine', 'feature', 'warning', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初始标签数据
INSERT INTO tags (name, type) VALUES
  ('味道好', 'feature'), ('服务好', 'feature'), ('环境佳', 'feature'),
  ('性价比高', 'feature'), ('分量足', 'feature'), ('食材新鲜', 'feature'),
  ('味道差', 'warning'), ('服务差', 'warning'), ('环境差', 'warning'),
  ('性价比低', 'warning'), ('不卫生', 'warning'), ('虚假宣传', 'warning'),
  ('中餐', 'cuisine'), ('日料', 'cuisine'), ('韩餐', 'cuisine'),
  ('西餐', 'cuisine'), ('东南亚', 'cuisine'), ('火锅', 'cuisine'),
  ('烧烤', 'cuisine'), ('海鲜', 'cuisine'), ('甜品', 'cuisine');

-- ===== 9. Restaurant Tags 餐厅标签关联表 =====
CREATE TABLE restaurant_tags (
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (restaurant_id, tag_id)
);

-- ===== 10. Reports 举报表 =====
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT CHECK (target_type IN ('review', 'restaurant', 'comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 11. Browse History 浏览记录表 =====
CREATE TABLE browse_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_browse_history_user ON browse_history(user_id);

-- ===== 存储过程：更新餐厅评分统计 =====
CREATE OR REPLACE FUNCTION update_restaurant_stats(restaurant_id UUID)
RETURNS void AS $$
DECLARE
  v_avg DECIMAL(2,1);
  v_count INTEGER;
  v_red_count INTEGER;
  v_black_count INTEGER;
BEGIN
  SELECT COALESCE(AVG(rating)::DECIMAL(2,1), 0), COUNT(*)
  INTO v_avg, v_count
  FROM reviews
  WHERE restaurant_id = update_restaurant_stats.restaurant_id AND is_approved = true;

  SELECT COUNT(*) INTO v_red_count
  FROM reviews
  WHERE restaurant_id = update_restaurant_stats.restaurant_id AND list_type = 'red' AND is_approved = true;

  SELECT COUNT(*) INTO v_black_count
  FROM reviews
  WHERE restaurant_id = update_restaurant_stats.restaurant_id AND list_type = 'black' AND is_approved = true;

  UPDATE restaurants
  SET avg_rating = v_avg,
      review_count = v_count,
      red_list_count = v_red_count,
      black_list_count = v_black_count,
      updated_at = NOW()
  WHERE id = update_restaurant_stats.restaurant_id;
END;
$$ LANGUAGE plpgsql;

-- ===== RLS 策略 =====
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE browse_history ENABLE ROW LEVEL SECURITY;

-- profiles: 所有人可读，用户可更新自己
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- restaurants: 所有人可读已批准的，创建者可更新
CREATE POLICY "Approved restaurants are viewable" ON restaurants FOR SELECT USING (status = 'approved' OR auth.uid() = created_by OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Authenticated users can insert" ON restaurants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creator can update" ON restaurants FOR UPDATE USING (auth.uid() = created_by OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admin can delete" ON restaurants FOR DELETE USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- reviews: 所有人可读已批准的
CREATE POLICY "Approved reviews are viewable" ON reviews FOR SELECT USING (is_approved = true OR auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Authenticated users can insert reviews" ON reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- favorites: 用户管理自己的收藏
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- comments: 所有人可读
CREATE POLICY "Comments are viewable" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- review_likes: 用户管理自己的点赞
CREATE POLICY "Users can view likes" ON review_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON review_likes FOR DELETE USING (auth.uid() = user_id);

-- reports: 用户举报
CREATE POLICY "Authenticated users can report" ON reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- browse_history: 用户自己的浏览记录
CREATE POLICY "Users can view own history" ON browse_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON browse_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===== 存储桶创建（在 Supabase Dashboard > Storage 中手动创建） =====
-- 1. restaurant-images (Public) - 餐厅图片
-- 2. review-images (Public) - 评价图片
-- 3. avatars (Public) - 用户头像


-- ====================================================================
-- Migration: Add eaten_status and reviewed_by fields (v1.1)
-- Run this if you already have the tables created:
-- ====================================================================
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS eaten_status TEXT CHECK (eaten_status IN ('eaten', 'not_eaten'));
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
-- ALTER TABLE reviews ADD COLUMN IF NOT EXISTS eaten_status TEXT CHECK (eaten_status IN ('eaten', 'not_eaten'));
-- ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);


-- ====================================================================
-- Seed Data: 示例餐厅和评价（部署后可删除本段）
-- 需在有至少一个用户注册后手动执行，或替换 created_by 为实际用户 ID
-- ====================================================================

-- 注意：以下 SQL 中的 created_by 需要替换为实际注册用户的 UUID。
-- 你可以先注册一个账号，然后在 Supabase Dashboard > Authentication > Users 中复制你的 User ID，
-- 替换下面的 'REPLACE_WITH_YOUR_USER_ID'。

-- 示例餐厅（已审核通过）
-- INSERT INTO restaurants (id, name, address, city, cuisine, avg_price, description, latitude, longitude, status, is_approved, created_by, avg_rating, review_count, red_list_count, black_list_count) VALUES
-- (gen_random_uuid(), '老北京炸酱面馆', '东城区南锣鼓巷89号', '北京', '中餐', 35, '地道老北京炸酱面，手工擀面配秘制炸酱，胡同里的老味道。', 39.9375, 116.4033, 'approved', true, 'REPLACE_WITH_YOUR_USER_ID', 4.5, 3, 3, 0),
-- (gen_random_uuid(), '蜀大侠火锅', '朝阳区三里屯太古里B1', '北京', '火锅', 120, '成都排队王，牛油锅底香浓醇厚，毛肚黄喉必点。', 39.9336, 116.4609, 'approved', true, 'REPLACE_WITH_YOUR_USER_ID', 4.2, 5, 4, 1),
-- (gen_random_uuid(), '鮨一日本料理', '静安区南京西路1515号', '上海', '日料', 380, '板前Omakase，食材每日空运，主厨曾在银座修业十年。', 31.2304, 121.4495, 'approved', true, 'REPLACE_WITH_YOUR_USER_ID', 4.7, 4, 4, 0),
-- (gen_random_uuid(), 'XX网红奶茶店', '海淀区中关村大街1号', '北京', '甜品', 28, '排队两小时买的奶茶，味道跟路边摊没有区别，纯属营销炒作。', 39.9836, 116.3198, 'approved', true, 'REPLACE_WITH_YOUR_USER_ID', 1.8, 3, 0, 3),
-- (gen_random_uuid(), '潮汕牛肉火锅', '天河区体育西路78号', '广州', '火锅', 90, '每日鲜切牛肉，吊龙、匙柄、胸口油，蘸沙茶酱绝了。', 23.1291, 113.3269, 'approved', true, 'REPLACE_WITH_YOUR_USER_ID', 4.4, 3, 3, 0),
-- (gen_random_uuid(), 'The Rug 西餐厅', '朝阳区朝阳公园南路6号', '北京', '西餐', 220, '京城老牌Brunch，班尼迪克蛋和松饼是招牌，环境适合约会。', 39.9427, 116.4768, 'approved', true, 'REPLACE_WITH_YOUR_USER_ID', 4.0, 4, 3, 1),
-- (gen_random_uuid(), 'XX海鲜自助', '浦东新区陆家嘴环路168号', '上海', '海鲜', 298, '说是海鲜自助，大部分是冷冻货，龙虾还要加钱，不值这个价。', 31.2397, 121.5015, 'approved', true, 'REPLACE_WITH_YOUR_USER_ID', 2.0, 2, 0, 2),
-- (gen_random_uuid(), '明洞韩国料理', '朝阳区望京街10号', '北京', '韩餐', 85, '望京韩国人开的店，炸鸡啤酒和部队锅很正宗，泡菜无限续。', 39.9974, 116.4793, 'approved', true, 'REPLACE_WITH_YOUR_USER_ID', 4.1, 3, 3, 0);
