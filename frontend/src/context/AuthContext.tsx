// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_BASE } from '@/lib/api';

export interface Pet {
   id: string;
   user_id: string;
   name: string;
   species: string;
   breed?: string;
   birth_date?: string | null;
   photo_url?: string;
   created_at?: string;
}

export interface CartItem {
   id: string;
   name: string;
   price: number;
   quantity: number;
   image?: string;
}

interface AuthContextType {
   token: string | null;
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
   registerPet: (petData: any) => Promise<boolean>;
   loadUserData: (authToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
   const [token, setToken] = useState<string | null>(null);
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
      setPets([]);
      setSelectedPet(null);
      setCart([]);
      localStorage.removeItem('petconnect_token');
   }, []);

   const loadUserData = useCallback(
      async (authToken: string) => {
         try {
            const res = await fetch(`${API_BASE}/pets/`, {
               headers: { Authorization: `Bearer ${authToken}` },
            });

            if (res.ok) {
               setPets(await res.json());
            } else if (res.status === 401) {
               // Token vencido o inválido: se cierra la sesión
               logout();
            }
         } catch (error) {
            console.error('Error cargando mascotas:', error);
         } finally {
            setLoading(false);
         }
      },
      [logout]
   );

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

   return (
      <AuthContext.Provider
         value={{
            token,
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
            registerPet,
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
