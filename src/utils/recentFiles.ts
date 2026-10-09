import { RecentFileItem, DocumentFormat } from '../types/document';

const STORAGE_KEY = 'docs_viewer_recent_files';

export function detectFormat(fileName: string): DocumentFormat {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'xlsx':
    case 'xls':
    case 'csv':
      return 'xlsx';
    case 'pptx':
    case 'ppt':
      return 'pptx';
    default:
      return 'unknown';
  }
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getRecentFiles(): RecentFileItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse recent files:', e);
    return [];
  }
}

export function addRecentFile(item: RecentFileItem): RecentFileItem[] {
  try {
    const current = getRecentFiles();
    const filtered = current.filter(f => (f.path || f.name) !== (item.path || item.name));
    const updated = [item, ...filtered].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save recent files:', e);
    return [];
  }
}

export function removeRecentFile(identifier: string): RecentFileItem[] {
  try {
    const current = getRecentFiles();
    const updated = current.filter(f => f.path !== identifier && f.name !== identifier);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to remove recent file:', e);
    return [];
  }
}

export function updateFilePosition(identifier: string, page: number, scrollTop?: number) {
  try {
    const current = getRecentFiles();
    const index = current.findIndex(f => f.path === identifier || f.name === identifier);
    if (index >= 0) {
      current[index].lastPage = page;
      if (scrollTop !== undefined) {
        current[index].lastScrollTop = scrollTop;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.warn('Failed to update file position:', e);
  }
}
