export const storageKeys = {
  users: 'khaman.users',
  companies: 'khaman.companies',
  sessionUserId: 'khaman.sessionUserId',
  language: 'khaman.language',
  companyData: (companyId: string) => `khaman.companyData.${companyId}`,
} as const;
