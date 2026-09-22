import type { App, TFile } from 'obsidian';

export async function toggleEntry(
  app: App,
  file: TFile,
  date: string,
  entries: Set<string>
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return;
  }

  const next = new Set(entries);
  if (next.has(date)) {
    next.delete(date);
  } else {
    next.add(date);
  }

  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter.entries = [...next].sort();
  });
}