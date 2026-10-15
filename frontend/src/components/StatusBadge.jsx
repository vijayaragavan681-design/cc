import React from "react";

export const StatusBadge = ({ status, type = "classification" }) => {
  if (!status) return null;

  const s = status.toUpperCase();

  let styles = "bg-slate-100 text-slate-700 border-slate-200";

  if (s === "LOW" || s === "CRITICAL" || s === "REJECTED") {
    styles = "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20";
  } else if (s === "NORMAL" || s === "ACKNOWLEDGED" || s === "SENT" || s === "APPROVED") {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20";
  } else if (s === "EXCESS" || s === "PENDING") {
    styles = "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20";
  } else if (s === "WARNING") {
    styles = "bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {status}
    </span>
  );
};
