export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type DocumentVariant = {
  id: string;
  document_id: string;
  label: string;
  price: number;
  enabled: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type DocumentImage = {
  id: string;
  document_id: string;
  variant_id: string | null;
  image_path: string;
  alt_text: string | null;
  sort_order: number;
  created_at?: string;
};

export type DocumentReview = {
  id: string;
  document_id: string;
  name: string;
  rating: number;
  comment: string;
  approved: boolean;
  created_at: string;
  updated_at?: string;
};

export type MarketplaceDocument = {
  id: string;
  title: string;
  description: string | null;
  title_en?: string | null;
  description_en?: string | null;
  title_so?: string | null;
  description_so?: string | null;
  category_id: string | null;
  file_path: string | null;
  thumbnail_path: string | null;
  price: number;
  is_free: boolean;
  payment_link: string | null;
  published: boolean;
  download_enabled: boolean;
  product_type: string;
  download_count: number;
  created_at: string;
  updated_at: string;
  variants?: DocumentVariant[];
  images?: DocumentImage[];
  reviews?: DocumentReview[];
};