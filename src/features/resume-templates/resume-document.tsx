'use client';

import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { readableInk, textOn } from '@/lib/color';
import type { PageSize, Resume } from '@/types/resume';
import { buildColumns, contactItems, type Block } from './blocks';
import { fontStack, RESUME_FONTS } from './fonts';
import { paginate } from './paginate';
import { getTemplate } from './registry';
import type { TemplateDefinition } from './types';

/** CSS pixels at 96dpi. A4 is 1122.5px tall; rounding down avoids a blank trailing page. */
export const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  a4: { width: 794, height: 1122 },
  letter: { width: 816, height: 1056 },
};

const KHMER = /[ក-៿]/;

function pageStyle(resume: Resume, template: TemplateDefinition): CSSProperties {
  const d = resume.design;
  const { width, height } = PAGE_DIMENSIONS[d.pageSize];
  const onSecondary = textOn(d.secondary);
  return {
    width,
    height,
    fontFamily: fontStack(d.font),
    '--rc-accent': d.accent,
    '--rc-accent-ink': readableInk(d.accent),
    '--rc-on-accent': textOn(d.accent),
    '--rc-secondary': d.secondary,
    '--rc-on-secondary': onSecondary,
    '--rc-secondary-accent': readableInk(d.accent, d.secondary, 4.5),
    '--rc-body': `${d.bodySize}pt`,
    '--rc-heading': `${d.headingSize}pt`,
    '--rc-name': `${d.nameSize}pt`,
    '--rc-weight': d.bodyWeight,
    '--rc-heading-weight': d.headingWeight,
    '--rc-leading': d.lineHeight,
    '--rc-section': `${d.sectionSpacing}px`,
    '--rc-margin': `${d.margin}px`,
    '--rc-photo': `${d.photoSize}px`,
    '--rc-side': `${Math.round(width * template.layout.sidebarWidth)}px`,
  } as CSSProperties;
}

function Header({
  resume,
  template,
  interactive,
}: {
  resume: Resume;
  template: TemplateDefinition;
  interactive: boolean;
}) {
  const { personal } = resume.data;
  const { layout } = template;
  const showPhoto = template.photo && resume.design.photoVisible && personal.photo;
  const contact =
    layout.columns !== 'single' && layout.sidebarSections.includes('contact')
      ? []
      : contactItems(resume, layout.contactIcons, interactive);
  const words = personal.fullName.trim().split(/\s+/);
  const name: ReactNode =
    layout.headerVariant === 'stacked' && words.length > 1 ? (
      <>
        <span>{words.slice(0, -1).join(' ')}</span>
        <span>{words[words.length - 1]}</span>
      </>
    ) : (
      personal.fullName
    );
  if (!personal.fullName && !personal.headline && !contact.length && !showPhoto) return null;
  const align = template.supportsHeaderAlign ? resume.design.headerAlign : undefined;
  return (
    <header className={`rc-header rc-header-${layout.headerVariant}`} data-align={align}>
      {showPhoto && (
        // A data URL stored in the browser: next/image has nothing to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="rc-photo"
          data-shape={resume.design.photoShape}
          src={personal.photo}
          alt=""
        />
      )}
      <div className="rc-identity">
        {personal.fullName && <h1 className="rc-name">{name}</h1>}
        {personal.headline && <p className="rc-headline">{personal.headline}</p>}
      </div>
      {contact.length > 0 && <div className="rc-contacts">{contact}</div>}
    </header>
  );
}

const Flow = ({ blocks }: { blocks: Block[] }) => (
  <div className="rc-flow">
    {blocks.map((block) => (
      <div
        key={block.key}
        className={`rc-block ${block.className ?? ''}`}
        data-gap={block.gap}
        data-block
      >
        {block.node}
      </div>
    ))}
  </div>
);

type Layout = { main: number[][]; side: number[][] };

function Page({
  resume,
  template,
  header,
  main,
  side,
  index,
  interactive,
}: {
  resume: Resume;
  template: TemplateDefinition;
  header: boolean;
  main: Block[];
  side: Block[];
  index: number;
  interactive: boolean;
}) {
  const { layout } = template;
  const place = header ? layout.header : null;
  const head = <Header resume={resume} template={template} interactive={interactive} />;
  const hasKhmer = resume.language === 'km' || KHMER.test(JSON.stringify(resume.data));
  return (
    <div
      className="rc-page"
      lang={resume.language}
      data-template={template.id}
      data-columns={layout.columns}
      data-heading={layout.heading}
      data-entry={layout.entry}
      data-khmer={hasKhmer || undefined}
      data-continued={index > 0 || undefined}
      data-page={index + 1}
      style={pageStyle(resume, template)}
    >
      {place === 'full' && <div className="rc-full-header">{head}</div>}
      <div className="rc-body">
        {layout.columns !== 'single' && (
          <aside className="rc-side">
            {place === 'sidebar' && <div className="rc-column-header">{head}</div>}
            <Flow blocks={side} />
          </aside>
        )}
        <div className="rc-main">
          {place === 'main' && <div className="rc-column-header">{head}</div>}
          <Flow blocks={main} />
        </div>
      </div>
    </div>
  );
}

/** Heights are measured on an unscaled hidden copy, then blocks are dealt onto pages. */
function measure(root: HTMLElement, columns: { main: Block[]; side: Block[] }): Layout | null {
  const [first, next] = Array.from(root.querySelectorAll<HTMLElement>('.rc-page'));
  // Not laid out (inside a hidden ancestor): there is nothing to measure yet.
  if (!first?.offsetWidth || !next) return null;
  // Thumbnails scale their contents; convert rects back to layout pixels.
  const scale = first.getBoundingClientRect().width / first.offsetWidth || 1;
  const run = (selector: '.rc-main' | '.rc-side', blocks: Block[]) => {
    const column = first?.querySelector<HTMLElement>(selector);
    if (!column || !blocks.length) return [[]];
    const nodes = Array.from(
      column.querySelectorAll<HTMLElement>(':scope > .rc-flow > [data-block]'),
    );
    const measured = nodes.map((node, i) => ({
      height: node.getBoundingClientRect().height / scale,
      // The first child never has a gap on screen, so read it from a sibling rule.
      gap: i === 0 ? 0 : parseFloat(getComputedStyle(node).paddingTop) || 0,
      keepWithNext: blocks[i]!.keepWithNext,
    }));
    const room = (page: HTMLElement) => {
      const target = page.querySelector<HTMLElement>(selector)!;
      const flow = target.querySelector<HTMLElement>(':scope > .rc-flow')!;
      const style = getComputedStyle(target);
      return (
        (target.getBoundingClientRect().bottom - flow.getBoundingClientRect().top) / scale -
        (parseFloat(style.paddingBottom) || 0)
      );
    };
    const firstRoom = room(first!);
    const nextRoom = room(next!);
    return paginate(measured, (page) => (page === 0 ? firstRoom : nextRoom));
  };
  return { main: run('.rc-main', columns.main), side: run('.rc-side', columns.side) };
}

type Props = {
  resume: Resume;
  /** Render only the first page (thumbnails). */
  firstPageOnly?: boolean;
  /** Wraps each page, e.g. to scale it. */
  wrapPage?: (page: ReactNode, index: number, total: number) => ReactNode;
  onLayout?: (pages: number) => void;
  /** Set to false for decorative thumbnails, so contact/link text doesn't render as a nested <a>. */
  interactive?: boolean;
};

/**
 * The one renderer behind thumbnails, the live preview and PDF export, which is
 * what keeps the three identical.
 */
export const ResumeDocument = memo(function ResumeDocument({
  resume,
  firstPageOnly,
  wrapPage,
  onLayout,
  interactive = true,
}: Props) {
  const template = getTemplate(resume.templateId);
  const columns = useMemo(
    () => buildColumns(resume, template, interactive),
    [resume, template, interactive],
  );
  const probe = useRef<HTMLDivElement>(null);
  const [fontsTick, setFontsTick] = useState(0);
  const [result, setResult] = useState<{ columns: typeof columns; layout: Layout } | null>(null);

  // Re-measure when web fonts arrive, since they change line heights and wrapping.
  useEffect(() => {
    const done = () => setFontsTick((n) => n + 1);
    document.fonts.addEventListener('loadingdone', done);
    return () => document.fonts.removeEventListener('loadingdone', done);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const family = RESUME_FONTS[resume.design.font].family;
    const text = JSON.stringify(resume.data).slice(0, 20000);
    const specs = ['400', '500', '600', '700'].flatMap((weight) => [
      `${weight} 12px "${family}"`,
      `${weight} 12px "Noto Sans Khmer"`,
    ]);
    // Typing with fonts that are already there needs no second measurement.
    if (specs.every((spec) => document.fonts.check(spec, text))) return;
    Promise.all(specs.map((spec) => document.fonts.load(spec, text).catch(() => [])))
      .then(() => document.fonts.ready)
      .then(() => !cancelled && setFontsTick((n) => n + 1));
    return () => {
      cancelled = true;
    };
  }, [resume.design.font, resume.data]);

  useLayoutEffect(() => {
    if (!probe.current) return;
    const layout = measure(probe.current, columns);
    if (!layout) return;
    // Pagination depends on real DOM measurements, so it has to run after layout.
    setResult({ columns, layout });
  }, [columns, fontsTick, resume.design]);

  // Until the new measurement lands, keep showing the previous one to avoid flicker.
  const shown = result;
  const total = shown ? Math.max(shown.layout.main.length, shown.layout.side.length) : 0;

  useEffect(() => {
    if (shown && shown.columns === columns) onLayout?.(total);
  }, [shown, columns, total, onLayout]);

  const pick = (blocks: Block[], indexes: number[] | undefined) =>
    (indexes ?? []).flatMap((i) => (blocks[i] ? [blocks[i]] : []));

  return (
    <>
      <div ref={probe} className="rc-probe" aria-hidden inert>
        <Page
          resume={resume}
          template={template}
          header
          index={0}
          main={columns.main}
          side={columns.side}
          interactive={interactive}
        />
        <Page
          resume={resume}
          template={template}
          header={false}
          index={1}
          main={[]}
          side={[]}
          interactive={interactive}
        />
      </div>
      {shown &&
        Array.from({ length: firstPageOnly ? 1 : total }, (_, index) => {
          const page = (
            <Page
              key={index}
              resume={resume}
              template={template}
              header={index === 0}
              index={index}
              main={pick(shown.columns.main, shown.layout.main[index])}
              side={pick(shown.columns.side, shown.layout.side[index])}
              interactive={interactive}
            />
          );
          return wrapPage ? wrapPage(page, index, total) : page;
        })}
    </>
  );
});
