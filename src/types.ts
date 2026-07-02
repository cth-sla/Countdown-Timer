export interface AlarmConfig {
  warningTime: number; // in seconds
  warningSound: string;
  warningEnabled: boolean;
  warningVolume: number;
  endSound: string;
  endVolume: number;
  loopEndAlarm: boolean;
  endAlarmDuration: number; // in seconds to automatically stop ringing
}

export interface SoundPreset {
  id: string;
  name: string;
  description: string;
  type: 'warning' | 'end' | 'both';
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'warning' | 'completed';
