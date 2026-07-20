import { useState } from 'react';
import UnifiedHeaderbar from './components/layout/UnifiedHeaderbar';
import ContextualSidebar from './components/layout/ContextualSidebar';
import Canvas from './components/reader/Canvas';
import FloatingActionButtons from './components/reader/FloatingActionButtons';

function App() {
  const [scale, setScale] = useState(1.2);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('No Document Opened');
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [outline, setOutline] = useState<any[]>([]);

  // Handle native drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setFileName(file.name);
      setCurrentPage(1); // Reset page on new document
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  return (
    <div 
      className="window-frame" 
      onDrop={handleDrop} 
      onDragOver={handleDragOver}
    >
      <UnifiedHeaderbar 
        onFileSelected={(url, name) => {
          setPdfUrl(url);
          setFileName(name);
          setCurrentPage(1);
        }} 
        fileName={fileName}
        numPages={numPages}
        currentPage={currentPage}
      />

      <div className="flex flex-1 overflow-hidden">
        <ContextualSidebar outline={outline} />

        <div className="flex-1 relative bg-adwaita-bg">
          <Canvas 
            scale={scale} 
            documentUrl={pdfUrl} 
            onDocumentLoad={(pages, documentOutline) => {
              setNumPages(pages);
              setOutline(documentOutline);
            }} 
          />
          
          <FloatingActionButtons 
            onZoomIn={() => setScale(s => s + 0.2)}
            onZoomOut={() => setScale(s => Math.max(0.4, s - 0.2))}
            onFit={() => setScale(1.0)}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
