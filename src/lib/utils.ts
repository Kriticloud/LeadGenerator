import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Lead } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function downloadLeadsAsCSV(leads: Lead[]) {
  if (leads.length === 0) return;

  const headers = [
    "Name",
    "Company",
    "Role",
    "Industry",
    "Website",
    "Description",
    "Reasoning",
    "Confidence",
    "Email",
    "Phone",
    "LinkedIn",
    "Twitter"
  ];

  const rows = leads.map(l => [
    l.name,
    l.company,
    l.role || "",
    l.industry,
    l.website || "",
    l.description,
    l.reasoning,
    l.confidence,
    l.contactInfo?.email || "",
    l.contactInfo?.phone || "",
    l.contactInfo?.linkedin || "",
    l.contactInfo?.twitter || ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.map(v => {
      const stringValue = String(v ?? "");
      // Escape quotes and wrap in quotes
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `leadpulse_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
