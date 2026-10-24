// src/lib/api.ts

/**
 * Normaliza la URL base de la API:
 * Si en producción NEXT_PUBLIC_API_URL fue configurada como 'https://...onrender.com'
 * sin el '/api/v1', esta función asegura que siempre termine en '/api/v1'.
 */
function resolveApiBase(): string {
   const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
   if (!envUrl) {
      return 'http://127.0.0.1:8000/api/v1';
   }

   const clean = envUrl.replace(/\/+$/, '');
   if (!clean.endsWith('/api/v1')) {
      return `${clean}/api/v1`;
   }
   return clean;
}

export const API_BASE = resolveApiBase();

export function getApiUrl(endpoint: string): string {
   const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
   return `${API_BASE}${cleanEndpoint}`;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
   const token = typeof window !== 'undefined' ? localStorage.getItem('petconnect_token') : null;

   const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
   };

   // Con FormData el navegador define el Content-Type (multipart) por sí mismo
   if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
   }

   if (token) {
      headers['Authorization'] = `Bearer ${token}`;
   }

   const url = getApiUrl(endpoint);
   const res = await fetch(url, {
      ...options,
      headers,
   });

   if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('petconnect_token');
      window.location.href = '/login';
      throw new Error('Sesión expirada');
   }

   return res;
}

// Extrae un mensaje legible de las respuestas de error de FastAPI
export async function errorMessage(res: Response, fallback: string): Promise<string> {
   try {
      const data = await res.json();
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
   } catch {
      /* respuesta sin JSON */
   }
   return fallback;
}
