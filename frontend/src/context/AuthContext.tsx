// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_BASE } from '@/lib/api';

export interface Pet {
   id: string;
   user_id: string;
   device_id?: string | null;
   name: string;
   species: string;
   breed?: string;
   birth_date?: string | null;
   photo_url?: string;
   home_latitude?: number | null;
   home_longitude?: number | null;
   safe_radius_meters?: number | null;
   safe_zone_enabled?: boolean;
   is_outside_safe_zone?: boolean;
   created_at?: string;
}

export interface CartItem {
   id: string;
   name: string;
   price: number;
   quantity: number;
   color?: string;
   image?: string;
}

export interface UserProfile {
   id: string;
   email: string;
   full_name: string;
   phone?: string | null;
   address?: string | null;
}

interface AuthContextType {
   token: string | null;
   user: UserProfile | null;
   userPets: Pet[];
   selectedPet: Pet | null;
   setSelectedPet: (pet: Pet) => void;
   loading: boolean;
   cart: CartItem[];
   addToCart: (item: CartItem) => void;
   removeFromCart: (id: string) => void;
   updateQuantity: (id: string, quantity: number) => void;
   clearCart: () => void;
   isCartOpen: boolean;
   setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
   login: (formData: URLSearchParams) => Promise<boolean>;
   logout: () => void;
   updateProfile: (data: { full_name?: string; phone?: string; address?: string }) => Promise<boolean>;
   registerPet: (petData: any) => Promise<boolean>;
   updatePetSafeZone: (
      petId: string,
      data: {
         home_latitude?: number | null;
         home_longitude?: number | null;
         safe_radius_meters?: number;
         safe_zone_enabled: boolean;
      }
   ) => Promise<Pet | null>;
   loadUserData: (authToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
   const [token, setToken] = useState<string | null>(null);
   const [user, setUser] = useState<UserProfile | null>(null);
   const [pets, setPets] = useState<Pet[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

   const [cart, setCart] = useState<CartItem[]>([]);
   const [isCartOpen, setIsCartOpen] = useState(false);
   const [cartLoaded, setCartLoaded] = useState(false);

   // Recupera el carrito guardado en el navegador
   useEffect(() => {
      try {
         const stored = localStorage.getItem('petconnect_cart');
         if (stored) setCart(JSON.parse(stored));
      } catch (error) {
         console.error('Error leyendo carrito:', error);
      }
      setCartLoaded(true);
   }, []);

   // Guarda el carrito cada vez que cambia (solo tras la carga inicial)
   useEffect(() => {
      if (cartLoaded) localStorage.setItem('petconnect_cart', JSON.stringify(cart));
   }, [cart, cartLoaded]);

   const addToCart = (item: CartItem) => {
      setCart((prev) => {
         const existing = prev.find((i) => i.id === item.id);
         if (existing) {
            return prev.map((i) =>
               i.id === item.id ? { ...i, quantity: Math.min(20, i.quantity + item.quantity) } : i
            );
         }
         return [...prev, item];
      });
      setIsCartOpen(true);
   };

   const removeFromCart = (id: string) => {
      setCart((prev) => prev.filter((i) => i.id !== id));
   };

   const updateQuantity = (id: string, quantity: number) => {
      if (quantity < 1) return removeFromCart(id);
      setCart((prev) =>
         prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(20, quantity) } : i))
      );
   };

   const clearCart = () => setCart([]);

   const logout = useCallback(() => {
      setToken(null);
      setUser(null);
      setPets([]);
      setSelectedPet(null);
      setCart([]);
      localStorage.removeItem('petconnect_token');
   }, []);

   const loadUserData = useCallback(
      async (authToken: string) => {
         try {
            const [petsRes, userRes] = await Promise.all([
               fetch(`${API_BASE}/pets/`, {
                  headers: { Authorization: `Bearer ${authToken}` },
               }),
               fetch(`${API_BASE}/auth/me`, {
                  headers: { Authorization: `Bearer ${authToken}` },
               }),
            ]);

            if (petsRes.ok) {
               setPets(await petsRes.json());
            } else if (petsRes.status === 401) {
               // Token vencido o inválido: se cierra la sesión
               logout();
               return;
            }

            if (userRes.ok) {
               setUser(await userRes.json());
            }
         } catch (error) {
            console.error('Error cargando datos:', error);
         } finally {
            setLoading(false);
         }
      },
      [logout]
   );

   const updateProfile = async (data: { full_name?: string; phone?: string; address?: string }): Promise<boolean> => {
      if (!token) return false;
      try {
         const res = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
         });

         if (res.ok) {
            const updated = await res.json();
            setUser(updated);
            return true;
         }
         return false;
      } catch (error) {
         console.error('Error actualizando perfil:', error);
         return false;
      }
   };

   useEffect(() => {
      const storedToken = localStorage.getItem('petconnect_token');
      if (storedToken) {
         setToken(storedToken);
         loadUserData(storedToken);
      } else {
         setLoading(false);
      }
   }, [loadUserData]);

   const login = async (formData: URLSearchParams): Promise<boolean> => {
      try {
         const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
         });

         if (res.ok) {
            const data = await res.json();
            const accessToken = data.access_token;
            setToken(accessToken);
            localStorage.setItem('petconnect_token', accessToken);
            await loadUserData(accessToken);
            return true;
         }
         return false;
      } catch (error) {
         console.error('Error en login:', error);
         return false;
      }
   };

   const registerPet = async (petData: Omit<Pet, 'id'>) => {
      if (!token) return false;
      try {
         const res = await fetch(`${API_BASE}/pets/`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(petData),
         });

         if (res.ok) {
            await loadUserData(token);
            return true;
         }
         return false;
      } catch (error) {
         console.error('Error registrando mascota:', error);
         return false;
      }
   };

   const updatePetSafeZone = async (
      petId: string,
      data: {
         home_latitude?: number | null;
         home_longitude?: number | null;
         safe_radius_meters?: number;
         safe_zone_enabled: boolean;
      }
   ): Promise<Pet | null> => {
      if (!token) return null;
      try {
         const res = await fetch(`${API_BASE}/pets/${petId}/safe-zone`, {
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
         });

         if (res.ok) {
            const updatedPet: Pet = await res.json();
            setPets((prev) => prev.map((p) => (p.id === updatedPet.id ? updatedPet : p)));
            setSelectedPet((prev) => (prev && prev.id === updatedPet.id ? updatedPet : prev));
            return updatedPet;
         }
         return null;
      } catch (error) {
         console.error('Error actualizando zona segura:', error);
         return null;
      }
   };

   return (
      <AuthContext.Provider
         value={{
            token,
            user,
            userPets: pets,
            selectedPet,
            setSelectedPet,
            loading,
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            isCartOpen,
            setIsCartOpen,
            login,
            logout,
            updateProfile,
            registerPet,
            updatePetSafeZone,
            loadUserData,
         }}
      >
         {children}
      </AuthContext.Provider>
   );
}

export function useAuth() {
   const context = useContext(AuthContext);
   if (!context) {
      throw new Error('useAuth debe usarse dentro de un AuthProvider');
   }
   return context;
}
