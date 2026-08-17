import React, { useState, useEffect } from "react";
import { Search, X, AlertCircle } from "lucide-react";
import locationService from "../services/locationService";

/**
 * Reusable Coverage States Selector Component
 * Allows multi-selecting 1 to 10 states based on selected country.
 */
const CoverageStatesSelector = ({ selectedStates = [], onChange, error, countryId }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch states whenever countryId changes
  useEffect(() => {
    if (!countryId) {
      setStates([]);
      return;
    }
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await locationService.getStates(countryId);
        const list = Array.isArray(res) ? res : (res?.data || res?.states || []);
        setStates(list);
      } catch (e) {
        console.error("Failed to load states", e);
        setStates([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [countryId]);

  const availableStates = states.filter(
    (state) =>
      !selectedStates.includes(state.name) &&
      state.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleAddState = (stateName) => {
    if (selectedStates.length >= 10) return;
    if (!selectedStates.includes(stateName)) {
      onChange([...selectedStates, stateName]);
      setSearchTerm("");
    }
  };

  const handleRemoveState = (stateToRemove) => {
    onChange(selectedStates.filter((s) => s !== stateToRemove));
  };

  return (
    <div className="space-y-3">
      <label htmlFor="coverageStateSearch" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Coverage States <span className="text-red-400">*</span>
      </label>
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold ${
            selectedStates.length === 0
              ? "text-red-400"
              : selectedStates.length >= 10
              ? "text-amber-400"
              : "text-slate-400"
          }`}
        >
          {selectedStates.length} / 10 selected
        </span>
      </div>

      {/* Selected Chips */}
      {selectedStates.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-800/40 border border-slate-700/60 rounded-2xl min-h-[48px]">
          {selectedStates.map((state) => (
            <span
              key={state}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-sm transition-all"
            >
              • {state}
              <button
                type="button"
                onClick={() => handleRemoveState(state)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-indigo-500/30 text-indigo-300 hover:text-white transition-colors"
                title={`Remove ${state}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search / Select Dropdown */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3.5 text-slate-500" />
          <input
            id="coverageStateSearch"
            name="coverageStateSearch"
            type="text"
            value={searchTerm}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            placeholder={
              !countryId
                ? "Select a country first to view states…"
                : selectedStates.length >= 10
                ? "Maximum 10 states reached"
                : loading
                ? "Loading states…"
                : states.length === 0
                ? "No states available under this country"
                : "Search & select state…"
            }
            disabled={!countryId || selectedStates.length >= 10 || loading || states.length === 0}
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border text-slate-100 text-sm placeholder-slate-500 outline-none transition-colors ${
              error ? "border-red-500" : "border-slate-700 focus:border-indigo-500"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        </div>

        {!countryId && (
          <p className="text-xs text-slate-500 mt-1">
            Please select a country above to see and select its coverage states.
          </p>
        )}

        {countryId && states.length === 0 && !loading && (
          <p className="text-xs text-amber-400 mt-1">
            No states created under this country yet. Add states in Global Geography.
          </p>
        )}

        {/* Dropdown Menu */}
        {isOpen && countryId && states.length > 0 && selectedStates.length < 10 && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute z-20 mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5 space-y-0.5">
              {availableStates.length > 0 ? (
                availableStates.map((state) => (
                  <button
                    key={state._id || state.name}
                    type="button"
                    onClick={() => handleAddState(state.name)}
                    className="w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 flex items-center justify-between transition-colors"
                  >
                    <span>{state.name}</span>
                    <span className="text-xs text-indigo-400 font-bold">+ Add</span>
                  </button>
                ))
              ) : (
                <div className="px-3.5 py-3 text-xs text-slate-400 text-center">
                  {searchTerm ? `No state matching "${searchTerm}"` : "All available states selected"}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default CoverageStatesSelector;
