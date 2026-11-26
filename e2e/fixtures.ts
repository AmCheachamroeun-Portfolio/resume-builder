import { SAMPLE_DATA } from '../src/constants/sample-resume';
import { createResume } from '../src/lib/resume-factory';
import { resumeDataSchema, type Resume, type ResumeData } from '../src/types/resume';

/* All fictional. Used to exercise long documents and Khmer text. */

export function longData(): ResumeData {
  const data = structuredClone(SAMPLE_DATA);
  data.experience = Array.from({ length: 11 }, (_, i) => ({
    ...structuredClone(SAMPLE_DATA.experience[0]!),
    id: `long-${i}`,
    title: `Engineer role ${i + 1}`,
    company: `Fictional Company ${i + 1}`,
    current: false,
    start: `${2010 + i}-01`,
    end: `${2010 + i}-12`,
    description: Array.from(
      { length: 5 },
      (_, n) => `- Entry ${i + 1} point ${n + 1}: maintained a sample system and wrote its guides`,
    ).join('\n'),
  }));
  data.experience[10]!.description += '\n- LASTLINEMARKER';
  return data;
}

/**
 * Words without subscripts or leading vowels. Those two come back reordered or
 * missing when PDF.js extracts text, although they display correctly.
 */
export const KHMER_PHRASES = ['ការងារ', 'ទំព័រ'];

export function khmerData(): ResumeData {
  return resumeDataSchema.parse({
    personal: {
      fullName: 'សុវណ្ណ ម៉ាយ៉ា',
      headline: 'អ្នកអភិវឌ្ឍគេហទំព័រ',
      email: 'maya.sovann@example.com',
      phone: '+855 12 000 000',
      location: 'ភ្នំពេញ កម្ពុជា',
      website: 'maya.example.com',
    },
    summary: {
      professional:
        'អ្នកអភិវឌ្ឍគេហទំព័រដែលមានបទពិសោធន៍ក្នុងការបង្កើតកម្មវិធីងាយប្រើ និងដំណើរការលឿន។ ចូលចិត្តធ្វើការជាក្រុម ដើម្បីប្ដូរតម្រូវការមិនច្បាស់ឱ្យក្លាយជាចំណុចប្រទាក់ដែលមនុស្សប្រើបានដោយមិនបាច់បណ្ដុះបណ្ដាល។',
    },
    experience: [
      {
        id: 'km1',
        title: 'អ្នកអភិវឌ្ឍ Frontend',
        company: 'ស្ទូឌីយោគំរូ',
        location: 'ភ្នំពេញ',
        start: '2024-03',
        current: true,
        description:
          '- បង្កើតទំព័រកក់ និងវិក្កយបត្រសម្រាប់ប្រព័ន្ធគ្រប់គ្រងគ្លីនិក\n- រៀបចំបណ្ណាល័យសមាសភាគរួម ដែលមានច្បាប់ភាពងាយប្រើច្បាស់លាស់\n- ពិនិត្យការងារ និងជួយអ្នកអភិវឌ្ឍថ្មីពីរនាក់',
      },
    ],
    education: [
      {
        id: 'km2',
        institution: 'វិទ្យាស្ថានគំរូ',
        degree: 'បរិញ្ញាបត្រវិស្វកម្មសូហ្វវែរ',
        start: '2018',
        end: '2022',
      },
    ],
    skills: [
      { id: 'ks1', name: 'React', level: 4 },
      { id: 'ks2', name: 'TypeScript', level: 4 },
      { id: 'ks3', name: 'ការរចនាចំណុចប្រទាក់', level: 3 },
    ],
    languages: [{ id: 'kl1', name: 'ខ្មែរ', level: 'native' }],
  });
}

export function fixture(
  templateId: string,
  kind: 'sample' | 'long' | 'khmer',
  pageSize: 'a4' | 'letter' = 'a4',
): Resume {
  const data =
    kind === 'long' ? longData() : kind === 'khmer' ? khmerData() : structuredClone(SAMPLE_DATA);
  const resume = createResume({
    id: `${kind}-${templateId}-${pageSize}`,
    templateId,
    title: `${kind} ${templateId}`,
    language: kind === 'khmer' ? 'km' : 'en',
    data,
  });
  resume.design.pageSize = pageSize;
  return resume;
}
