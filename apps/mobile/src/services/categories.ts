import { listServiceCategories } from './professionalConfig';
import type { ServiceCategoryOption } from '../types/professional';

export const listCategories = async (): Promise<ServiceCategoryOption[]> =>
  listServiceCategories();
