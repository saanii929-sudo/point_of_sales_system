/**
 * External Services Verification Script
 * Tests all external service configurations
 */

import { validateExternalServices, isServiceConfigured } from '../lib/external-services';

interface ServiceCheck {
  name: string;
  configured: boolean;
  required: boolean;
  status: 'success' | 'warning' | 'error';
  message: string;
}

async function verifyExternalServices() {
  console.log('🔍 Verifying External Services Configuration...\n');

  const checks: ServiceCheck[] = [];

  // Check Stripe
  const stripeConfigured = isServiceConfigured('stripe');
  checks.push({
    name: 'Stripe',
    configured: stripeConfigured,
    required: true,
    status: stripeConfigured ? 'success' : 'error',
    message: stripeConfigured 
      ? 'Stripe is configured correctly' 
      : 'Stripe API keys are missing (REQUIRED for payments)',
  });

  // Check Klarna
  const klarnaConfigured = isServiceConfigured('klarna');
  checks.push({
    name: 'Klarna',
    configured: klarnaConfigured,
    required: false,
    status: klarnaConfigured ? 'success' : 'warning',
    message: klarnaConfigured 
      ? 'Klarna is configured correctly' 
      : 'Klarna not configured (BNPL will be limited)',
  });

  // Check Afterpay
  const afterpayConfigured = isServiceConfigured('afterpay');
  checks.push({
    name: 'Afterpay',
    configured: afterpayConfigured,
    required: false,
    status: afterpayConfigured ? 'success' : 'warning',
    message: afterpayConfigured 
      ? 'Afterpay is configured correctly' 
      : 'Afterpay not configured (BNPL will be limited)',
  });

  // Check Affirm
  const affirmConfigured = isServiceConfigured('affirm');
  checks.push({
    name: 'Affirm',
    configured: affirmConfigured,
    required: false,
    status: affirmConfigured ? 'success' : 'warning',
    message: affirmConfigured 
      ? 'Affirm is configured correctly' 
      : 'Affirm not configured (BNPL will be limited)',
  });

  // Check SendGrid
  const sendgridConfigured = isServiceConfigured('sendgrid');
  checks.push({
    name: 'SendGrid',
    configured: sendgridConfigured,
    required: true,
    status: sendgridConfigured ? 'success' : 'error',
    message: sendgridConfigured 
      ? 'SendGrid is configured correctly' 
      : 'SendGrid API key missing (REQUIRED for email receipts)',
  });

  // Check Twilio
  const twilioConfigured = isServiceConfigured('twilio');
  checks.push({
    name: 'Twilio',
    configured: twilioConfigured,
    required: false,
    status: twilioConfigured ? 'success' : 'warning',
    message: twilioConfigured 
      ? 'Twilio is configured correctly' 
      : 'Twilio not configured (SMS receipts will be unavailable)',
  });

  // Check Google Speech
  const googleSpeechConfigured = isServiceConfigured('google-speech');
  checks.push({
    name: 'Google Cloud Speech-to-Text',
    configured: googleSpeechConfigured,
    required: false,
    status: googleSpeechConfigured ? 'success' : 'warning',
    message: googleSpeechConfigured 
      ? 'Google Cloud Speech is configured correctly' 
      : 'Google Cloud not configured (Voice features will be unavailable)',
  });

  // Display results
  console.log('📋 Configuration Status:\n');
  
  let hasErrors = false;
  let hasWarnings = false;

  checks.forEach(check => {
    const icon = check.status === 'success' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
    const requiredLabel = check.required ? '[REQUIRED]' : '[OPTIONAL]';
    
    console.log(`${icon} ${check.name} ${requiredLabel}`);
    console.log(`   ${check.message}\n`);

    if (check.status === 'error') hasErrors = true;
    if (check.status === 'warning') hasWarnings = true;
  });

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const validation = validateExternalServices();
  
  if (hasErrors) {
    console.log('❌ CONFIGURATION INCOMPLETE');
    console.log('\nMissing required services:');
    validation.missing.forEach(key => console.log(`   - ${key}`));
    console.log('\n⚠️  Please configure all required services before proceeding.');
    console.log('📖 See .kiro/specs/advanced-pos-features/SETUP_GUIDE.md for instructions.\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  CONFIGURATION PARTIAL');
    console.log('\nOptional services not configured:');
    validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    console.log('\n✅ All required services are configured.');
    console.log('💡 Consider configuring optional services for full functionality.\n');
  } else {
    console.log('✅ ALL SERVICES CONFIGURED');
    console.log('\n🎉 Your external services are ready to use!\n');
  }

  // Feature flags status
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🚩 Feature Flags:\n');
  
  const features = [
    { name: 'Self-Checkout', enabled: process.env.FEATURE_SELF_CHECKOUT_ENABLED === 'true' },
    { name: 'Loyalty Program', enabled: process.env.FEATURE_LOYALTY_PROGRAM_ENABLED === 'true' },
    { name: 'BNPL Integration', enabled: process.env.FEATURE_BNPL_ENABLED === 'true' },
    { name: 'Voice-Activated POS', enabled: process.env.FEATURE_VOICE_ACTIVATED_ENABLED === 'true' },
  ];

  features.forEach(feature => {
    const icon = feature.enabled ? '✅' : '⭕';
    const status = feature.enabled ? 'ENABLED' : 'DISABLED';
    console.log(`${icon} ${feature.name}: ${status}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run verification
verifyExternalServices().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
