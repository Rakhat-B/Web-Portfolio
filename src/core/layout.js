// Portrait screens (phones held upright, narrow windows) get the touch layout: view tiles in the
// room, the folder ring and board hopping (main.js). Landscape keeps the desktop layout.
// style.scss switches on the same media query, so CSS and JS always agree.
export const portraitQuery = window.matchMedia('(orientation: portrait)');

export const isPortrait = () => portraitQuery.matches;
