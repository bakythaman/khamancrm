export const storageKeys = {
  users: 'khaman.users',
  companies: 'khaman.companies',
  sessionUserId: 'khaman.sessionUserId',
  apiToken: 'khaman.apiToken',
  language: 'khaman.language',
  companyData: (companyId: string) => `khaman.companyData.${companyId}`,
} as const;
