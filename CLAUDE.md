# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hinged is a macOS stamp collection management app built with Swift 5.0, SwiftUI, and SwiftData. It targets macOS 14.0+ and requires Xcode 15.0+ to build.

## Build Commands

```bash
# Open project in Xcode
open Hinged.xcodeproj

# Build from command line
xcodebuild -project Hinged.xcodeproj -scheme Hinged build

# Build for release
xcodebuild -project Hinged.xcodeproj -scheme Hinged -configuration Release build
```

Build in Xcode: Cmd+B to build, Cmd+R to run.

No external dependencies - uses only Apple frameworks (SwiftUI, SwiftData, Foundation, AppKit, UniformTypeIdentifiers).

No test framework is currently configured.

## Architecture

### Data Model (SwiftData)

```
Collection ──┬── Country (optional)
             └── Albums (1:many, cascade delete)
                    └── Stamps (1:many, cascade delete)
                           └── Country (optional, direct relationship)
```

Core models in `src/Models/`:
- **Country.swift** - Countries with catalog prefixes per system
- **Collection.swift** - Top-level units defining catalog system (Scott, Michel, etc.)
- **Album.swift** - Subdivisions within collections
- **Stamp.swift** - Individual stamp records with condition, status, images
- **Enums.swift** - CatalogSystem, GumCondition, CenteringGrade, CollectionStatus
- **Settings.swift** - User preferences and CustomCatalog model for user-defined catalog systems

Supporting models:
- **BackupRestore.swift** - Backup/restore functionality with version tracking (.hinged files)
- **ImageStorage.swift** - Image file storage management
- **NavigationSelection.swift** - Navigation state management
- **SchemaVersioning.swift** - SwiftData migration infrastructure
- **FocusedValues.swift** - Menu/command communication via focused values

### UI Architecture (Three-Column NavigationSplitView)

Entry point: `src/StampCollectionApp.swift` → `ContentView.swift`

Main views in `src/Views/`:
- **ContentView.swift** - Main NavigationSplitView wrapper
- **SidebarView.swift** - Left column: collections/albums tree + smart collections
- **StampListView.swift** - Center column: filterable stamp table with search, CSV import/export
- **StampDetailView.swift** - Right column: stamp editing form

Additional views:
- **CountryManagementView.swift** - Manage country-specific catalog prefixes
- **GapAnalysisView.swift** - Analyze collection completeness
- **HelpView.swift** - Built-in help documentation
- **SettingsView.swift** - User preferences UI
- **Components/FlowLayout.swift** - Reusable flow layout component

### Key Patterns

**SwiftData Integration**:
- Use `@Query` for data fetching
- Use `@Bindable` for model editing
- Enum values stored as raw strings with computed properties for type safety

**Menu/Command Communication**:
- FocusedValues (`src/Models/FocusedValues.swift`) enable menu items to access current selection context
- Protocols: AlbumActions, CollectionActions, FileActions

**Catalog System**:
- 7 built-in catalog systems (Scott, Michel, Stanley Gibbons, etc.)
- CustomCatalog model allows user-defined catalog systems
- UnifiedCatalogSystem enum handles both built-in and custom catalogs

**Cross-Platform Structure**:
- Code organized for eventual iOS/iPadOS support
- Uses `NavigationSplitView` and adaptive SwiftUI patterns
- Platform-specific code (NSImage) is isolated

### Data Storage

User data is stored at:
```
~/Documents/Hinged/
├── Hinged.store      (SwiftData database)
└── Images/           (stamp image files)
```

Backup files use `.hinged` extension (JSON format, UTType: `com.factus10.hinged.backup`).

## Command Accessibility Rules

Per DEVELOPMENT.md, all features must be accessible via:
1. Menu bar command with keyboard shortcut OR toolbar button OR inline button
2. Context menus are secondary (must also have primary access method)

Key keyboard shortcuts:
- ⌘? - Help
- ⌘, - Settings
- ⌘⇧N - New Collection
- ⌘⌥N - New Album
- ⌘⇧E - Export Backup
