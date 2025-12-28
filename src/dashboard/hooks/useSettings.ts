import { useEffect, useState } from "react";

type UseSettingsReturn = {
  enableTags: boolean;
};

export function useSettings(): UseSettingsReturn {
  const [enableTags, setEnableTags] = useState(true);

  useEffect(() => {
    // Load initial setting
    chrome.storage.local
      .get({ enableTags: true })
      .then((data) => setEnableTags(Boolean(data.enableTags)))
      .catch(() => setEnableTags(true));

    // Listen for changes
    function handleStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) {
      if (area === "local" && changes.enableTags) {
        setEnableTags(Boolean(changes.enableTags.newValue));
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  return { enableTags };
}
