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
    id: 'digital-siren',
    name: 'Còi Báo Kỹ Thuật Số',
    description: 'Âm thanh cảnh báo điện tử dồn dập, tần số kép cuốn hút.',
  },
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
    id: 'ticking-tension',
    name: 'Tiếng Tích Tắc Hồi Hộp',
    description: 'Âm thanh gõ gỗ đanh gọn giống kim giây gõ dồn dập.',
  },
];

interface AudioHandle {
  stop: () => void;
}

// Synthesize sound effects using pure Web Audio API
export function playSound(soundId: string, volume: number, loop: boolean = false): AudioHandle {
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
      case 'digital-siren': {
        // High-low pulse siren
        playBeep(987.77, 0.2, 'square'); // B5
        setTimeout(() => playBeep(783.99, 0.2, 'square'), 250); // G5
        break;
      }
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
    }
    intervalId = setInterval(() => {
      triggerSound();
    }, intervalTime);
  }

  return { stop };
}
