// src/lib/api.ts
const API_BASE = 'http://127.0.0.1:8000/api/v1';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
   const token = typeof window !== 'undefined' ? localStorage.getItem('petconnect_token') : null;

   const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
   };

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