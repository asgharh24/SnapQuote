// Use relative path '' in production (Nginx handles routing)
// Use localhost:5000 in local development
export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');
