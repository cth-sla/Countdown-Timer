import React, { useState, useRef } from 'react';
import { Play, Square, Trash2, Plus, Music, Upload, Check, Globe } from 'lucide-react';
import { SOUND_PRESETS, EXPANDED_LIBRARY_SOUNDS, playSound } from '../utils/audio';

interface SoundSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
  volume: number;
  type: 'warning' | 'end';
  customSounds: Array<{ id: string; name: string; url: string }>;
  onAddCustomSound: (name: string, blob: Blob) => Promise<string>;
  onDeleteCustomSound: (id: string) => Promise<void>;
}

type TabType = 'synth' | 'online' | 'custom';

export default function SoundSelector({
  selectedId,
  onSelect,
  volume,
  type,
  customSounds,
  onAddCustomSound,
  onDeleteCustomSound,
}: SoundSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (customSounds.some(s => s.id === selectedId)) return 'custom';
    if (EXPANDED_LIBRARY_SOUNDS.some(s => s.id === selectedId)) return 'online';
    return 'synth';
  });

  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<{ stop: () => void } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePreview = (soundId: string) => {
    // If already playing this preview, stop it
    if (playingPreview === soundId) {
      if (activeHandle) {
        activeHandle.stop();
        setActiveHandle(null);
      }
      setPlayingPreview(null);
      return;
    }

    // Stop existing preview if any
    if (activeHandle) {
      activeHandle.stop();
    }

    // Play once or in loop for a short preview duration
    const isLoop = type === 'end';
    const handle = playSound(soundId, volume, isLoop);
    setActiveHandle(handle);
    setPlayingPreview(soundId);

    // Auto stop preview
    const timeout = isLoop ? 4000 : 2000;
    setTimeout(() => {
      handle.stop();
      setPlayingPreview((prev) => (prev === soundId ? null : prev));
    }, timeout);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      alert('Vui lòng chọn một tệp âm thanh hợp lệ (MP3, WAV, OGG, M4A...).');
      return;
    }

    // Check size (limit to 12MB for safety)
    if (file.size > 12 * 1024 * 1024) {
      alert('Tệp âm thanh quá lớn. Vui lòng chọn tệp nhỏ hơn 12MB.');
      return;
    }

    setIsUploading(true);
    try {
      // Clean up file extension for nicer display
      const displayName = file.name.replace(/\.[^/.]+$/, "");
      const newId = await onAddCustomSound(displayName, file);
      onSelect(newId);
    } catch (err) {
      console.error(err);
      alert('Không thể lưu tệp âm thanh vào bộ nhớ cục bộ.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Category Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-950/60 p-0.5 rounded-lg border border-slate-200/30 dark:border-slate-800/40">
        <button
          type="button"
          onClick={() => setActiveTab('synth')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
            activeTab === 'synth'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Music className="w-3 h-3" />
          <span>Mặc định (Synth)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('online')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
            activeTab === 'online'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Globe className="w-3 h-3" />
          <span>Thư viện (Online)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
            activeTab === 'custom'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Upload className="w-3 h-3" />
          <span>Tải lên tệp ({customSounds.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[140px] max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar flex flex-col gap-1.5">
        
        {/* TAB 1: SYNTHESIZED SOUNDS */}
        {activeTab === 'synth' && (
          <div className="flex flex-col gap-1.5">
            {SOUND_PRESETS.map((sound) => {
              const isSelected = selectedId === sound.id;
              return (
                <div
                  key={sound.id}
                  onClick={() => onSelect(sound.id)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition-all duration-150 ${
                    isSelected
                      ? type === 'end'
                        ? 'border-rose-500 bg-rose-500/5 dark:bg-rose-500/10'
                        : 'border-amber-400 bg-amber-500/5 dark:bg-amber-500/10'
                      : 'border-slate-100 hover:border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 max-w-[80%] pl-1">
                    <div className="flex items-center gap-1.5">
                      {isSelected && (
                        <div className={`w-1.5 h-1.5 rounded-full ${type === 'end' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      )}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{sound.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sound.description}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(sound.id);
                    }}
                    className={`p-1.5 rounded-lg transition-all ${
                      playingPreview === sound.id
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {playingPreview === sound.id ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: ONLINE EXPANDED LIBRARY */}
        {activeTab === 'online' && (
          <div className="flex flex-col gap-1.5">
            {EXPANDED_LIBRARY_SOUNDS.map((sound) => {
              const isSelected = selectedId === sound.id;
              return (
                <div
                  key={sound.id}
                  onClick={() => onSelect(sound.id)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition-all duration-150 ${
                    isSelected
                      ? type === 'end'
                        ? 'border-rose-500 bg-rose-500/5 dark:bg-rose-500/10'
                        : 'border-amber-400 bg-amber-500/5 dark:bg-amber-500/10'
                      : 'border-slate-100 hover:border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 max-w-[80%] pl-1">
                    <div className="flex items-center gap-1.5">
                      {isSelected && (
                        <div className={`w-1.5 h-1.5 rounded-full ${type === 'end' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      )}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{sound.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sound.description}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(sound.id);
                    }}
                    className={`p-1.5 rounded-lg transition-all ${
                      playingPreview === sound.id
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {playingPreview === sound.id ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: CUSTOM UPLOADED SOUNDS */}
        {activeTab === 'custom' && (
          <div className="flex flex-col gap-1.5">
            {/* Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-teal-500 bg-teal-50/20 dark:bg-teal-950/10'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-900/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <Upload className={`w-5 h-5 mb-1 ${isDragging ? 'text-teal-500' : 'text-slate-400'}`} />
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {isUploading ? 'Đang lưu âm thanh...' : 'Nhấp hoặc thả tệp âm thanh vào đây'}
              </p>
              <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
                Chấp nhận MP3, WAV, OGG... dung lượng tối đa 12MB
              </p>
            </div>

            {/* Custom Sound List */}
            {customSounds.length === 0 ? (
              <div className="text-center py-4 text-[10px] text-slate-400 dark:text-slate-500">
                Chưa có âm thanh tải lên nào.
              </div>
            ) : (
              customSounds.map((sound) => {
                const isSelected = selectedId === sound.id;
                return (
                  <div
                    key={sound.id}
                    onClick={() => onSelect(sound.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition-all duration-150 ${
                      isSelected
                        ? type === 'end'
                          ? 'border-rose-500 bg-rose-500/5 dark:bg-rose-500/10'
                          : 'border-amber-400 bg-amber-500/5 dark:bg-amber-500/10'
                        : 'border-slate-100 hover:border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 max-w-[65%] pl-1">
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <div className={`w-1.5 h-1.5 rounded-full ${type === 'end' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        )}
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block">
                          {sound.name}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500">Tệp nhạc cá nhân</span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Play Button */}
                      <button
                        type="button"
                        onClick={() => handlePreview(sound.id)}
                        className={`p-1.5 rounded-lg transition-all ${
                          playingPreview === sound.id
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {playingPreview === sound.id ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa âm thanh "${sound.name}" không?`)) {
                            onDeleteCustomSound(sound.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/50 dark:text-rose-400 transition-all"
                        title="Xóa âm thanh"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
