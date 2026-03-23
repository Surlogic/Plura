import type { Category } from './category';

export type HomeStats = {
  activeUsers: number;
  professionals: number;
  categories: number;
  monthlyBookings: number;
};

export type HomeTopProfessional = {
  id: string;
  slug: string;
  name: string;
  category: string;
  rating?: number | null;
  reviewsCount?: number | null;
  imageUrl?: string | null;
};

export type HomeResponse = {
  stats: HomeStats;
  categories: Category[];
  topProfessionals: HomeTopProfessional[];
};
