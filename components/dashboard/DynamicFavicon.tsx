'use client';

import { useEffect } from 'react';

interface DynamicFaviconProps {
  faviconUrl?: string;
  businessName?: string;
}

export function DynamicFavicon({ faviconUrl, businessName }: DynamicFaviconProps) {
  useEffect(() => {
    // Update page title
    if (businessName) {
      document.title = `${businessName} - Dashboard`;
    }
  }, [businessName]);

  useEffect(() => {
    if (!faviconUrl || typeof window === 'undefined') return;

    // Format the favicon URL properly
    let formattedUrl = faviconUrl;
    
    // If it's a base64 string without data URI prefix, add it
    if (faviconUrl.startsWith('/9j/') || faviconUrl.startsWith('iVBOR')) {
      // Detect image type from base64 signature
      const isPNG = faviconUrl.startsWith('iVBOR');
      const mimeType = isPNG ? 'image/png' : 'image/jpeg';
      formattedUrl = `data:${mimeType};base64,${faviconUrl}`;
    }
    
    // Add cache-busting timestamp
    const timestamp = new Date().getTime();
    const urlWithCache = formattedUrl.includes('?') 
      ? `${formattedUrl}&t=${timestamp}` 
      : `${formattedUrl}?t=${timestamp}`;

    // Find or create favicon link
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    // Set type based on the image format
    if (formattedUrl.includes('image/png') || formattedUrl.endsWith('.png')) {
      link.type = 'image/png';
    } else if (formattedUrl.includes('image/svg')) {
      link.type = 'image/svg+xml';
    } else {
      link.type = 'image/x-icon';
    }
    
    // Update href
    link.href = urlWithCache;

    // Also update or create apple-touch-icon
    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = urlWithCache;

    // Update or create shortcut icon
    let shortcutLink = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
    if (!shortcutLink) {
      shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      document.head.appendChild(shortcutLink);
    }
    shortcutLink.href = urlWithCache;

  }, [faviconUrl]);

  return null;
}
