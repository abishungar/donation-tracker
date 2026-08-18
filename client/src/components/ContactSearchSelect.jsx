import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { inputCls } from "./FormBits.jsx";

export default function ContactSearchSelect({ contacts, value, onChange, placeholder = "Search contacts..." }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = contacts.find((c) => c.id === value);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = contacts
    .filter((c) => `${c.firstName} ${c.lastName} ${c.email || ""}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30);

  if (selected && !open) {
    return (
      <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
        <span>{selected.firstName} {selected.lastName}</span>
        <button type="button" onClick={() => { onChange(null); setQuery(""); setOpen(true); }} className="text-gray-400 hover:text-gray-700">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder={placeholder}
          className={`${inputCls} pl-8`}
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => { onChange(c.id); setQuery(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between"
            >
              <span>{c.firstName} {c.lastName}</span>
              {c.group && <span className="text-xs text-gray-400">{c.group.name}</span>}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No matches</p>}
        </div>
      )}
    </div>
  );
}
