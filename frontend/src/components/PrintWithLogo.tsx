/**
 * CI ERP — Print / Save with Logo
 * Wraps any content with company branding for print/PDF export.
 * This is the unique ERP feature — every print/save output gets the custom logo.
 */
import { useRef } from "react";
import { useBranding } from "@/lib/branding-context";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";

interface PrintWithLogoProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  showActions?: boolean;
}

export default function PrintWithLogo({ title, children, className = "", showActions = true }: PrintWithLogoProps) {
  const { branding, logoDataUrl } = useBranding();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const logoHtml = logoDataUrl
      ? `<img src="${logoDataUrl}" alt="logo" style="max-height:50px;max-width:150px;object-fit:contain;" />`
      : `<span style="font-size:18px;font-weight:bold;color:${branding.primary_color}">CI ERP</span>`;

    const headerText = branding.report_header ? `<div style="font-size:11px;color:#666;margin-top:4px;">${branding.report_header}</div>` : "";
    const footerText = branding.report_footer || `CI ERP • ${new Date().toLocaleDateString()}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || "CI ERP Report"}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1a1a2e; }
            .print-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 16px; border-bottom: 2px solid ${branding.primary_color}; }
            .print-title { font-size: 20px; font-weight: 700; color: ${branding.primary_color}; }
            .print-date { font-size: 11px; color: #666; text-align: right; }
            .print-body { padding: 20px 24px; }
            .print-footer { border-top: 1px solid #eee; padding: 12px 24px; text-align: center; font-size: 10px; color: #999; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: ${branding.primary_color}; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
            td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
            tr:nth-child(even) td { background: #f8f9fa; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div>
              ${logoHtml}
              ${headerText}
            </div>
            <div class="print-right">
              ${title ? `<div class="print-title">${title}</div>` : ""}
              <div class="print-date">
                Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
          <div class="print-body">
            ${printContent}
          </div>
          <div class="print-footer">${footerText}</div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error("Please allow popups for printing");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  const handleDownloadHTML = () => {
    // Generate a downloadable report file
    handlePrint();
    toast.info("Print dialog opened — use 'Save as PDF' to save the file");
  };

  return (
    <div className={className}>
      {showActions && (
        <div className="flex justify-end gap-2 mb-3 no-print">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 h-8">
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadHTML} className="gap-1.5 h-8">
            <Download className="w-3.5 h-3.5" />
            Save PDF
          </Button>
        </div>
      )}
      <div ref={printRef}>
        {children}
      </div>
    </div>
  );
}
