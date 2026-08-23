export interface LocalAccountSummary {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface AccountSession {
  account: LocalAccountSummary;
  snapshot: import('./types').BudgetSnapshot;
}

export interface AccountBackup {
  app: 'Finterest';
  version: 1;
  exportedAt: string;
  account: {
    name: string;
    pinHash: string;
    pinSalt: string;
  };
  snapshot: import('./types').BudgetSnapshot;
}
