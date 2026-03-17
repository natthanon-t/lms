/**
 * Build a compact list of page numbers to display.
 * When totalPages <= 4 show all pages: [1, 2, 3, 4]
 * When totalPages > 4 show first 3 + last: [1, 2, 3, "…", 25]
 * Current page and its neighbours are always included.
 */
export function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 4) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set();
  // Always include first page, last page
  pages.add(1);
  pages.add(totalPages);
  // Always include current and its neighbours
  if (currentPage > 1) pages.add(currentPage - 1);
  pages.add(currentPage);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  // Always include pages 2 and 3 for the beginning
  pages.add(2);
  pages.add(3);

  const sorted = [...pages].sort((a, b) => a - b);

  // Insert "…" markers where there are gaps
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("…");
    }
    result.push(sorted[i]);
  }
  return result;
}
