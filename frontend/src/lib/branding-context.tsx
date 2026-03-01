/**
 * CI ERP — Branding Context
 * Manages company logo and print branding across the entire app.
 * Logo is used in all report/invoice/print outputs.
 */
import React, { createContext, useContext, useEffect, useState } from "react";

export type BrandingSettings = {
  logo_data: string | null;           // base64 image
  logo_filename: string | null;
  logo_mime_type: string | null;
  report_header: string | null;
  report_footer: string | null;
  primary_color: string;
  secondary_color: string;
  show_logo_on_reports: boolean;
  show_logo_on_invoices: boolean;
  show_logo_on_payslips: boolean;
};

const DEFAULT_BRANDING: BrandingSettings = {
  logo_data: null,
  logo_filename: null,
  logo_mime_type: null,
  report_header: null,
  report_footer: null,
  primary_color: "#1a3a5c",
  secondary_color: "#2563eb",
  show_logo_on_reports: true,
  show_logo_on_invoices: true,
  show_logo_on_payslips: true,
};

const LS_KEY = "ci_erp_branding";

type BrandingContextValue = {
  branding: BrandingSettings;
  setBranding: (b: BrandingSettings) => void;
  uploadLogo: (file: File) => Promise<void>;
  removeLogo: () => void;
  updateSettings: (partial: Partial<BrandingSettings>) => void;
  logoDataUrl: string | null;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBrandingState] = useState<BrandingSettings>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return { ...DEFAULT_BRANDING, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_BRANDING;
  });

  const setBranding = (b: BrandingSettings) => {
    setBrandingState(b);
    localStorage.setItem(LS_KEY, JSON.stringify(b));
  };

  const uploadLogo = async (file: File) => {
    const reader = new FileReader();
    return new Promise<void>((resolve, reject) => {
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // result is "data:image/png;base64,xxxx"
        const [header, b64] = result.split(",");
        const mime = header.match(/data:([^;]+)/)?.[1] || file.type;
        const updated: BrandingSettings = {
          ...branding,
          logo_data: b64,
          logo_filename: file.name,
          logo_mime_type: mime,
        };
        setBranding(updated);
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeLogo = () => {
    setBranding({ ...branding, logo_data: null, logo_filename: null, logo_mime_type: null });
  };

  const updateSettings = (partial: Partial<BrandingSettings>) => {
    setBranding({ ...branding, ...partial });
  };

  const logoDataUrl = branding.logo_data
    ? `data:${branding.logo_mime_type || "image/png"};base64,${branding.logo_data}`
    : null;

  return (
    <BrandingContext.Provider value={{ branding, setBranding, uploadLogo, removeLogo, updateSettings, logoDataUrl }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used inside BrandingProvider");
  return ctx;
}
