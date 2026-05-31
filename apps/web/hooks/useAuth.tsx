'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, isApiEnabled } from '@/lib/api/client';
import { hashPassword } from '@/lib/auth/password';
import { storageKeys } from '@/lib/storage/keys';
import { readJson, readString, removeItem, writeJson, writeString } from '@/lib/storage/local-store';
import type { Company, CompanyData, Language, LoginPayload, RegisterPayload, TeamMemberPayload, User } from '@/lib/storage/types';
import { createEmptyCompanyData } from '@/lib/mock-data/seed';
import { useTranslation } from '@/hooks/useTranslation';

interface AuthContextValue {
  currentUser: User | null;
  company: Company | null;
  loading: boolean;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (payload: { email: string; code: string; password: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: Pick<User, 'name' | 'email' | 'phone'> & Partial<Pick<User, 'avatarDataUrl'>>) => void;
  updateCompany: (name: string) => void;
  updateLanguage: (language: Language) => void;
  createCompanyUser: (payload: TeamMemberPayload) => Promise<User>;
  updateCompanyUser: (id: string, payload: Partial<Pick<User, 'name' | 'email' | 'phone' | 'role' | 'active' | 'avatarDataUrl'>>) => void;
  deleteCompanyUser: (id: string) => void;
  emailExists: (email: string, exceptUserId?: string) => boolean;
  canManageCompany: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ApiAuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    avatarUrl?: string | null;
    organization?: string;
    organizationId?: string;
  };
  organization?: {
    id: string;
    name: string;
  };
}

interface ApiMeResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatarUrl?: string | null;
  organization: {
    id: string;
    name: string;
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readUsers() {
  return readJson<User[]>(storageKeys.users, []);
}

function readCompanies() {
  return readJson<Company[]>(storageKeys.companies, []);
}

function mapApiUser(payload: ApiAuthResponse | ApiMeResponse): { user: User; company: Company } {
  const apiUser = 'user' in payload ? payload.user : payload;
  const organization =
    'user' in payload
      ? (payload.organization ?? {
          id: payload.user.organizationId ?? 'api-company',
          name: payload.user.organization ?? 'Khaman CRM',
        })
      : payload.organization;
  const company: Company = {
    id: organization.id,
    name: organization.name,
    createdAt: new Date().toISOString(),
  };
  const role = apiUser.role.toLowerCase();
  return {
    company,
    user: {
      id: apiUser.id,
      name: apiUser.name,
      email: normalizeEmail(apiUser.email),
      phone: apiUser.phone ?? '',
      role,
      companyId: company.id,
      language: readString(storageKeys.language) === 'kz' ? 'kz' : 'ru',
      passwordHash: '',
      active: true,
      avatarDataUrl: apiUser.avatarUrl ?? undefined,
    },
  };
}

function normalizeUser(user: User): User {
  return {
    ...user,
    role: user.role ?? 'manager',
    active: user.active ?? true,
  };
}

function markUserPresence(user: User, event: 'login' | 'logout' | 'seen') {
  const key = storageKeys.companyData(user.companyId);
  const companyData = readJson<CompanyData | null>(key, null) ?? createEmptyCompanyData(user);
  const timestamp = new Date().toISOString();
  const teamMembers = companyData.teamMembers.map((member) =>
    member.id === user.id
      ? {
          ...member,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatarDataUrl: user.avatarDataUrl,
          isOnline: event !== 'logout',
          lastSeenAt: timestamp,
          lastLoginAt: event === 'login' ? timestamp : member.lastLoginAt,
          lastLogoutAt: event === 'logout' ? timestamp : member.lastLogoutAt,
          loginCount: event === 'login' ? (member.loginCount ?? 0) + 1 : (member.loginCount ?? 0),
          logoutCount: event === 'logout' ? (member.logoutCount ?? 0) + 1 : (member.logoutCount ?? 0),
        }
      : member,
  );

  writeJson(key, {
    ...companyData,
    teamMembers,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setLanguage } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isApiEnabled()) {
      const token = readString(storageKeys.apiToken);
      if (token) {
        void apiRequest<ApiMeResponse>('/auth/me')
	          .then((payload) => {
	            const mapped = mapApiUser(payload);
	            markUserPresence(mapped.user, 'seen');
	            setCurrentUser(mapped.user);
	            setCompany(mapped.company);
	            setLanguage(mapped.user.language);
          })
          .catch(() => {
            removeItem(storageKeys.apiToken);
          })
          .finally(() => setLoading(false));
        return;
      }
    }

    const sessionUserId = readString(storageKeys.sessionUserId);
    const user = readUsers().map(normalizeUser).find((item) => item.id === sessionUserId) ?? null;
    const userCompany = user ? readCompanies().find((item) => item.id === user.companyId) ?? null : null;

	    if (user) {
	      markUserPresence(user, 'seen');
	      setCurrentUser(user);
	      setLanguage(user.language);
    }
    setCompany(userCompany);
    setLoading(false);
  }, [setLanguage]);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      if (isApiEnabled()) {
        const response = await apiRequest<ApiAuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
	        writeString(storageKeys.apiToken, response.accessToken);
	        const mapped = mapApiUser(response);
	        markUserPresence(mapped.user, 'login');
	        setCurrentUser(mapped.user);
        setCompany(mapped.company);
        setLanguage(mapped.user.language);
        return;
      }

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
	      markUserPresence(user, 'login');
	      writeString(storageKeys.sessionUserId, user.id);

      setCurrentUser(user);
      setCompany(companyRecord);
      setLanguage(user.language);
    },
    [setLanguage],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      if (isApiEnabled()) {
        const response = await apiRequest<ApiAuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
	        writeString(storageKeys.apiToken, response.accessToken);
	        const mapped = mapApiUser(response);
	        markUserPresence(mapped.user, 'login');
	        setCurrentUser(mapped.user);
        setCompany(mapped.company);
        setLanguage(mapped.user.language);
        return;
      }

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
	      markUserPresence(user, 'login');
	      setCurrentUser(user);
      setCompany(userCompany);
      setLanguage(user.language);
    },
    [setLanguage],
  );

	  const logout = useCallback(() => {
	    if (currentUser) markUserPresence(currentUser, 'logout');
	    removeItem(storageKeys.sessionUserId);
	    removeItem(storageKeys.apiToken);
	    setCurrentUser(null);
	    setCompany(null);
	  }, [currentUser]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!isApiEnabled()) {
      throw new Error('auth.apiRequired');
    }
    await apiRequest('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email: normalizeEmail(email) }),
    });
  }, []);

  const resetPassword = useCallback(async (payload: { email: string; code: string; password: string }) => {
    if (!isApiEnabled()) {
      throw new Error('auth.apiRequired');
    }
    await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: normalizeEmail(payload.email),
        code: payload.code.trim(),
        password: payload.password,
      }),
    });
  }, []);

  const emailExists = useCallback((email: string, exceptUserId?: string) => {
    const normalized = normalizeEmail(email);
    return readUsers().some((user) => user.email === normalized && user.id !== exceptUserId);
  }, []);

  const updateProfile = useCallback((payload: Pick<User, 'name' | 'email' | 'phone'> & Partial<Pick<User, 'avatarDataUrl'>>) => {
    setCurrentUser((user) => {
      if (!user) return user;
      const nextUser = {
        ...user,
        name: payload.name.trim(),
        email: normalizeEmail(payload.email),
        phone: payload.phone.trim(),
        avatarDataUrl: payload.avatarDataUrl ?? user.avatarDataUrl,
      };
      writeJson(
        storageKeys.users,
        readUsers().map((item) => (item.id === nextUser.id ? nextUser : item)),
      );
      if (isApiEnabled()) {
        void apiRequest('/auth/me', {
          method: 'PATCH',
          body: JSON.stringify({
            name: nextUser.name,
            email: nextUser.email,
            phone: nextUser.phone,
            avatarUrl: nextUser.avatarDataUrl,
          }),
        });
      }
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

      if (isApiEnabled()) {
        const user = await apiRequest<{
          id: string;
          name: string;
          email: string;
          phone?: string;
          role: string;
          active: boolean;
          avatarUrl?: string | null;
        }>('/users/invite', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            email,
            role: ['owner', 'admin', 'manager'].includes(payload.role) ? payload.role.toUpperCase() : 'MANAGER',
          }),
        });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone ?? payload.phone,
          role: user.role.toLowerCase(),
          companyId: currentUser.companyId,
          language: currentUser.language,
          passwordHash: '',
          active: user.active,
          avatarDataUrl: user.avatarUrl ?? undefined,
        };
      }

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
        avatarDataUrl: payload.avatarDataUrl,
      };

      writeJson(storageKeys.users, [...users, user]);
      return user;
    },
    [currentUser],
  );

  const updateCompanyUser = useCallback(
    (id: string, payload: Partial<Pick<User, 'name' | 'email' | 'phone' | 'role' | 'active' | 'avatarDataUrl'>>) => {
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
      if (isApiEnabled()) {
        void apiRequest(`/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...payload,
            role: payload.role && ['owner', 'admin', 'manager'].includes(payload.role) ? payload.role.toUpperCase() : undefined,
            avatarUrl: payload.avatarDataUrl,
          }),
        });
      }
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
      requestPasswordReset,
      resetPassword,
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
      requestPasswordReset,
      resetPassword,
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
