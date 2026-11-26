import type { Design, PageSize, ContentLanguage } from '@/types/resume';
import type { BuiltInSection } from '@/constants/sections';

export const TEMPLATE_CATEGORIES = [
  'professional',
  'modern',
  'classic',
  'minimalist',
  'creative',
  'executive',
  'academic',
  'ats',
  'student',
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export type HeaderVariant =
  | 'classic'
  | 'corporate'
  | 'plain'
  | 'band'
  | 'stacked'
  | 'portrait'
  | 'quiet'
  | 'serif'
  | 'poster'
  | 'profile'
  | 'ats'
  | 'stripe';

export type HeadingVariant =
  | 'centered'
  | 'tab'
  | 'underline'
  | 'marker'
  | 'spaced'
  | 'plain'
  | 'gutter'
  | 'ornament'
  | 'numbered'
  | 'bar'
  | 'rule'
  | 'chip';

export type EntryVariant = 'stacked' | 'split' | 'dated' | 'timeline';
export type SkillVariant = 'inline' | 'grouped' | 'bars' | 'tags' | 'columns' | 'dots';

export type SidebarSection = BuiltInSection | 'contact';

export type TemplateDefinition = {
  id: string;
  name: string;
  description: Record<ContentLanguage, string>;
  categories: TemplateCategory[];
  layout: {
    columns: 'single' | 'sidebar-left' | 'sidebar-right';
    /** Sidebar share of the page width. */
    sidebarWidth: number;
    sidebarSections: SidebarSection[];
    /** "full" spans the page; otherwise the header sits at the top of one column. */
    header: 'full' | 'main' | 'sidebar';
    headerVariant: HeaderVariant;
    heading: HeadingVariant;
    entry: EntryVariant;
    skills: SkillVariant;
    sidebarSkills?: SkillVariant;
    contactIcons: boolean;
  };
  photo: boolean;
  /** "high": single column, no graphics. "medium": simple two column or minor decoration. */
  ats: 'high' | 'medium' | 'low';
  pageSizes: PageSize[];
  /** Whether the secondary colour changes anything in this design. */
  usesSecondary: boolean;
  supportsHeaderAlign: boolean;
  design: Design;
  /** Preferred section order for resumes created with this template. */
  sectionOrder?: BuiltInSection[];
};
