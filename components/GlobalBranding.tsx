'use client';

import { useEffect, useState } from 'react';
import { DynamicFavicon } from './dashboard/DynamicFavicon';

interface Branding {
  businessName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  companyTagline: string;
}

export function GlobalBranding() {
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    fetchBranding();
    
    // Listen for branding updates
    const handleBrandingUpdate = (event: CustomEvent) => {
      setBranding(event.detail);
    };

    window.addEventListener('brandingUpdated', handleBrandingUpdate as EventListener);
    
    return () => {
      window.removeEventListener('brandingUpdated', handleBrandingUpdate as EventListener);
    };
  }, []);

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/business/branding');
      if (res.ok) {
        const data = await res.json();
        setBranding(data.branding);
        
        // Apply branding colors globally
        if (data.branding) {
          applyBrandingColors(data.branding);
        }
      }
    } catch (error) {
      // Silently fail for public pages
      console.debug('Branding not available');
    }
  };

  const applyBrandingColors = (brandingData: Branding) => {
    const root = document.documentElement;
    
    root.style.setProperty('--primary-color', brandingData.primaryColor);
    root.style.setProperty('--secondary-color', brandingData.secondaryColor);
    root.style.setProperty('--accent-color', brandingData.accentColor);
    
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const primaryRgb = hexToRgb(brandingData.primaryColor);
    const secondaryRgb = hexToRgb(brandingData.secondaryColor);
    const accentRgb = hexToRgb(brandingData.accentColor);
    
    if (primaryRgb) {
      root.style.setProperty('--primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
      root.style.setProperty('--primary-light', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
      root.style.setProperty('--primary-lighter', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.05)`);
    }
    
    if (secondaryRgb) {
      root.style.setProperty('--secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
    }
    
    if (accentRgb) {
      root.style.setProperty('--accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    }
    
    updateBodyBackground();
  };

  const updateBodyBackground = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const body = document.body;
    
    if (isDark) {
      body.style.background = `linear-gradient(to bottom right, #111827, rgba(var(--primary-rgb), 0.1), rgba(var(--secondary-rgb), 0.05))`;
    } else {
      body.style.background = `linear-gradient(to bottom right, var(--primary-lighter), var(--primary-light), rgba(var(--secondary-rgb), 0.1))`;
    }
  };

  return (
    <DynamicFavicon 
      faviconUrl={branding?.faviconUrl || undefined} 
      businessName={branding?.businessName}
    />
  );
}
