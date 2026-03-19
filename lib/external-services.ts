/**
 * External Services Configuration
 * Centralized configuration for all external service integrations
 */

// Stripe Configuration
export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  apiVersion: '2023-10-16' as const,
};

// Klarna Configuration
export const klarnaConfig = {
  apiKey: process.env.KLARNA_API_KEY || '',
  apiSecret: process.env.KLARNA_API_SECRET || '',
  region: process.env.KLARNA_REGION || 'US',
  baseUrl: process.env.KLARNA_REGION === 'EU' 
    ? 'https://api.klarna.com' 
    : 'https://api-na.klarna.com',
  feeRate: 0.0329, // 3.29%
  fixedFee: 0.30,
};

// Afterpay Configuration
export const afterpayConfig = {
  merchantId: process.env.AFTERPAY_MERCHANT_ID || '',
  secretKey: process.env.AFTERPAY_SECRET_KEY || '',
  region: process.env.AFTERPAY_REGION || 'US',
  baseUrl: getAfterpayBaseUrl(process.env.AFTERPAY_REGION || 'US'),
  feeRate: 0.05, // 5%
  fixedFee: 0,
};

function getAfterpayBaseUrl(region: string): string {
  const urls: Record<string, string> = {
    US: 'https://api.us.afterpay.com',
    UK: 'https://api.afterpay.com',
    AU: 'https://api.afterpay.com',
    CA: 'https://api.us.afterpay.com',
  };
  return urls[region] || urls.US;
}

// Affirm Configuration
export const affirmConfig = {
  publicKey: process.env.AFFIRM_PUBLIC_KEY || '',
  privateKey: process.env.AFFIRM_PRIVATE_KEY || '',
  environment: process.env.AFFIRM_ENVIRONMENT || 'sandbox',
  baseUrl: process.env.AFFIRM_ENVIRONMENT === 'production'
    ? 'https://api.affirm.com'
    : 'https://sandbox.affirm.com',
  feeRate: 0.029, // 2.9%
  fixedFee: 0.30,
};

// SendGrid Configuration
export const sendgridConfig = {
  apiKey: process.env.SENDGRID_API_KEY || '',
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@smartvendr.com',
  fromName: process.env.SENDGRID_FROM_NAME || 'SmartVendr',
  baseUrl: 'https://api.sendgrid.com/v3',
};

// Twilio Configuration
export const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  baseUrl: 'https://api.twilio.com/2010-04-01',
};

// Google Cloud Speech-to-Text Configuration
export const googleSpeechConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  credentialsPath: process.env.GOOGLE_CLOUD_CREDENTIALS_PATH || '',
  languageCodes: {
    'en-US': 'English (US)',
    'es-ES': 'Spanish',
    'fr-FR': 'French',
    'de-DE': 'German',
    'zh-CN': 'Mandarin Chinese',
  },
};

// Feature Flags
export const featureFlags = {
  selfCheckout: process.env.FEATURE_SELF_CHECKOUT_ENABLED === 'true',
  loyaltyProgram: process.env.FEATURE_LOYALTY_PROGRAM_ENABLED === 'true',
  bnpl: process.env.FEATURE_BNPL_ENABLED === 'true',
  voiceActivated: process.env.FEATURE_VOICE_ACTIVATED_ENABLED === 'true',
};

// Self-Checkout Configuration
export const selfCheckoutConfig = {
  sessionTimeoutHours: parseInt(process.env.SELF_CHECKOUT_SESSION_TIMEOUT_HOURS || '2'),
  bagCheckPercentage: parseInt(process.env.SELF_CHECKOUT_BAG_CHECK_PERCENTAGE || '12'),
  exitPassValidityMinutes: 5,
};

// Loyalty Program Configuration
export const loyaltyConfig = {
  pointsPerDollar: parseInt(process.env.LOYALTY_POINTS_PER_DOLLAR || '1'),
  tiers: {
    bronze: {
      threshold: parseInt(process.env.LOYALTY_BRONZE_THRESHOLD || '0'),
      multiplier: parseFloat(process.env.LOYALTY_BRONZE_MULTIPLIER || '1'),
    },
    silver: {
      threshold: parseInt(process.env.LOYALTY_SILVER_THRESHOLD || '500'),
      multiplier: parseFloat(process.env.LOYALTY_SILVER_MULTIPLIER || '1.25'),
    },
    gold: {
      threshold: parseInt(process.env.LOYALTY_GOLD_THRESHOLD || '2000'),
      multiplier: parseFloat(process.env.LOYALTY_GOLD_MULTIPLIER || '1.5'),
    },
    platinum: {
      threshold: parseInt(process.env.LOYALTY_PLATINUM_THRESHOLD || '5000'),
      multiplier: parseFloat(process.env.LOYALTY_PLATINUM_MULTIPLIER || '2'),
    },
  },
  birthdayDiscountPercentage: 20,
  anniversaryDiscountPercentage: 15,
  rewardValidityDays: 7,
  referralBonusPoints: 500,
  refereeDiscountPercentage: 10,
};

// BNPL Configuration
export const bnplConfig = {
  minimumAmount: parseFloat(process.env.BNPL_MINIMUM_AMOUNT || '50'),
  providers: ['klarna', 'afterpay', 'affirm'] as const,
};

// Voice Configuration
export const voiceConfig = {
  confidenceThreshold: parseFloat(process.env.VOICE_CONFIDENCE_THRESHOLD || '0.95'),
  autoConfirmTimeout: parseInt(process.env.VOICE_AUTO_CONFIRM_TIMEOUT || '3000'),
  supportedLanguages: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN'],
};

// Validation function to check if required environment variables are set
export function validateExternalServices(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check Stripe (required for payments)
  if (!stripeConfig.secretKey) missing.push('STRIPE_SECRET_KEY');
  if (!stripeConfig.publishableKey) missing.push('STRIPE_PUBLISHABLE_KEY');

  // Check BNPL providers (optional but warn if enabled)
  if (featureFlags.bnpl) {
    if (!klarnaConfig.apiKey) warnings.push('KLARNA_API_KEY not set - Klarna will be unavailable');
    if (!afterpayConfig.merchantId) warnings.push('AFTERPAY_MERCHANT_ID not set - Afterpay will be unavailable');
    if (!affirmConfig.publicKey) warnings.push('AFFIRM_PUBLIC_KEY not set - Affirm will be unavailable');
  }

  // Check SendGrid (required for email receipts)
  if (featureFlags.loyaltyProgram) {
    if (!sendgridConfig.apiKey) warnings.push('SENDGRID_API_KEY not set - Email receipts will fail');
  }

  // Check Twilio (optional for SMS)
  if (featureFlags.loyaltyProgram) {
    if (!twilioConfig.accountSid) warnings.push('TWILIO_ACCOUNT_SID not set - SMS receipts will be unavailable');
  }

  // Check Google Speech (required for voice)
  if (featureFlags.voiceActivated) {
    if (!googleSpeechConfig.projectId) warnings.push('GOOGLE_CLOUD_PROJECT_ID not set - Voice features will fail');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

// Helper function to check if a specific service is configured
export function isServiceConfigured(service: 'stripe' | 'klarna' | 'afterpay' | 'affirm' | 'sendgrid' | 'twilio' | 'google-speech'): boolean {
  switch (service) {
    case 'stripe':
      return !!stripeConfig.secretKey && !!stripeConfig.publishableKey;
    case 'klarna':
      return !!klarnaConfig.apiKey && !!klarnaConfig.apiSecret;
    case 'afterpay':
      return !!afterpayConfig.merchantId && !!afterpayConfig.secretKey;
    case 'affirm':
      return !!affirmConfig.publicKey && !!affirmConfig.privateKey;
    case 'sendgrid':
      return !!sendgridConfig.apiKey;
    case 'twilio':
      return !!twilioConfig.accountSid && !!twilioConfig.authToken;
    case 'google-speech':
      return !!googleSpeechConfig.projectId;
    default:
      return false;
  }
}
