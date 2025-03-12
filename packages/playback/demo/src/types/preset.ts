import { Tag } from './tag'

export interface Preset {
  id: string;
  name: string;
  tags: Tag[];
  isPublic: boolean;
  url: string;
}
