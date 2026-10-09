import { DocumentFormat } from '../../types/document';

export type NavDrawerTab = 'pages' | 'outline' | 'bookmarks' | 'properties' | 'none';

interface NavigationRailProps {
  activeTab: NavDrawerTab;
  onTabChange: (tab: NavDrawerTab) => void;
  format: DocumentFormat;
  onOpenShortcuts: () => void;
}

export default function NavigationRail({
  activeTab,
  onTabChange,
  format,
  onOpenShortcuts,
}: NavigationRailProps) {
  const handleTabClick = (tab: NavDrawerTab) => {
    if (activeTab === tab) {
      onTabChange('none'); // Toggle collapse
    } else {
      onTabChange(tab);
    }
  };

  const navItemClass = (tab: NavDrawerTab) => {
    const isActive = activeTab === tab;
    return `w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
      isActive
        ? 'bg-primary-container text-on-primary-container shadow-xs'
        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
    }`;
  };

  return (
    <aside className="w-12 bg-surface-container-lowest border-r border-surface-container-high/60 z-30 flex flex-col items-center py-2 select-none shrink-0 h-full">
      {/* Top Navigation Icons */}
      <nav className="flex flex-col items-center gap-1.5 w-full px-1.5">
        {/* Pages / Thumbnails / Slides */}
        <button
          onClick={() => handleTabClick('pages')}
          className={navItemClass('pages')}
          title={format === 'pptx' ? "Slide Deck (F9)" : format === 'xlsx' ? "Sheets (F9)" : "Pages & Thumbnails (F9)"}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </button>

        {/* Outline / Headings */}
        <button
          onClick={() => handleTabClick('outline')}
          className={navItemClass('outline')}
          title={format === 'docx' ? "Headings & Document Map" : "Table of Contents / Outline"}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h11M4 18h14" />
            <circle cx="20" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </button>

        {/* Bookmarks */}
        <button
          onClick={() => handleTabClick('bookmarks')}
          className={navItemClass('bookmarks')}
          title="Bookmarks"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Document Properties */}
        <button
          onClick={() => handleTabClick('properties')}
          className={navItemClass('properties')}
          title="Document Properties / Inspector"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </nav>

      {/* Bottom Action: Shortcuts Reference */}
      <div className="mt-auto flex flex-col items-center gap-1.5 w-full px-1.5">
        <button
          onClick={onOpenShortcuts}
          className="w-9 h-9 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          title="Keyboard Shortcuts & Reference"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
