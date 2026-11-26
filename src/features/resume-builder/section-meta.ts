import {
  Award,
  BookOpen,
  Briefcase,
  FolderGit2,
  GraduationCap,
  HandHeart,
  Heart,
  Languages,
  LayoutList,
  Medal,
  TextQuote,
  Trophy,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { createElement } from 'react';
import { ENTRY_TITLE_FIELDS } from '@/constants/sections';
import type { ListSectionKey, Resume } from '@/types/resume';

const ICONS: Record<string, LucideIcon> = {
  personal: UserRound,
  summary: TextQuote,
  experience: Briefcase,
  education: GraduationCap,
  skills: Wrench,
  projects: FolderGit2,
  certifications: Award,
  languages: Languages,
  awards: Trophy,
  achievements: Medal,
  volunteer: HandHeart,
  publications: BookOpen,
  references: Users,
  interests: Heart,
};

export function SectionIcon({ section, className }: { section: string; className?: string }) {
  return createElement(ICONS[section] ?? LayoutList, { className, 'aria-hidden': true });
}

export type SectionStatus = 'empty' | 'partial' | 'complete';

/** A rough guide to what is filled in. It makes no claim about quality. */
export function sectionStatus(resume: Resume, key: string): SectionStatus {
  const { data } = resume;
  if (key === 'personal') {
    const { fullName, email, phone, headline, location } = data.personal;
    if (fullName.trim() && (email.trim() || phone.trim())) return 'complete';
    return [fullName, email, phone, headline, location].some((v) => v.trim()) ? 'partial' : 'empty';
  }
  if (key === 'summary') {
    if (data.summary.professional.trim()) return 'complete';
    return Object.values(data.summary).some((v) => v.trim()) ? 'partial' : 'empty';
  }
  const named = (values: string[]) =>
    values.length === 0 ? 'empty' : values.every((v) => v.trim()) ? 'complete' : 'partial';
  if (key.startsWith('custom:')) {
    const items = data.custom.find((c) => `custom:${c.id}` === key)?.items ?? [];
    return named(items.map((item) => item.title || item.description));
  }
  const [field] = ENTRY_TITLE_FIELDS[key as ListSectionKey];
  const list = data[key as ListSectionKey] as unknown as Record<string, string>[];
  return named(list.map((entry) => entry[field] ?? ''));
}
