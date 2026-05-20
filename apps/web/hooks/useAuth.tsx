'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hashPassword } from '@/lib/auth/password';
import { storageKeys } from '@/lib/storage/keys';
import { readJson, readString, removeItem, writeJson, writeString } from '@/lib/storage/local-store';
import type { Company, Language, LoginPayload, RegisterPayload, TeamMemberPayload, User } from '@/lib/storage/types';
import { createEmptyCompanyData } from '@/lib/mock-data/seed';
import { useTranslation } from '@/hooks/useTranslation';

interface AuthContextValue {
  currentUser: User | null;
  company: Company | null;
  loading: boolean;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: Pick<User, 'name' | 'email' | 'phone'>) => void;
  updateCompany: (name: string) => void;
  updateLanguage: (language: Language) => void;
  createCompanyUser: (payload: TeamMemberPayload) => Promise<User>;
  updateCompanyUser: (id: string, payload: Partial<Pick<User, 'name' | 'email' | 'phone' | 'role' | 'active'>>) => void;
  deleteCompanyUser: (id: string) => void;
  emailExists: (email: string, exceptUserId?: string) => boolean;
  canManageCompany: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readUsers() {
  return readJson<User[]>(storageKeys.users, []);
}

function readCompanies() {
  return readJson<Company[]>(storageKeys.companies, []);
}

function normalizeUser(user: User): User {
  return {
    ...user,
    role: user.role ?? 'manager',
    active: user.active ?? true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setLanguage } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionUserId = readString(storageKeys.sessionUserId);
    const user = readUsers().map(normalizeUser).find((item) => item.id === sessionUserId) ?? null;
    const userCompany = user ? readCompanies().find((item) => item.id === user.companyId) ?? null : null;

    if (user) {
      setCurrentUser(user);
      setLanguage(user.language);
    }
    setCompany(userCompany);
    setLoading(false);
  }, [setLanguage]);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const email = normalizeEmail(payload.email);
      const users = readUsers();

      if (users.some((user) => user.email === email)) {
        throw new Error('validation.userExists');
      }

      const companyId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      const storedLanguage = readString(storageKeys.language);
      const language: Language = storedLanguage === 'kz' ? 'kz' : 'ru';
      const companyRecord: Company = {
        id: companyId,
        name: payload.companyName.trim(),
        createdAt: new Date().toISOString(),
      };
      const user: User = {
        id: userId,
        name: payload.name.trim(),
        email,
        phone: payload.phone.trim(),
        role: 'owner',
        companyId,
        language: language === 'kz' ? 'kz' : 'ru',
        passwordHash: await hashPassword(payload.password),
        active: true,
      };

      writeJson(storageKeys.users, [...users, user]);
      writeJson(storageKeys.companies, [...readCompanies(), companyRecord]);
      writeJson(storageKeys.companyData(companyId), createEmptyCompanyData(user));
      writeString(storageKeys.sessionUserId, user.id);

      setCurrentUser(user);
      setCompany(companyRecord);
      setLanguage(user.language);
    },
    [setLanguage],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      const email = normalizeEmail(payload.email);
      const user = readUsers().map(normalizeUser).find((item) => item.email === email);
      const passwordHash = await hashPassword(payload.password);

      if (!user || user.passwordHash !== passwordHash) {
        throw new Error('validation.invalidCredentials');
      }

      if (user.active === false) {
        throw new Error('validation.inactiveUser');
      }

      const userCompany = readCompanies().find((item) => item.id === user.companyId) ?? null;
      writeString(storageKeys.sessionUserId, user.id);
      setCurrentUser(user);
      setCompany(userCompany);
      setLanguage(user.language);
    },
    [setLanguage],
  );

  const logout = useCallback(() => {
    removeItem(storageKeys.sessionUserId);
    setCurrentUser(null);
    setCompany(null);
  }, []);

  const emailExists = useCallback((email: string, exceptUserId?: string) => {
    const normalized = normalizeEmail(email);
    return readUsers().some((user) => user.email === normalized && user.id !== exceptUserId);
  }, []);

  const updateProfile = useCallback((payload: Pick<User, 'name' | 'email' | 'phone'>) => {
    setCurrentUser((user) => {
      if (!user) return user;
      const nextUser = {
        ...user,
        name: payload.name.trim(),
        email: normalizeEmail(payload.email),
        phone: payload.phone.trim(),
      };
      writeJson(
        storageKeys.users,
        readUsers().map((item) => (item.id === nextUser.id ? nextUser : item)),
      );
      return nextUser;
    });
  }, []);

  const updateCompany = useCallback((name: string) => {
    setCompany((current) => {
      if (!current) return current;
      const nextCompany = { ...current, name: name.trim() };
      writeJson(
        storageKeys.companies,
        readCompanies().map((item) => (item.id === nextCompany.id ? nextCompany : item)),
      );
      return nextCompany;
    });
  }, []);

  const updateLanguage = useCallback(
    (language: Language) => {
      setLanguage(language);
      setCurrentUser((user) => {
        if (!user) return user;
        const nextUser = { ...user, language };
        writeJson(
          storageKeys.users,
          readUsers().map((item) => (item.id === nextUser.id ? nextUser : item)),
        );
        return nextUser;
      });
    },
    [setLanguage],
  );

  const createCompanyUser = useCallback(
    async (payload: TeamMemberPayload) => {
      if (!currentUser) throw new Error('validation.required');
      const email = normalizeEmail(payload.email);
      const users = readUsers();

      if (users.some((user) => user.email === email)) {
        throw new Error('validation.userExists');
      }

      if (!payload.password || payload.password.length < 6) {
        throw new Error('validation.passwordMin');
      }

      if (payload.password !== payload.confirmPassword) {
        throw new Error('validation.passwordMismatch');
      }

      const user: User = {
        id: crypto.randomUUID(),
        name: payload.name.trim(),
        email,
        phone: payload.phone.trim(),
        role: payload.role,
        companyId: currentUser.companyId,
        language: currentUser.language,
        passwordHash: await hashPassword(payload.password),
        active: true,
      };

      writeJson(storageKeys.users, [...users, user]);
      return user;
    },
    [currentUser],
  );

  const updateCompanyUser = useCallback(
    (id: string, payload: Partial<Pick<User, 'name' | 'email' | 'phone' | 'role' | 'active'>>) => {
      const users = readUsers().map((user) =>
        user.id === id
          ? {
              ...user,
              ...payload,
              email: payload.email ? normalizeEmail(payload.email) : user.email,
              name: payload.name ? payload.name.trim() : user.name,
              phone: payload.phone ? payload.phone.trim() : user.phone,
            }
          : user,
      );
      writeJson(storageKeys.users, users);
      setCurrentUser((user) => (user?.id === id ? normalizeUser(users.find((item) => item.id === id) ?? user) : user));
    },
    [],
  );

  const deleteCompanyUser = useCallback((id: string) => {
    writeJson(
      storageKeys.users,
      readUsers().filter((user) => user.id !== id),
    );
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      company,
      loading,
      register,
      login,
      logout,
      updateProfile,
      updateCompany,
      updateLanguage,
      createCompanyUser,
      updateCompanyUser,
      deleteCompanyUser,
      emailExists,
      canManageCompany: currentUser?.role === 'owner' || currentUser?.role === 'admin',
    }),
    [
      company,
      createCompanyUser,
      currentUser,
      deleteCompanyUser,
      emailExists,
      loading,
      login,
      logout,
      register,
      updateCompany,
      updateCompanyUser,
      updateLanguage,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
