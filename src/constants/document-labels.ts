import type { ContentLanguage } from '@/types/resume';
import type { BuiltInSection } from './sections';

type Labels = {
  sections: Record<BuiltInSection, string> & { about: string; objective: string; contact: string };
  present: string;
  months: string[];
  gpa: string;
  credential: string;
  expires: string;
  languageLevels: Record<string, string>;
  employment: Record<string, string>;
};

/** Words printed inside the resume. These follow the resume's content language. */
export const DOCUMENT_LABELS: Record<ContentLanguage, Labels> = {
  en: {
    sections: {
      summary: 'Professional Summary',
      about: 'About Me',
      objective: 'Career Objective',
      contact: 'Contact',
      experience: 'Work Experience',
      education: 'Education',
      skills: 'Skills',
      projects: 'Projects',
      certifications: 'Certifications',
      languages: 'Languages',
      awards: 'Awards',
      achievements: 'Achievements',
      volunteer: 'Volunteer Experience',
      publications: 'Publications',
      references: 'References',
      interests: 'Interests',
    },
    present: 'Present',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    gpa: 'GPA',
    credential: 'Credential ID',
    expires: 'Expires',
    languageLevels: {
      basic: 'Basic',
      conversational: 'Conversational',
      professional: 'Professional',
      fluent: 'Fluent',
      native: 'Native',
    },
    employment: {
      'full-time': 'Full-time',
      'part-time': 'Part-time',
      contract: 'Contract',
      internship: 'Internship',
      freelance: 'Freelance',
    },
  },
  km: {
    sections: {
      summary: 'សង្ខេបប្រវត្តិការងារ',
      about: 'អំពីខ្ញុំ',
      objective: 'គោលបំណងការងារ',
      contact: 'ទំនាក់ទំនង',
      experience: 'បទពិសោធន៍ការងារ',
      education: 'ការអប់រំ',
      skills: 'ជំនាញ',
      projects: 'គម្រោង',
      certifications: 'វិញ្ញាបនបត្រ',
      languages: 'ភាសា',
      awards: 'រង្វាន់',
      achievements: 'សមិទ្ធផល',
      volunteer: 'ការងារស្ម័គ្រចិត្ត',
      publications: 'ការបោះពុម្ពផ្សាយ',
      references: 'អ្នកធានា',
      interests: 'ចំណាប់អារម្មណ៍',
    },
    present: 'បច្ចុប្បន្ន',
    months: [
      'មករា',
      'កុម្ភៈ',
      'មីនា',
      'មេសា',
      'ឧសភា',
      'មិថុនា',
      'កក្កដា',
      'សីហា',
      'កញ្ញា',
      'តុលា',
      'វិច្ឆិកា',
      'ធ្នូ',
    ],
    gpa: 'មធ្យមភាគ',
    credential: 'លេខវិញ្ញាបនបត្រ',
    expires: 'ផុតកំណត់',
    languageLevels: {
      basic: 'មូលដ្ឋាន',
      conversational: 'សន្ទនាបាន',
      professional: 'ប្រើក្នុងការងារ',
      fluent: 'ស្ទាត់ជំនាញ',
      native: 'ភាសាកំណើត',
    },
    employment: {
      'full-time': 'ពេញម៉ោង',
      'part-time': 'ក្រៅម៉ោង',
      contract: 'កិច្ចសន្យា',
      internship: 'កម្មសិក្សា',
      freelance: 'ការងារឯករាជ្យ',
    },
  },
};

export function formatDate(value: string, language: ContentLanguage) {
  if (!value) return '';
  const [year, month] = value.split('-');
  const name = month ? DOCUMENT_LABELS[language].months[Number(month) - 1] : '';
  return name ? `${name} ${year}` : (year ?? '');
}

export function formatRange(
  start: string,
  end: string,
  current: boolean,
  language: ContentLanguage,
) {
  const from = formatDate(start, language);
  const to = current ? DOCUMENT_LABELS[language].present : formatDate(end, language);
  return [from, to].filter(Boolean).join(' – ');
}
