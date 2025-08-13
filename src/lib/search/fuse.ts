import Fuse from 'fuse.js'
import type { Tables } from '@/types/supabase'

type ReleaseItemRow = Tables<'release_items'>

const fuseOptions: Fuse.IFuseOptions<ReleaseItemRow> = {
  includeScore: true,
  shouldSort: true,
  useExtendedSearch: true,
  threshold: 0.28,
  distance: 200,
  minMatchCharLength: 2,
  keys: [
    { name: 'title', weight: 0.72 },
    { name: 'description', weight: 0.28 },
  ],
}

export function createReleaseItemsFuseIndex(items: ReleaseItemRow[]) {
  return new Fuse(items, fuseOptions)
}

const titleOnlyOptions: Fuse.IFuseOptions<ReleaseItemRow> = {
  includeScore: true,
  shouldSort: true,
  useExtendedSearch: true,
  threshold: 0.28,
  distance: 200,
  minMatchCharLength: 2,
  keys: [{ name: 'title', weight: 1 }],
}

export function createReleaseItemsFuseIndexTitleOnly(items: ReleaseItemRow[]) {
  return new Fuse(items, titleOnlyOptions)
}


