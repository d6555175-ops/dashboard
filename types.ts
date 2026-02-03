
export interface MiningLog {
  id: string;
  date: string;
  amount: number; // em BTC
  status: 'arquivado' | 'pendente';
  timestamp: number;
}

export interface Investor {
  id: string;
  name: string;
  contribution: number; // Aporte inicial em BRL
  joinedAt: number;
}

export interface TeamWithdrawal {
  id: string;
  date: string;
  amount: number; // Saque em BRL
  description: string;
  timestamp: number;
}

export interface CryptoPrices {
  usd: number;
  brl: number;
  lastUpdated: number;
}

export enum StatusType {
  ARCHIVED = 'arquivado',
  PENDING = 'pendente'
}
