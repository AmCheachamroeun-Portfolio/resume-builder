import { createResume } from '@/lib/resume-factory';
import type { Resume, ResumeData } from '@/types/resume';
import { resumeDataSchema } from '@/types/resume';
import { SAMPLE_PHOTO } from './sample-photo';

/** The one source for sample resumes. Companies and contact details are made up. */
export const SAMPLE_DATA: ResumeData = resumeDataSchema.parse({
  personal: {
    fullName: 'Am Cheachamroeun',
    headline: 'Frontend Developer',
    email: 'am@example.com',
    phone: '+855 12 000 000',
    location: 'Phnom Penh, Cambodia',
    linkedin: 'linkedin.com/in/am-example',
    github: 'github.com/am-example',
    website: 'am.example.com',
  },
  summary: {
    professional:
      'Frontend developer who builds accessible, fast web applications with React and TypeScript. Works closely with designers and backend engineers to turn unclear requirements into interfaces people can use without training.',
  },
  experience: [
    {
      id: 'x1',
      title: 'Frontend Developer',
      company: 'Lotus Ledger Studio',
      location: 'Phnom Penh',
      employmentType: 'full-time',
      start: '2024-03',
      current: true,
      description:
        '- Built the booking and invoicing screens of a clinic management product\n- Introduced a shared component library with documented accessibility rules\n- Reviewed pull requests and paired with two junior developers',
    },
    {
      id: 'x2',
      title: 'Junior Web Developer',
      company: 'Riverbank Digital',
      location: 'Siem Reap',
      employmentType: 'full-time',
      start: '2022-06',
      end: '2024-02',
      description:
        '- Delivered responsive websites for hospitality and retail clients\n- Replaced fragile form scripts with validated, typed React forms',
    },
  ],
  education: [
    {
      id: 'e1',
      institution: 'Banyan Institute of Technology',
      degree: 'Bachelor of Science',
      field: 'Software Engineering',
      start: '2018-10',
      end: '2022-07',
      description: 'Final project: an offline-first library catalogue for rural schools.',
    },
  ],
  skills: [
    ['React', 'Frontend', 5],
    ['TypeScript', 'Frontend', 4],
    ['Next.js', 'Frontend', 4],
    ['CSS', 'Frontend', 5],
    ['REST APIs', 'Tools', 4],
    ['Git', 'Tools', 4],
    ['Playwright', 'Tools', 3],
    ['Figma', 'Tools', 3],
  ].map(([name, category, level], i) => ({ id: `s${i}`, name, category, level })),
  projects: [
    {
      id: 'p1',
      name: 'Market Day',
      technologies: 'Next.js, IndexedDB, Tailwind CSS',
      date: '2025-04',
      url: 'market-day.example.com',
      description: 'A stock list for market sellers that keeps working without a connection.',
    },
  ],
  certifications: [
    {
      id: 'c1',
      name: 'Web Accessibility Foundations',
      issuer: 'Banyan Learning Centre',
      issued: '2023-11',
    },
  ],
  languages: [
    { id: 'l1', name: 'Khmer', level: 'native' },
    { id: 'l2', name: 'English', level: 'professional' },
  ],
});

export function sampleResume(templateId: string, photo = SAMPLE_PHOTO): Resume {
  const resume = createResume({ templateId, title: 'Sample', id: `sample-${templateId}` });
  return {
    ...resume,
    createdAt: 0,
    updatedAt: 0,
    data: { ...SAMPLE_DATA, personal: { ...SAMPLE_DATA.personal, photo } },
  };
}
