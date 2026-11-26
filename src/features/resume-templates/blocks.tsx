import { Globe, Link2, Mail, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { DOCUMENT_LABELS, formatDate, formatRange } from '@/constants/document-labels';
import type { BuiltInSection } from '@/constants/sections';
import { displayUrl, safeHref } from '@/lib/url';
import type { Resume, ResumeData } from '@/types/resume';
import { parseRich, renderInline } from './rich-text';
import type { SkillVariant, TemplateDefinition } from './types';

export type Block = {
  key: string;
  /** Never leave this block at the bottom of a page without the next one. */
  keepWithNext: boolean;
  /** What kind of vertical space precedes the block. */
  gap: 'section' | 'item' | 'line' | 'none';
  className?: string;
  node: ReactNode;
};

export type ColumnBlocks = { main: Block[]; side: Block[] };

type Entry = {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  meta?: string;
  links?: { label: string; href: string }[];
  body?: string[];
};

const join = (...parts: (string | undefined)[]) => parts.filter((p) => p?.trim()).join(' · ');
const filled = (...parts: (string | undefined)[]) => parts.some((p) => p?.trim());

function links(...values: string[]) {
  return values.flatMap((value) => {
    const href = safeHref(value);
    return href ? [{ href, label: displayUrl(value) }] : [];
  });
}

/** Normalises every list section into entries, dropping anything left empty. */
function entriesFor(key: BuiltInSection, resume: Resume): Entry[] {
  const { data, language } = resume;
  const labels = DOCUMENT_LABELS[language];
  const range = (s: string, e: string, c = false) => formatRange(s, e, c, language);
  const day = (d: string) => formatDate(d, language);
  const awards = (items: ResumeData['awards']) =>
    items.map((a) => ({
      id: a.id,
      title: a.title,
      subtitle: a.issuer,
      date: day(a.date),
      body: [a.description],
    }));

  const build = (): Entry[] => {
    switch (key) {
      case 'experience':
        return data.experience.map((x) => ({
          id: x.id,
          title: x.title,
          subtitle: join(
            x.company,
            x.location,
            x.employmentType ? labels.employment[x.employmentType] : '',
          ),
          date: range(x.start, x.end, x.current),
          body: [x.description, x.achievements],
        }));
      case 'education':
        return data.education.map((x) => ({
          id: x.id,
          title: [x.degree, x.field].filter(Boolean).join(', ') || x.institution,
          subtitle: join(
            x.degree || x.field ? x.institution : '',
            x.gpa ? `${labels.gpa} ${x.gpa}` : '',
          ),
          date: range(x.start, x.end),
          body: [x.description],
        }));
      case 'projects':
        return data.projects.map((x) => ({
          id: x.id,
          title: x.name,
          subtitle: x.technologies,
          date: day(x.date),
          links: links(x.url, x.repo),
          body: [x.description],
        }));
      case 'certifications':
        return data.certifications.map((x) => ({
          id: x.id,
          title: x.name,
          subtitle: x.issuer,
          date: day(x.issued),
          meta: join(
            x.credentialId ? `${labels.credential}: ${x.credentialId}` : '',
            x.expires ? `${labels.expires} ${day(x.expires)}` : '',
          ),
          links: links(x.url),
        }));
      case 'awards':
        return awards(data.awards);
      case 'achievements':
        return awards(data.achievements);
      case 'volunteer':
        return data.volunteer.map((x) => ({
          id: x.id,
          title: x.role,
          subtitle: x.organization,
          date: range(x.start, x.end, x.current),
          body: [x.description],
        }));
      case 'publications':
        return data.publications.map((x) => ({
          id: x.id,
          title: x.title,
          subtitle: x.publisher,
          date: day(x.date),
          links: links(x.url),
          body: [x.description],
        }));
      case 'references':
        return data.references.map((x) => ({
          id: x.id,
          title: x.name,
          subtitle: join(x.relationship, x.company),
          meta: join(x.email, x.phone),
        }));
      default:
        return [];
    }
  };

  return build().filter((e) =>
    filled(e.title, e.subtitle, e.meta, ...(e.body ?? []), ...(e.links ?? []).map((l) => l.href)),
  );
}

export function contactItems(resume: Resume, icons: boolean, interactive = true) {
  const p = resume.data.personal;
  const items = [
    { key: 'email', value: p.email, href: safeHref(`mailto:${p.email.trim()}`), Icon: Mail },
    {
      key: 'phone',
      value: p.phone,
      href: safeHref(`tel:${p.phone.replace(/\s+/g, '')}`),
      Icon: Phone,
    },
    { key: 'location', value: p.location, href: null, Icon: MapPin },
    { key: 'linkedin', value: p.linkedin, href: safeHref(p.linkedin), Icon: Link2 },
    { key: 'github', value: p.github, href: safeHref(p.github), Icon: Link2 },
    { key: 'website', value: p.website, href: safeHref(p.website), Icon: Globe },
    ...p.links.map((l) => ({
      key: l.id,
      value: l.url,
      label: l.label,
      href: safeHref(l.url),
      Icon: Link2,
    })),
  ].filter((item) => item.value.trim());

  return items.map(({ key, value, href, Icon, ...rest }) => {
    const label = 'label' in rest && rest.label ? rest.label : undefined;
    const isUrl = !['email', 'phone', 'location'].includes(key);
    const text = label ?? (isUrl ? displayUrl(value) : value);
    return (
      <span key={key} className="rc-contact">
        {icons && <Icon aria-hidden className="rc-contact-icon" />}
        {href && interactive ? <a href={href}>{text}</a> : <span>{text}</span>}
      </span>
    );
  });
}

function entryBlocks(
  prefix: string,
  entry: Entry,
  variant: string,
  interactive = true,
): Block[] {
  const lines = (entry.body ?? []).flatMap(parseRich);
  const head: Block = {
    key: `${prefix}-${entry.id}`,
    keepWithNext: lines.length > 0,
    gap: 'item',
    className: 'rc-entry rc-entry-start',
    node: (
      <div className="rc-head">
        {variant === 'dated' && <div className="rc-date">{entry.date}</div>}
        <div className="rc-head-main">
          <div className="rc-title-row">
            {entry.title && <h3 className="rc-title">{entry.title}</h3>}
            {variant !== 'dated' &&
              variant !== 'stacked' &&
              variant !== 'timeline' &&
              entry.date && <span className="rc-date">{entry.date}</span>}
          </div>
          {entry.subtitle && <div className="rc-subtitle">{entry.subtitle}</div>}
          {(variant === 'stacked' || variant === 'timeline') && entry.date && (
            <div className="rc-date">{entry.date}</div>
          )}
          {entry.meta && <div className="rc-meta">{entry.meta}</div>}
          {entry.links?.length ? (
            <div className="rc-links">
              {entry.links.map((l) =>
                interactive ? (
                  <a key={l.href} href={l.href}>
                    {l.label}
                  </a>
                ) : (
                  <span key={l.href}>{l.label}</span>
                ),
              )}
            </div>
          ) : null}
        </div>
      </div>
    ),
  };
  return [
    head,
    ...lines.map((line, i): Block => ({
      key: `${prefix}-${entry.id}-${i}`,
      keepWithNext: false,
      gap: 'line',
      className: 'rc-entry rc-entry-body',
      node:
        line.type === 'li' ? (
          <div className="rc-li">{renderInline(line.text)}</div>
        ) : (
          <p className="rc-p">{renderInline(line.text)}</p>
        ),
    })),
  ];
}

function skillBlocks(resume: Resume, variant: SkillVariant): Block[] {
  const skills = resume.data.skills.filter((s) => s.name.trim());
  const groups = new Map<string, typeof skills>();
  for (const skill of skills) {
    const category = skill.category.trim();
    groups.set(category, [...(groups.get(category) ?? []), skill]);
  }
  const blocks: Block[] = [];
  const level = (value: number, kind: 'bars' | 'dots') =>
    value > 0 && (
      <span className={`rc-level rc-level-${kind}`} role="img" aria-label={`${value} / 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <i key={n} data-on={n <= value || undefined} />
        ))}
      </span>
    );
  const push = (key: string, node: ReactNode, keepWithNext = false, gap: Block['gap'] = 'line') =>
    blocks.push({ key: `skills-${key}`, node, keepWithNext, gap });

  for (const [category, items] of groups) {
    const names = items.map((s) => s.name);
    if (variant === 'inline' || variant === 'grouped') {
      push(
        category || 'all',
        <p className={`rc-skill-line rc-skill-${variant}`}>
          {category && <strong>{category}</strong>}
          <span>{names.join(variant === 'inline' ? ' · ' : ', ')}</span>
        </p>,
      );
      continue;
    }
    if (category) push(category, <div className="rc-skill-category">{category}</div>, true);
    if (variant === 'tags') {
      push(
        `${category}-tags`,
        <ul className="rc-tags">
          {items.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>,
      );
    } else if (variant === 'columns') {
      for (let i = 0; i < items.length; i += 3) {
        push(
          items[i]!.id,
          <ul className="rc-columns">
            {items.slice(i, i + 3).map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>,
        );
      }
    } else {
      for (const s of items) {
        push(
          s.id,
          <div className={`rc-skill-row rc-skill-${variant}`}>
            <span>{s.name}</span>
            {level(s.level, variant)}
          </div>,
        );
      }
    }
  }
  return blocks;
}

type SectionContent = { key: string; title: string; blocks: Block[] };

function sectionContents(
  key: string,
  resume: Resume,
  template: TemplateDefinition,
  inSidebar: boolean,
  interactive: boolean,
): SectionContent[] {
  const labels = DOCUMENT_LABELS[resume.language];
  const { data } = resume;
  const paragraphs = (prefix: string, text: string): Block[] =>
    parseRich(text).map((line, i) => ({
      key: `${prefix}-${i}`,
      keepWithNext: false,
      gap: 'line',
      node:
        line.type === 'li' ? (
          <div className="rc-li">{renderInline(line.text)}</div>
        ) : (
          <p className="rc-p">{renderInline(line.text)}</p>
        ),
    }));

  if (key === 'summary') {
    return (
      [
        ['summary', data.summary.professional],
        ['about', data.summary.about],
        ['objective', data.summary.objective],
      ] as const
    ).map(([part, text]) => ({
      key: part,
      title: labels.sections[part],
      blocks: paragraphs(part, text),
    }));
  }
  if (key.startsWith('custom:')) {
    const custom = data.custom.find((c) => `custom:${c.id}` === key);
    if (!custom) return [];
    const blocks = custom.items
      .filter((i) => filled(i.title, i.subtitle, i.description))
      .flatMap((i) =>
        entryBlocks(
          key,
          {
            id: i.id,
            title: i.title,
            subtitle: i.subtitle,
            date: formatDate(i.date, resume.language),
            body: [i.description],
          },
          inSidebar ? 'stacked' : template.layout.entry,
          interactive,
        ),
      );
    return [{ key, title: custom.title, blocks }];
  }

  const section = key as BuiltInSection;
  let blocks: Block[];
  if (section === 'skills') {
    const variant = inSidebar
      ? (template.layout.sidebarSkills ?? template.layout.skills)
      : template.layout.skills;
    blocks = skillBlocks(resume, variant);
  } else if (section === 'languages') {
    blocks = data.languages
      .filter((l) => l.name.trim())
      .map((l) => ({
        key: `languages-${l.id}`,
        keepWithNext: false,
        gap: 'line',
        node: (
          <div className="rc-language">
            <span>{l.name}</span>
            {l.level && <span className="rc-muted">{labels.languageLevels[l.level]}</span>}
          </div>
        ),
      }));
  } else if (section === 'interests') {
    const names = data.interests.map((i) => i.name.trim()).filter(Boolean);
    blocks = names.length
      ? [
          {
            key: 'interests-all',
            keepWithNext: false,
            gap: 'line',
            node: <p className="rc-p">{names.join(' · ')}</p>,
          },
        ]
      : [];
  } else {
    // Narrow sidebars cannot fit a date column or timeline.
    const variant = inSidebar ? 'stacked' : template.layout.entry;
    blocks = entriesFor(section, resume).flatMap((e) =>
      entryBlocks(section, e, variant, interactive),
    );
  }
  return [{ key: section, title: labels.sections[section], blocks }];
}

export function buildColumns(
  resume: Resume,
  template: TemplateDefinition,
  interactive = true,
): ColumnBlocks {
  const { layout } = template;
  const columns: ColumnBlocks = { main: [], side: [] };
  const hasSide = layout.columns !== 'single';
  const number = { main: 0, side: 0 };

  const add = (column: 'main' | 'side', section: SectionContent) => {
    if (!section.blocks.length) return;
    number[column] += 1;
    const heading = (
      <h2 className="rc-heading">
        {layout.heading === 'numbered' && column === 'main' && (
          <span className="rc-heading-number">{String(number[column]).padStart(2, '0')}</span>
        )}
        <span>{section.title}</span>
      </h2>
    );
    if (layout.heading === 'gutter') {
      // The label shares a row with the first block instead of sitting above it.
      section.blocks.forEach((block, index) => {
        columns[column].push({
          ...block,
          key: `${section.key}:${block.key}`,
          gap: index === 0 ? 'section' : block.gap,
          node: (
            <div className="rc-gutter">
              <div>{index === 0 && section.title ? heading : null}</div>
              <div className={block.className}>{block.node}</div>
            </div>
          ),
          className: undefined,
        });
      });
      return;
    }
    if (section.title.trim()) {
      columns[column].push({
        key: `${section.key}:heading`,
        keepWithNext: true,
        gap: 'section',
        node: heading,
      });
    }
    section.blocks.forEach((block, index) =>
      columns[column].push({
        ...block,
        key: `${section.key}:${block.key}`,
        gap: index === 0 ? (section.title.trim() ? 'item' : 'section') : block.gap,
      }),
    );
  };

  const contact = contactItems(resume, layout.contactIcons, interactive);
  if (hasSide && layout.sidebarSections.includes('contact') && contact.length) {
    add('side', {
      key: 'contact',
      title: DOCUMENT_LABELS[resume.language].sections.contact,
      blocks: contact.map((node, i) => ({
        key: `contact-${i}`,
        keepWithNext: false,
        gap: 'line',
        node,
      })),
    });
  }

  for (const { key, visible } of resume.sections) {
    if (!visible) continue;
    const inSidebar = hasSide && (layout.sidebarSections as string[]).includes(key);
    for (const section of sectionContents(key, resume, template, inSidebar, interactive)) {
      add(inSidebar ? 'side' : 'main', section);
    }
  }
  return columns;
}
