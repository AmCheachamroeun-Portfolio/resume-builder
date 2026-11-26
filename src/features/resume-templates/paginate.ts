export type Measured = {
  /** Full outer height, including the leading gap. */
  height: number;
  /** Leading gap, which is dropped when the block starts a page. */
  gap: number;
  keepWithNext: boolean;
};

/**
 * Greedy pagination over indivisible blocks. Blocks chained by keepWithNext move
 * together; a chain taller than a page is broken apart rather than clipped.
 * Returns block indexes per page.
 */
export function paginate(blocks: Measured[], capacity: (page: number) => number): number[][] {
  const pages: number[][] = [[]];
  let used = 0;

  const newPage = () => {
    pages.push([]);
    used = 0;
  };
  const cost = (indexes: number[]) =>
    indexes.reduce(
      (sum, index, position) =>
        sum +
        blocks[index]!.height -
        (position === 0 && pages[pages.length - 1]!.length === 0 ? blocks[index]!.gap : 0),
      0,
    );
  const fits = (indexes: number[]) => used + cost(indexes) <= capacity(pages.length - 1) + 0.5;
  const place = (indexes: number[]) => {
    used += cost(indexes);
    pages[pages.length - 1]!.push(...indexes);
  };

  let i = 0;
  while (i < blocks.length) {
    const chain = [i];
    while (
      blocks[chain[chain.length - 1]!]!.keepWithNext &&
      chain[chain.length - 1]! + 1 < blocks.length
    ) {
      chain.push(chain[chain.length - 1]! + 1);
    }
    i += chain.length;

    if (fits(chain)) {
      place(chain);
      continue;
    }
    // A shorter first page (under the header) may be left empty on purpose.
    const current = pages.length - 1;
    const canAdvance = pages[current]!.length > 0 || capacity(current + 1) > capacity(current);
    if (canAdvance) newPage();
    if (fits(chain)) {
      place(chain);
      continue;
    }
    for (const index of chain) {
      if (!fits([index]) && pages[pages.length - 1]!.length > 0) newPage();
      place([index]);
    }
  }
  return pages;
}
