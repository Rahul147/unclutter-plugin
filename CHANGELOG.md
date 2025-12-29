# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions CI workflow for automated testing and linting
- GitHub Actions CD workflow for automated releases on tag push
- Comprehensive test coverage for dashboard components and utilities

### Changed
- Simplified TypeScript usage following Google JavaScript standards
- Upgraded to Node.js 20 for compatibility with latest dependencies
- Improved TagEditor component with better state management

### Fixed
- TagEditor stale closure bug when pasting multiple tags
- Keyboard navigation state updates in TagEditor

## [0.1.0] - Initial Release

### Added
- Save pages for later reading with one click
- Clean, searchable dashboard to manage saved items
- Tag support for organizing saved content
- Dark/light theme support
- Local-first storage using IndexedDB
