import type { Resume } from '@/types/resume';

export const SORT_KEYS = ['updatedAt', 'createdAt', 'title'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function filterResumes(
  resumes: Resume[],
  query: string,
  sort: SortKey,
  /** More text to search, such as the template's name. */
  extra: (resume: Resume) => string = () => '',
) {
  const needle = query.trim().toLocaleLowerCase();
  return resumes
    .filter((r) =>
      [r.title, r.data.personal.fullName, r.data.personal.headline, r.targetRole, extra(r)]
        .join(' ')
        .toLocaleLowerCase()
        .includes(needle),
    )
    .sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : b[sort] - a[sort]));
}
