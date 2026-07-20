interface SidebarProps {
  outline?: any[];
}

export default function ContextualSidebar({ outline = [] }: SidebarProps) {
  // A simple recursive component to render nested outline items
  const renderOutlineItems = (items: any[], depth = 0) => {
    if (!items || items.length === 0) return null;
    return items.map((item, idx) => (
      <div key={idx} style={{ paddingLeft: `${depth * 12}px` }}>
        <div 
          className="p-1.5 hover:bg-gray-200/70 rounded text-sm text-gray-700 cursor-pointer truncate"
          title={item.title}
        >
          {item.title}
        </div>
        {item.items && item.items.length > 0 && renderOutlineItems(item.items, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="w-64 bg-adwaita-sidebar border-r border-adwaita-border flex flex-col shrink-0 select-none">
      {/* Sidebar Content Area */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Outline</div>
        
        {outline.length > 0 ? (
          renderOutlineItems(outline)
        ) : (
          <div className="text-sm text-gray-500 italic p-2">No outline available</div>
        )}
      </div>

      {/* Bottom Navigation Tabs */}
      <div className="h-14 border-t border-adwaita-border flex items-center justify-around bg-adwaita-header px-1">
        {/* Thumbnails */}
        <button className="p-2 rounded-md hover:bg-adwaita-hover text-gray-600"><svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg></button>
        {/* Outline (Active) */}
        <button className="p-2 rounded-md bg-gray-300 shadow-sm text-gray-800"><svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg></button>
        {/* Search */}
        <button className="p-2 rounded-md hover:bg-adwaita-hover text-gray-600"><svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
        {/* Bookmarks */}
        <button className="p-2 rounded-md hover:bg-adwaita-hover text-gray-600"><svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg></button>
      </div>
    </div>
  );
}
