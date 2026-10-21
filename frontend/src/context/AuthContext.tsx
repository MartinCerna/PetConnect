// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Pet {
   id: string;
   user_id: string;
   name: string;
   species: string;
   breed?: string;
   birth_date?: string | null;  // <-- Agrega esta línea
   photo_url?: string;
   created_at?: string;
   // age?: number; <-- Puedes borrar esta línea, ya no viene del backend
}

interface AuthContextType {
   token: string | null;
   userPets: Pet[];       // Cambia 'pets: Pet[]' por 'userPets: Pet[]'
   selectedPet: Pet | null; // Añade esta línea si no la tienes
   setSelectedPet: (pet: Pet) => void; // Añade esta línea si no la tienes
   loading: boolean;
   cart: any[];
   isCartOpen: boolean;
   setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
   login: (formData: URLSearchParams) => void;
   logout: () => void;
   registerPet: (petData: any) => Promise<boolean>;
   loadUserData: (authToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
   const [token, setToken] = useState<string | null>(null);
   const [pets, setPets] = useState<Pet[]>([]);
   const [loading, setLoading] = useState(true);

   const [selectedPet, setSelectedPet] = useState<Pet | null>(null); // Estado para la mascota seleccionada
   // Inicialización de estados del carrito
   const [cart, setCart] = useState<any[]>([]);
   const [isCartOpen, setIsCartOpen] = useState(false);

   useEffect(() => {
      const storedToken = localStorage.getItem('petconnect_token');
      if (storedToken) {
         setToken(storedToken);
         loadUserData(storedToken);
      } else {
         setLoading(false);
      }
   }, []);

   const loadUserData = async (authToken: string) => {
      try {
         const res = await fetch('http://127.0.0.1:8000/api/v1/pets/', {
            headers: {
               Authorization: `Bearer ${authToken}`,
            },
         });

         if (res.ok) {
            const petsData = await res.json();
            setPets(petsData);
         }
      } catch (error) {
         console.error('Error cargando mascotas:', error);
      } finally {
         setLoading(false);
      }
   };

   const login = async (formData: URLSearchParams) => {
      try {
         // CAMBIAR AQUÍ: Reemplazar '/token/' por '/login' (o el nombre exacto de tu backend)
         const res = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
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

   const logout = () => {
      setToken(null);
      setPets([]);
      localStorage.removeItem('petconnect_token');
   };

   const registerPet = async (petData: Omit<Pet, 'id'>) => {
      if (!token) return false;
      try {
         const res = await fetch('http://127.0.0.1:8000/api/v1/pets/', {
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

   // Aquí está el return que estaba arrojando el error, ahora correctamente 
   // ubicado al final de la función AuthProvider
   return (
      <AuthContext.Provider
         value={{
            token,
            userPets: pets, // Aquí le decimos que exponga 'pets' como 'userPets'
            selectedPet,    // Ahora sí existe (Paso 2)
            setSelectedPet, // Ahora sí existe (Paso 2)
            loading,
            cart,
            isCartOpen,
            setIsCartOpen,
            login,
            logout,
            registerPet,
            loadUserData
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