import { createGulviraRepairData } from '@/lib/mock-data/seed';
import { slugifyLandingUsername } from '@/lib/mock-data/seed';
import { storageKeys } from '@/lib/storage/keys';
import { readJson, writeJson } from '@/lib/storage/local-store';
import type { Company, CompanyData, RepairData, RepairProject, User } from '@/lib/storage/types';

const fallbackOwner: User = {
  id: 'user-gulvira-director',
  name: 'Гульвира Бакытжанкызы',
  email: 'director@gulvira.kz',
  phone: '+7 775 669 10 03',
  role: 'owner',
  companyId: 'company-gulvira-group',
  language: 'ru',
  passwordHash: '',
  active: true,
};

export function createFallbackRepairPlatform(): RepairData {
  return createGulviraRepairData(fallbackOwner);
}

export function getPublicRepairData(repair?: RepairData, companyName?: string): RepairData {
  if (repair?.site) {
    return {
      ...repair,
      site: {
        ...repair.site,
        username: repair.site.username || slugifyLandingUsername(companyName),
        brandName: repair.site.brandName || companyName || 'Ремонтная компания',
      },
    };
  }

  return createFallbackRepairPlatform();
}

export function getPublicRepairDataByUsername(username?: string | null) {
  if (!username?.trim()) return null;
  const target = slugifyLandingUsername(username ?? '');

  const companies = readJson<Company[]>(storageKeys.companies, []);
  for (const company of companies) {
    if (company.vertical !== 'repair') continue;
    const data = readJson<CompanyData | null>(storageKeys.companyData(company.id), null);
    const repair = data?.repair;
    if (!repair?.site) continue;
    const siteUsername = slugifyLandingUsername(repair.site.username || company.name);
    if (siteUsername === target) return getPublicRepairData(repair, company.name);
  }

  if (target === 'gulvira') return createFallbackRepairPlatform();
  return null;
}

export function updatePublicRepairDataByUsername(username: string | null | undefined, updater: (repair: RepairData) => RepairData) {
  if (!username?.trim()) return null;
  const target = slugifyLandingUsername(username ?? '');

  const companies = readJson<Company[]>(storageKeys.companies, []);
  for (const company of companies) {
    if (company.vertical !== 'repair') continue;
    const key = storageKeys.companyData(company.id);
    const data = readJson<CompanyData | null>(key, null);
    const repair = data?.repair;
    if (!data || !repair?.site) continue;
    const siteUsername = slugifyLandingUsername(repair.site.username || company.name);
    if (siteUsername !== target) continue;

    const nextRepair = updater(getPublicRepairData(repair, company.name));
    writeJson(key, { ...data, repair: nextRepair });
    return nextRepair;
  }

  return null;
}

export function repairLandingPath(username?: string | null) {
  const slug = slugifyLandingUsername(username ?? '', '');
  return slug ? `/${slug}` : '/site';
}

export function repairClientPath(username?: string | null) {
  const slug = slugifyLandingUsername(username ?? '', '');
  return slug ? `/client?u=${encodeURIComponent(slug)}` : '/client';
}

export function projectDuration(project: RepairProject) {
  const start = new Date(`${project.startDate}T00:00:00`);
  const due = new Date(`${project.dueDate}T00:00:00`);
  const days = Math.max(1, Math.round((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const weeks = Math.max(1, Math.round(days / 7));
  return weeks >= 5 ? `${Math.round(weeks / 4)} мес.` : `${weeks} нед.`;
}

export const repairRates = {
  'дизайн-проект': 14000,
  ремонт: 85000,
  'дизайн + ремонт': 98000,
  мебель: 62000,
} as const;

export const repairClassMultipliers = {
  базовый: 0.82,
  комфорт: 1,
  премиум: 1.34,
} as const;

export const repairTypeMultipliers = {
  квартира: 1,
  дом: 1.18,
  'коммерческое помещение': 1.12,
} as const;
