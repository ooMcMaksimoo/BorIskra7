import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  Database,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyB1zuY8r2oqxgLPYACpclfxBVthSyS4nWw',
  authDomain: 'iskra-ppm.firebaseapp.com',
  databaseURL: 'https://iskra-ppm-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'iskra-ppm',
  storageBucket: 'iskra-ppm.firebasestorage.app',
  messagingSenderId: '797408836882',
  appId: '1:797408836882:web:a62cf9e248f66f1c3f87cb',
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db: Database = getDatabase(firebaseApp);

export const MANAGER_PIN = '1234';

export interface CurrentUser {
  name: string;
  role: 'welder' | 'manager';
}

export interface Product {
  id: string;
  name: string;
}

interface AppContextValue {
  currentUser: CurrentUser | null;
  products: Product[];
  isLoading: boolean;
  isOnline: boolean;
  login: (name: string, role: 'welder' | 'manager') => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const unsubscribeProductsRef = useRef<(() => void) | null>(null);
  const unsubscribeConnectionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('boriskra_user').then((data) => {
      if (data) {
        try {
          setCurrentUser(JSON.parse(data));
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    const connRef = ref(db, '.info/connected');
    const unsub = onValue(connRef, (snap) => {
      setIsOnline(snap.val() !== false);
    });
    unsubscribeConnectionRef.current = unsub;

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      if (unsubscribeProductsRef.current) {
        unsubscribeProductsRef.current();
        unsubscribeProductsRef.current = null;
      }
      setProducts([]);
      return;
    }

    const productsRef = ref(db, 'products');
    const unsub = onValue(productsRef, (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((child) => {
        list.push({ id: child.key!, name: child.val() as string });
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      setProducts(list);
    });
    unsubscribeProductsRef.current = unsub;

    return () => {
      unsub();
    };
  }, [currentUser]);

  const login = async (name: string, role: 'welder' | 'manager') => {
    const user: CurrentUser = { name, role };
    setCurrentUser(user);
    await AsyncStorage.setItem('boriskra_user', JSON.stringify(user));
    await AsyncStorage.setItem('boriskra_lastName', name);
  };

  const logout = async () => {
    if (unsubscribeProductsRef.current) {
      unsubscribeProductsRef.current();
      unsubscribeProductsRef.current = null;
    }
    setCurrentUser(null);
    setProducts([]);
    await AsyncStorage.removeItem('boriskra_user');
  };

  const value = useMemo(
    () => ({ currentUser, products, isLoading, isOnline, login, logout }),
    [currentUser, products, isLoading, isOnline]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
