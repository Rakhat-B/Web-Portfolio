// Opens `src` in an iframe with a spinner over it until it has loaded (.is-loading on the
// iframe's parent, see style.scss), instead of a blank box while a PDF or slides come in.
// 'about:blank' (unloading it) shows no spinner.
export function setFrameSrc(frame, src) {
  const holder = frame.parentElement;
  holder.classList.toggle('is-loading', src !== 'about:blank');
  frame.onload = () => holder.classList.remove('is-loading');
  frame.src = src;
}
