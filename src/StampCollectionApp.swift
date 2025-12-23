import SwiftUI
import SwiftData

@main
struct HingedApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema(versionedSchema: SchemaV1.self)

        // Store data in ~/Documents/Hinged/
        let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let hingedFolderURL = documentsURL.appendingPathComponent("Hinged", isDirectory: true)
        let storeURL = hingedFolderURL.appendingPathComponent("Hinged.store")

        // Create the Hinged folder if it doesn't exist
        try? FileManager.default.createDirectory(at: hingedFolderURL, withIntermediateDirectories: true)

        let modelConfiguration = ModelConfiguration(
            schema: schema,
            url: storeURL,
            allowsSave: true
        )

        do {
            return try ModelContainer(
                for: schema,
                migrationPlan: HingedMigrationPlan.self,
                configurations: [modelConfiguration]
            )
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
        #if os(macOS)
        .windowStyle(.automatic)
        .defaultSize(width: 1200, height: 800)
        #endif
        .commands {
            // Remove "New Window" from File menu
            CommandGroup(replacing: .newItem) { }

            // Remove Close/Save section
            CommandGroup(replacing: .saveItem) { }

            AboutCommand()
            HelpCommand()
            SettingsCommand()
            FileCommands()
            CollectionCommands()
            AlbumCommands()
        }

        #if os(macOS)
        Window("About Hinged", id: "about") {
            AboutView()
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
        .defaultPosition(.center)

        Window("Hinged Help", id: "help") {
            HelpView()
        }
        .defaultSize(width: 800, height: 600)
        .defaultPosition(.center)

        Window("Settings", id: "settings") {
            SettingsView()
        }
        .modelContainer(sharedModelContainer)
        .windowResizability(.contentSize)
        .defaultPosition(.center)
        #endif
    }
}

// MARK: - About Command

struct AboutCommand: Commands {
    @Environment(\.openWindow) private var openWindow

    var body: some Commands {
        CommandGroup(replacing: .appInfo) {
            Button("About Hinged") {
                openWindow(id: "about")
            }
        }
    }
}

// MARK: - Help Command

struct HelpCommand: Commands {
    @Environment(\.openWindow) private var openWindow

    var body: some Commands {
        CommandGroup(replacing: .help) {
            Button("Hinged Help") {
                openWindow(id: "help")
            }
            .keyboardShortcut("?", modifiers: [.command])
        }
    }
}

// MARK: - Settings Command

struct SettingsCommand: Commands {
    @Environment(\.openWindow) private var openWindow

    var body: some Commands {
        CommandGroup(after: .appSettings) {
            Button("Settings...") {
                openWindow(id: "settings")
            }
            .keyboardShortcut(",", modifiers: [.command])
        }
    }
}

// MARK: - File Commands (Import/Export)

struct FileCommands: Commands {
    @FocusedValue(\.fileActions) var fileActions

    var body: some Commands {
        CommandGroup(after: .saveItem) {
            Divider()

            Menu("Import") {
                Button("Import CSV...") {
                    fileActions?.importCSV()
                }
                .disabled(fileActions == nil || !fileActions!.canImportCSV)

                Button("Import Full Backup...") {
                    fileActions?.importBackup()
                }
            }

            Menu("Export") {
                Button("Export CSV...") {
                    fileActions?.exportCSV()
                }
                .disabled(fileActions == nil || !fileActions!.canExportCSV)

                Button("Export Full Backup...") {
                    fileActions?.exportBackup()
                }
                .keyboardShortcut("e", modifiers: [.command, .shift])
            }

            Divider()

            Button("Quit Hinged") {
                NSApplication.shared.terminate(nil)
            }
            .keyboardShortcut("q", modifiers: [.command])
        }
    }
}

// MARK: - File Actions Protocol

struct FileActionsKey: FocusedValueKey {
    typealias Value = FileActions
}

extension FocusedValues {
    var fileActions: FileActions? {
        get { self[FileActionsKey.self] }
        set { self[FileActionsKey.self] = newValue }
    }
}

protocol FileActions {
    var canImportCSV: Bool { get }
    var canExportCSV: Bool { get }
    func importCSV()
    func exportCSV()
    func importBackup()
    func exportBackup()
}

// MARK: - About View

struct AboutView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(nsImage: NSApp.applicationIconImage)
                .resizable()
                .frame(width: 128, height: 128)

            Text("Hinged")
                .font(.system(size: 24, weight: .bold))

            Text("Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text("A stamp collection management app")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Divider()
                .frame(width: 200)

            VStack(spacing: 4) {
                Text("Created by David Anderson")
                Text("Copyright © 2025 David Anderson")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Link("github.com/factus10/Hinged", destination: URL(string: "https://github.com/factus10/Hinged")!)
                .font(.subheadline)

            Divider()
                .frame(width: 200)

            Text("Licensed under GPL-3.0")
                .font(.caption)
                .foregroundStyle(.secondary)

            Button("OK") {
                NSApp.keyWindow?.close()
            }
            .keyboardShortcut(.defaultAction)
            .padding(.top, 8)
        }
        .padding(32)
        .frame(width: 320)
    }
}

// MARK: - Collection Commands

struct CollectionCommands: Commands {
    @FocusedValue(\.selectedCollection) var selectedCollection
    @FocusedValue(\.collectionActions) var collectionActions

    var body: some Commands {
        CommandMenu("Collection") {
            Button("Add Collection...") {
                collectionActions?.add()
            }
            .keyboardShortcut("n", modifiers: [.command, .shift])

            Divider()

            Button("Edit Collection...") {
                collectionActions?.edit()
            }
            .keyboardShortcut("e", modifiers: [.command, .shift])
            .disabled(selectedCollection == nil)

            Button("Delete Collection") {
                collectionActions?.delete()
            }
            .disabled(selectedCollection == nil)
        }
    }
}

// MARK: - Album Commands

struct AlbumCommands: Commands {
    @FocusedValue(\.selectedAlbum) var selectedAlbum
    @FocusedValue(\.selectedCollection) var selectedCollection
    @FocusedValue(\.albumActions) var albumActions

    var body: some Commands {
        CommandMenu("Album") {
            Button("Add Album...") {
                albumActions?.add()
            }
            .keyboardShortcut("n", modifiers: [.command, .option])
            .disabled(selectedCollection == nil)

            Divider()

            Button("Rename Album...") {
                albumActions?.rename()
            }
            .keyboardShortcut("r", modifiers: [.command, .shift])
            .disabled(selectedAlbum == nil)

            Divider()

            Button("Delete Album") {
                albumActions?.delete()
            }
            .keyboardShortcut(.delete, modifiers: [.command])
            .disabled(selectedAlbum == nil)
        }
    }
}
