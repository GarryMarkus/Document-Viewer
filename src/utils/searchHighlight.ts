function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights text matches inside an element's DOM tree without disrupting layout or text selection.
 */
export function applySearchHighlights(
  root: HTMLElement,
  query: string,
  isActivePage: boolean,
  activeMatchOnPage: number = 0
): number {
  // 1. Remove previous highlights
  const marks = root.querySelectorAll('.search-highlight, .search-highlight-active');
  marks.forEach(m => {
    const parent = m.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(m.textContent || ''), m);
      parent.normalize();
    }
  });

  const cleanQuery = query.trim();
  if (!cleanQuery) return 0;

  // 2. Collect text nodes that contain the query
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;
  const lowerQuery = cleanQuery.toLowerCase();

  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.toLowerCase().includes(lowerQuery)) {
      textNodes.push(node as Text);
    }
  }

  let matchCounter = 0;

  // 3. Replace matching substrings with highlighted spans
  for (const textNode of textNodes) {
    const text = textNode.nodeValue || '';
    const regex = new RegExp(escapeRegExp(cleanQuery), 'gi');
    let match: RegExpExecArray | null;
    const fragments: (string | HTMLElement)[] = [];
    let lastIdx = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        fragments.push(text.substring(lastIdx, match.index));
      }
      const span = document.createElement('span');
      const isCurrentActive = isActivePage && matchCounter === activeMatchOnPage;
      span.className = isCurrentActive ? 'search-highlight-active' : 'search-highlight';
      span.textContent = match[0];
      fragments.push(span);
      lastIdx = regex.lastIndex;
      matchCounter++;
    }

    if (lastIdx < text.length) {
      fragments.push(text.substring(lastIdx));
    }

    if (fragments.length > 0 && textNode.parentNode) {
      const parent = textNode.parentNode;
      for (const frag of fragments) {
        if (typeof frag === 'string') {
          parent.insertBefore(document.createTextNode(frag), textNode);
        } else {
          parent.insertBefore(frag, textNode);
        }
      }
      parent.removeChild(textNode);
    }
  }

  return matchCounter;
}
