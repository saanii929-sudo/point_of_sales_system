export interface SubscriptionState {
  status: 'active' | 'trial' | 'expired' | 'inactive';
  isExpired: boolean;
  isTrial: boolean;
  isActive: boolean;
  daysLeft: number;
  expiry: string | null; // ISO string so it's serialisable across API boundaries
  plan: string;
}

/**
 * Pure function — no DB calls. Pass in the relevant business fields.
 * Works in both server and client contexts.
 */
export function getSubscriptionState(business: {
  subscriptionStatus: string;
  subscriptionExpiry?: Date | string | null;
  isActive: boolean;
  subscriptionPlan: string;
}): SubscriptionState {
  const plan = business.subscriptionPlan;

  if (!business.isActive) {
    return { status: 'inactive', isExpired: false, isTrial: false, isActive: false, daysLeft: 0, expiry: null, plan };
  }

  if (!business.subscriptionExpiry) {
    // No expiry set yet — business is pending trial start (awaiting approval)
    return { status: 'inactive', isExpired: false, isTrial: false, isActive: false, daysLeft: 0, expiry: null, plan };
  }

  const expiry = new Date(business.subscriptionExpiry);
  const now    = new Date();
  const msLeft = expiry.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const isExpired = msLeft <= 0;

  if (isExpired) {
    return { status: 'expired', isExpired: true, isTrial: false, isActive: false, daysLeft: 0, expiry: expiry.toISOString(), plan };
  }

  const isTrial = business.subscriptionStatus === 'trial';
  return {
    status:    isTrial ? 'trial' : 'active',
    isExpired: false,
    isTrial,
    isActive:  true,
    daysLeft,
    expiry:    expiry.toISOString(),
    plan,
  };
}

/** Convenience: returns a 403 JSON body when subscription access is denied. */
export function subscriptionDeniedResponse(state: SubscriptionState): { error: string; code: string } {
  if (state.status === 'expired' || state.isExpired) {
    return {
      error: 'Your subscription has expired. Please contact the admin to renew your plan.',
      code:  'SUBSCRIPTION_EXPIRED',
    };
  }
  return {
    error: 'Your account is currently inactive. Please contact the admin.',
    code:  'ACCOUNT_INACTIVE',
  };
}
