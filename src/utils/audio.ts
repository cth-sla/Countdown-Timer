// Web Audio API Synthesizer for high-quality, zero-dependency sound effects

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    // Standard and vendor prefixed support
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const SOUND_PRESETS = [
  {
    id: 'marimba-chime',
    name: 'Gõ Nhạc Gỗ Marimba',
    description: 'Giai điệu mộc mạc, thư thái, thích hợp chuẩn bị hết giờ.',
  },
  {
    id: 'soothing-bell',
    name: 'Chuông Đồng Ngân Vang',
    description: 'Tiếng chuông gõ ấm áp, sâu lắng với dải âm ngân lâu.',
  },
  {
    id: 'airport-chime',
    name: 'Âm Thanh Sân Bay',
    description: 'Âm báo phát thanh sân bay cổ điển, thanh lịch và trang trọng.',
  },
  {
    id: 'ticking-tension',
    name: 'Tiếng Tích Tắc Hồi Hộp',
    description: 'Âm thanh gõ gỗ đanh gọn giống kim giây gõ dồn dập.',
  },
];

export const EXPANDED_LIBRARY_SOUNDS = [
  {
    id: 'online-bell',
    name: 'Chuông Đồng Vang Vọng (Online)',
    description: 'Âm thanh tiếng gõ chuông đồng phong cách thiền tĩnh lặng.',
    url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav',
  },
  {
    id: 'online-buzzer',
    name: 'Còi Báo Điện Tử Retro (Online)',
    description: 'Tiếng còi bíp bíp liên hồi mang âm hưởng cổ điển, dứt khoát.',
    url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav',
  },
  {
    id: 'online-chime',
    name: 'Gõ Đệm Nhẹ Nhàng (Online)',
    description: 'Nhịp gõ sáo hoặc kim loại nhỏ thanh tao thích hợp báo hiệu sớm.',
    url: 'https://assets.mixkit.co/active_storage/sfx/911/911-84.wav',
  },
  {
    id: 'online-siren',
    name: 'Còi Hú Cảnh Báo (Online)',
    description: 'Còi cảnh báo dồn dập, tần số cao kích thích phản xạ tập trung.',
    url: 'https://assets.mixkit.co/active_storage/sfx/1004/1004-84.wav',
  },
  {
    id: 'online-flute',
    name: 'Sáo Trúc Êm Ái (Online)',
    description: 'Giai điệu sáo trúc du dương, thư thái phù hợp nhắc nhở nhẹ.',
    url: 'https://assets.mixkit.co/active_storage/sfx/1659/1659-84.wav',
  },
  {
    id: 'online-guitar',
    name: 'Gảy Đàn Guitar (Online)',
    description: 'Tiếng gảy dây đàn mộc ấm áp, trong trẻo.',
    url: 'https://assets.mixkit.co/active_storage/sfx/1545/1545-84.wav',
  },
];

const customSoundUrls = new Map<string, string>();

export function registerCustomSound(id: string, url: string) {
  customSoundUrls.set(id, url);
}

export function unregisterCustomSound(id: string) {
  const url = customSoundUrls.get(id);
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // Ignore
    }
  }
  customSoundUrls.delete(id);
}

interface AudioHandle {
  stop: () => void;
}

// Play sound effects using pure Web Audio API synthesis or external/custom audio files
export function playSound(soundId: string, volume: number, loop: boolean = false): AudioHandle {
  // 1. Check if the soundId corresponds to an external/custom URL
  let resolvedUrl = '';
  if (customSoundUrls.has(soundId)) {
    resolvedUrl = customSoundUrls.get(soundId)!;
  } else {
    const onlinePreset = EXPANDED_LIBRARY_SOUNDS.find(s => s.id === soundId);
    if (onlinePreset) {
      resolvedUrl = onlinePreset.url;
    } else if (
      soundId.startsWith('http://') ||
      soundId.startsWith('https://') ||
      soundId.startsWith('blob:') ||
      soundId.startsWith('data:')
    ) {
      resolvedUrl = soundId;
    }
  }

  // 2. Play using standard Audio element if resolved as a URL (highly robust and avoids CORS issues for audio playback)
  if (resolvedUrl) {
    const audio = new Audio(resolvedUrl);
    audio.volume = volume;
    audio.loop = loop;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Audio play prevented or failed:', error);
      });
    }

    return {
      stop: () => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
          // Ignore
        }
      }
    };
  }

  // Fallback to Web Audio API synthesis
  const ctx = getAudioContext();
  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(volume, ctx.currentTime);
  mainGain.connect(ctx.destination);

  let activeSources: AudioNode[] = [];
  let intervalId: any = null;
  let isStopped = false;

  const stop = () => {
    if (isStopped) return;
    isStopped = true;
    if (intervalId) {
      clearInterval(intervalId);
    }
    activeSources.forEach((src) => {
      try {
        (src as any).stop();
      } catch (e) {
        // Already stopped or not applicable
      }
    });
    activeSources = [];
  };

  const playBeep = (freq: number, duration: number, type: OscillatorType = 'sine', decay = true) => {
    if (isStopped) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(1, ctx.currentTime);
    if (decay) {
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    } else {
      gainNode.gain.setValueAtTime(1, ctx.currentTime + duration - 0.02);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    }

    osc.connect(gainNode);
    gainNode.connect(mainGain);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
    
    activeSources.push(osc);
    setTimeout(() => {
      activeSources = activeSources.filter(s => s !== osc);
    }, duration * 1000 + 100);
  };

  const triggerSound = () => {
    switch (soundId) {
      case 'marimba-chime': {
        // Warm rich marimba chord arpeggio
        const now = ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            if (isStopped) return;
            // Play physical strike model
            const osc = ctx.createOscillator();
            const osc2 = ctx.createOscillator(); // harmonic
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);
            
            gain.gain.setValueAtTime(0.6, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(mainGain);
            
            osc.start();
            osc2.start();
            osc.stop(ctx.currentTime + 0.8);
            osc2.stop(ctx.currentTime + 0.8);
            
            activeSources.push(osc, osc2);
          }, idx * 120);
        });
        break;
      }
      case 'soothing-bell': {
        // Giant warm copper gong bell
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
        
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(164.81, ctx.currentTime); // E3 (resonant bass)
        
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
        
        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(mainGain);
        
        osc.start();
        subOsc.start();
        osc.stop(ctx.currentTime + 2.0);
        subOsc.stop(ctx.currentTime + 2.0);
        
        activeSources.push(osc, subOsc);
        break;
      }
      case 'airport-chime': {
        // Classic 4-note airport announcer chime (F4 - A4 - C5 - F5) with resonant overtones
        const notes = [349.23, 440.00, 523.25, 698.46];
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            if (isStopped) return;
            const osc = ctx.createOscillator();
            const overtone = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            overtone.type = 'sine';
            overtone.frequency.setValueAtTime(freq * 2, ctx.currentTime);
            
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
            
            osc.connect(gain);
            overtone.connect(gain);
            gain.connect(mainGain);
            
            osc.start();
            overtone.start();
            osc.stop(ctx.currentTime + 1.6);
            overtone.stop(ctx.currentTime + 1.6);
            
            activeSources.push(osc, overtone);
          }, idx * 280);
        });
        break;
      }
      case 'ticking-tension': {
        // sharp tension tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, ctx.currentTime);
        gain.gain.setValueAtTime(0.9, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(mainGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
        activeSources.push(osc);
        break;
      }
      default:
        // Default simple beep
        playBeep(440, 0.2);
        break;
    }
  };

  // Trigger once initially
  triggerSound();

  // If loop is requested, set up interval
  if (loop) {
    let intervalTime = 1000;
    if (soundId === 'soothing-bell') {
      intervalTime = 2500;
    } else if (soundId === 'marimba-chime') {
      intervalTime = 1800;
    } else if (soundId === 'airport-chime') {
      intervalTime = 3000;
    }
    intervalId = setInterval(() => {
      triggerSound();
    }, intervalTime);
  }

  return { stop };
}
