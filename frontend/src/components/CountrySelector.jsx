import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import locationService from "../services/locationService";

/**
 * Country selector for the Create Company wizard.
 * Fetches countries from the backend and renders a searchable dropdown.
 * Calls `onChange` with the selected country ID.
 */
const CountrySelector = ({ value, onChange, error }) => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await locationService.getActiveCountries();
        const list = Array.isArray(res) ? res : (res?.data || res?.countries || []);
        setCountries(list);
      } catch (e) {
        console.error("Failed to load countries", e);
        setCountries([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="companyCountry" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Country <span className="text-red-400">*</span>
      </label>
      <div className="relative flex items-center">
        <select
          id="companyCountry"
          name="companyCountry"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading || countries.length === 0}
          className={`w-full px-4 py-2.5 rounded-xl bg-slate-800 border text-slate-100 text-sm outline-none transition-colors ${error ? "border-red-500" : "border-slate-700 focus:border-indigo-500"} disabled:opacity-60`}
        >
          <option value="">
            {loading ? "Loading countries..." : countries.length === 0 ? "No countries available" : "Select a country…"}
          </option>
          {countries.map((c) => (
            <option key={c._id} value={c._id || c.name}>
              {c.name} {c.code ? `(${c.code})` : ""}
            </option>
          ))}
        </select>
      </div>
      {countries.length === 0 && !loading && (
        <p className="text-xs text-amber-400 mt-1">
          Create a country first before assigning company coverage.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default CountrySelector;
