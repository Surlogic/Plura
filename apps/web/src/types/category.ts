export type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  displayOrder?: number | null;
  professionalsCount?: number | null;
};