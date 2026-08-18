import React from "react";

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 px-4 text-sm font-medium transition disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
