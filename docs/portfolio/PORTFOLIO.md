# ResumeCraft: portfolio kit

Everything needed to add ResumeCraft to a developer portfolio. Paths are relative to this folder (`docs/portfolio/`).

## Before you publish

- **Verify the AI features with a real key** (`pnpm verify:ai`). They have only been tested with stand-in answers. The title says "AI-Powered", so check this first.
- **Live URL:** not deployed yet. Add it after you deploy.
- **Khmer and Chinese text below:** have a fluent reader check it.
- **"My role" lines:** edit them so they describe your own part accurately.

## Project facts

| Field     | Value                                              |
| --------- | -------------------------------------------------- |
| Name      | ResumeCraft                                        |
| Slug      | `resumecraft`                                      |
| Tagline   | AI-Powered Resume & Cover Letter Builder           |
| Category  | `fullstack`                                        |
| Accent    | `#6ea8f7` (on dark pages), `#0f5fc4` (on light)    |
| GitHub    | https://github.com/Am-CheaChamroeun/resume-builder |
| Live URL  | _add after deployment_                             |
| Image fit | `cover`                                            |
| Cover     | `covers/resumecraft-cover-dark.webp` (recommended) |

The dark cover suits a graphite portfolio and survives a 16:10 thumbnail crop. Use `covers/resumecraft-cover-light.webp` on a light page. `covers/resumecraft-cover.png` is a PNG copy of the dark cover.

## Concise description

A resume and cover letter builder that keeps documents in the visitor's own browser, with 12 resume templates, 3 cover letter templates, English and Khmer, PDF and Word export, and optional Gemini suggestions that are applied only after review.

## Case study

### Objectives

- Make a polished resume without creating an account or uploading personal details to a database.
- Keep what you see in the preview the same as the exported PDF, including Khmer text.
- Offer AI help that never changes a document, or adds facts to it, on its own.

### Problem

Resume builders often ask for an account, store personal data on their servers, or lock exports behind a payment. Khmer text also breaks in some browser PDF libraries.

### Solution

A local-first web app. The browser reads imported files, renders the resume, saves it in IndexedDB and creates the export files. The server is used only when the user asks for AI help.

### My role

- Application design and development with Next.js and TypeScript
- Resume rendering, pagination and export
- Server routes for the optional Gemini features

### Architecture

Next.js App Router with React. Editor state lives in a Zustand store with undo and redo, and is autosaved to IndexedDB through Dexie with conflict detection between tabs. One HTML and CSS renderer drives thumbnails, the live preview and printing. Word files are produced with `docx`. AI requests go through Next.js route handlers that hold the Gemini key and check origin, size, rate limit, response shape and invented facts. Zod schemas are the single source of truth for data.

### Challenges and solutions

| Challenge                                                            | Solution                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A tested PDF library dropped Khmer letters and let text overflow     | Render HTML once and export through the browser's print engine: selectable text, embedded fonts        |
| Preview pages had to match printed pages                             | Split content into blocks, measure them and place them on fixed-size pages                             |
| Two open tabs could silently overwrite each other                    | Detect the conflict and ask which copy to keep                                                         |
| AI text can invent achievements                                      | Reject new numbers, remove details not found in the input, and require review before applying anything |
| Faithful Word copies of 12 designs would be fragile and hard to edit | Export one clean, editable column that keeps the content and structure                                 |

## Main features

- 12 resume templates and 3 cover letter templates; switching keeps your content
- Live paged preview, undo and redo, autosave and version history
- Colours, six font families, sizes, spacing, A4 or US Letter, light and dark themes
- PDF (through the print window) and editable Word export
- Import from text PDF, `.docx` or a backup file, with a review step
- On-device compatibility check and job-description keyword comparison
- English and Khmer interface and resume content
- Optional Gemini help: questions, summaries, rewrites, skill ideas, template recommendations, review, tailoring and letter drafts

## Technical highlights

- Local-first: no account and no database
- One renderer for preview and print
- Schema-validated data and AI responses
- Server-only API key with consent, origin checks and rate limiting
- Unit tests with Vitest and browser tests with Playwright

## Technology stack

Show official logos for: Next.js, React, TypeScript, Tailwind CSS, Google Gemini, Zod, Vitest. Zustand, Dexie and Playwright have no icon in `simple-icons`, so the portfolio's neutral fallback is correct for them.

Also used: next-intl, Radix UI, dnd-kit, React Hook Form, `docx`, pdf.js, mammoth.

## Descriptions in three languages

### English

- **Tagline:** AI-Powered Resume & Cover Letter Builder
- **Description:** Build resumes and cover letters that stay in your browser. Choose from 12 resume and 3 letter templates, edit with a live preview in English or Khmer, and export to PDF or Word. Optional Gemini suggestions wait for your approval.

### Khmer

- **Tagline:** កម្មវិធីបង្កើតប្រវត្តិរូបសង្ខេប និងលិខិតដាក់ពាក្យ ដោយមានជំនួយពី AI
- **Description:** បង្កើតប្រវត្តិរូបសង្ខេប និងលិខិតដាក់ពាក្យ ដែលរក្សាទុកក្នុងកម្មវិធីរុករករបស់អ្នក។ ជ្រើសរើសពីគំរូប្រវត្តិរូប ១២ និងគំរូលិខិត ៣ កែសម្រួលដោយមើលលទ្ធផលភ្លាមៗជាភាសាអង់គ្លេស ឬខ្មែរ ហើយនាំចេញជា PDF ឬ Word។ ការណែនាំពី Gemini ជាជម្រើស ហើយត្រូវមានការយល់ព្រមពីអ្នកមុននឹងអនុវត្ត។

### 简体中文

- **Tagline:** AI 辅助的简历与求职信制作工具
- **Description:** 制作保存在自己浏览器中的简历和求职信。提供 12 款简历模板和 3 款求职信模板，支持英语和高棉语实时预览编辑，可导出为 PDF 或 Word。可选的 Gemini 建议需经你确认后才会应用。

## Adding it to the portfolio

1. Copy the files from `covers/` and `screenshots/` to `public/projects/resumecraft/` in the portfolio.
2. Add this object to `src/data/portfolio.ts` (as `featuredProject` or inside `projects`).

```ts
const media = '/projects/resumecraft';

const resumecraft: Project = {
  name: 'ResumeCraft',
  slug: 'resumecraft',
  // The card shows the first four.
  tech: [
    'Next.js',
    'React',
    'TypeScript',
    'Tailwind',
    'Gemini API',
    'Zustand',
    'Dexie',
    'Zod',
    'Vitest',
    'Playwright',
  ],
  accent: '#6ea8f7',
  category: 'fullstack',
  repoUrl: 'https://github.com/Am-CheaChamroeun/resume-builder',
  liveUrl: '', // add after deployment
  image: `${media}/resumecraft-cover-dark.webp`,
  imageFit: 'cover',
  // The first image is also the large picture at the top of the case study.
  gallery: [
    'resumecraft-cover-dark',
    '03-resume-editor',
    '02-template-gallery',
    '05-customization',
    '04-editor-dark',
    '10-cover-letter-templates',
    '09-cover-letter',
    '11-khmer-resume',
    '07-ats-analysis',
    '12-pdf-export',
    '08-my-resumes',
    '13-version-history',
    '06-ai-assistant',
    '01-landing-page',
  ].map((file) => `${media}/${file}.webp`),
};
```

3. Add the text under `content.projects.resumecraft` in `src/i18n/locales/en.json`, `km.json` and `zh-CN.json`. Remove the placeholder entry you replace.

<details>
<summary><strong>en.json</strong></summary>

```json
"resumecraft": {
  "tagline": "AI-Powered Resume & Cover Letter Builder",
  "description": "Build resumes and cover letters that stay in your browser. Choose from 12 resume and 3 letter templates, edit with a live preview in English or Khmer, and export to PDF or Word. Optional Gemini suggestions wait for your approval.",
  "highlights": [
    "12 resume and 3 cover letter templates",
    "Live preview with PDF and Word export",
    "Local-first, with optional AI help"
  ],
  "study": {
    "objectives": [
      "Make a polished resume without an account or a database",
      "Keep the preview and the exported PDF the same, including Khmer",
      "Offer AI help that never changes a document on its own"
    ],
    "problem": "Resume builders often ask for an account, store personal data on their servers or charge for export, and Khmer text breaks in some PDF libraries.",
    "solution": "A local-first web app: the browser reads, renders, saves and exports documents, and the server is used only for AI requests.",
    "role": [
      "Application design and development with Next.js and TypeScript",
      "Resume rendering, pagination and export",
      "Server routes for the optional Gemini features"
    ],
    "architecture": "Next.js and React, with a Zustand editor store saved to IndexedDB through Dexie. One HTML renderer drives previews and printing. Route handlers keep the Gemini key on the server and validate every request and response.",
    "challenges": [
      "Khmer PDF output: export through the browser's print engine",
      "Matching page breaks: measure content blocks and place them on fixed pages",
      "Tab conflicts: detect them and ask which copy to keep",
      "Invented AI facts: check responses and require review before applying"
    ]
  }
}
```

</details>

<details>
<summary><strong>km.json</strong></summary>

```json
"resumecraft": {
  "tagline": "កម្មវិធីបង្កើតប្រវត្តិរូបសង្ខេប និងលិខិតដាក់ពាក្យ ដោយមានជំនួយពី AI",
  "description": "បង្កើតប្រវត្តិរូបសង្ខេប និងលិខិតដាក់ពាក្យ ដែលរក្សាទុកក្នុងកម្មវិធីរុករករបស់អ្នក។ ជ្រើសរើសពីគំរូប្រវត្តិរូប ១២ និងគំរូលិខិត ៣ កែសម្រួលដោយមើលលទ្ធផលភ្លាមៗជាភាសាអង់គ្លេស ឬខ្មែរ ហើយនាំចេញជា PDF ឬ Word។ ការណែនាំពី Gemini ជាជម្រើស ហើយត្រូវមានការយល់ព្រមពីអ្នកមុននឹងអនុវត្ត។",
  "highlights": [
    "គំរូប្រវត្តិរូប ១២ និងគំរូលិខិតដាក់ពាក្យ ៣",
    "មើលលទ្ធផលភ្លាមៗ និងនាំចេញជា PDF ឬ Word",
    "ទិន្នន័យនៅលើឧបករណ៍របស់អ្នក ជាមួយជំនួយ AI ជាជម្រើស"
  ],
  "study": {
    "objectives": [
      "បង្កើតប្រវត្តិរូបសង្ខេបស្អាត ដោយមិនចាំបាច់មានគណនី ឬមូលដ្ឋានទិន្នន័យ",
      "ធ្វើឱ្យការមើលជាមុន និង PDF ដែលនាំចេញដូចគ្នា រួមទាំងអក្សរខ្មែរ",
      "ផ្តល់ជំនួយ AI ដែលមិនកែឯកសារដោយខ្លួនឯង"
    ],
    "problem": "កម្មវិធីបង្កើតប្រវត្តិរូបជាច្រើនទាមទារគណនី រក្សាទុកទិន្នន័យផ្ទាល់ខ្លួនលើម៉ាស៊ីនមេ ឬគិតថ្លៃការនាំចេញ ហើយអក្សរខ្មែរខូចក្នុងបណ្ណាល័យ PDF មួយចំនួន។",
    "solution": "កម្មវិធីវែបដែលផ្តោតលើឧបករណ៍អ្នកប្រើ៖ កម្មវិធីរុករកអាន បង្ហាញ រក្សាទុក និងនាំចេញឯកសារ ហើយម៉ាស៊ីនមេប្រើសម្រាប់តែសំណើ AI ប៉ុណ្ណោះ។",
    "role": [
      "រចនា និងអភិវឌ្ឍកម្មវិធីដោយ Next.js និង TypeScript",
      "ការបង្ហាញប្រវត្តិរូប ការបែងចែកទំព័រ និងការនាំចេញ",
      "ផ្លូវ API លើម៉ាស៊ីនមេសម្រាប់មុខងារ Gemini ជាជម្រើស"
    ],
    "architecture": "ប្រើ Next.js និង React ដោយឃ្លាំងស្ថានភាព Zustand ត្រូវបានរក្សាទុកក្នុង IndexedDB តាមរយៈ Dexie។ កម្មវិធីបង្ហាញ HTML តែមួយ ប្រើសម្រាប់ការមើលជាមុន និងការបោះពុម្ព។ ផ្លូវ API រក្សាសោ Gemini លើម៉ាស៊ីនមេ ហើយពិនិត្យរាល់សំណើ និងចម្លើយ។",
    "challenges": [
      "PDF អក្សរខ្មែរ៖ នាំចេញតាមម៉ាស៊ីនបោះពុម្ពរបស់កម្មវិធីរុករក",
      "ការបែងចែកទំព័រឱ្យដូចគ្នា៖ វាស់ប្លុកមាតិកា ហើយដាក់លើទំព័រទំហំថេរ",
      "ការប៉ះទង្គិចរវាងផ្ទាំង៖ រកឱ្យឃើញ ហើយសួរថាត្រូវរក្សាច្បាប់ណា",
      "ព័ត៌មានដែល AI បង្កើតខ្លួនឯង៖ ពិនិត្យចម្លើយ ហើយតម្រូវឱ្យអ្នកប្រើយល់ព្រមមុនអនុវត្ត"
    ]
  }
}
```

</details>

<details>
<summary><strong>zh-CN.json</strong></summary>

```json
"resumecraft": {
  "tagline": "AI 辅助的简历与求职信制作工具",
  "description": "制作保存在自己浏览器中的简历和求职信。提供 12 款简历模板和 3 款求职信模板，支持英语和高棉语实时预览编辑，可导出为 PDF 或 Word。可选的 Gemini 建议需经你确认后才会应用。",
  "highlights": [
    "12 款简历模板和 3 款求职信模板",
    "实时预览，支持导出 PDF 和 Word",
    "数据本地优先，AI 辅助可选"
  ],
  "study": {
    "objectives": [
      "无需账户和数据库即可制作精美简历",
      "让预览与导出的 PDF 保持一致，包括高棉语",
      "提供不会擅自修改文档的 AI 辅助"
    ],
    "problem": "许多简历工具要求注册账户、在服务器上保存个人数据或对导出收费，部分 PDF 库还会导致高棉语文字出错。",
    "solution": "本地优先的网页应用：由浏览器读取、排版、保存和导出文档，服务器仅用于处理 AI 请求。",
    "role": [
      "使用 Next.js 和 TypeScript 设计与开发应用",
      "简历排版、分页与导出",
      "可选 Gemini 功能的服务端接口"
    ],
    "architecture": "基于 Next.js 和 React，编辑器的 Zustand 状态通过 Dexie 保存到 IndexedDB。预览与打印共用同一套 HTML 渲染。接口层将 Gemini 密钥保留在服务器端，并校验每个请求和响应。",
    "challenges": [
      "高棉语 PDF：通过浏览器打印引擎导出",
      "分页一致：测量内容块并放置到固定尺寸的页面",
      "多标签页冲突：检测冲突并询问保留哪个版本",
      "AI 虚构内容：校验响应，应用前需经用户确认"
    ]
  }
}
```

</details>

4. Optional: give Gemini and Zod their logos in `src/lib/tech.ts`. Import `siGooglegemini` and `siZod` from `simple-icons`, add `gemini: siGooglegemini` and `zod: siZod` to `techIcons`, and add `'gemini api': 'gemini'` and `'google gemini': 'gemini'` to `techAliases`.

### How the current portfolio code treats it

- Gallery pictures are cropped to 16:10, so the 16:9 screenshots lose about 5% at each side. The covers keep their content inside that area.
- The case study groups technologies it does not recognise under "infrastructure" (`layerOf` in `CaseStudy.tsx`), including Zustand, Dexie and Zod.
- The `Project` type has no video field. Showing the demo needs a small portfolio change.
- The phone screenshots are portrait and are left out of the gallery.

## Gallery order and captions

| #   | File                        | Caption                                                       |
| --- | --------------------------- | ------------------------------------------------------------- |
| 1   | `resumecraft-cover-dark`    | ResumeCraft: resume and cover letter builder                  |
| 2   | `03-resume-editor`          | Structured forms beside a live, paged preview                 |
| 3   | `02-template-gallery`       | Resume templates with layout and compatibility details        |
| 4   | `05-customization`          | Colours, fonts and spacing for each resume                    |
| 5   | `04-editor-dark`            | Dark interface; the document keeps its own colours            |
| 6   | `10-cover-letter-templates` | Three cover letter styles that keep the same text             |
| 7   | `09-cover-letter`           | Writing a letter with a live preview                          |
| 8   | `11-khmer-resume`           | Khmer interface and Khmer resume content                      |
| 9   | `07-ats-analysis`           | Compatibility check and keyword comparison, run on the device |
| 10  | `12-pdf-export`             | Export window with PDF steps for each browser                 |
| 11  | `08-my-resumes`             | A library of resumes saved in the browser                     |
| 12  | `13-version-history`        | Preview and restore earlier versions                          |
| 13  | `06-ai-assistant`           | The optional assistant, before any request is sent            |
| 14  | `01-landing-page`           | Landing page                                                  |

## Video and GIF

| File                                | Notes                                 |
| ----------------------------------- | ------------------------------------- |
| `demo/resumecraft-demo.mp4`         | 1920×1080, 30 fps, about 44 s, silent |
| `demo/resumecraft-demo.gif`         | 1120×630, about 15 s, looping         |
| `demo/resumecraft-demo-poster.webp` | Poster frame taken from the video     |

## How these files were made

- Screenshots and video were captured from the app running locally in Chrome (development server, with the development badge hidden). All people, companies, schools and contact details are fictional; the sample name is the author's.
- The video is edited from real interactions: loading waits are shortened and scenes are joined with fades. A small pointer was added so movements are visible.
- The "Exported PDF" shot in the video is the page produced by Chrome's print-to-PDF from the resume edited in the demo. The browser's own print window is not shown.
- Gemini could not be reached, so there is **no AI output anywhere**. For `06-ai-assistant` only, the server was started with a fake placeholder key so the assistant shows its ready state. Nothing was sent to Google.
- The covers are layouts composed from real screenshots and real exported pages.
- `originals/` holds the PNG originals of the desktop screenshots and covers. `mobile/` holds phone captures (390×844 at 2× scale).
