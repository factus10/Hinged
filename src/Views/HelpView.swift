import SwiftUI

struct HelpView: View {
    @State private var selectedTopic: HelpTopic? = .gettingStarted

    var body: some View {
        NavigationSplitView {
            List(HelpTopic.allCases, selection: $selectedTopic) { topic in
                Label(topic.title, systemImage: topic.systemImage)
                    .tag(topic)
            }
            .listStyle(.sidebar)
            .navigationTitle("Help Topics")
        } detail: {
            if let topic = selectedTopic {
                ScrollView {
                    topic.content
                        .padding(24)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .navigationTitle(topic.title)
            } else {
                ContentUnavailableView("Select a Topic", systemImage: "questionmark.circle")
            }
        }
        .frame(minWidth: 700, minHeight: 500)
    }
}

// MARK: - Help Topics

enum HelpTopic: String, CaseIterable, Identifiable {
    case gettingStarted
    case collections
    case albums
    case stamps
    case smartCollections
    case filtering
    case bulkActions
    case importExport
    case gapAnalysis
    case countryManagement
    case keyboardShortcuts

    var id: String { rawValue }

    var title: String {
        switch self {
        case .gettingStarted: return "Getting Started"
        case .collections: return "Collections"
        case .albums: return "Albums"
        case .stamps: return "Stamps"
        case .smartCollections: return "Smart Collections"
        case .filtering: return "Filtering & Searching"
        case .bulkActions: return "Bulk Actions"
        case .importExport: return "Import & Export"
        case .gapAnalysis: return "Gap Analysis"
        case .countryManagement: return "Country Management"
        case .keyboardShortcuts: return "Keyboard Shortcuts"
        }
    }

    var systemImage: String {
        switch self {
        case .gettingStarted: return "star"
        case .collections: return "folder.fill"
        case .albums: return "book.closed.fill"
        case .stamps: return "stamp"
        case .smartCollections: return "gearshape.fill"
        case .filtering: return "line.3.horizontal.decrease.circle"
        case .bulkActions: return "checkmark.circle"
        case .importExport: return "arrow.up.arrow.down"
        case .gapAnalysis: return "chart.bar.xaxis"
        case .countryManagement: return "globe"
        case .keyboardShortcuts: return "keyboard"
        }
    }

    @ViewBuilder
    var content: some View {
        switch self {
        case .gettingStarted:
            GettingStartedHelp()
        case .collections:
            CollectionsHelp()
        case .albums:
            AlbumsHelp()
        case .stamps:
            StampsHelp()
        case .smartCollections:
            SmartCollectionsHelp()
        case .filtering:
            FilteringHelp()
        case .bulkActions:
            BulkActionsHelp()
        case .importExport:
            ImportExportHelp()
        case .gapAnalysis:
            GapAnalysisHelp()
        case .countryManagement:
            CountryManagementHelp()
        case .keyboardShortcuts:
            KeyboardShortcutsHelp()
        }
    }
}

// MARK: - Help Content Views

struct HelpSectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.title2)
            .fontWeight(.semibold)
            .padding(.top, 16)
            .padding(.bottom, 4)
    }
}

struct HelpParagraph: View {
    let text: String

    var body: some View {
        Text(text)
            .padding(.bottom, 8)
    }
}

struct HelpBulletList: View {
    let items: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: 8) {
                    Text("\u{2022}")
                    Text(item)
                }
            }
        }
        .padding(.bottom, 8)
    }
}

struct HelpNote: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "info.circle.fill")
                .foregroundStyle(.blue)
            Text(text)
                .font(.callout)
        }
        .padding(12)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(8)
        .padding(.vertical, 8)
    }
}

struct HelpKeyboardShortcut: View {
    let keys: String
    let description: String

    var body: some View {
        HStack {
            Text(keys)
                .font(.system(.body, design: .monospaced))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.secondary.opacity(0.2))
                .cornerRadius(4)
            Text(description)
            Spacer()
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Getting Started

struct GettingStartedHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Welcome to Hinged")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Hinged is a stamp collection management application designed for philatelists. It helps you organize, track, and analyze your stamp collection with support for multiple catalog systems.")

            HelpSectionHeader(title: "Quick Start")

            HelpParagraph(text: "Follow these steps to get started with your collection:")

            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    Text("1.")
                        .fontWeight(.bold)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Create a Collection").fontWeight(.medium)
                        Text("Click the + button in the sidebar and choose 'New Collection'. Select your preferred catalog system (Scott, Michel, etc.) and optionally associate it with a country.")
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    Text("2.")
                        .fontWeight(.bold)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Add an Album").fontWeight(.medium)
                        Text("Within your collection, create albums to organize stamps. Right-click on a collection or use the + menu to add albums.")
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    Text("3.")
                        .fontWeight(.bold)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Add Stamps").fontWeight(.medium)
                        Text("Select an album and click the + button in the toolbar to add stamps. You can also import stamps from CSV files or use 'Populate Number Range' for batch creation.")
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    Text("4.")
                        .fontWeight(.bold)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Track Your Progress").fontWeight(.medium)
                        Text("Mark stamps as Owned, Wanted, or Not Collecting. Use Smart Collections to quickly view your want list or recent additions.")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.vertical, 8)

            HelpSectionHeader(title: "Interface Overview")

            HelpParagraph(text: "The app uses a three-column layout:")

            HelpBulletList(items: [
                "Left sidebar: Collections, albums, and smart collections",
                "Center panel: Stamp list with filtering and bulk actions",
                "Right panel: Detailed stamp information and editing"
            ])

            HelpNote(text: "Tip: Use the toolbar buttons at the top to access Gap Analysis and Country Management features.")
        }
    }
}

// MARK: - Collections Help

struct CollectionsHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Collections")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Collections are the top-level organizational unit in Hinged. Each collection represents a distinct philatelic focus, such as stamps from a specific country or a topical collection.")

            HelpSectionHeader(title: "Creating a Collection")

            HelpBulletList(items: [
                "Click the + button in the sidebar toolbar",
                "Select 'New Collection...'",
                "Enter a name and optional description",
                "Choose a catalog system (Scott, Michel, Stanley Gibbons, etc.)",
                "Optionally select a country, or leave as 'Worldwide' for multi-country collections"
            ])

            HelpSectionHeader(title: "Catalog Systems")

            HelpParagraph(text: "Hinged supports the following catalog systems:")

            HelpBulletList(items: [
                "Scott (USA) - Uses 'Sc#' prefix",
                "Michel (Germany) - Uses 'Mi#' prefix",
                "Stanley Gibbons (UK) - Uses 'SG#' prefix",
                "Yvert et Tellier (France) - Uses 'Y&T#' prefix",
                "Sakura (Japan) - Uses 'Sak#' prefix",
                "Facit (Scandinavia) - Uses 'Fac#' prefix",
                "Other - Uses '#' prefix"
            ])

            HelpSectionHeader(title: "Worldwide vs Country-Specific")

            HelpParagraph(text: "When creating a collection, you can choose between:")

            HelpBulletList(items: [
                "Country-specific: All stamps inherit the collection's country. The country column is hidden in the stamp list.",
                "Worldwide: Stamps can be from any country. You set the country on each stamp individually, and the country column is displayed."
            ])

            HelpSectionHeader(title: "Managing Collections")

            HelpBulletList(items: [
                "Edit: Right-click and select 'Edit Collection...' or use the Collection menu",
                "Delete: Right-click and select 'Delete Collection'. This deletes all albums and stamps within.",
                "Reorder: Collections are displayed in creation order by default"
            ])
        }
    }
}

// MARK: - Albums Help

struct AlbumsHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Albums")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Albums are subdivisions within a collection. Use albums to organize stamps by year, type, or any other criteria that makes sense for your collection.")

            HelpSectionHeader(title: "Creating Albums")

            HelpBulletList(items: [
                "Right-click on a collection and select 'Add Album...'",
                "Or use the + menu and select 'New Album in...'",
                "Enter a name and optional description"
            ])

            HelpNote(text: "When you create an album, its parent collection will automatically expand to show the new album.")

            HelpSectionHeader(title: "Album Organization Ideas")

            HelpBulletList(items: [
                "By decade (1900s, 1910s, 1920s, etc.)",
                "By stamp type (Definitives, Commemoratives, Airmail)",
                "By era (Classic, Modern, Contemporary)",
                "By physical album or stockbook location"
            ])

            HelpSectionHeader(title: "Managing Albums")

            HelpBulletList(items: [
                "Rename: Right-click and select 'Rename...' or use Cmd+Shift+R",
                "Delete: Right-click and select 'Delete Album' or use Cmd+Delete. You'll be asked to confirm if the album contains stamps.",
                "View stamps: Click on an album to see its stamps in the center panel"
            ])
        }
    }
}

// MARK: - Stamps Help

struct StampsHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Stamps")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Each stamp record contains detailed information about a single stamp or stamp variety in your collection.")

            HelpSectionHeader(title: "Adding Stamps")

            HelpParagraph(text: "There are several ways to add stamps:")

            HelpBulletList(items: [
                "Click the + button in the toolbar to add a single stamp",
                "Use 'Quick Add Mode' (bolt icon) for faster entry of multiple stamps",
                "Import from CSV file for bulk additions",
                "Use 'Populate Number Range' to create placeholder entries for a range of catalog numbers"
            ])

            HelpSectionHeader(title: "Stamp Fields")

            VStack(alignment: .leading, spacing: 8) {
                Group {
                    Text("Identification").fontWeight(.semibold)
                    HelpBulletList(items: [
                        "Catalog Number: The primary identifier (e.g., '100', 'C5', 'O12')",
                        "Year of Issue: When the stamp was issued",
                        "Denomination: Face value (e.g., '5c', '1M', '10/-')"
                    ])
                }

                Group {
                    Text("Physical Characteristics").fontWeight(.semibold)
                    HelpBulletList(items: [
                        "Color: The stamp's color",
                        "Perforation: Gauge measurement (e.g., '11', '12x11.5')",
                        "Watermark: Watermark type if present"
                    ])
                }

                Group {
                    Text("Condition").fontWeight(.semibold)
                    HelpBulletList(items: [
                        "Gum Condition: MNH, MLH, MH, OG, NG, etc.",
                        "Centering Grade: Superb, XF, VF, F-VF, etc."
                    ])
                }

                Group {
                    Text("Collection Status").fontWeight(.semibold)
                    HelpBulletList(items: [
                        "Owned: You have this stamp",
                        "Wanted: On your want list",
                        "Not Collecting: You're skipping this stamp"
                    ])
                }

                Group {
                    Text("Acquisition Details").fontWeight(.semibold)
                    HelpBulletList(items: [
                        "Purchase Price: What you paid",
                        "Acquisition Date: When you acquired it",
                        "Source: Where you got it (dealer, auction, etc.)"
                    ])
                }
            }

            HelpSectionHeader(title: "Stamp Images")

            HelpParagraph(text: "You can attach images to stamps by clicking the image area in the detail panel. Supported formats include JPEG, PNG, and other common image types.")

            HelpSectionHeader(title: "Catalog Number Sorting")

            HelpParagraph(text: "Catalog numbers are sorted naturally, meaning:")

            HelpBulletList(items: [
                "Numbers sort numerically: 1, 2, 10, 100 (not 1, 10, 100, 2)",
                "Prefixes sort alphabetically before numbers: B1, C1, O1, 1",
                "Suffixes are handled: 100, 100a, 100b, 101"
            ])
        }
    }
}

// MARK: - Smart Collections Help

struct SmartCollectionsHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Smart Collections")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Smart Collections automatically show stamps matching specific criteria across all your collections and albums.")

            HelpSectionHeader(title: "Available Smart Collections")

            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("All Owned").fontWeight(.medium)
                        Text("Shows all stamps with status 'Owned' from every collection.")
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "heart.fill")
                        .foregroundStyle(.red)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Want List").fontWeight(.medium)
                        Text("Shows all stamps with status 'Wanted'. Perfect for taking to shows or sending to dealers.")
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "minus.circle.fill")
                        .foregroundStyle(.gray)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Not Collecting").fontWeight(.medium)
                        Text("Shows stamps you've marked as not collecting, such as expensive varieties or items outside your focus.")
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "clock.fill")
                        .foregroundStyle(.blue)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Recent Additions").fontWeight(.medium)
                        Text("Shows stamps added in the last 30 days.")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.vertical, 8)

            HelpNote(text: "Smart Collections are read-only views. To modify stamps, select them and use the detail panel or bulk actions.")
        }
    }
}

// MARK: - Filtering Help

struct FilteringHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Filtering & Searching")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Hinged provides powerful filtering options to help you find stamps quickly.")

            HelpSectionHeader(title: "Search Bar")

            HelpParagraph(text: "The search bar at the top of the window searches across:")

            HelpBulletList(items: [
                "Catalog numbers",
                "Country names",
                "Year of issue"
            ])

            HelpSectionHeader(title: "Filter Bar")

            HelpParagraph(text: "The filter bar below the search provides specific filters:")

            VStack(alignment: .leading, spacing: 8) {
                Text("Country").fontWeight(.semibold)
                HelpParagraph(text: "Filter by country (shown only for worldwide collections or when viewing multiple collections).")

                Text("Gum Condition").fontWeight(.semibold)
                HelpParagraph(text: "Filter by gum condition: MNH, MLH, MH, OG, NG, etc.")

                Text("Centering Grade").fontWeight(.semibold)
                HelpParagraph(text: "Filter by centering quality: Superb, XF, VF, F-VF, etc.")

                Text("Status").fontWeight(.semibold)
                HelpParagraph(text: "Filter by collection status: Owned, Wanted, or Not Collecting.")

                Text("Year Range").fontWeight(.semibold)
                HelpParagraph(text: "Enter start and/or end years to filter by issue date.")

                Text("Catalog Number Range").fontWeight(.semibold)
                HelpParagraph(text: "Enter start and/or end catalog numbers. Supports prefixes (e.g., C1 to C50).")
            }

            HelpSectionHeader(title: "Clearing Filters")

            HelpParagraph(text: "Click the 'Clear' button on the right side of the filter bar to reset all filters.")

            HelpNote(text: "Filters only affect the current view. They don't modify your data.")
        }
    }
}

// MARK: - Bulk Actions Help

struct BulkActionsHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Bulk Actions")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Bulk actions allow you to modify multiple stamps at once, saving time when managing large collections.")

            HelpSectionHeader(title: "Selecting Stamps")

            HelpBulletList(items: [
                "Use the checkbox in the first column to select individual stamps",
                "Use the 'Select All' checkbox (above the stamp list) to select all visible stamps",
                "The selection count shows how many stamps are selected"
            ])

            HelpNote(text: "Only stamps visible with current filters can be selected. Use filters to narrow down your selection.")

            HelpSectionHeader(title: "Available Actions")

            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Set Status").fontWeight(.medium)
                        Text("Change the collection status of all selected stamps to Owned, Wanted, or Not Collecting.")
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "trash")
                        .foregroundStyle(.red)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Delete").fontWeight(.medium)
                        Text("Permanently delete all selected stamps. A confirmation dialog will appear before deletion.")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.vertical, 8)

            HelpSectionHeader(title: "Common Workflows")

            HelpBulletList(items: [
                "Update want list after a purchase: Select newly acquired stamps, change status to 'Owned'",
                "Clean up duplicates: Filter to find duplicates, select them, and delete",
                "Mark reference stamps: Select stamps you own for reference but aren't actively collecting, set to 'Not Collecting'"
            ])
        }
    }
}

// MARK: - Import/Export Help

struct ImportExportHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Import & Export")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Hinged supports CSV (Comma-Separated Values) format for importing and exporting stamp data.")

            HelpSectionHeader(title: "Importing Stamps")

            HelpBulletList(items: [
                "Select an album where stamps will be imported",
                "Click the '...' menu in the toolbar",
                "Select 'Import CSV...'",
                "Choose your CSV file"
            ])

            HelpParagraph(text: "Required columns:")

            HelpBulletList(items: [
                "Catalog Number (or catalogNumber)"
            ])

            HelpParagraph(text: "Optional columns:")

            HelpBulletList(items: [
                "Year (or yearOfIssue)",
                "Denomination (or denomination)",
                "Color (or color)",
                "Status (or collectionStatus) - accepts: TRUE/owned, FALSE/wanted, notCollecting",
                "Gum Condition (or gumCondition)",
                "Centering Grade (or centeringGrade)",
                "Notes (or notes)"
            ])

            HelpSectionHeader(title: "Exporting Stamps")

            HelpBulletList(items: [
                "Apply filters to show only stamps you want to export",
                "Click the '...' menu in the toolbar",
                "Select 'Export CSV...'",
                "Choose a location and filename"
            ])

            HelpNote(text: "Exports include all visible stamps with the current filters applied.")

            HelpSectionHeader(title: "Populate Number Range")

            HelpParagraph(text: "This feature creates placeholder entries for a sequential range of catalog numbers:")

            HelpBulletList(items: [
                "Select an album",
                "Click the '...' menu and select 'Populate Number Range...'",
                "Enter an optional prefix (e.g., 'C' for airmail)",
                "Enter start and end numbers",
                "Choose the default status (usually 'Wanted')"
            ])

            HelpParagraph(text: "This is useful for setting up a want list quickly. For example, entering prefix 'C', start '1', end '150' creates entries C1 through C150.")
        }
    }
}

// MARK: - Gap Analysis Help

struct GapAnalysisHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Gap Analysis")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Gap Analysis helps you understand your collection's completeness and identify missing stamps.")

            HelpSectionHeader(title: "Accessing Gap Analysis")

            HelpParagraph(text: "Click the 'Gap Analysis' button (chart icon) in the main toolbar.")

            HelpSectionHeader(title: "Using Gap Analysis")

            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    Text("1.")
                        .fontWeight(.bold)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Select a Country").fontWeight(.medium)
                        Text("Choose which country to analyze.")
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    Text("2.")
                        .fontWeight(.bold)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Set Year Range").fontWeight(.medium)
                        Text("Use the presets (Classic, Modern, Recent) or enter custom years.")
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    Text("3.")
                        .fontWeight(.bold)
                        .frame(width: 24)
                    VStack(alignment: .leading) {
                        Text("Click Analyze").fontWeight(.medium)
                        Text("View your collection completeness and gaps.")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.vertical, 8)

            HelpSectionHeader(title: "Understanding Results")

            HelpBulletList(items: [
                "Completion Percentage: Shows what portion of stamps in the range you own",
                "Potential Gaps: Lists catalog numbers that appear to be missing sequences",
                "Wanted Stamps: Groups your want list by year"
            ])

            HelpSectionHeader(title: "Year Range Presets")

            HelpBulletList(items: [
                "Classic (1840-1940): Early philatelic period",
                "Modern (1941-2000): Mid-20th century to millennium",
                "Recent (2001-present): Contemporary issues"
            ])

            HelpNote(text: "Gap detection looks for numeric sequences. It may identify intentional gaps (varieties you're not collecting) as well as true gaps.")
        }
    }
}

// MARK: - Country Management Help

struct CountryManagementHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Country Management")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Manage countries and their catalog prefixes for proper organization of your stamps.")

            HelpSectionHeader(title: "Accessing Country Management")

            HelpParagraph(text: "Click the 'Countries' button (globe icon) in the main toolbar.")

            HelpSectionHeader(title: "Default Countries")

            HelpParagraph(text: "Hinged comes with 10 pre-configured countries, each with appropriate catalog prefixes:")

            HelpBulletList(items: [
                "United States, United Kingdom, Germany, France",
                "Japan, Canada, Australia, China, Sweden, Italy"
            ])

            HelpSectionHeader(title: "Adding Countries")

            HelpBulletList(items: [
                "Click the + button in the country list",
                "Enter the country name",
                "Optionally set up catalog prefixes for each catalog system"
            ])

            HelpSectionHeader(title: "Catalog Prefixes")

            HelpParagraph(text: "Catalog prefixes identify how stamps from each country are numbered in different catalogs. For example:")

            HelpBulletList(items: [
                "Scott might use 'US' for United States",
                "Michel might use 'D' for Germany (Deutschland)",
                "Stanley Gibbons might use 'GB' for Great Britain"
            ])

            HelpParagraph(text: "These prefixes help with importing data from different catalog sources and generating proper catalog numbers.")

            HelpSectionHeader(title: "Deleting Countries")

            HelpParagraph(text: "You can delete countries that aren't associated with any collections or stamps. If a country is in use, you'll need to reassign or delete those stamps first.")
        }
    }
}

// MARK: - Keyboard Shortcuts Help

struct KeyboardShortcutsHelp: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Keyboard Shortcuts")
                .font(.title)
                .fontWeight(.bold)
                .padding(.bottom, 8)

            HelpParagraph(text: "Use these keyboard shortcuts to work more efficiently.")

            HelpSectionHeader(title: "Collection Commands")

            VStack(alignment: .leading, spacing: 4) {
                HelpKeyboardShortcut(keys: "Cmd + Shift + E", description: "Edit selected collection")
            }

            HelpSectionHeader(title: "Album Commands")

            VStack(alignment: .leading, spacing: 4) {
                HelpKeyboardShortcut(keys: "Cmd + Shift + R", description: "Rename selected album")
                HelpKeyboardShortcut(keys: "Cmd + Delete", description: "Delete selected album")
            }

            HelpSectionHeader(title: "General")

            VStack(alignment: .leading, spacing: 4) {
                HelpKeyboardShortcut(keys: "Cmd + F", description: "Focus search field")
                HelpKeyboardShortcut(keys: "Cmd + ,", description: "Open preferences")
                HelpKeyboardShortcut(keys: "Cmd + ?", description: "Open help")
                HelpKeyboardShortcut(keys: "Cmd + Q", description: "Quit application")
            }

            HelpSectionHeader(title: "Window")

            VStack(alignment: .leading, spacing: 4) {
                HelpKeyboardShortcut(keys: "Cmd + W", description: "Close window")
                HelpKeyboardShortcut(keys: "Cmd + M", description: "Minimize window")
                HelpKeyboardShortcut(keys: "Cmd + 0", description: "Show/hide sidebar")
            }

            HelpNote(text: "Many standard macOS shortcuts work throughout the app, including Cmd+C (copy), Cmd+V (paste), and Cmd+Z (undo).")
        }
    }
}

#Preview {
    HelpView()
}
