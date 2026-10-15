import React from "react";

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeColor = "emerald",
  trend,
  className = "",
}) => {
  return (
    <div
      className={`bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-3xl font-bold tracking-tight text-slate-900">{value}</h3>
        {badgeText && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              badgeColor === "rose"
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : badgeColor === "amber"
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {badgeText}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center text-xs text-slate-500">
          {trend && <span className="font-semibold text-emerald-600 mr-1.5">{trend}</span>}
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};
