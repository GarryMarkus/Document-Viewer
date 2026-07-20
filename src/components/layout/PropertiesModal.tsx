
interface PropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: any;
  fileName: string;
  numPages: number;
  darkMode: boolean;
}

export default function PropertiesModal({
  isOpen,
  onClose,
  metadata,
  fileName,
  numPages,
  darkMode
}: PropertiesModalProps) {
  if (!isOpen) return null;

  const bg = darkMode ? 'bg-[#242424]' : 'bg-[#fafafa]';
  const overlay = darkMode ? 'bg-black/60' : 'bg-black/20';
  const text = darkMode ? 'text-dark-text' : 'text-adwaita-text';
  const textDim = darkMode ? 'text-dark-text-dim' : 'text-adwaita-text-dim';
  const border = darkMode ? 'border-dark-border' : 'border-adwaita-border';
  
  const properties = [
    { label: 'File Name', value: fileName },
    { label: 'Title', value: metadata?.Title || 'Unknown' },
    { label: 'Author', value: metadata?.Author || 'Unknown' },
    { label: 'Creator', value: metadata?.Creator || 'Unknown' },
    { label: 'Producer', value: metadata?.Producer || 'Unknown' },
    { label: 'Pages', value: numPages.toString() },
  ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${overlay}`} onClick={onClose}>
      <div 
        className={`${bg} ${text} rounded-xl shadow-2xl overflow-hidden w-[400px] border ${border} animate-in fade-in zoom-in-95 duration-150`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`px-6 py-4 border-b ${border} flex justify-between items-center`}>
          <h2 className="font-semibold text-lg">Document Properties</h2>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-full ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid gap-3">
            {properties.map((prop, i) => (
              <div key={i} className="flex">
                <span className={`w-28 shrink-0 ${textDim} text-sm font-medium`}>{prop.label}</span>
                <span className="text-sm truncate" title={prop.value}>{prop.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
