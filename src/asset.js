// Files from public/ resolved against Vite's base, so the site also works from a sub-path
// (GitHub Pages serves it at /<repo>/).
export const asset = (path) => import.meta.env.BASE_URL + path
