import * as THREE from 'three';

// Loading screen (.loader in index.html): frosted glass over the scene while it loads. Its bar
// follows what three.js's default loading manager has fetched (models, Draco decoder, board
// images) but never fills faster than MIN_TIME, so the title gets a moment to be read.
const MIN_TIME = 2000; // ms
const HOLD_TIME = 3000; // ms the full bar stays up before the reveal
const EASE_TIME = 120; // ms for the bar to close ~63% of the gap to its target, at any frame rate

const loader = document.querySelector('.loader');
const bar = loader.querySelector('.loader__bar');
const percent = loader.querySelector('.loader__percent');

// The manager calls onStart when a batch of loads begins and onLoad when all of it is done,
// so `busy` mirrors its own (private) loading state.
const manager = THREE.DefaultLoadingManager;
let progress = 0;
let busy = false;
let onIdle = null;
manager.onStart = () => { busy = true; };
manager.onProgress = (url, itemsLoaded, itemsTotal) => { progress = Math.max(progress, itemsLoaded / itemsTotal); };
manager.onLoad = () => {
  busy = false;
  onIdle?.();
};
const whenIdle = () => (busy ? new Promise((resolve) => { onIdle = resolve; }) : Promise.resolve());

// New loads keep joining while the scene is built, so the bar holds below 90% until the end.
const start = performance.now();
let last = start;
let finished = false;
let shown = 0;
let onFull = null;

function tick(now) {
  const target = Math.min(finished ? 1 : 0.9 * progress, (now - start) / MIN_TIME);
  shown = Math.max(shown, shown + (target - shown) * (1 - Math.exp((last - now) / EASE_TIME)));
  last = now;
  if (target === 1 && shown > 0.995) {
    shown = 1;
  }
  bar.style.transform = `scaleX(${shown})`;
  percent.textContent = `${Math.round(shown * 100)}%`;
  if (shown === 1) {
    onFull?.();
  } else {
    requestAnimationFrame(tick);
  }
}
requestAnimationFrame(tick);

// Once everything has loaded and the bar has sat full for HOLD_TIME, clears the glass and calls
// onReveal as it does.
export async function revealScene(onReveal) {
  await whenIdle();
  finished = true;
  if (shown < 1) {
    await new Promise((resolve) => { onFull = resolve; });
  }
  await new Promise((resolve) => setTimeout(resolve, HOLD_TIME));
  loader.classList.add('is-done');
  onReveal();
  loader.addEventListener('transitionend', (event) => {
    if (event.target === loader && event.propertyName === 'opacity') {
      loader.remove();
    }
  });
}
