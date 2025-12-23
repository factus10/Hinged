# StampCollection Development Guidelines

## UI/UX Patterns

### Command Accessibility

All user actions must be accessible through multiple methods consistent with Apple Human Interface Guidelines:

1. **Primary Access** (at least one required):
   - Menu bar command with keyboard shortcut
   - Toolbar button
   - Inline button in the relevant view

2. **Secondary Access** (optional, in addition to primary):
   - Right-click context menu
   - Touch bar (if applicable)

**Rule**: If a feature is available via right-click context menu, it MUST also be available through a primary access method (menu bar, toolbar, or inline button).

### Current Command Implementations

| Feature | Menu Bar | Shortcut | Context Menu | Toolbar |
|---------|----------|----------|--------------|---------|
| New Collection | + menu | - | - | + button |
| Edit Collection | Collection menu | ⇧⌘E | Collection context | - |
| Delete Collection | Collection menu | - | Collection context | - |
| New Album | + menu | - | Collection context | + button |
| Rename Album | Album menu | ⇧⌘R | Album context | - |
| Delete Album | Album menu | ⌘⌫ | Album context | - |
| Gap Analysis | - | - | - | Toolbar button |
| Country Management | - | - | - | Toolbar button |

### Adding New Features Checklist

When adding a new user-facing feature:

- [ ] Implement the core functionality
- [ ] Add to menu bar with keyboard shortcut (if applicable)
- [ ] Add context menu entry (if contextually relevant)
- [ ] Consider toolbar button (if frequently used)
- [ ] Use `FocusedValues` to communicate selection state to menu commands
- [ ] Ensure menu items are disabled when not applicable

## Code Organization

### File Structure

```
StampCollection/
├── StampCollectionApp.swift    # App entry, menu commands
├── Models/
│   ├── Enums.swift             # CatalogSystem, GumCondition, etc.
│   ├── Country.swift           # SwiftData model
│   ├── Collection.swift        # SwiftData model
│   ├── Album.swift             # SwiftData model
│   ├── Stamp.swift             # SwiftData model
│   ├── NavigationSelection.swift
│   └── FocusedValues.swift     # For menu bar communication
└── Views/
    ├── ContentView.swift       # Main NavigationSplitView
    ├── SidebarView.swift       # Collections & albums
    ├── StampListView.swift     # Stamp table with filters
    ├── StampDetailView.swift   # Stamp editing
    ├── GapAnalysisView.swift
    ├── CountryManagementView.swift
    └── Components/
        └── FlowLayout.swift    # Reusable layout components
```

### SwiftData Patterns

- Use `@Query` for fetching data in views
- Use `@Bindable` for editing model properties
- Store enum values as raw strings (e.g., `gumConditionRaw`) with computed properties for type-safe access
- Use `PersistentIdentifier` for selection bindings with `Table`

### Cross-Platform Considerations

This app is structured for eventual iOS/iPadOS support:

- Use `NavigationSplitView` instead of platform-specific navigation
- Avoid `#if os(macOS)` where SwiftUI provides adaptive alternatives
- Use `.sheet(item:)` pattern for modal presentations
- Keep platform-specific code (like `NSImage`) isolated and conditionally compiled
