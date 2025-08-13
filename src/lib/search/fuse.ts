import Fuse from 'fuse.js'
import type { ReleaseItem } from '@/types/db'

const fuseOptions: Fuse.IFuseOptions<ReleaseItem> = {
  includeScore: true,
  threshold: 0.3,
  keys: [
    { name: 'title', weight: 0.7 },
    { name: 'description', weight: 0.3 },
  ],
}

export function createReleaseItemsFuseIndex(items: ReleaseItem[]) {
  return new Fuse(items, fuseOptions)
}


