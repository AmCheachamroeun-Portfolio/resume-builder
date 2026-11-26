/*
 * Compares the wording of a job advert with the wording of a resume. It matches
 * words, a few well-known phrases and spellings; it does not understand meaning.
 */

const STOPWORDS = new Set(
  `a able about across after all also an and any apply are as at be been being benefit benefits both but by
  can candidate company could day daily do does each etc experience for from good great has have having help
  hire hiring how ideal if in including into is it its job join just know knows knowledge like looking may
  more most must need needs new not of offer on one or other our out over per plus preferred required
  requirements responsibilities role should skills so some strong such team than that the their them then
  there these they this those through to under understanding up us use using very we well what when where
  which while who will with within work working would year years you your`.split(/\s+/),
);

const KHMER_STOPWORDS = new Set(
  `និង ឬ ការ ដែល ក្នុង នៃ ដោយ ជា មាន សម្រាប់ ទៅ នៅ របស់ ពី ដល់ គឺ ត្រូវ អាច នេះ នោះ ផ្សេង ផ្សេងៗ ល្អ ការងារ
  បេក្ខជន យើង អ្នក ចំណេះដឹង បទពិសោធន៍ មានបទពិសោធន៍ ជំនាញ តម្រូវការ ត្រូវការ ទទួល ស្វែងរក ព្រម ទាំង ដូចជា
  លើ ជាមួយ ឲ្យ ឱ្យ ផង ដែរ ឡើង បាន នឹង ក៏ តែ ពេល ខ្ពស់`.split(/\s+/),
);

/** Different spellings of the same thing, grouped under one name. */
const ALIASES: string[][] = [
  ['javascript', 'js'],
  ['typescript', 'ts'],
  ['node.js', 'nodejs'],
  ['next.js', 'nextjs'],
  ['react', 'react.js', 'reactjs'],
  ['vue', 'vue.js', 'vuejs'],
  ['postgresql', 'postgres'],
  ['kubernetes', 'k8s'],
  ['golang', 'go lang'],
  ['ci/cd', 'ci cd', 'cicd', 'continuous integration'],
  ['rest api', 'rest apis', 'restful api', 'restful apis'],
  ['ui', 'user interface'],
  ['ux', 'user experience'],
  ['seo', 'search engine optimisation', 'search engine optimization'],
  ['qa', 'quality assurance'],
  ['amazon web services', 'aws'],
  ['microsoft excel', 'excel'],
];

/** Terms of more than one word that mean something only together. */
const PHRASES = [
  'amazon web services',
  'business analysis',
  'continuous integration',
  'customer service',
  'data analysis',
  'design systems',
  'digital marketing',
  'google analytics',
  'machine learning',
  'power bi',
  'project management',
  'quality assurance',
  'react native',
  'rest apis',
  'rest api',
  'restful apis',
  'restful api',
  'ruby on rails',
  'search engine optimization',
  'search engine optimisation',
  'social media',
  'sql server',
  'unit testing',
  'user experience',
  'user interface',
  'user research',
  'ci/cd',
];

const KHMER = /[\u1780-\u17ff]/;

/** Reduces simple English endings so "managed" and "management" meet. */
function stem(word: string) {
  if (!/^[a-z]+$/.test(word)) return word;
  let cut = word.replace(/(ations?|ments?|ings?|ers?|ed|es|s)$/, '');
  if (cut.length < 4) cut = word.length > 3 ? word.replace(/s$/, '') : word;
  cut = cut.replace(/([b-df-hj-np-tv-z])\1$/, '$1');
  return cut.length > 3 ? cut.replace(/e$/, '') : cut;
}

const normalise = (text: string) => text.toLowerCase().replace(/\u200b/g, '');

const latinWords = (text: string) =>
  (text.match(/[a-z][a-z0-9+#.\-]*[a-z0-9+#]|\b[a-z]\b/g) ?? []) as string[];

function khmerWords(text: string) {
  const segmenter = new Intl.Segmenter('km', { granularity: 'word' });
  return Array.from(segmenter.segment(text))
    .filter((part) => part.isWordLike && KHMER.test(part.segment))
    .map((part) => part.segment);
}

const phrasePattern = (phrase: string) =>
  new RegExp(
    `(?<![a-z0-9+#])${phrase.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace(/ /g, '[\\s-]+')}(?![a-z0-9+#])`,
    'g',
  );

/** Distinctive terms from a job description, most frequent first. */
export function extractKeywords(text: string, limit = 25) {
  const counts = new Map<string, number>();
  const count = (term: string, by = 1) => counts.set(term, (counts.get(term) ?? 0) + by);
  let rest = normalise(text);
  for (const phrase of PHRASES) {
    const found = rest.match(phrasePattern(phrase));
    if (found) {
      count(phrase, found.length);
      rest = rest.replace(phrasePattern(phrase), ' | ');
    }
  }
  for (const word of latinWords(rest.replace(/\//g, ' '))) {
    if (word.length < 2 && word !== 'c' && word !== 'r') continue;
    if (!STOPWORDS.has(word)) count(word);
  }
  if (KHMER.test(rest)) {
    for (const word of khmerWords(rest)) {
      // Single characters and short particles carry no meaning of their own.
      if (word.length > 2 && !KHMER_STOPWORDS.has(word)) count(word);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/** Builds a test for whether `text` mentions a term, allowing for common variants. */
export function termMatcher(text: string) {
  const haystack = normalise(text);
  const stems = new Set(latinWords(haystack.replace(/\//g, ' ')).map(stem));
  const direct = (term: string) => {
    if (KHMER.test(term)) return haystack.includes(term);
    if (/[\s/]/.test(term)) return haystack.search(phrasePattern(term)) >= 0;
    return stems.has(stem(term));
  };
  return (term: string) =>
    direct(term) || (ALIASES.find((group) => group.includes(term))?.some(direct) ?? false);
}
