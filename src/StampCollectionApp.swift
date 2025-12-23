import SwiftUI
import SwiftData

@main
struct HingedApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Collection.self,
            Album.self,
            Stamp.self,
            Country.self
        ])
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false
        )

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
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
            AboutCommand()
            HelpCommand()
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
