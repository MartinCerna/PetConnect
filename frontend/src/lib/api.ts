// src/lib/api.ts
// URL base del backend: configurable con NEXT_PUBLIC_API_URL (frontend/.env.local)
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1';

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

   const res = await fetch(`${API_BASE}${endpoint}`, {
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
