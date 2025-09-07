# Chrome Extension

Bootstrap repository for a Chrome extension (default branch: `main`).

## Development
- Build your source into `dist/` (ignored by git).
- Load the unpacked extension via `chrome://extensions` → Enable Developer Mode → Load unpacked → select the project root or `dist/` as appropriate.

## Theme
- The UI supports light and dark themes with a deep black/white palette.
- Toggle the theme from the Dashboard and Options headers using the moon/sun button.
- Preference persists via `localStorage` key `unclutter.theme` across pages.
- If no preference is saved, the UI follows the system `prefers-color-scheme`.

## Categories and Bookmarking
- New: items with status `unread`.
- Viewed: items with status `done` (marked when you open from the dashboard).
- Bookmarked: items with `bookmarked = true`. Toggle the star on a card to bookmark.
- Tabs at the top of the dashboard show these categories with counts. Search and tag filters work within the selected tab.

Opening a saved item from the dashboard marks it as viewed and updates `lastOpenedAt`.

## Tagging
- Edit tags inline on each card using the "Edit tags" / "Done" toggle.
- Tags render as chips; click the × on a chip to remove it. When the input is empty, Backspace removes the last chip.
- Type to see autocomplete suggestions from all tags (excluding ones already added). Navigate with ArrowUp/ArrowDown and press Enter to add; Tab and Comma also add.
- Pasting a comma- or semicolon-delimited list will add multiple tags at once.
- Limits: max 20 tags per item; max 30 characters per tag. Duplicate tags (case-insensitive) are ignored.
- Accessibility: input uses combobox with listbox suggestions; additions and removals are announced via a live region.

## Packaging
- Keep any private keys (e.g., `key.pem`) out of version control.
- Package artifacts like `.crx` or `.zip` are ignored by the `.gitignore`.

## Git
- Default branch is `main`.
- Global `user.name` / `user.email` will be used for commits.
