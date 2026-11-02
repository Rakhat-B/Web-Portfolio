// Files in public/ are written from the site root ('/docs/resume.pdf'), but the site is served
// from a sub-folder (base in vite.config.js); this puts that folder in front.
// Anything else (https:// links, '', null) comes back unchanged.
export function publicUrl(path) {
  return typeof path === 'string' && path.startsWith('/') ? import.meta.env.BASE_URL + path.slice(1) : path;
}
