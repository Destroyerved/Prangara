import { useState } from "react";
import { Download, FileText, Printer, ExternalLink, Loader2 } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { api } from "../../api/client";

interface ReportExportButtonProps {
  assessmentId: string;
}

export function ReportExportButton({ assessmentId }: ReportExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const htmlUrl = api.reportUrl(assessmentId, "html");
  const pdfUrl = api.reportUrl(assessmentId, "pdf");

  const handleDownload = (format: "html" | "pdf") => {
    setDownloading(true);
    const url = format === "html" ? htmlUrl : pdfUrl;
    window.open(url, "_blank");
    setTimeout(() => {
      setDownloading(false);
      setOpen(false);
    }, 1200);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="icon-button report-export-trigger"
          title="Export Audited Working Paper Report"
          aria-label="Export Audited Working Paper Report"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            background: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: "8px",
            color: "var(--accent-cyan, #38bdf8)",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          <span>{downloading ? "Exporting…" : "Export Report"}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="popover report-popover"
          align="end"
          sideOffset={8}
          style={{
            background: "#090d14",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "12px",
            padding: "16px",
            width: "280px",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6)",
            zIndex: 1000,
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#f8fafc", marginBottom: "4px" }}>
              Audited Working Paper
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.4 }}>
              Deterministic accounting paper with vector SVG MACC curve and CBAM/BRSR schedule.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={() => handleDownload("html")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#f1f5f9",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={16} color="#38bdf8" />
                <span>HTML Working Paper</span>
              </span>
              <ExternalLink size={13} color="#64748b" />
            </button>

            <button
              onClick={() => handleDownload("pdf")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#f1f5f9",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Printer size={16} color="#a78bfa" />
                <span>PDF Document</span>
              </span>
              <ExternalLink size={13} color="#64748b" />
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
