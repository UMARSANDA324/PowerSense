import { useState, useEffect } from "react";
import { evaluateFeatureFlags } from "../services/featureFlagService";

/**
 * Reusable React Hook for consuming Feature Flags cleanly in UI components.
 * Usage: const isNewReportEnabled = useFeatureFlag("report_new_experience", false);
 */
export const useFeatureFlag = (flagKey, defaultValue = false) => {
  const [enabled, setEnabled] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkFlag = async () => {
      try {
        const flags = await evaluateFeatureFlags();
        if (isMounted) {
          if (flagKey in flags) {
            setEnabled(Boolean(flags[flagKey]));
          } else {
            setEnabled(defaultValue);
          }
        }
      } catch (err) {
        if (isMounted) setEnabled(defaultValue);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkFlag();

    return () => {
      isMounted = false;
    };
  }, [flagKey, defaultValue]);

  return { enabled, loading };
};

export default useFeatureFlag;
