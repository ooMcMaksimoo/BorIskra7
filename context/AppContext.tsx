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
  push,
  remove,
  update,
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

export const ADMIN_PIN = '1234';

export interface CurrentUser {
  name: string;
  role: 'welder' | 'manager';
}

export interface Product {
  id: string;
  name: string;
}

export interface UserRecord {
  id: string;
  name: string;
  role: 'welder' | 'manager';
  pin: string;
}

interface AppContextValue {
  currentUser: CurrentUser | null;
  products: Product[];
  users: UserRecord[];
  isLoading: boolean;
  isOnline: boolean;
  login: (name: string, pin: string) => Promise<'ok' | 'not_found'>;
  logout: () => Promise<void>;
  addUser: (name: string, role: 'welder' | 'manager', pin: string) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  updateUserPin: (id: string, pin: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const unsubscribeProductsRef = useRef<(() => void) | null>(null);

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
    return () => unsub();
  }, []);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      const list: UserRecord[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        if (val && val.name && val.role && val.pin) {
          list.push({
            id: child.key!,
            name: val.name,
            role: val.role,
            pin: val.pin,
          });
        }
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      setUsers(list);
    });
    return () => unsub();
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
        const val = child.val();
        if (val) {
          list.push({ id: child.key!, name: typeof val === 'string' ? val : val.name ?? '' });
        }
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      setProducts(list);
    });
    unsubscribeProductsRef.current = unsub;

    return () => {
      unsub();
    };
  }, [currentUser]);

  const login = async (name: string, pin: string): Promise<'ok' | 'not_found'> => {
    const trimmed = name.trim();
    if (!trimmed || !pin.trim()) return 'not_found';

    const matched = users.find(
      (u) => u.name.toLowerCase() === trimmed.toLowerCase() && u.pin === pin.trim()
    );

    if (matched) {
      const user: CurrentUser = { name: matched.name, role: matched.role };
      setCurrentUser(user);
      await AsyncStorage.setItem('boriskra_user', JSON.stringify(user));
      await AsyncStorage.setItem('boriskra_lastName', matched.name);
      return 'ok';
    }

    if (pin.trim() === ADMIN_PIN) {
      const user: CurrentUser = { name: trimmed, role: 'manager' };
      setCurrentUser(user);
      await AsyncStorage.setItem('boriskra_user', JSON.stringify(user));
      await AsyncStorage.setItem('boriskra_lastName', trimmed);
      return 'ok';
    }

    return 'not_found';
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

  const addUser = async (name: string, role: 'welder' | 'manager', pin: string) => {
    await push(ref(db, 'users'), { name: name.trim(), role, pin: pin.trim() });
  };

  const removeUser = async (id: string) => {
    await remove(ref(db, `users/${id}`));
  };

  const updateUserPin = async (id: string, pin: string) => {
    await update(ref(db, `users/${id}`), { pin: pin.trim() });
  };

  const value = useMemo(
    () => ({
      currentUser,
      products,
      users,
      isLoading,
      isOnline,
      login,
      logout,
      addUser,
      removeUser,
      updateUserPin,
    }),
    [currentUser, products, users, isLoading, isOnline]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
