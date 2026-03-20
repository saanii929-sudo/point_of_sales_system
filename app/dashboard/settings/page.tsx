'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import {
  Settings, Palette, Image as ImageIcon, Upload, X, Lightbulb,
  Building2, Lock, CheckCircle2, Loader2, Eye,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Branding {
  businessName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  faviconUrl: string;
  companyTagline: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none ' +
  'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] ' +
  'focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 ' +
  'placeholder:text-[var(--text-tertiary)]';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>
      {children}
    </p>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{children}</label>
      {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [faviconPreview, setFaviconPreview] = useState<string>('');
  const [branding, setBranding] = useState<Branding>({
    businessName: '',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    accentColor: '#34d399',
    logoUrl: '',
    faviconUrl: '',
    companyTagline: '',
  });

  useEffect(() => { fetchBranding(); }, []);

  const fetchBranding = async () => {
    try {
      const { data } = await fetchWithOfflineFallback('/api/business/branding');
      const b: Branding = {
        businessName:   data.branding.businessName   || '',
        primaryColor:   data.branding.primaryColor   || '#10b981',
        secondaryColor: data.branding.secondaryColor || '#059669',
        accentColor:    data.branding.accentColor    || '#34d399',
        logoUrl:        data.branding.logoUrl        || '',
        faviconUrl:     data.branding.faviconUrl     || '',
        companyTagline: data.branding.companyTagline || '',
      };
      setBranding(b);
      setLogoPreview(b.logoUrl);
      setFaviconPreview(b.faviconUrl);
    } catch {
      toast.error('Failed to load branding');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'favicon') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image size should be less than 2MB'); return; }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'logo') {
        setLogoPreview(base64);
        setBranding(b => ({ ...b, logoUrl: base64 }));
      } else {
        setFaviconPreview(base64);
        setBranding(b => ({ ...b, faviconUrl: base64 }));
      }
      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded`);
    };
    reader.onerror = () => toast.error('Failed to read image file');
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (type: 'logo' | 'favicon') => {
    if (type === 'logo') { setLogoPreview(''); setBranding(b => ({ ...b, logoUrl: '' })); }
    else { setFaviconPreview(''); setBranding(b => ({ ...b, faviconUrl: '' })); }
    toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} removed`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/business/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor:   branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          accentColor:    branding.accentColor,
          logoUrl:        branding.logoUrl,
          faviconUrl:     branding.faviconUrl,
          companyTagline: branding.companyTagline,
        }),
      });
      if (res.ok) {
        applyBrandingChanges();
        toast.success('Branding saved successfully!');
      } else {
        toast.error('Failed to update branding');
      }
    } catch {
      toast.error('Failed to update branding');
    } finally {
      setIsSaving(false);
    }
  };

  const applyBrandingChanges = () => {
    document.documentElement.style.setProperty('--primary-color', branding.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', branding.secondaryColor);
    document.documentElement.style.setProperty('--accent-color', branding.accentColor);
    if (branding.faviconUrl) updateFavicon(branding.faviconUrl);
    if (branding.businessName) document.title = `${branding.businessName} - Settings`;
    window.dispatchEvent(new CustomEvent('brandingUpdated', { detail: { ...branding } }));
  };

  const updateFavicon = (faviconUrl: string) => {
    if (typeof window === 'undefined') return;
    let formattedUrl = faviconUrl;
    if (faviconUrl.startsWith('/9j/') || faviconUrl.startsWith('iVBOR')) {
      const isPNG = faviconUrl.startsWith('iVBOR');
      formattedUrl = `data:${isPNG ? 'image/png' : 'image/jpeg'};base64,${faviconUrl}`;
    }
    const urlWithCache = `${formattedUrl}${formattedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const setLink = (rel: string) => {
      let link = document.querySelector(`link[rel*='${rel}']`) as HTMLLinkElement;
      if (!link) { link = document.createElement('link'); link.rel = rel; document.head.appendChild(link); }
      link.type = formattedUrl.includes('image/png') ? 'image/png' : formattedUrl.includes('image/svg') ? 'image/svg+xml' : 'image/x-icon';
      link.href = urlWithCache;
    };
    setLink('icon'); setLink('apple-touch-icon'); setLink('shortcut icon');
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse pb-10">
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-xl" style={{ background: 'var(--bg-surface-2)' }} />
          <div className="h-4 w-72 rounded-lg" style={{ background: 'var(--bg-surface-3)' }} />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div className="h-5 w-32 rounded-lg" style={{ background: 'var(--bg-surface-2)' }} />
              {[1,2,3,4].map(j => (
                <div key={j} className="space-y-1.5">
                  <div className="h-3.5 w-24 rounded" style={{ background: 'var(--bg-surface-3)' }} />
                  <div className="h-10 rounded-xl" style={{ background: 'var(--bg-surface-2)' }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Access denied ──────────────────────────────────────────────────────────
  if (user?.role !== 'business_owner') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-surface-2)' }}>
          <Lock className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Access Restricted</h2>
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          Only business owners can access and modify branding settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Business Settings
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Customize your brand identity and appearance
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          style={{ background: 'var(--primary-color)', boxShadow: '0 2px 8px var(--primary-color)44' }}
        >
          {isSaving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>
          }
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── LEFT: Settings form ── */}
        <div className="space-y-5">

          {/* Business Identity */}
          <div
            className="rounded-2xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-color)22' }}>
                <Building2 className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Business Identity</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Your public-facing brand info</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel hint="Contact support to change your business name">Business Name</FieldLabel>
                <div className="relative">
                  <input
                    value={branding.businessName}
                    disabled
                    className={inputCls + ' pr-10 opacity-60 cursor-not-allowed'}
                  />
                  <Lock className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                </div>
              </div>
              <div>
                <FieldLabel>Company Tagline</FieldLabel>
                <input
                  value={branding.companyTagline}
                  onChange={e => setBranding(b => ({ ...b, companyTagline: e.target.value }))}
                  placeholder="e.g. Quality you can trust"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Brand Colors */}
          <div
            className="rounded-2xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#8b5cf622' }}>
                <Palette className="w-4 h-4" style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Brand Colors</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Defines the look and feel of your dashboard</p>
              </div>
            </div>

            <div className="space-y-4">
              {(
                [
                  { key: 'primaryColor',   label: 'Primary Color',   hint: 'Used for buttons, links, and highlights' },
                  { key: 'secondaryColor', label: 'Secondary Color', hint: 'Gradient partner for the primary color' },
                  { key: 'accentColor',    label: 'Accent Color',    hint: 'Used for secondary actions and tags' },
                ] as const
              ).map(({ key, label, hint }) => (
                <div key={key}>
                  <FieldLabel hint={hint}>{label}</FieldLabel>
                  <div className="flex gap-2 items-center">
                    <label className="flex-shrink-0 cursor-pointer relative">
                      <input
                        type="color"
                        value={branding[key]}
                        onChange={e => setBranding(b => ({ ...b, [key]: e.target.value }))}
                        className="sr-only"
                      />
                      <div
                        className="w-10 h-10 rounded-xl border-2 transition-all hover:scale-105"
                        style={{ background: branding[key], borderColor: 'var(--border-default)' }}
                      />
                    </label>
                    <input
                      type="text"
                      value={branding[key]}
                      onChange={e => setBranding(b => ({ ...b, [key]: e.target.value }))}
                      placeholder="#10b981"
                      maxLength={7}
                      className={inputCls + ' font-mono'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assets */}
          <div
            className="rounded-2xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#3b82f622' }}>
                <ImageIcon className="w-4 h-4" style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Visual Assets</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Logo and browser tab icon</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Logo */}
              <div>
                <FieldLabel hint="Recommended: 200×200px · PNG or JPG · max 2MB">Company Logo</FieldLabel>
                {logoPreview ? (
                  <div className="relative inline-flex mb-3">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-28 h-28 rounded-2xl object-cover"
                      style={{ border: '2px solid var(--border-default)' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('logo')}
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white transition-all hover:opacity-90"
                      style={{ background: '#ef4444' }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="logo-upload"
                    className="flex flex-col items-center justify-center w-28 h-28 rounded-2xl border-2 border-dashed cursor-pointer transition-all hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 mb-3"
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    <Upload className="w-5 h-5 mb-1" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>Upload<br/>logo</span>
                  </label>
                )}
                <input
                  type="file" accept="image/*" id="logo-upload" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'logo'); }}
                />
                {logoPreview && (
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    style={{ color: 'var(--primary-color)' }}
                  >
                    <Upload className="w-3 h-3" /> Replace
                  </label>
                )}
              </div>

              {/* Favicon */}
              <div>
                <FieldLabel hint="Recommended: 32×32px · PNG or ICO · max 2MB">Browser Favicon</FieldLabel>
                {faviconPreview ? (
                  <div className="relative inline-flex mb-3">
                    <img
                      src={faviconPreview}
                      alt="Favicon preview"
                      className="w-16 h-16 rounded-xl object-cover"
                      style={{ border: '2px solid var(--border-default)' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('favicon')}
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
                      style={{ background: '#ef4444' }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="favicon-upload"
                    className="flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 mb-3"
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    <Upload className="w-4 h-4 mb-0.5" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Icon</span>
                  </label>
                )}
                <input
                  type="file" accept="image/*" id="favicon-upload" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'favicon'); }}
                />
                {faviconPreview && (
                  <label
                    htmlFor="favicon-upload"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    style={{ color: 'var(--primary-color)' }}
                  >
                    <Upload className="w-3 h-3" /> Replace
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Info tip */}
          <div
            className="flex gap-3 rounded-2xl p-4"
            style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
          >
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3b82f6' }} />
            <p className="text-xs leading-relaxed" style={{ color: '#1d4ed8' }}>
              <strong>Changes apply immediately</strong> after saving — colors, logo, and favicon update live across the dashboard without a page reload.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div
          className="rounded-2xl p-6 space-y-6 sticky top-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Live Preview</p>
            <span
              className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-tertiary)' }}
            >
              Real-time
            </span>
          </div>

          {/* Sidebar logo preview */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Sidebar Logo</p>
            <div
              className="p-4 rounded-xl flex items-center gap-3"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
                >
                  🛒
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {branding.businessName || 'Your Business'}
                </p>
                {branding.companyTagline && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{branding.companyTagline}</p>
                )}
              </div>
            </div>
          </div>

          {/* Favicon preview */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Browser Tab</p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
            >
              {faviconPreview ? (
                <img src={faviconPreview} alt="Favicon" className="w-4 h-4 object-cover rounded" />
              ) : (
                <div
                  className="w-4 h-4 rounded"
                  style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
                />
              )}
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {branding.businessName || 'My POS'} — Dashboard
              </p>
            </div>
          </div>

          {/* Button preview */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Button Styles</p>
            <div className="space-y-2">
              <button
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
              >
                Primary Action
              </button>
              <button
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: branding.accentColor }}
              >
                Accent Action
              </button>
            </div>
          </div>

          {/* Color palette */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Palette className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Color Palette</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { color: branding.primaryColor,   label: 'Primary' },
                { color: branding.secondaryColor, label: 'Secondary' },
                { color: branding.accentColor,    label: 'Accent' },
              ].map(({ color, label }) => (
                <div key={label} className="text-center">
                  <div
                    className="w-full h-14 rounded-xl mb-1.5"
                    style={{ background: color, boxShadow: `0 4px 12px ${color}44` }}
                  />
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{color}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Save button (mirrored for convenience) */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--primary-color)' }}
          >
            {isSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
