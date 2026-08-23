/** Synthetic account id for the ephemeral guest session — never written to accounts.json or a .sqlite file. */
export const GUEST_ACCOUNT_ID = 'guest';

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
