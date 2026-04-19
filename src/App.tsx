/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent } from 'react';
import { Camera, Sparkles, AlertCircle, CheckCircle2, Loader2, Upload, Trash2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { POSE_PRESETS, GeneratedImage } from './types.ts';
import { generatePosedImage } from './services/aiService.ts';

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setGeneratedImages([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const startPosing = async () => {
    if (!originalImage) return;

    setIsProcessing(true);
    
    const initialImages: GeneratedImage[] = POSE_PRESETS.map((preset, index) => ({
      id: `${preset.id}-${Date.now()}-${index}`,
      url: '',
      label: preset.label,
      status: 'pending'
    }));
    
    setGeneratedImages(initialImages);
    setGlobalError(null);

    for (let i = 0; i < initialImages.length; i++) {
        const currentPreset = POSE_PRESETS[i];
        
        // Add a small delay between requests to avoid rate limiting
        if (i > 0) await delay(2000);

        setGeneratedImages(prev => prev.map((img, idx) => 
            idx === i ? { ...img, status: 'generating' } : img
        ));

        try {
            const url = await generatePosedImage(originalImage, currentPreset.label);
            setGeneratedImages(prev => prev.map((img, idx) => 
                idx === i ? { ...img, url, status: 'completed' } : img
            ));
        } catch (error: any) {
            console.error(`Error generating ${currentPreset.label}:`, error);
            
            const errorMsg = error?.message || '';
            const isQuotaError = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');
            
            if (isQuotaError) {
                setGlobalError("Máy chủ hiện đang quá tải hoặc hết hạn mức (Quota Exceeded). Vui lòng thử lại sau vài phút.");
            }

            setGeneratedImages(prev => prev.map((img, idx) => 
                idx === i ? { ...img, status: 'error' } : img
            ));

            // If it's a quota error, maybe we should stop trying the rest
            if (isQuotaError) break;
        }
    }

    setIsProcessing(false);
  };

  const retryPosing = async (index: number) => {
    if (!originalImage || isProcessing) return;

    const currentPreset = POSE_PRESETS[index];
    
    setGeneratedImages(prev => prev.map((img, idx) => 
        idx === index ? { ...img, status: 'generating' } : img
    ));
    setGlobalError(null);

    try {
        const url = await generatePosedImage(originalImage, currentPreset.label);
        setGeneratedImages(prev => prev.map((img, idx) => 
            idx === index ? { ...img, url, status: 'completed' } : img
        ));
    } catch (error: any) {
        console.error(`Error retrying ${currentPreset.label}:`, error);
        
        const errorMsg = error?.message || '';
        const isQuotaError = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');
        
        if (isQuotaError) {
            setGlobalError("Máy chủ vẫn báo quá tải (429). Hãy đợi khoảng 1-2 phút trước khi nhấn thử lại lần nữa.");
        }

        setGeneratedImages(prev => prev.map((img, idx) => 
            idx === index ? { ...img, status: 'error' } : img
        ));
    }
  };

  const downloadAll = async () => {
    const completedImages = generatedImages.filter(img => img.status === 'completed' && img.url);
    if (completedImages.length === 0) return;

    setIsDownloading(true);
    const zip = new JSZip();

    try {
      for (let i = 0; i < completedImages.length; i++) {
        const img = completedImages[i];
        const response = await fetch(img.url);
        const blob = await response.blob();
        const fileName = `${img.label.replace(/\s+/g, '_').toLowerCase()}_${i + 1}.png`;
        zip.file(fileName, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `tu_anh_studio_photos.zip`);
    } catch (error) {
      console.error("Lỗi khi tải ảnh xuống:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const removeOriginal = () => {
    setOriginalImage(null);
    setGeneratedImages([]);
  };

  const completedCount = generatedImages.filter(img => img.status === 'completed').length;

  return (
    <div id="studio-app" className="min-h-screen flex flex-col font-sans bg-black selection:bg-white/10">
      {/* Header */}
      <header className="px-4 md:px-6 py-4 flex items-center justify-between border-b border-white/10 studio-card sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg flex-shrink-0">
            <Camera className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-semibold tracking-tight uppercase truncate">Tú Anh Studio</h1>
            <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-widest font-medium">Đồ Anh Điền • AI Beta</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
            {completedCount > 0 && (
                <button 
                  onClick={downloadAll}
                  disabled={isDownloading}
                  className="p-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 px-3"
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="text-[10px] uppercase font-bold hidden sm:inline">Tải tất cả</span>
                </button>
            )}
            <span className="text-[9px] md:text-[11px] px-2 md:px-3 py-1 bg-white/5 rounded-full text-white/40 border border-white/10 uppercase tracking-tighter shrink-0">AI Beta</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden lg:flex-row flex-col relative">
        {/* Scrollable Left Sidebar on Desktop, Top Section on Mobile */}
        <aside className="lg:w-96 w-full lg:h-full lg:overflow-y-auto studio-card lg:border-r border-b lg:border-b-0 border-white/5 p-4 md:p-6 shrink-0 z-40 bg-black">
          <div className="space-y-6 md:space-y-8 max-w-md mx-auto lg:max-w-none">
            <section>
              <h2 className="text-[10px] md:text-xs font-semibold text-white/40 uppercase tracking-widest mb-4 md:mb-6 px-1">Ảnh Gốc</h2>
              
              <div className="relative group">
                {!originalImage ? (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    id="upload-button"
                    className="w-full aspect-[4/3] lg:aspect-[3/4] rounded-2xl md:rounded-24 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 md:gap-4 hover:border-white/30 transition-all bg-white/[0.02] active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Upload className="w-5 h-5 md:w-6 md:h-6 text-white/40" />
                    </div>
                    <div className="text-center p-2">
                      <p className="text-sm font-medium">Tải ảnh mẫu lên</p>
                      <p className="text-[10px] md:text-xs text-white/40 mt-1">Chụp trực tiếp hoặc chọn từ máy</p>
                    </div>
                  </button>
                ) : (
                  <div className="relative rounded-2xl md:rounded-24 overflow-hidden border border-white/10">
                    <img 
                      src={originalImage} 
                      alt="Original" 
                      className="w-full h-auto object-cover grayscale-[0.2]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <button 
                        onClick={removeOriginal}
                        className="p-2 md:p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full transition-colors backdrop-blur-md border border-red-500/20 active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
            </section>

            <section className="space-y-4">
              <button
                id="start-button"
                disabled={!originalImage || isProcessing}
                onClick={startPosing}
                className={`w-full py-4 md:py-5 rounded-2xl md:rounded-full flex items-center justify-center gap-2 font-bold transition-all text-sm md:text-base ${
                  !originalImage || isProcessing 
                    ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                    : 'bg-white text-black hover:bg-white/90 active:scale-[0.96] shadow-[0_4px_20px_rgba(255,255,255,0.1)]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang tạo dáng...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>BẮT ĐẦU TẠO DÁNG</span>
                  </>
                )}
              </button>

              <div className="p-4 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="flex gap-3">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-white/40 shrink-0 mt-0.5" />
                  <p className="text-[10px] md:text-[11px] leading-relaxed text-white/40 italic">
                    Mẹo: Sử dụng ảnh có ánh sáng tốt và phông nền đơn giản để AI có thể nhận diện vóc dáng người mẫu chính xác nhất.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-black">
          {globalError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{globalError}</p>
              <button 
                onClick={() => setGlobalError(null)}
                className="ml-auto text-xs uppercase font-bold tracking-widest hover:underline"
              >
                Đóng
              </button>
            </motion.div>
          )}

          {!originalImage && generatedImages.length === 0 ? (
            <div className="h-full min-h-[40vh] lg:min-h-0 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/[0.02] flex items-center justify-center mb-6 border border-white/5">
                <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-white/10" />
              </div>
              <h3 className="text-lg md:text-xl font-light text-white/20 max-w-xs md:max-w-md mx-auto">Tải ảnh lên để bắt đầu sáng tạo những tư thế quyến rũ</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 pb-32">
              <AnimatePresence mode="popLayout">
                {generatedImages.map((image, index) => (
                  <motion.div
                    key={image.id}
                    id={`image-card-${index}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 100, delay: index * 0.05 }}
                    className="group"
                  >
                    <div className="rounded-2xl md:rounded-24 overflow-hidden studio-card relative transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[0_0_50px_rgba(255,255,255,0.08)]">
                      <div className="aspect-[3/4] relative bg-white/[0.02]">
                        {image.status === 'generating' && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-md bg-black/40">
                             <div className="relative">
                                <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-white/40 animate-spin" />
                                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/60" />
                             </div>
                            <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mt-4">AI Sáng tạo...</p>
                          </div>
                        )}
                        
                        {image.status === 'pending' && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/10 flex items-center justify-center">
                                <span className="text-xs md:text-sm text-white font-mono">#{index + 1}</span>
                            </div>
                          </div>
                        )}

                        {image.status === 'error' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-3">
                             <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-red-500/30" />
                             <p className="text-[10px] md:text-xs text-red-500/50 uppercase font-bold">Lỗi hạn mức AI</p>
                             <button 
                                onClick={(e) => { e.stopPropagation(); retryPosing(index); }}
                                className="mt-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold hover:bg-white/10 transition-all"
                             >
                                Thử lại ảnh này
                             </button>
                          </div>
                        )}

                        {image.url && (
                          <motion.img 
                            initial={{ filter: 'blur(30px)', opacity: 0, scale: 1.1 }}
                            animate={{ filter: 'blur(0px)', opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                            src={image.url} 
                            alt={image.label}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        )}

                        {image.status === 'completed' && (
                          <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20">
                            <div className="hoan-tat-badge px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                              <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                              <span className="uppercase tracking-wider">Hoàn tất</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 md:p-5 flex items-center justify-between bg-white/[0.02] border-t border-white/5">
                        <h4 className="text-[12px] md:text-[13px] font-medium tracking-tight text-white/80 line-clamp-1 pr-2">{image.label}</h4>
                        <span className="text-[9px] md:text-[10px] font-mono text-white/20 shrink-0">#{index + 1}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
