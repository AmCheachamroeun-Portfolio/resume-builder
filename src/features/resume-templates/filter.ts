import { TEMPLATES } from './registry';
import type { TemplateCategory, TemplateDefinition } from './types';

export type TemplateFilters = {
  columns: 'any' | 'one' | 'two';
  photo: 'any' | 'yes' | 'no';
  ats: 'any' | 'high';
};
export const NO_FILTERS: TemplateFilters = { columns: 'any', photo: 'any', ats: 'any' };

export function matchesFilters(template: TemplateDefinition, filters: TemplateFilters) {
  const columns = template.layout.columns === 'single' ? 'one' : 'two';
  return (
    (filters.columns === 'any' || filters.columns === columns) &&
    (filters.photo === 'any' || (filters.photo === 'yes') === template.photo) &&
    (filters.ats === 'any' || template.ats === filters.ats)
  );
}

export function filterTemplates(
  query: string,
  category: TemplateCategory | 'all',
  filters: TemplateFilters = NO_FILTERS,
) {
  const needle = query.trim().toLocaleLowerCase();
  return TEMPLATES.filter(
    (template) =>
      (category === 'all' || template.categories.includes(category)) &&
      matchesFilters(template, filters) &&
      (!needle ||
        [template.name, ...Object.values(template.description), ...template.categories]
          .join(' ')
          .toLocaleLowerCase()
          .includes(needle)),
  );
}
