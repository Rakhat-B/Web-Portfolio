import { defineConfig } from 'vite';

// The site is served from the root of https://rakhatb.com (custom domain on GitHub Pages).
// Without the custom domain it would live at https://rakhat-b.github.io/Web-Portfolio/,
// and base would have to be '/Web-Portfolio/'.
export default defineConfig({
  base: '/'
});
