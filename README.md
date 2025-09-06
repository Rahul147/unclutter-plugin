# Chrome Extension

Bootstrap repository for a Chrome extension (default branch: `main`).

## Development
- Build your source into `dist/` (ignored by git).
- Load the unpacked extension via `chrome://extensions` → Enable Developer Mode → Load unpacked → select the project root or `dist/` as appropriate.

## Packaging
- Keep any private keys (e.g., `key.pem`) out of version control.
- Package artifacts like `.crx` or `.zip` are ignored by the `.gitignore`.

## Git
- Default branch is `main`.
- Global `user.name` / `user.email` will be used for commits.
