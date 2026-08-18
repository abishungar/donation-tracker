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

export function MoneyInput({ value, onChange, className = "", ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={onChange}
        className={`${inputCls} pl-6 ${className}`}
        placeholder="0.00"
        {...props}
      />
    </div>
  );
}

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
