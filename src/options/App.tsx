import React, { useEffect, useState } from 'react';
import { Separator } from '../components/ui/separator';
import { Button } from '../components/ui/button';

export default function App() {
  const [enableTags, setEnableTags] = useState<boolean>(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await chrome.storage.local.get({ enableTags: false });
        setEnableTags(Boolean(data.enableTags));
      } catch {
        setEnableTags(false);
      }
    })();
  }, []);

  async function toggleTagsFeature() {
    const next = !enableTags;
    setEnableTags(next);
    try {
      await chrome.storage.local.set({ enableTags: next });
    } catch {
      // ignore
    }
  }

  return (
    <div className="app">
      <header className="container" style={{ gap: 8 }}>
        <h1 className="heading">unclutter — options</h1>
        <p className="subtle">Set categories, reminders, and experimental features.</p>
      </header>
      <main className="container">
        <div className="card">
          <div className="card__content">
            <div className="stack" style={{ gap: 8 }}>
              <h3 className="card__title">Experimental</h3>
              <Separator />
              <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <input
                  id="enableTags"
                  type="checkbox"
                  checked={enableTags}
                  onChange={() => void toggleTagsFeature()}
                />
                <label htmlFor="enableTags">Enable tagging (beta)</label>
                <div style={{ flex: 1 }} />
                <Button size="sm" variant="outline" onClick={() => void toggleTagsFeature()}>
                  {enableTags ? 'Disable' : 'Enable'}
                </Button>
              </div>
              <p className="subtle">Adds tags, tag filters, and inline tag editing on the dashboard.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


