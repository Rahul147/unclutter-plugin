import React, { useEffect, useState } from 'react';

import { Button } from '../components/ui/button';
import { applyTheme, getTheme } from '../lib/theme';

export default function App() {
  const [enableTags, setEnableTags] = useState<boolean>(false);
  const initialTheme: 'light' | 'dark' = (() => {
    const pref = getTheme();
    if (pref === 'light' || pref === 'dark') return pref;
    const systemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemDark ? 'dark' : 'light';
  })();
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);

  useEffect(() => {
    void (async () => {
      try {
        const data = await chrome.storage.local.get({ enableTags: true });
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
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <div className="stack" style={{ gap: 4 }}>
            <h1 className="heading">unclutter — options</h1>
            <p className="subtle">Set categories, reminders, and experimental features.</p>
          </div>
          <div style={{ flex: 1 }} />
          <Button
            size="icon"
            variant="ghost"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); applyTheme(next); }}
          >
            {theme === 'dark' ? '☀︎' : '☾'}
          </Button>
        </div>
      </header>
      <main className="container">
        <div className="card card--static">
          <div className="card__header">
            <h3 className="heading">Experimental</h3>
          </div>
          <div className="card__content">
            <div className="stack" style={{ gap: 12 }}>
              <div className="form-row">
                <input
                  id="enableTags"
                  type="checkbox"
                  className="checkbox"
                  checked={enableTags}
                  onChange={() => void toggleTagsFeature()}
                />
                <label htmlFor="enableTags">Enable tagging (beta)</label>
                <div style={{ flex: 1 }} />
                <Button size="sm" variant="outline" onClick={() => void toggleTagsFeature()}>
                  {enableTags ? 'Disable' : 'Enable'}
                </Button>
              </div>
              <p className="caption">Adds tags, tag filters, and inline tag editing on the dashboard.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


