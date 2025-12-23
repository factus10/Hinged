import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var sidebarSelection: SidebarSelection?
    @State private var selectedStamp: Stamp?
    @State private var filterState = StampFilterState()
    @State private var columnVisibility: NavigationSplitViewVisibility = .all
    @State private var showingGapAnalysis = false

    // Import/Export state
    @State private var isExportingBackup = false
    @State private var isImportingBackup = false
    @State private var backupToExport: HingedBackup?
    @State private var showingImportConfirmation = false
    @State private var pendingImportURL: URL?
    @State private var importResult: ImportResult?
    @State private var showingImportResult = false
    @State private var importError: Error?
    @State private var showingImportError = false

    @Query private var countries: [Country]
    @Query private var stamps: [Stamp]

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            SidebarView(selection: $sidebarSelection)
                .navigationSplitViewColumnWidth(min: 200, ideal: 240, max: 300)
        } content: {
            StampListView(
                filterState: filterState,
                sidebarSelection: sidebarSelection,
                selectedStamp: $selectedStamp,
                showingGapAnalysis: $showingGapAnalysis
            )
        } detail: {
            detailView
                .navigationSplitViewColumnWidth(min: 300, ideal: 350, max: 450)
        }
        .searchable(text: $filterState.searchText, prompt: "Search stamps...")
        .focusedSceneValue(\.fileActions, FileActionsHandler(contentView: self))
        .sheet(isPresented: $showingGapAnalysis) {
            GapAnalysisView()
        }
        .fileExporter(
            isPresented: $isExportingBackup,
            document: backupToExport.map { HingedBackupDocument(backup: $0) },
            contentType: .hingedBackup,
            defaultFilename: "Hinged Backup \(formattedDate).hinged"
        ) { result in
            backupToExport = nil
            if case .failure(let error) = result {
                print("Export failed: \(error)")
            }
        }
        .fileImporter(
            isPresented: $isImportingBackup,
            allowedContentTypes: [.hingedBackup, .json],
            allowsMultipleSelection: false
        ) { result in
            handleBackupImport(result)
        }
        .confirmationDialog(
            "Import Backup",
            isPresented: $showingImportConfirmation,
            titleVisibility: .visible
        ) {
            Button("Replace All Data") {
                performImport(mode: .replace)
            }
            Button("Merge with Existing Data") {
                performImport(mode: .merge)
            }
            Button("Cancel", role: .cancel) {
                pendingImportURL = nil
            }
        } message: {
            Text("How would you like to import this backup?\n\nReplace: Deletes all existing data first.\nMerge: Adds to your existing data (skips duplicate countries).")
        }
        .alert("Import Complete", isPresented: $showingImportResult) {
            Button("OK") { }
        } message: {
            if let result = importResult {
                Text(result.summary)
            }
        }
        .alert("Import Failed", isPresented: $showingImportError) {
            Button("OK") { }
        } message: {
            if let error = importError {
                Text(error.localizedDescription)
            }
        }
        .onAppear {
            initializeDataIfNeeded()
        }
    }

    @ViewBuilder
    private var detailView: some View {
        if let stamp = selectedStamp {
            // Use transition: false for immediate updates without animation delay
            StampDetailView(stamp: stamp, countries: countries)
        } else {
            ContentUnavailableView(
                "No Selection",
                systemImage: "stamp",
                description: Text("Select a stamp to view its details.")
            )
        }
    }

    private func initializeDataIfNeeded() {
        // Ensure all default countries exist (adds any missing ones)
        Country.ensureDefaultCountries(in: modelContext)
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    // MARK: - Backup Export

    func exportBackup() {
        do {
            let backup = try BackupManager.createBackup(from: modelContext)
            backupToExport = backup
            isExportingBackup = true
        } catch {
            print("Failed to create backup: \(error)")
        }
    }

    // MARK: - Backup Import

    func importBackup() {
        isImportingBackup = true
    }

    private func handleBackupImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            pendingImportURL = url
            showingImportConfirmation = true
        case .failure(let error):
            importError = error
            showingImportError = true
        }
    }

    private func performImport(mode: ImportMode) {
        guard let url = pendingImportURL else { return }
        pendingImportURL = nil

        do {
            let accessing = url.startAccessingSecurityScopedResource()
            defer {
                if accessing { url.stopAccessingSecurityScopedResource() }
            }

            let data = try Data(contentsOf: url)
            let backup = try BackupManager.importFromData(data)
            let result = try BackupManager.restoreBackup(backup, to: modelContext, mode: mode)
            importResult = result
            showingImportResult = true

            // Clear selection after import
            selectedStamp = nil
            sidebarSelection = nil
        } catch {
            importError = error
            showingImportError = true
        }
    }
}

// MARK: - File Actions Handler

struct FileActionsHandler: FileActions {
    let contentView: ContentView

    var canImportCSV: Bool {
        // CSV import requires an album to be selected (handled in StampListView)
        true
    }

    var canExportCSV: Bool {
        // CSV export is available when stamps exist
        true
    }

    func importCSV() {
        // CSV import is handled by StampListView
        // Post notification or use another mechanism if needed
        NotificationCenter.default.post(name: .importCSV, object: nil)
    }

    func exportCSV() {
        // CSV export is handled by StampListView
        NotificationCenter.default.post(name: .exportCSV, object: nil)
    }

    func importBackup() {
        contentView.importBackup()
    }

    func exportBackup() {
        contentView.exportBackup()
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let importCSV = Notification.Name("importCSV")
    static let exportCSV = Notification.Name("exportCSV")
}

#Preview {
    ContentView()
        .modelContainer(for: [Collection.self, Album.self, Stamp.self, Country.self], inMemory: true)
}
