import React from "react";

export const SkeletonCard = ({ className = "" }) => (
  <div className={`bg-gradient-to-r from-slate-100 to-slate-50 rounded-[2rem] animate-pulse ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
  </div>
);

export const SkeletonGrid = ({ count = 4 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
        <div className="bg-slate-200 rounded-xl w-10 h-10 animate-pulse mb-4" />
        <div className="space-y-2">
          <div className="bg-slate-200 h-3 w-16 rounded animate-pulse" />
          <div className="bg-slate-200 h-6 w-20 rounded animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonHealthCard = () => (
  <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-md">
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
      <div className="space-y-3 text-center sm:text-left w-full sm:w-auto">
        <div className="bg-slate-200 h-3 w-24 rounded animate-pulse mx-auto sm:mx-0" />
        <div className="bg-slate-200 h-12 w-32 rounded animate-pulse mx-auto sm:mx-0" />
        <div className="bg-slate-200 h-8 w-24 rounded animate-pulse mx-auto sm:mx-0" />
      </div>
      <div className="grid grid-cols-2 gap-4 w-full sm:w-auto">
        {Array(2).fill(0).map((_, i) => (
          <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
            <div className="bg-slate-200 h-3 w-16 rounded animate-pulse mb-2" />
            <div className="bg-slate-200 h-6 w-12 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonInsightCard = () => (
  <div className="bg-slate-100 rounded-[2rem] p-6 animate-pulse h-28" />
);

export default SkeletonCard;
