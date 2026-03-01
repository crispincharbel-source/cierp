/**
 * CI ERP — Logo Uploader Component
 * Unique ERP feature: upload custom logo that appears on ALL print/save outputs.
 */
import { useRef, useState, DragEvent } from "react";
import { useBranding } from "@/lib/branding-context";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
const MAX_MB = 5;

export default function LogoUploader({ compact = false }: { compact?: boolean }) {
  const { branding, logoDataUrl, uploadLogo, removeLogo } = useBranding();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Unsupported format. Use PNG, JPEG, WebP, GIF, or SVG.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large (max ${MAX_MB} MB)`);
      return;
    }
    setUploading(true);
    try {
      await uploadLogo(file);
      toast.success(`Logo "${file.name}" uploaded! It will appear on all reports and invoices.`);
    } catch (err) {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {logoDataUrl ? (
          <>
            <div className="w-10 h-10 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
              <img src={logoDataUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{branding.logo_filename}</p>
              <p className="text-xs text-slate-500">Used on all reports & invoices</p>
            </div>
            <Button size="sm" variant="ghost" onClick={removeLogo} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded border-2 border-dashed border-slate-300 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500">No logo uploaded</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>
          </>
        )}
        <input ref={inputRef} type="file" accept={ALLOWED.join(",")} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Logo Preview */}
      {logoDataUrl && (
        <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-green-800">Logo Active</p>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Appears on all outputs
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 h-16 bg-white border border-green-200 rounded-lg flex items-center justify-center overflow-hidden p-2">
                <img src={logoDataUrl} alt="Company logo" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-green-700 font-medium truncate">{branding.logo_filename}</p>
                <p className="text-xs text-green-600">PNG/JPEG/WebP/SVG • Max 5MB</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}
                    className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50">
                    Replace
                  </Button>
                  <Button size="sm" variant="ghost" onClick={removeLogo}
                    className="h-7 text-xs text-red-600 hover:text-red-800 hover:bg-red-50">
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      {!logoDataUrl && (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed
            cursor-pointer transition-all select-none
            ${dragging
              ? "border-blue-500 bg-blue-50 scale-[1.01]"
              : "border-slate-300 hover:border-blue-400 hover:bg-slate-50 bg-white"
            }
          `}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${dragging ? "bg-blue-100" : "bg-slate-100"}`}>
            <Upload className={`w-6 h-6 ${dragging ? "text-blue-600" : "text-slate-400"}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">
              {uploading ? "Uploading..." : "Drop your logo here"}
            </p>
            <p className="text-xs text-slate-500 mt-1">or click to browse</p>
            <p className="text-xs text-slate-400 mt-2">PNG, JPEG, WebP, SVG, GIF • Max 5 MB</p>
          </div>
          {uploading && (
            <div className="absolute inset-0 rounded-xl bg-white/70 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <ImageIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Your logo will appear on:</span> invoices, purchase orders,
          payslips, financial reports, order tracking exports, and all printed or saved PDF outputs.
          Change it anytime — updates apply immediately.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
