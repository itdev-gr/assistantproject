/**
 * Normalize user input for keyword matching:
 * lowercase, strip Greek diacritics (όνομα → ονομα), collapse whitespace.
 * Robust to mixed scripts.
 */
export function normalize(input: string): string {
  return input
    .toLocaleLowerCase('el-GR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  const norm = normalize(input);
  if (!norm) return [];
  return norm.split(' ');
}
