// 文件路径: components/ImageLightbox.tsx
import React, { useEffect } from 'react';
import { downloadImage } from '../services/downloadService';

interface ImageLightboxProps {
  src: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, onClose }) => {
  // Support ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing lightbox
    downloadImage(src, `MOKE_VISION_${Date.now()}.png`);
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
         
         {/* Image */}
         <img 
           src={src} 
           alt="Full Scale" 
           className="max-w-full max-h-full object-contain shadow-2xl scale-95 animate-in zoom-in-95 duration-300 select-none"
           onClick={(e) => e.stopPropagation()} 
         />
         
         {/* Controls (Top Right) */}
         <div className="absolute top-6 right-6 flex gap-4">
             {/* Download Button */}
             <button 
                onClick={handleDownload}
                className="group flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-white/5 hover:bg-white/20 hover:border-white/40 transition-all duration-300 backdrop-blur-md"
                title="Save to Disk"
             >
                <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
             </button>

             {/* Close Button */}
             <button 
                onClick={onClose}
                className="group flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-white/5 hover:bg-moke-red hover:border-moke-red transition-all duration-300 backdrop-blur-md"
                title="Close"
             >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
         </div>

         {/* Hint */}
         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-500 font-mono text-xs tracking-widest uppercase">
            Press ESC to Close
         </div>
      </div>
    </div>
  );
};