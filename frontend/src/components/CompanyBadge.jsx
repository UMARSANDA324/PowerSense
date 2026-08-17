import React from "react";
import { Building2 } from "lucide-react";
import { getCurrentUser } from "../services/authService";

/**
 * Reusable Company Identity Badge Component
 * Displays the user's assigned electricity distribution company (logo + name).
 * Dynamically retrieves company identity from user context — no hardcoded branding.
 */
const CompanyBadge = ({
  prefix = "",
  company: propCompany = null,
  variant = "header",
  className = "",
  showPrefix = true
}) => {
  const currentUser = getCurrentUser();
  const company = propCompany || currentUser?.company || null;
  const companyName = company?.name || company?.shortName || "Electricity Distribution Provider";
  const logoUrl = company?.logo || null;

  // Variants styling
  if (variant === "header") {
    return (
      <div className={`flex items-center gap-2.5 py-1 ${className}`}>
        <div className="flex flex-col">
          {showPrefix && prefix && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {prefix}
            </span>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="h-6 w-auto max-w-[100px] object-contain rounded-md"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 items-center justify-center text-indigo-400 ${
                logoUrl ? "hidden" : "flex"
              }`}
            >
              <Building2 size={13} />
            </div>
            <span className="text-sm font-bold text-slate-800 tracking-tight">
              {companyName}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 shadow-sm ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="h-7 w-auto max-w-[90px] object-contain rounded-md flex-shrink-0"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center text-indigo-400 flex-shrink-0 ${
              logoUrl ? "hidden" : "flex"
            }`}
          >
            <Building2 size={15} />
          </div>
          <div className="min-w-0">
            {showPrefix && prefix && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {prefix}
              </p>
            )}
            <p className="text-xs sm:text-sm font-bold text-slate-100 truncate">
              {companyName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Inline / Default
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showPrefix && prefix && (
        <span className="text-xs font-semibold text-slate-400">{prefix}</span>
      )}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={companyName}
          className="h-5 w-auto max-w-[80px] object-contain rounded-md"
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "inline-flex";
          }}
        />
      ) : null}
      <div
        className={`w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/20 items-center justify-center text-indigo-400 ${
          logoUrl ? "hidden" : "inline-flex"
        }`}
      >
        <Building2 size={11} />
      </div>
      <span className="text-xs font-bold text-slate-200">{companyName}</span>
    </div>
  );
};

export default CompanyBadge;
