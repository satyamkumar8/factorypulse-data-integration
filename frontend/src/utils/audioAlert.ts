class AudioAlertManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (enabled && !this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public playAlarm(type: 'breakdown' | 'defect' | 'success') {
    if (!this.soundEnabled) return;

    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;

      if (type === 'breakdown') {
        // High urgency two-tone alert
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(440, now + 0.15); // A4
        osc.frequency.setValueAtTime(880, now + 0.3); // A5

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'defect') {
        // Warning chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(392.00, now + 0.1); // G4

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'success') {
        // Pleasant success chord
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.warn("Could not play audio alert:", e);
    }
  }
}

export const audioAlert = new AudioAlertManager();
