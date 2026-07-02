import React, { useState } from 'react';
import { Volume2, Bell, AlertTriangle, Play, Square, Settings2, Sparkles, HelpCircle } from 'lucide-react';
import { AlarmConfig, SoundPreset } from '../types';
import { SOUND_PRESETS, playSound } from '../utils/audio';

interface AlarmSettingsProps {
  config: AlarmConfig;
  onChangeConfig: (newConfig: AlarmConfig) => void;
}

export default function AlarmSettings({ config, onChangeConfig }: AlarmSettingsProps) {
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<{ stop: () => void } | null>(null);

  const handlePreview = (soundId: string, volume: number, type: 'warning' | 'end') => {
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

    // Auto stop warning preview after 3 seconds, and loop preview after 4 seconds
    const timeout = isLoop ? 4000 : 2000;
    setTimeout(() => {
      handle.stop();
      setPlayingPreview((prev) => (prev === soundId ? null : prev));
    }, timeout);
  };

  const updateField = (field: keyof AlarmConfig, value: any) => {
    const updated = { ...config, [field]: value };
    onChangeConfig(updated);
  };

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-lg flex flex-col gap-6" id="alarm-settings-panel">
      
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-600 dark:text-teal-400">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Bảng Quản Lý Chuông Báo</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tùy chỉnh âm thanh & thời gian cảnh báo của đồng hồ</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[10px] font-semibold uppercase px-2 py-1 rounded-md tracking-wider">
          <Sparkles className="w-3 h-3 text-teal-500 animate-pulse" />
          <span>Synthesizer</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* SECTION 1: WARNING ALARM (SẮP HẾT GIỜ) */}
        <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-900/40 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 pl-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Chuông Báo Sắp Hết Giờ</h3>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="warning-enabled-toggle"
                checked={config.warningEnabled}
                onChange={(e) => updateField('warningEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 pl-1 leading-relaxed">
            Phát âm thanh báo hiệu khi thời gian còn lại chạm mốc quy định giúp chuẩn bị tinh thần trước.
          </p>

          {config.warningEnabled ? (
            <div className="flex flex-col gap-4 mt-2">
              
              {/* Trigger time */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">Cảnh báo trước:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono">{config.warningTime} giây</span>
                </div>
                <input
                  type="range"
                  id="warning-time-slider"
                  min="3"
                  max="60"
                  step="1"
                  value={config.warningTime}
                  onChange={(e) => updateField('warningTime', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>3s</span>
                  <span>10s (Mặc định)</span>
                  <span>60s</span>
                </div>
              </div>

              {/* Sound Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Chọn tiếng chuông:</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {SOUND_PRESETS.map((sound) => (
                    <div 
                      key={sound.id}
                      onClick={() => updateField('warningSound', sound.id)}
                      className={`
                        flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all duration-150
                        ${config.warningSound === sound.id
                          ? 'border-amber-400 bg-amber-500/5 dark:bg-amber-500/10'
                          : 'border-slate-100 hover:border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700'
                        }
                      `}
                    >
                      <div className="flex flex-col gap-0.5 max-w-[80%]">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{sound.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sound.description}</span>
                      </div>
                      
                      <button
                        type="button"
                        id={`preview-warning-${sound.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(sound.id, config.warningVolume, 'warning');
                        }}
                        className={`
                          p-1.5 rounded-lg transition-all
                          ${playingPreview === sound.id
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                          }
                        `}
                      >
                        {playingPreview === sound.id ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Volume Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Âm lượng cảnh báo:</span>
                  </div>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{Math.round(config.warningVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  id="warning-volume-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.warningVolume}
                  onChange={(e) => updateField('warningVolume', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl bg-white/40 dark:bg-slate-900/10">
              <span className="text-xs text-slate-400 dark:text-slate-500 text-center">Đã tắt cảnh báo sắp hết giờ. Hãy bật công tắc bên trên nếu cần báo hiệu sớm.</span>
            </div>
          )}
        </div>

        {/* SECTION 2: TIMEOUT ALARM (HẾT GIỜ) */}
        <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-900/40 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 pl-1">
              <Bell className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Chuông Báo Khi Hết Giờ</h3>
            </div>
            
            <div className="flex items-center gap-1.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded">
              Bắt buộc
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 pl-1 leading-relaxed">
            Phát chuông báo dồn dập khi thời gian đếm ngược chính thức kết thúc về 00:00:00.
          </p>

          <div className="flex flex-col gap-4 mt-2">
            
            {/* End Alarm Duration Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">Tự động dừng chuông sau:</span>
                <span className="text-rose-600 dark:text-rose-400 font-mono">
                  {config.endAlarmDuration === 0 ? 'Lặp vô tận' : `${config.endAlarmDuration} giây`}
                </span>
              </div>
              <input
                type="range"
                id="end-alarm-duration-slider"
                min="0"
                max="60"
                step="5"
                value={config.endAlarmDuration}
                onChange={(e) => updateField('endAlarmDuration', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0s (Liên tục)</span>
                <span>30s (Mặc định)</span>
                <span>60s</span>
              </div>
            </div>

            {/* Loop End Alarm Setting */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Rung lặp liên tục</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Phát lặp chuông báo cho tới khi bấm nút dừng</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="loop-end-alarm-toggle"
                  checked={config.loopEndAlarm}
                  onChange={(e) => updateField('loopEndAlarm', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-rose-500"></div>
              </label>
            </div>

            {/* Sound Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Chọn tiếng chuông chính:</label>
              <div className="grid grid-cols-1 gap-1.5">
                {SOUND_PRESETS.map((sound) => (
                  <div 
                    key={sound.id}
                    onClick={() => updateField('endSound', sound.id)}
                    className={`
                      flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all duration-150
                      ${config.endSound === sound.id
                        ? 'border-rose-500 bg-rose-500/5 dark:bg-rose-500/10'
                        : 'border-slate-100 hover:border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700'
                      }
                    `}
                  >
                    <div className="flex flex-col gap-0.5 max-w-[80%]">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{sound.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sound.description}</span>
                    </div>
                    
                    <button
                      type="button"
                      id={`preview-end-${sound.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(sound.id, config.endVolume, 'end');
                      }}
                      className={`
                        p-1.5 rounded-lg transition-all
                        ${playingPreview === sound.id
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                        }
                      `}
                    >
                      {playingPreview === sound.id ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Volume Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Âm lượng chuông chính:</span>
                </div>
                <span className="font-mono text-slate-700 dark:text-slate-300">{Math.round(config.endVolume * 100)}%</span>
              </div>
              <input
                type="range"
                id="end-volume-slider"
                min="0"
                max="1"
                step="0.05"
                value={config.endVolume}
                onChange={(e) => updateField('endVolume', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>

          </div>
        </div>

      </div>

      <div className="flex gap-2 bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 items-start">
        <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong>Thông tin âm thanh:</strong> Ứng dụng tích hợp bộ giải âm kỹ thuật số chuyên nghiệp, hoạt động độc lập ngay trên trình duyệt mà không cần kết nối mạng. Nếu không nghe thấy tiếng kêu, vui lòng đảm bảo tab trình duyệt không bị tắt tiếng và thiết bị của bạn đã tăng âm lượng.
        </p>
      </div>
      
    </div>
  );
}
