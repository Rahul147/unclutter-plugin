# Chrome Extension

Bootstrap repository for a Chrome extension (default branch: `main`).

## Development
- Build your source into `dist/` (ignored by git).
- Load the unpacked extension via `chrome://extensions` → Enable Developer Mode → Load unpacked → select the project root or `dist/` as appropriate.

## Categories and Bookmarking
- New: items with status `unread`.
- Viewed: items with status `done` (marked when you open from the dashboard).
- Bookmarked: items with `bookmarked = true`. Toggle the star on a card to bookmark.
- Tabs at the top of the dashboard show these categories with counts. Search and tag filters work within the selected tab.

Opening a saved item from the dashboard marks it as viewed and updates `lastOpenedAt`.

## Packaging
- Keep any private keys (e.g., `key.pem`) out of version control.
- Package artifacts like `.crx` or `.zip` are ignored by the `.gitignore`.

## Git
- Default branch is `main`.
- Global `user.name` / `user.email` will be used for commits.
