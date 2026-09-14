export interface User {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  apiKey: string;
  webhookUrl?: string | null;
  displayName?: string | null;
  isEmailVerified?: boolean;
  phone?: string | null;
  country?: string | null;
  address?: string | null;
  birthDate?: string | null;
  lastIp?: string | null;
  status?: string;
  vipTier?: string;
  wallet?: {
    balance: number;
    reservedBalance: number;
    currency: string;
  };
  createdAt?: string;
}

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  icon: string;
  basePrice: number;
  isActive: boolean;
  otpPattern?: string | null;
  extractUrl?: boolean;
  priorityMode?: boolean;
}

export interface DomainItem {
  id: string;
  domainName: string;
  isPrivate: boolean;
  isActive: boolean;
  defaultPrice: number;
  _count?: {
    rentalSessions: number;
  };
}

export interface RentalSession {
  id: number;
  emailAddress: string;
  domainId: string;
  serviceCode: string;
  price: number;
  status: 'WAITING_CODE' | 'CANCELLED' | 'COMPLETED' | 'WAITING_NEXT' | 'EXPIRED';
  code: string | null;
  verificationUrl?: string | null;
  allowRecode?: boolean;
  recodeCount?: number;
  receivedOtps?: string[];
  expiresAt: string;
  receivedAt: string | null;
  createdAt: string;
  domain?: { domainName: string };
  serviceItem?: { name: string; icon: string };
}

export interface LedgerTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'HOLD' | 'RELEASE' | 'REFUND';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string;
  referenceId?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  imapHost: string;
  imapPort: number;
  proxyUrl?: string | null;
  status: 'ACTIVE' | 'DEAD' | 'CHECKING' | 'BUSY';
  lastCheckedAt?: string | null;
  checkError?: string | null;
  usedServices: string[];
  blockedServices?: string[];
  isExclusive: boolean;
  createdAt: string;
}

export interface BlockedServiceRule {
  id: string;
  serviceName: string;
  matchPattern: string;
  reason?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  name: string;
  rewardType: 'CASH' | 'BONUS' | 'DISCOUNT';
  rewardValue: number;
  currency: string;
  maxReward: number;
  maxUses: number;
  usedCount: number;
  perUserLimit: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
}

export interface AdminOverviewStats {
  overview: {
    totalDeposits: number;
    totalDepositsCount: number;
    totalWithdrawals: number;
    totalWithdrawalsCount: number;
    platformProfit: number;
    newUsers: number;
    totalUsers: number;
    financeChart: Array<{ period: string; deposits: number; spent: number }>;
    platformFeeDue: {
      amount: number;
      period: string;
      profitShare: string;
      maintenanceFee: string;
      nextPayment: string;
      status: string;
    };
  };
  presence: {
    inGame: number;
    onlineIdle: number;
    offline: number;
    totalUsers: number;
  };
  rtp: {
    rate: number;
    totalRentals: number;
    completedRentals: number;
    expiredOrCancelled: number;
  };
  operationalMetrics: {
    betVolume: number;
    totalWins: number;
    lockedBalance: number;
    lockedAccounts: number;
    onlineNow: number;
    activeRentals: number;
    servicesCount: number;
    providersCount: number;
    activeBonuses: number;
    riskEvents: number;
  };
  topClients: Array<{
    rank: number;
    id: string;
    username: string;
    email: string;
    totalSpent: number;
    lockedBalance: number;
    status: string;
  }>;
  topServices: Array<{
    serviceCode: string;
    count: number;
    volume: number;
  }>;
}

export interface UserDetailData {
  user: User;
  metrics: {
    balance: number;
    netSpent: number;
    vipTier: string;
    xp: number;
    otpReceivedRtp: number;
    totalOrders: number;
    completedOrders: number;
    lastIp: string;
  };
  topups: Array<{
    id: string;
    amount: number;
    gateway: string;
    status: string;
    createdAt: string;
  }>;
  ledger: LedgerTransaction[];
  promosRedeemed: Array<{
    id: string;
    promoCode: string;
    amountGranted: number;
    redeemedAt: string;
  }>;
  otpHistory: RentalSession[];
}

export interface StockAvailability {
  [domainIdOrProvider: string]: number;
}
