import { gsap } from 'gsap';
import { publicUrl } from '../../core/paths';

// Background music: put the track at public/audio/music.mp3 (or point MUSIC_SRC elsewhere).
// It loops, starts on the visitor's first click or key press (browsers block sound before
// that) and remembers mute and volume for the next visit. Without the file the controls stay hidden.
const MUSIC_SRC = publicUrl('/audio/song.mp3');
const DEFAULT_VOLUME = 0.4;
const FADE_IN = 2; // seconds, on first start
const FADE = 0.25; // seconds, on mute/unmute
const STORAGE_KEY = 'portfolio-music';

// Saved settings can be missing or unreadable (private windows, blocked storage): use the defaults.
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved?.volume)) {
      return { volume: Math.min(1, Math.max(0, saved.volume)), muted: Boolean(saved.muted) };
    }
  } catch {}
  return { volume: DEFAULT_VOLUME, muted: false };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function createMusicPlayer() {
  const root = document.querySelector('.music');
  const toggle = root.querySelector('.music__toggle');
  const slider = root.querySelector('.music__volume');
  const settings = loadSettings();
  let started = false;

  const audio = new Audio(MUSIC_SRC);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0; // fades up once it starts
  audio.addEventListener('loadedmetadata', () => { root.hidden = false; }, { once: true });
  audio.addEventListener('error', () => { root.hidden = true; });

  const isAudible = () => !settings.muted && settings.volume > 0;

  // Muting fades out and pauses, so it also works where the volume is fixed (iOS ignores audio.volume).
  function update(fade = FADE) {
    root.classList.toggle('is-muted', !isAudible());
    toggle.setAttribute('aria-pressed', String(!isAudible()));
    slider.value = Math.round(settings.volume * 100);
    saveSettings(settings);
    if (!started) {
      return;
    }

    gsap.killTweensOf(audio);
    if (isAudible()) {
      if (audio.paused) {
        audio.play().catch(() => {});
      }
      gsap.to(audio, { volume: settings.volume, duration: fade, ease: 'power1.out' });
    } else {
      gsap.to(audio, { volume: 0, duration: fade, ease: 'power1.out', onComplete: () => audio.pause() });
    }
  }

  // The first click or key press anywhere starts the music. If that click is on the mute button,
  // it starts here and the button's own click mutes it right away.
  const gestures = ['pointerdown', 'keydown'];
  function onFirstGesture() {
    gestures.forEach((type) => window.removeEventListener(type, onFirstGesture));
    started = true;
    update(FADE_IN);
  }
  gestures.forEach((type) => window.addEventListener(type, onFirstGesture));

  toggle.addEventListener('click', () => {
    if (isAudible()) {
      settings.muted = true;
    } else {
      settings.muted = false;
      settings.volume ||= DEFAULT_VOLUME; // unmuting a slider left at 0 brings the sound back
    }
    update();
  });

  slider.addEventListener('input', () => {
    settings.volume = slider.value / 100;
    settings.muted = false;
    update(0.1);
  });

  update();
}
