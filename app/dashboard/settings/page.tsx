'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import {
  Settings, Palette, Image as ImageIcon, Upload, X, Lightbulb,
  Building2, Lock, CheckCircle2, Loader2, Eye,
  Bell, Shield, CreditCard, DollarSign, Receipt,
  ToggleLeft, ToggleRight, ChevronRight, Star,
  Mail, Globe, Phone, Clock, AlertTriangle, Key, Smartphone,
  Package, Users, GitBranch,
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

type Tab = 'branding' | 'business' | 'tax' | 'notifications' | 'security' | 'subscription';

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

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <button onClick={() => onChange(!value)} className="transition-all hover:opacity-80">
        {value
          ? <ToggleRight className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
          : <ToggleLeft className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
        }
      </button>
    </div>
  );
}

// ─── Tab components ───────────────────────────────────────────────────────────
function BrandingTab({ branding, setBranding, isSaving, onSave, logoPreview, setLogoPreview, faviconPreview, setFaviconPreview }: {
  branding: Branding;
  setBranding: React.Dispatch<React.SetStateAction<Branding>>;
  isSaving: boolean;
  onSave: () => void;
  logoPreview: string;
  setLogoPreview: (v: string) => void;
  faviconPreview: string;
  setFaviconPreview: (v: string) => void;
}) {
  const handleImageUpload = async (file: File, type: 'logo' | 'favicon') => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image size should be less than 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'logo') { setLogoPreview(base64); setBranding(b => ({ ...b, logoUrl: base64 })); }
      else { setFaviconPreview(base64); setBranding(b => ({ ...b, faviconUrl: base64 })); }
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

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
      <div className="space-y-5">
        {/* Business Identity */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
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
                <input value={branding.businessName} disabled className={inputCls + ' pr-10 opacity-60 cursor-not-allowed'} />
                <Lock className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            </div>
            <div>
              <FieldLabel>Company Tagline</FieldLabel>
              <input value={branding.companyTagline} onChange={e => setBranding(b => ({ ...b, companyTagline: e.target.value }))}
                placeholder="e.g. Quality you can trust" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
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
            {([
              { key: 'primaryColor',   label: 'Primary Color',   hint: 'Used for buttons, links, and highlights' },
              { key: 'secondaryColor', label: 'Secondary Color', hint: 'Gradient partner for the primary color' },
              { key: 'accentColor',    label: 'Accent Color',    hint: 'Used for secondary actions and tags' },
            ] as const).map(({ key, label, hint }) => (
              <div key={key}>
                <FieldLabel hint={hint}>{label}</FieldLabel>
                <div className="flex gap-2 items-center">
                  <label className="flex-shrink-0 cursor-pointer relative">
                    <input type="color" value={branding[key]} onChange={e => setBranding(b => ({ ...b, [key]: e.target.value }))} className="sr-only" />
                    <div className="w-10 h-10 rounded-xl border-2 transition-all hover:scale-105" style={{ background: branding[key], borderColor: 'var(--border-default)' }} />
                  </label>
                  <input type="text" value={branding[key]} onChange={e => setBranding(b => ({ ...b, [key]: e.target.value }))}
                    placeholder="#10b981" maxLength={7} className={inputCls + ' font-mono'} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assets */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
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
            <div>
              <FieldLabel hint="Recommended: 200×200px · PNG or JPG · max 2MB">Company Logo</FieldLabel>
              {logoPreview ? (
                <div className="relative inline-flex mb-3">
                  <img src={logoPreview} alt="Logo preview" className="w-28 h-28 rounded-2xl object-cover" style={{ border: '2px solid var(--border-default)' }} />
                  <button type="button" onClick={() => handleRemoveImage('logo')} className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: '#ef4444' }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label htmlFor="logo-upload" className="flex flex-col items-center justify-center w-28 h-28 rounded-2xl border-2 border-dashed cursor-pointer transition-all hover:border-[var(--primary-color)] mb-3" style={{ borderColor: 'var(--border-default)' }}>
                  <Upload className="w-5 h-5 mb-1" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>Upload<br/>logo</span>
                </label>
              )}
              <input type="file" accept="image/*" id="logo-upload" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'logo'); }} />
              {logoPreview && <label htmlFor="logo-upload" className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: 'var(--primary-color)' }}><Upload className="w-3 h-3" /> Replace</label>}
            </div>
            <div>
              <FieldLabel hint="Recommended: 32×32px · PNG or ICO · max 2MB">Browser Favicon</FieldLabel>
              {faviconPreview ? (
                <div className="relative inline-flex mb-3">
                  <img src={faviconPreview} alt="Favicon preview" className="w-16 h-16 rounded-xl object-cover" style={{ border: '2px solid var(--border-default)' }} />
                  <button type="button" onClick={() => handleRemoveImage('favicon')} className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: '#ef4444' }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label htmlFor="favicon-upload" className="flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-[var(--primary-color)] mb-3" style={{ borderColor: 'var(--border-default)' }}>
                  <Upload className="w-4 h-4 mb-0.5" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Icon</span>
                </label>
              )}
              <input type="file" accept="image/*" id="favicon-upload" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'favicon'); }} />
              {faviconPreview && <label htmlFor="favicon-upload" className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: 'var(--primary-color)' }}><Upload className="w-3 h-3" /> Replace</label>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 rounded-2xl p-4" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3b82f6' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#1d4ed8' }}>
            <strong>Changes apply immediately</strong> after saving — colors, logo, and favicon update live across the dashboard without a page reload.
          </p>
        </div>

        <div className="flex justify-end">
          <button onClick={onSave} disabled={isSaving} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60" style={{ background: 'var(--primary-color)' }}>
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Save Branding</>}
          </button>
        </div>
      </div>

      {/* Right: Live preview */}
      <div className="rounded-2xl p-6 space-y-4 sticky top-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Live Preview</p>
        </div>
        {/* Mini sidebar preview */}
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-default)' }}>
          <div className="p-3" style={{ background: branding.primaryColor }}>
            <div className="flex items-center gap-2">
              {logoPreview
                ? <img src={logoPreview} alt="" className="w-7 h-7 rounded-lg object-cover" />
                : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'rgba(0,0,0,0.2)' }}>S</div>
              }
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{branding.businessName || 'Your Business'}</p>
                {branding.companyTagline && <p className="text-[10px] text-white/70 truncate">{branding.companyTagline}</p>}
              </div>
            </div>
          </div>
          <div className="p-3 space-y-1" style={{ background: 'var(--bg-surface)' }}>
            {['Dashboard', 'Products', 'Sales', 'Reports'].map((item, i) => (
              <div key={item} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={i === 0 ? { background: branding.primaryColor + '20', color: branding.primaryColor } : { color: 'var(--text-secondary)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? branding.primaryColor : 'var(--text-tertiary)' }} />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Color Swatches</p>
          <div className="flex gap-2">
            {[branding.primaryColor, branding.secondaryColor, branding.accentColor].map((c, i) => (
              <div key={i} className="flex-1 h-10 rounded-xl" style={{ background: c }} title={c} />
            ))}
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: branding.primaryColor }}>
            <span className="text-white text-xs font-semibold">Save Changes</span>
            <ChevronRight className="w-3 h-3 text-white ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxCurrencyTab() {
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState('12.5');
  const [taxName, setTaxName] = useState('VAT');
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [currency, setCurrency] = useState('GH₵');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for your purchase!');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success('Tax & currency settings saved!');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#10b98122' }}>
            <DollarSign className="w-4 h-4" style={{ color: '#10b981' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Currency Settings</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Used throughout the POS and reports</p>
          </div>
        </div>
        <div>
          <FieldLabel>Currency Symbol</FieldLabel>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls + ' appearance-none'}>
            <option value="GH₵">GH₵ — Ghana Cedi (default)</option>
            <option value="$">$ — US Dollar</option>
            <option value="€">€ — Euro</option>
            <option value="£">£ — British Pound</option>
            <option value="₦">₦ — Nigerian Naira</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#3b82f622' }}>
            <Receipt className="w-4 h-4" style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Tax Configuration</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Applied to all sales transactions</p>
          </div>
        </div>
        <div className="space-y-4">
          <Toggle value={taxEnabled} onChange={setTaxEnabled} label="Enable tax on sales" />
          {taxEnabled && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Tax Name</FieldLabel>
                  <input value={taxName} onChange={e => setTaxName(e.target.value)} placeholder="e.g. VAT, GST, Tax" className={inputCls} />
                </div>
                <div>
                  <FieldLabel>Tax Rate (%)</FieldLabel>
                  <input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <Toggle value={taxInclusive} onChange={setTaxInclusive} label="Prices are tax-inclusive (tax is included in product price)" />
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b22' }}>
            <Receipt className="w-4 h-4" style={{ color: '#f59e0b' }} />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Receipt Footer</p>
        </div>
        <FieldLabel hint="Printed at the bottom of every receipt">Footer Message</FieldLabel>
        <input value={receiptFooter} onChange={e => setReceiptFooter(e.target.value)} placeholder="Thank you for your purchase!" className={inputCls} />
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60" style={{ background: 'var(--primary-color)' }}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Save Settings</>}
        </button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    emailEnabled: false,
    notifyEmail: '',
    newSale: true,
    lowStock: true,
    newEmployee: false,
    dailySummary: true,
    lowStockThreshold: '10',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success('Notification preferences saved!');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#10b98122' }}>
            <Bell className="w-4 h-4" style={{ color: '#10b981' }} />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Notification Events</p>
        </div>
        <div className="space-y-0">
          <Toggle value={settings.newSale}      onChange={v => setSettings(s => ({ ...s, newSale: v }))}       label="New sale completed" />
          <Toggle value={settings.lowStock}     onChange={v => setSettings(s => ({ ...s, lowStock: v }))}      label="Product stock falls below threshold" />
          <Toggle value={settings.newEmployee}  onChange={v => setSettings(s => ({ ...s, newEmployee: v }))}   label="New employee added" />
          <Toggle value={settings.dailySummary} onChange={v => setSettings(s => ({ ...s, dailySummary: v }))}  label="Daily sales summary" />
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#8b5cf622' }}>
            <Package className="w-4 h-4" style={{ color: '#8b5cf6' }} />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Inventory Alerts</p>
        </div>
        <FieldLabel hint="Products with stock at or below this number will trigger a low stock alert">Default Low Stock Threshold</FieldLabel>
        <input type="number" min="0" value={settings.lowStockThreshold} onChange={e => setSettings(s => ({ ...s, lowStockThreshold: e.target.value }))} className={inputCls} />
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#3b82f622' }}>
            <Mail className="w-4 h-4" style={{ color: '#3b82f6' }} />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Email Notifications</p>
        </div>
        <Toggle value={settings.emailEnabled} onChange={v => setSettings(s => ({ ...s, emailEnabled: v }))} label="Send email notifications" />
        {settings.emailEnabled && (
          <div className="mt-4">
            <FieldLabel>Notification Email Address</FieldLabel>
            <input type="email" value={settings.notifyEmail} onChange={e => setSettings(s => ({ ...s, notifyEmail: e.target.value }))} placeholder="alerts@yourbusiness.com" className={inputCls} />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60" style={{ background: 'var(--primary-color)' }}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Save Preferences</>}
        </button>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPass !== form.confirm) { toast.error('New passwords do not match.'); return; }
    if (form.newPass.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPass }),
      });
      if (res.ok) { toast.success('Password changed successfully!'); setForm({ current: '', newPass: '', confirm: '' }); }
      else { const d = await res.json(); toast.error(d.error || 'Failed to change password.'); }
    } catch { toast.error('Something went wrong — please try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#ef444422' }}>
            <Key className="w-4 h-4" style={{ color: '#ef4444' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Change Password</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Use a strong, unique password</p>
          </div>
        </div>
        <form onSubmit={save} className="space-y-4">
          {[
            { key: 'current', label: 'Current Password', show: showCurrent, toggle: () => setShowCurrent(s => !s) },
            { key: 'newPass', label: 'New Password',     show: showNew,     toggle: () => setShowNew(s => !s) },
            { key: 'confirm', label: 'Confirm New Password', show: showNew, toggle: () => setShowNew(s => !s) },
          ].map(({ key, label, show, toggle }) => (
            <div key={key}>
              <FieldLabel>{label}</FieldLabel>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="••••••••"
                  className={inputCls + ' pr-16'}
                  required
                />
                <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: 'var(--primary-color)' }}>
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60" style={{ background: 'var(--primary-color)' }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Shield className="w-4 h-4" /> Update Password</>}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b22' }}>
            <Smartphone className="w-4 h-4" style={{ color: '#f59e0b' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Two-Factor Authentication</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#eff6ff', color: '#3b82f6' }}>Coming Soon</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Add an extra layer of security to your account</p>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface-2)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Two-factor authentication will be available in an upcoming update. It will require a verification code from your phone in addition to your password.</p>
        </div>
      </div>
    </div>
  );
}

function SubscriptionTab() {
  const planFeatures = ['Unlimited products', 'Up to 5 branches', 'Up to 20 employees', 'Advanced reports', 'Priority support'];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Current plan */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b22' }}>
              <Star className="w-4 h-4" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Current Plan</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Your active subscription</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#d1fae5', color: '#065f46' }}>Active</span>
        </div>
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--primary-color)15', border: '1px solid var(--primary-color)30' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Professional Plan</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Renews April 8, 2027</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {planFeatures.map(f => (
            <div key={f} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage meters */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', }}>
        <p className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Usage</p>
        {[
          { label: 'Employees',   used: 8,  max: 20,  icon: Users      },
          { label: 'Branches',    used: 2,  max: 5,   icon: GitBranch  },
          { label: 'Products',    used: 143, max: null, icon: Package   },
        ].map(m => (
          <div key={m.label} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <m.icon className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {m.used}{m.max ? ` / ${m.max}` : ' (unlimited)'}
              </span>
            </div>
            {m.max && (
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-2)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(m.used / m.max) * 100}%`, background: 'var(--primary-color)' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="w-full py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-90" style={{ background: 'var(--primary-color)', color: '#fff' }}>
        Upgrade Plan
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('branding');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [faviconPreview, setFaviconPreview] = useState<string>('');
  const [branding, setBranding] = useState<Branding>({
    businessName: '', primaryColor: '#10b981', secondaryColor: '#059669',
    accentColor: '#34d399', logoUrl: '', faviconUrl: '', companyTagline: '',
  });

  useEffect(() => {
    document.title = 'Settings | SmartVendr';
    fetchBranding();
  }, []);

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
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const applyBrandingChanges = () => {
    document.documentElement.style.setProperty('--primary-color', branding.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', branding.secondaryColor);
    document.documentElement.style.setProperty('--accent-color', branding.accentColor);
    window.dispatchEvent(new CustomEvent('brandingUpdated', { detail: { ...branding } }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/business/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: branding.primaryColor, secondaryColor: branding.secondaryColor,
          accentColor: branding.accentColor, logoUrl: branding.logoUrl,
          faviconUrl: branding.faviconUrl, companyTagline: branding.companyTagline,
        }),
      });
      if (res.ok) { applyBrandingChanges(); toast.success('Branding saved successfully!'); }
      else toast.error('Failed to update branding');
    } catch { toast.error('Failed to update branding'); }
    finally { setIsSaving(false); }
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
              {[1,2,3].map(j => (
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

  if (user?.role !== 'business_owner') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-surface-2)' }}>
          <Lock className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Access Restricted</h2>
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>Only business owners can access and modify settings.</p>
      </div>
    );
  }

  const tabs: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
    { key: 'branding',      label: 'Branding',      icon: Palette     },
    { key: 'tax',           label: 'Tax & Currency', icon: DollarSign  },
    { key: 'notifications', label: 'Notifications',  icon: Bell        },
    { key: 'security',      label: 'Security',       icon: Shield      },
    { key: 'subscription',  label: 'Subscription',   icon: Star        },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage your business profile, branding, and preferences</p>
      </div>

      {/* ── Tab navigation ── */}
      <div className="flex gap-1 flex-wrap p-1 rounded-2xl w-fit" style={{ background: 'var(--bg-surface-2)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={activeTab === tab.key
                ? { background: 'var(--bg-surface)', color: 'var(--text-primary)', }
                : { color: 'var(--text-secondary)' }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'branding' && (
        <BrandingTab
          branding={branding} setBranding={setBranding}
          isSaving={isSaving} onSave={handleSave}
          logoPreview={logoPreview} setLogoPreview={setLogoPreview}
          faviconPreview={faviconPreview} setFaviconPreview={setFaviconPreview}
        />
      )}
      {activeTab === 'tax'           && <TaxCurrencyTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'security'      && <SecurityTab />}
      {activeTab === 'subscription'  && <SubscriptionTab />}
    </div>
  );
}
