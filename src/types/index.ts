export type UserRole = 'user' | 'admin';
export type ListType = 'red' | 'black';
export type RestaurantStatus = 'pending' | 'approved' | 'rejected';
export type ReportTargetType = 'review' | 'restaurant' | 'comment';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type TagType = 'cuisine' | 'feature' | 'warning' | 'general';
export type EatenStatus = 'eaten' | 'not_eaten';

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  city: string | null;
  category: string | null;
  cuisine: string | null;
  price_range: string | null;
  avg_price: number | null;
  business_hours: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  cover_image: string | null;
  images: string[];
  created_by: string | null;
  is_approved: boolean;
  status: RestaurantStatus;
  list_type: ListType | null;
  eaten_status: EatenStatus | null;
  reviewed_by: string | null;
  red_list_count: number;
  black_list_count: number;
  avg_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  created_by_profile?: Profile;
  tags?: Tag[];
}

export interface Food {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image: string | null;
  rating: number;
  created_at: string;
  // joined
  is_favorited?: boolean;
  restaurant_name?: string;
}

export interface Review {
  id: string;
  user_id: string;
  restaurant_id: string;
  food_id: string | null;
  rating: number;
  taste_rating: number;
  environment_rating: number;
  service_rating: number;
  value_rating: number;
  would_revisit: boolean;
  list_type: ListType;
  title: string | null;
  content: string | null;
  images: string[];
  likes_count: number;
  is_approved: boolean;
  eaten_status: EatenStatus | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
  reviewed_by_profile?: Profile;
  restaurant?: Restaurant;
  food?: Food;
  liked_by_me?: boolean;
}

export interface Comment {
  id: string;
  user_id: string;
  review_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  user?: Profile;
  replies?: Comment[];
}

export interface Tag {
  id: string;
  name: string;
  type: TagType;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
  restaurant?: Restaurant;
}

export interface DishFavorite {
  id: string;
  user_id: string;
  food_id: string;
  created_at: string;
  food?: Food;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface BrowseHistory {
  id: string;
  user_id: string;
  restaurant_id: string;
  viewed_at: string;
  restaurant?: Restaurant;
}

export interface ReviewLike {
  id: string;
  user_id: string;
  review_id: string;
  created_at: string;
}

export interface RestaurantTag {
  restaurant_id: string;
  tag_id: string;
}

export interface StatsData {
  topRedRestaurants: Restaurant[];
  topBlackRestaurants: Restaurant[];
  cityRankings: { city: string; count: number; avg_rating: number }[];
  topContributors: { user: Profile; count: number }[];
  totalRestaurants: number;
  totalReviews: number;
  totalUsers: number;
}
