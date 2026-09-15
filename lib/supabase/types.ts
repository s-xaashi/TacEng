export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type MarketplaceDocument = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  file_path: string | null;
  thumbnail_path: string | null;
  price: number;
  is_free: boolean;
  payment_link: string | null;
  published: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
};
