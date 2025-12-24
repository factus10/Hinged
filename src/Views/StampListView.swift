import SwiftUI
import SwiftData
import Combine

// MARK: - Checked Stamps Manager (isolated state for checkboxes)

@Observable
final class CheckedStampsManager {
    private(set) var checked: Set<PersistentIdentifier> = []

    // Cached count to avoid repeated Set.count calls
    var count: Int { checked.count }
    var hasAny: Bool { !checked.isEmpty }

    func isChecked(_ id: PersistentIdentifier) -> Bool {
        checked.contains(id)
    }

    func toggle(_ id: PersistentIdentifier) {
        if checked.contains(id) {
            checked.remove(id)
        } else {
            checked.insert(id)
        }
    }

    func clear() {
        checked.removeAll()
    }

    func checkAll(_ ids: some Sequence<PersistentIdentifier>) {
        checked.formUnion(ids)
    }

    func uncheckAll(_ ids: some Sequence<PersistentIdentifier>) {
        checked.subtract(ids)
    }

    // O(min(n,m)) Set operations instead of O(n) iteration
    func allChecked(in ids: Set<PersistentIdentifier>) -> Bool {
        !ids.isEmpty && ids.isSubset(of: checked)
    }

    func someChecked(in ids: Set<PersistentIdentifier>) -> Bool {
        !checked.isDisjoint(with: ids)
    }

    func checkedCount(in ids: Set<PersistentIdentifier>) -> Int {
        checked.intersection(ids).count
    }
}

// MARK: - Import Duplicate Handling

enum ImportDuplicateAction: String, CaseIterable {
    case skip = "Skip duplicates"
    case update = "Update existing"
    case createNew = "Create duplicates"
}

// MARK: - Stamp Checkbox (observes manager directly to isolate re-renders)

struct StampCheckbox: View {
    let stampID: PersistentIdentifier
    let manager: CheckedStampsManager

    var body: some View {
        let isChecked = manager.isChecked(stampID)
        Button {
            manager.toggle(stampID)
        } label: {
            Image(systemName: isChecked ? "checkmark.square.fill" : "square")
                .foregroundStyle(isChecked ? Color.accentColor : .secondary)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Editable Table Cells

struct EditableDenominationCell: View {
    @Bindable var stamp: Stamp

    var body: some View {
        TextField("", text: $stamp.denomination)
            .textFieldStyle(.plain)
    }
}

struct EditableYearCell: View {
    @Bindable var stamp: Stamp
    @State private var yearText: String = ""

    var body: some View {
        TextField("", text: $yearText)
            .textFieldStyle(.plain)
            .frame(width: 80)
            .onAppear {
                yearText = stamp.displayYear
            }
            .onChange(of: stamp.yearStart) { _, _ in
                yearText = stamp.displayYear
            }
            .onChange(of: stamp.yearEnd) { _, _ in
                yearText = stamp.displayYear
            }
            .onSubmit {
                parseAndSetYear()
            }
            .onChange(of: yearText) { _, newValue in
                // Allow only digits and hyphen
                let filtered = newValue.filter { $0.isNumber || $0 == "-" }
                if filtered != newValue {
                    yearText = filtered
                }
            }
    }

    private func parseAndSetYear() {
        if yearText.isEmpty {
            stamp.yearStart = nil
            stamp.yearEnd = nil
        } else if yearText.contains("-") {
            let parts = yearText.split(separator: "-")
            if parts.count == 2,
               let start = Int(parts[0]),
               let end = Int(parts[1]) {
                stamp.yearStart = start
                stamp.yearEnd = end
            } else if parts.count == 1, let start = Int(parts[0]) {
                stamp.yearStart = start
                stamp.yearEnd = nil
            }
        } else if let year = Int(yearText) {
            stamp.yearStart = year
            stamp.yearEnd = nil
        }
    }
}

struct EditableStatusCell: View {
    @Bindable var stamp: Stamp

    var body: some View {
        Picker("", selection: $stamp.collectionStatus) {
            ForEach(CollectionStatus.allCases) { status in
                Label(status.shortDisplayName, systemImage: status.systemImage)
                    .tag(status)
            }
        }
        .labelsHidden()
        .pickerStyle(.menu)
        .frame(width: 75)
    }
}

// MARK: - Stamp Table View (isolated to prevent parent re-renders on selection)

struct StampTableView: View {
    let stamps: [Stamp]
    let stampsByID: [PersistentIdentifier: Stamp]
    let allStamps: [Stamp]
    let showCountryColumn: Bool
    let catalogSystem: CatalogSystem
    let manager: CheckedStampsManager
    @Binding var selectedStamp: Stamp?
    @State private var selectedStampID: PersistentIdentifier?
    @State private var sortOrder = [KeyPathComparator(\Stamp.catalogNumber, comparator: NaturalCatalogComparator())]

    var body: some View {
        Group {
            if showCountryColumn {
                tableWithCountry
            } else {
                tableWithoutCountry
            }
        }
        .onChange(of: selectedStampID) { _, newValue in
            // Direct assignment for fastest update
            if let id = newValue {
                selectedStamp = stampsByID[id]
            } else {
                selectedStamp = nil
            }
        }
        .contextMenu(forSelectionType: PersistentIdentifier.self) { ids in
            if let stampID = ids.first,
               let stamp = allStamps.first(where: { $0.persistentModelID == stampID }) {
                Button("Edit...") {
                    selectedStamp = stamp
                }
                Divider()
                Menu("Set Status") {
                    ForEach(CollectionStatus.allCases) { status in
                        Button {
                            stamp.collectionStatus = status
                        } label: {
                            if stamp.collectionStatus == status {
                                Label(status.displayName, systemImage: "checkmark")
                            } else {
                                Text(status.displayName)
                            }
                        }
                    }
                }
                Divider()
                Button("Delete", role: .destructive) {
                    if let context = stamp.modelContext {
                        context.delete(stamp)
                    }
                }
            }
        }
        .overlay {
            if stamps.isEmpty {
                ContentUnavailableView {
                    Label("No Stamps", systemImage: "stamp")
                } description: {
                    Text("No stamps match your current filters.")
                }
            }
        }
    }

    private var tableWithCountry: some View {
        Table(stamps, selection: $selectedStampID, sortOrder: $sortOrder) {
            TableColumn("") { stamp in
                StampCheckbox(stampID: stamp.persistentModelID, manager: manager)
            }
            .width(30)

            TableColumn(catalogSystem.catalogNumberLabel, value: \.catalogNumber, comparator: NaturalCatalogComparator()) { stamp in
                Text(stamp.catalogNumber)
                    .fontWeight(.medium)
            }
            .width(70)

            TableColumn("Denom", value: \.denomination) { stamp in
                EditableDenominationCell(stamp: stamp)
            }
            .width(min: 100)

            TableColumn("Country", value: \.countryNameForSort) { stamp in
                Text(stamp.collectionCountry?.name ?? "—")
            }
            .width(100)

            TableColumn("Year", value: \.yearForSort) { stamp in
                EditableYearCell(stamp: stamp)
            }
            .width(80)

            TableColumn("Condition", value: \.conditionShorthand) { stamp in
                Text(stamp.conditionShorthand)
                    .font(.system(.body, design: .monospaced))
            }
            .width(80)

            TableColumn("Status", value: \.collectionStatusRaw) { stamp in
                EditableStatusCell(stamp: stamp)
            }
            .width(85)
        }
    }

    private var tableWithoutCountry: some View {
        Table(stamps, selection: $selectedStampID, sortOrder: $sortOrder) {
            TableColumn("") { stamp in
                StampCheckbox(stampID: stamp.persistentModelID, manager: manager)
            }
            .width(30)

            TableColumn(catalogSystem.catalogNumberLabel, value: \.catalogNumber, comparator: NaturalCatalogComparator()) { stamp in
                Text(stamp.catalogNumber)
                    .fontWeight(.medium)
            }
            .width(70)

            TableColumn("Denom", value: \.denomination) { stamp in
                EditableDenominationCell(stamp: stamp)
            }
            .width(min: 100)

            TableColumn("Year", value: \.yearForSort) { stamp in
                EditableYearCell(stamp: stamp)
            }
            .width(80)

            TableColumn("Condition", value: \.conditionShorthand) { stamp in
                Text(stamp.conditionShorthand)
                    .font(.system(.body, design: .monospaced))
            }
            .width(80)

            TableColumn("Status", value: \.collectionStatusRaw) { stamp in
                EditableStatusCell(stamp: stamp)
            }
            .width(85)
        }
    }

    private func statusColor(_ status: CollectionStatus) -> Color {
        switch status {
        case .owned: return .green
        case .wanted: return .red
        case .notCollecting: return .gray
        }
    }
}

// MARK: - Bulk Actions Bar (isolated view to prevent parent re-renders)

struct BulkActionsBarView: View {
    let stampIDs: Set<PersistentIdentifier>
    let stampsByID: [PersistentIdentifier: Stamp]
    let manager: CheckedStampsManager
    let onSetStatus: (CollectionStatus) -> Void
    let onDelete: (Int) -> Void

    var body: some View {
        let isAllChecked = manager.allChecked(in: stampIDs)
        let isSomeChecked = manager.someChecked(in: stampIDs)
        let count = manager.checkedCount(in: stampIDs)

        if !stampIDs.isEmpty {
            VStack(spacing: 0) {
                HStack(spacing: 12) {
                    // Select all checkbox
                    Button {
                        if isAllChecked {
                            manager.uncheckAll(stampIDs)
                        } else {
                            manager.checkAll(stampIDs)
                        }
                    } label: {
                        Image(systemName: isAllChecked ? "checkmark.square.fill" : (isSomeChecked ? "minus.square.fill" : "square"))
                            .foregroundStyle(isAllChecked || isSomeChecked ? Color.accentColor : .secondary)
                    }
                    .buttonStyle(.plain)
                    .help(isAllChecked ? "Deselect all" : "Select all")

                    if isSomeChecked {
                        Text("\(count) selected")
                            .foregroundStyle(.secondary)
                            .font(.callout)

                        Divider()
                            .frame(height: 16)

                        Menu {
                            ForEach(CollectionStatus.allCases) { status in
                                Button {
                                    onSetStatus(status)
                                } label: {
                                    Label(status.displayName, systemImage: status.systemImage)
                                }
                            }
                        } label: {
                            Label("Set Status", systemImage: "arrow.triangle.2.circlepath")
                        }
                        .menuStyle(.borderlessButton)
                        .fixedSize()

                        Button(role: .destructive) {
                            onDelete(count)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                        .buttonStyle(.borderless)
                        .foregroundStyle(.red)
                    } else {
                        Text("Select stamps to perform bulk actions")
                            .foregroundStyle(.tertiary)
                            .font(.callout)
                    }

                    Spacer()
                }
                .padding(.horizontal)
                .padding(.vertical, 6)

                Divider()
            }
            .background(.bar)
        }
    }
}

struct StampListView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var filterState: StampFilterState
    let sidebarSelection: SidebarSelection?
    @Binding var selectedStamp: Stamp?
    @Binding var showingGapAnalysis: Bool

    @Query private var allStamps: [Stamp]
    @Query private var albums: [Album]
    @Query private var collections: [Collection]
    @Query private var countries: [Country]

    @State private var isAddingStamp = false
    @State private var quickAddMode = false
    @State private var isPopulatingRange = false
    @State private var isExporting = false
    @State private var isImporting = false
    @State private var checkedManager = CheckedStampsManager()
    @State private var showBulkDeleteConfirmation = false
    @State private var pendingDeleteCount = 0
    @State private var showImportOptionsDialog = false
    @State private var pendingImportURL: URL?

    init(
        filterState: StampFilterState,
        sidebarSelection: SidebarSelection?,
        selectedStamp: Binding<Stamp?>,
        showingGapAnalysis: Binding<Bool>
    ) {
        self.filterState = filterState
        self.sidebarSelection = sidebarSelection
        self._selectedStamp = selectedStamp
        self._showingGapAnalysis = showingGapAnalysis
    }

    private var filteredStamps: [Stamp] {
        var stamps = allStamps

        // Filter by sidebar selection
        switch sidebarSelection {
        case .smartCollection(let type):
            switch type {
            case .allOwned:
                stamps = stamps.filter { $0.collectionStatus == .owned }
            case .wantList:
                stamps = stamps.filter { $0.collectionStatus == .wanted }
            case .notCollecting:
                stamps = stamps.filter { $0.collectionStatus == .notCollecting }
            case .recentAdditions:
                let cutoff = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
                stamps = stamps.filter { $0.createdAt >= cutoff }
            }
        case .album(let albumID):
            stamps = stamps.filter { $0.album?.persistentModelID == albumID }
        case .collection(let collectionID):
            stamps = stamps.filter { $0.album?.collection?.persistentModelID == collectionID }
        case .none:
            break
        }

        // Apply search filter
        if !filterState.searchText.isEmpty {
            let search = filterState.searchText.lowercased()
            stamps = stamps.filter { stamp in
                stamp.catalogNumber.lowercased().contains(search) ||
                stamp.collectionCountry?.name.lowercased().contains(search) == true ||
                stamp.displayYear.contains(search)
            }
        }

        // Apply gum condition filter
        if let gumFilter = filterState.gumCondition {
            stamps = stamps.filter { $0.gumCondition == gumFilter }
        }

        // Apply centering grade filter
        if let gradeFilter = filterState.centeringGrade {
            stamps = stamps.filter { $0.centeringGrade == gradeFilter }
        }

        // Apply country filter (country is determined by collection)
        if let countryID = filterState.countryID {
            stamps = stamps.filter { $0.collectionCountry?.persistentModelID == countryID }
        }

        // Apply status filter
        if let statusFilter = filterState.collectionStatus {
            stamps = stamps.filter { $0.collectionStatus == statusFilter }
        }

        // Apply year range filter
        if let startYear = filterState.yearStart {
            stamps = stamps.filter { ($0.yearStart ?? 0) >= startYear }
        }
        if let endYear = filterState.yearEnd {
            stamps = stamps.filter { ($0.yearStart ?? Int.max) <= endYear }
        }

        // Apply catalog number range filter
        if !filterState.catalogStart.isEmpty || !filterState.catalogEnd.isEmpty {
            stamps = stamps.filter { filterState.catalogNumberInRange($0.catalogNumber) }
        }

        // Sort by catalog number (Table will handle user-initiated sort changes)
        return stamps.sorted { lhs, rhs in
            NaturalCatalogComparator().compare(lhs.catalogNumber, rhs.catalogNumber) == .orderedAscending
        }
    }

    // MARK: - Bulk Action Handlers

    private func bulkDelete(stampsByID: [PersistentIdentifier: Stamp]) {
        for id in checkedManager.checked {
            if let stamp = stampsByID[id] {
                modelContext.delete(stamp)
            }
        }
        // Reset all selection state
        checkedManager.clear()
        selectedStamp = nil
    }

    private func bulkSetStatus(_ status: CollectionStatus, stampsByID: [PersistentIdentifier: Stamp]) {
        for id in checkedManager.checked {
            if let stamp = stampsByID[id] {
                stamp.collectionStatus = status
            }
        }
        // Reset selection to avoid stale state (especially in Smart Collections where
        // stamps may be filtered out after status change)
        checkedManager.clear()
        selectedStamp = nil
    }

    private var catalogSystem: CatalogSystem {
        switch sidebarSelection {
        case .album(let albumID):
            return albums.first { $0.persistentModelID == albumID }?.collection?.catalogSystem ?? .scott
        case .collection(let collectionID):
            if let album = albums.first(where: { $0.collection?.persistentModelID == collectionID }) {
                return album.collection?.catalogSystem ?? .scott
            }
            return .scott
        default:
            return .scott
        }
    }

    /// Determines if we should show the Country column and filter
    /// True for: worldwide collections, or when multiple country-specific collections exist
    /// False for: single country-specific collection
    private var showCountryColumn: Bool {
        switch sidebarSelection {
        case .smartCollection, .none:
            // If there's only one collection and it's not worldwide, no need to show country
            if collections.count == 1, let collection = collections.first {
                return collection.isWorldwide
            }
            // Multiple collections or no collections - show country column
            return collections.count > 1
        case .album(let albumID):
            guard let album = albums.first(where: { $0.persistentModelID == albumID }) else { return true }
            return album.collection?.isWorldwide ?? true
        case .collection(let collectionID):
            guard let album = albums.first(where: { $0.collection?.persistentModelID == collectionID }) else { return true }
            return album.collection?.isWorldwide ?? true
        }
    }

    var body: some View {
        let stamps = filteredStamps  // Compute once per render
        // Pre-compute lookup structures once per render for O(1) access
        let stampIDs = Set(stamps.map { $0.persistentModelID })
        let stampsByID = Dictionary(uniqueKeysWithValues: stamps.map { ($0.persistentModelID, $0) })

        VStack(spacing: 0) {
            filterBar
            // BulkActionsBarView is a separate view that observes checkedManager
            // This isolates the observation so StampListView doesn't re-render on checkbox changes
            BulkActionsBarView(
                stampIDs: stampIDs,
                stampsByID: stampsByID,
                manager: checkedManager,
                onSetStatus: { status in
                    bulkSetStatus(status, stampsByID: stampsByID)
                },
                onDelete: { count in
                    pendingDeleteCount = count
                    showBulkDeleteConfirmation = true
                }
            )
            // StampTableView owns selection state to isolate re-renders
            StampTableView(
                stamps: stamps,
                stampsByID: stampsByID,
                allStamps: allStamps,
                showCountryColumn: showCountryColumn,
                catalogSystem: catalogSystem,
                manager: checkedManager,
                selectedStamp: $selectedStamp
            )
        }
        .navigationTitle(navigationTitle)
        .toolbar {
            toolbarContent
        }
        .sheet(isPresented: $isAddingStamp) {
            AddStampSheet(
                preselectedAlbum: currentAlbum,
                quickAddMode: quickAddMode
            )
        }
        .sheet(isPresented: $isPopulatingRange, onDismiss: {
            // Reset selection after populating to avoid stale state
            selectedStamp = nil
        }) {
            if let album = currentAlbum {
                PopulateRangeSheet(album: album)
            }
        }
        .fileExporter(
            isPresented: $isExporting,
            document: StampCSVDocument(stamps: filteredStamps),
            contentType: .commaSeparatedText,
            defaultFilename: exportFilename
        ) { result in
            // Handle export result if needed
        }
        .fileImporter(
            isPresented: $isImporting,
            allowedContentTypes: [.commaSeparatedText],
            allowsMultipleSelection: false
        ) { result in
            handleCSVImport(result)
        }
        .alert(
            "Delete \(pendingDeleteCount) Stamps?",
            isPresented: $showBulkDeleteConfirmation
        ) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                bulkDelete(stampsByID: Dictionary(uniqueKeysWithValues: filteredStamps.map { ($0.persistentModelID, $0) }))
            }
        } message: {
            Text("This will permanently delete \(pendingDeleteCount) stamps. This cannot be undone.")
        }
        .confirmationDialog(
            "Import Options",
            isPresented: $showImportOptionsDialog,
            titleVisibility: .visible
        ) {
            Button("Skip duplicates") {
                if let url = pendingImportURL, let album = currentAlbum {
                    importCSV(from: url, into: album, duplicateAction: .skip)
                    pendingImportURL = nil
                }
            }
            Button("Update existing") {
                if let url = pendingImportURL, let album = currentAlbum {
                    importCSV(from: url, into: album, duplicateAction: .update)
                    pendingImportURL = nil
                }
            }
            Button("Create duplicates") {
                if let url = pendingImportURL, let album = currentAlbum {
                    importCSV(from: url, into: album, duplicateAction: .createNew)
                    pendingImportURL = nil
                }
            }
            Button("Cancel", role: .cancel) {
                pendingImportURL = nil
            }
        } message: {
            Text("How should duplicate catalog numbers be handled?")
        }
        .onChange(of: sidebarSelection) { _, _ in
            // Clear checked stamps when switching views to avoid stale references
            checkedManager.clear()
        }
        .onReceive(NotificationCenter.default.publisher(for: .exportCSV)) { _ in
            if !filteredStamps.isEmpty {
                isExporting = true
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .importCSV)) { _ in
            if currentAlbum != nil {
                isImporting = true
            }
        }
    }

    private var exportFilename: String {
        let base = navigationTitle.replacingOccurrences(of: " ", with: "_")
        return "\(base)_stamps"
    }

    private func handleCSVImport(_ result: Result<[URL], Error>) {
        guard currentAlbum != nil else {
            print("CSV Import: No album selected")
            return
        }
        switch result {
        case .success(let urls):
            guard let url = urls.first else {
                print("CSV Import: No URL provided")
                return
            }
            // Store URL and show options dialog
            pendingImportURL = url
            showImportOptionsDialog = true
        case .failure(let error):
            print("CSV Import error: \(error)")
        }
    }

    private func importCSV(from url: URL, into album: Album, duplicateAction: ImportDuplicateAction) {
        // Handle security-scoped resource access
        let hasAccess = url.startAccessingSecurityScopedResource()
        defer {
            if hasAccess {
                url.stopAccessingSecurityScopedResource()
            }
        }

        guard let content = try? String(contentsOf: url, encoding: .utf8) else {
            print("CSV Import: Failed to read file at \(url)")
            return
        }
        let lines = content.components(separatedBy: .newlines)
        guard lines.count > 1 else {
            print("CSV Import: File has no data rows")
            return
        }

        // Parse header to find column indices
        let header = parseCSVLine(lines[0])
        let catalogIdx = header.firstIndex(of: "Catalog Number") ?? header.firstIndex(of: "catalogNumber")
        let yearIdx = header.firstIndex(of: "Year") ?? header.firstIndex(of: "yearOfIssue")
        let denomIdx = header.firstIndex(of: "Denomination") ?? header.firstIndex(of: "denomination")
        let colorIdx = header.firstIndex(of: "Color") ?? header.firstIndex(of: "color")
        let statusIdx = header.firstIndex(of: "Status") ?? header.firstIndex(of: "collectionStatus")
        let gumIdx = header.firstIndex(of: "Gum Condition") ?? header.firstIndex(of: "gumCondition")
        let gradeIdx = header.firstIndex(of: "Centering Grade") ?? header.firstIndex(of: "centeringGrade")
        let notesIdx = header.firstIndex(of: "Notes") ?? header.firstIndex(of: "notes")

        guard catalogIdx != nil else {
            print("CSV Import: No 'Catalog Number' column found. Headers: \(header)")
            return
        }

        // Build a lookup of existing catalog numbers in this album for duplicate detection
        let existingStamps = album.stamps ?? []
        let existingByNumber = Dictionary(grouping: existingStamps) { $0.catalogNumber }

        var importedCount = 0
        var skippedCount = 0
        var updatedCount = 0

        for i in 1..<lines.count {
            let line = lines[i].trimmingCharacters(in: .whitespaces)
            guard !line.isEmpty else { continue }
            let fields = parseCSVLine(line)

            let catalogNumber = catalogIdx.flatMap { $0 < fields.count ? fields[$0] : nil } ?? ""
            guard !catalogNumber.isEmpty else { continue }

            // Parse status - handle TRUE/FALSE as well as raw enum values
            let statusValue = statusIdx.flatMap { $0 < fields.count ? fields[$0] : nil } ?? ""
            let status: CollectionStatus
            switch statusValue.uppercased() {
            case "TRUE", "YES", "1", "OWNED":
                status = .owned
            case "FALSE", "NO", "0", "WANTED":
                status = .wanted
            case "NOTCOLLECTING", "SKIP":
                status = .notCollecting
            default:
                status = CollectionStatus(rawValue: statusValue) ?? .wanted
            }

            // Parse field values
            let yearValue = yearIdx.flatMap { $0 < fields.count ? fields[$0] : nil } ?? ""
            let (yearStart, yearEnd) = parseYearRange(yearValue)
            let denomination = denomIdx.flatMap { $0 < fields.count ? fields[$0] : nil } ?? ""
            let color = colorIdx.flatMap { $0 < fields.count ? fields[$0] : nil } ?? ""
            let gumCondition = gumIdx.flatMap { $0 < fields.count ? GumCondition(rawValue: fields[$0]) : nil } ?? .unspecified
            let centeringGrade = gradeIdx.flatMap { $0 < fields.count ? CenteringGrade(rawValue: fields[$0]) : nil } ?? .unspecified
            let notes = notesIdx.flatMap { $0 < fields.count ? fields[$0] : nil } ?? ""

            // Check for existing stamp with same catalog number
            if let existingList = existingByNumber[catalogNumber], let existing = existingList.first {
                switch duplicateAction {
                case .skip:
                    skippedCount += 1
                    continue
                case .update:
                    // Update existing stamp with imported values
                    existing.yearStart = yearStart
                    existing.yearEnd = yearEnd
                    existing.denomination = denomination
                    existing.color = color
                    existing.gumCondition = gumCondition
                    existing.centeringGrade = centeringGrade
                    existing.collectionStatus = status
                    existing.notes = notes
                    updatedCount += 1
                    continue
                case .createNew:
                    // Fall through to create new stamp
                    break
                }
            }

            let stamp = Stamp(
                catalogNumber: catalogNumber,
                yearStart: yearStart,
                yearEnd: yearEnd,
                denomination: denomination,
                color: color,
                gumCondition: gumCondition,
                centeringGrade: centeringGrade,
                collectionStatus: status,
                notes: notes,
                album: album
            )
            modelContext.insert(stamp)

            // Explicitly update the relationship to trigger UI update
            if album.stamps == nil {
                album.stamps = [stamp]
            } else {
                album.stamps?.append(stamp)
            }
            importedCount += 1
        }
        print("CSV Import: \(importedCount) imported, \(updatedCount) updated, \(skippedCount) skipped")
        // Reset selection to avoid stale state
        selectedStamp = nil
    }

    private func parseCSVLine(_ line: String) -> [String] {
        var fields: [String] = []
        var current = ""
        var inQuotes = false

        for char in line {
            if char == "\"" {
                inQuotes.toggle()
            } else if char == "," && !inQuotes {
                fields.append(current.trimmingCharacters(in: .whitespaces))
                current = ""
            } else {
                current.append(char)
            }
        }
        fields.append(current.trimmingCharacters(in: .whitespaces))
        return fields
    }

    private func parseYearRange(_ value: String) -> (Int?, Int?) {
        let trimmed = value.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty {
            return (nil, nil)
        }
        if trimmed.contains("-") {
            let parts = trimmed.split(separator: "-")
            if parts.count == 2,
               let start = Int(parts[0].trimmingCharacters(in: .whitespaces)),
               let end = Int(parts[1].trimmingCharacters(in: .whitespaces)) {
                return (start, end)
            } else if parts.count == 1, let start = Int(parts[0].trimmingCharacters(in: .whitespaces)) {
                return (start, nil)
            }
        }
        if let year = Int(trimmed) {
            return (year, nil)
        }
        return (nil, nil)
    }

    // MARK: - Filter Bar

    private var filterBar: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top) {
                Image(systemName: "line.3.horizontal.decrease.circle")
                    .foregroundStyle(.secondary)
                    .padding(.top, 5)

                FlowLayout(spacing: 8) {
                    if showCountryColumn {
                        Picker("Country", selection: $filterState.countryID) {
                            Text("Any Country").tag(nil as PersistentIdentifier?)
                            Divider()
                            ForEach(countries.sorted(by: { $0.name < $1.name })) { country in
                                Text(country.name).tag(country.persistentModelID as PersistentIdentifier?)
                            }
                        }
                        .fixedSize()
                    }

                    Picker("Gum", selection: $filterState.gumCondition) {
                        Text("Any Gum").tag(nil as GumCondition?)
                        Divider()
                        ForEach(GumCondition.allCases) { condition in
                            Text(condition.displayName).tag(condition as GumCondition?)
                        }
                    }
                    .fixedSize()

                    Picker("Grade", selection: $filterState.centeringGrade) {
                        Text("Any Grade").tag(nil as CenteringGrade?)
                        Divider()
                        ForEach(CenteringGrade.allCases) { grade in
                            Text(grade.displayName).tag(grade as CenteringGrade?)
                        }
                    }
                    .fixedSize()

                    Picker("Status", selection: $filterState.collectionStatus) {
                        Text("Any Status").tag(nil as CollectionStatus?)
                        Divider()
                        ForEach(CollectionStatus.allCases) { status in
                            Text(status.displayName).tag(status as CollectionStatus?)
                        }
                    }
                    .fixedSize()

                    HStack(spacing: 4) {
                        Text("Year:")
                            .foregroundStyle(.secondary)
                        TextField("From", value: $filterState.yearStart, format: .number)
                            .frame(width: 55)
                            .textFieldStyle(.roundedBorder)
                        Text("–")
                            .foregroundStyle(.secondary)
                        TextField("To", value: $filterState.yearEnd, format: .number)
                            .frame(width: 55)
                            .textFieldStyle(.roundedBorder)
                    }

                    HStack(spacing: 4) {
                        Text("Cat#:")
                            .foregroundStyle(.secondary)
                        TextField("From", text: $filterState.catalogStart)
                            .frame(width: 55)
                            .textFieldStyle(.roundedBorder)
                        Text("–")
                            .foregroundStyle(.secondary)
                        TextField("To", text: $filterState.catalogEnd)
                            .frame(width: 55)
                            .textFieldStyle(.roundedBorder)
                    }
                }

                Spacer(minLength: 8)

                Button("Clear") {
                    filterState.clearFilters()
                }
                .buttonStyle(.borderless)
                .disabled(!filterState.hasActiveFilters)
                .padding(.top, 3)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)

            Divider()
        }
        .background(.bar)
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .navigation) {
            Button {
                showingGapAnalysis = true
            } label: {
                Label("Gap Analysis", systemImage: "chart.bar.doc.horizontal")
            }
            .help("Analyze collection gaps by country and year range")
        }

        ToolbarItemGroup(placement: .primaryAction) {
            Menu {
                Button {
                    isImporting = true
                } label: {
                    Label("Import CSV...", systemImage: "square.and.arrow.down")
                }
                .disabled(currentAlbum == nil)

                Button {
                    isExporting = true
                } label: {
                    Label("Export CSV...", systemImage: "square.and.arrow.up")
                }
                .disabled(filteredStamps.isEmpty)

                Divider()

                Button {
                    isPopulatingRange = true
                } label: {
                    Label("Populate Number Range...", systemImage: "number.square")
                }
                .disabled(currentAlbum == nil)
            } label: {
                Label("More", systemImage: "ellipsis.circle")
            }
            .help("Import, export, and other options")

            Toggle(isOn: $quickAddMode) {
                Label("Quick Add", systemImage: "bolt.fill")
            }
            .help("Quick Add Mode: simplified form for fast batch entry")

            Button {
                isAddingStamp = true
            } label: {
                Label("Add Stamp", systemImage: "plus")
            }
            .disabled(currentAlbum == nil)
            .help("Add a new stamp to this album")
        }
    }

    // MARK: - Helpers

    private var navigationTitle: String {
        switch sidebarSelection {
        case .smartCollection(let type):
            return type.displayName
        case .album(let albumID):
            return albums.first { $0.persistentModelID == albumID }?.name ?? "Album"
        case .collection(let collectionID):
            return albums.first { $0.collection?.persistentModelID == collectionID }?.collection?.name ?? "Collection"
        case .none:
            return "Stamps"
        }
    }

    private var currentAlbum: Album? {
        switch sidebarSelection {
        case .album(let albumID):
            return albums.first { $0.persistentModelID == albumID }
        default:
            return nil
        }
    }
}

// MARK: - Filter State

@Observable
final class StampFilterState {
    var searchText: String = ""
    var gumCondition: GumCondition?
    var centeringGrade: CenteringGrade?
    var countryID: PersistentIdentifier?
    var collectionStatus: CollectionStatus?
    var yearStart: Int?
    var yearEnd: Int?
    var catalogStart: String = ""
    var catalogEnd: String = ""

    var hasActiveFilters: Bool {
        gumCondition != nil ||
        centeringGrade != nil ||
        countryID != nil ||
        collectionStatus != nil ||
        yearStart != nil ||
        yearEnd != nil ||
        !catalogStart.isEmpty ||
        !catalogEnd.isEmpty
    }

    func clearFilters() {
        gumCondition = nil
        centeringGrade = nil
        countryID = nil
        collectionStatus = nil
        yearStart = nil
        yearEnd = nil
        catalogStart = ""
        catalogEnd = ""
    }

    /// Parses a catalog number into components for range comparison
    func parseCatalogNumber(_ value: String) -> (prefix: String, number: Int, suffix: String) {
        var prefix = ""
        var numberStr = ""
        var suffix = ""
        var foundNumber = false

        for char in value {
            if char.isNumber {
                foundNumber = true
                numberStr.append(char)
            } else if !foundNumber {
                prefix.append(char)
            } else {
                suffix.append(char)
            }
        }

        let number = Int(numberStr) ?? 0
        return (prefix.uppercased(), number, suffix.lowercased())
    }

    /// Checks if a catalog number falls within the specified range
    func catalogNumberInRange(_ catalogNumber: String) -> Bool {
        // If no range specified, include everything
        if catalogStart.isEmpty && catalogEnd.isEmpty {
            return true
        }

        let parsed = parseCatalogNumber(catalogNumber)

        // Check start bound
        if !catalogStart.isEmpty {
            let startParsed = parseCatalogNumber(catalogStart)
            // Must match prefix
            if parsed.prefix != startParsed.prefix {
                return parsed.prefix > startParsed.prefix
            }
            if parsed.number < startParsed.number {
                return false
            }
        }

        // Check end bound
        if !catalogEnd.isEmpty {
            let endParsed = parseCatalogNumber(catalogEnd)
            // Must match prefix
            if parsed.prefix != endParsed.prefix {
                return parsed.prefix < endParsed.prefix
            }
            if parsed.number > endParsed.number {
                return false
            }
        }

        return true
    }
}

// MARK: - Populate Range Sheet

struct PopulateRangeSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let album: Album

    @State private var prefix = ""
    @State private var startNumber = ""
    @State private var endNumber = ""
    @State private var defaultStatus: CollectionStatus = .wanted

    private var isValid: Bool {
        guard let start = Int(startNumber), let end = Int(endNumber) else {
            return false
        }
        return start > 0 && end >= start && (end - start) <= 5000
    }

    private var rangeDescription: String {
        guard let start = Int(startNumber), let end = Int(endNumber), start > 0, end >= start else {
            return ""
        }
        let count = end - start + 1
        let firstNum = prefix.isEmpty ? "\(start)" : "\(prefix)\(start)"
        let lastNum = prefix.isEmpty ? "\(end)" : "\(prefix)\(end)"
        return "This will create \(count) entries: \(firstNum) through \(lastNum)"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Create placeholder entries for a range of catalog numbers. This is useful for setting up a want list without entering individual stamps manually.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }

                Section {
                    TextField("Prefix (optional)", text: $prefix)
                        .textFieldStyle(.roundedBorder)

                    HStack {
                        TextField("Start", text: $startNumber)
                            .textFieldStyle(.roundedBorder)
                        Text("to")
                        TextField("End", text: $endNumber)
                            .textFieldStyle(.roundedBorder)
                    }
                } header: {
                    Text("Catalog Number Format")
                } footer: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Examples:")
                            .fontWeight(.medium)
                        Text("• Regular stamps: leave prefix empty, enter 1 to 500")
                        Text("• Airmail: prefix \"C\", enter 1 to 150")
                        Text("• Officials: prefix \"O\", enter 1 to 50")
                        Text("• Semi-postals: prefix \"B\", enter 1 to 100")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Section("Default Status") {
                    Picker("Status for new entries", selection: $defaultStatus) {
                        ForEach(CollectionStatus.allCases) { status in
                            Text(status.displayName).tag(status)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                if !rangeDescription.isEmpty {
                    Section {
                        Text(rangeDescription)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .formStyle(.grouped)
            .navigationTitle("Populate Number Range")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        createEntries()
                        dismiss()
                    }
                    .disabled(!isValid)
                }
            }
        }
        .frame(minWidth: 450, minHeight: 450)
    }

    private func createEntries() {
        guard let start = Int(startNumber), let end = Int(endNumber) else { return }

        for number in start...end {
            let catalogNumber = prefix.isEmpty ? "\(number)" : "\(prefix)\(number)"
            let stamp = Stamp(
                catalogNumber: catalogNumber,
                collectionStatus: defaultStatus,
                album: album
            )
            modelContext.insert(stamp)
        }
    }
}

// MARK: - CSV Document

import UniformTypeIdentifiers

struct StampCSVDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.commaSeparatedText] }

    let stamps: [Stamp]

    init(stamps: [Stamp]) {
        self.stamps = stamps
    }

    init(configuration: ReadConfiguration) throws {
        stamps = []
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        let csv = generateCSV()
        let data = csv.data(using: .utf8) ?? Data()
        return FileWrapper(regularFileWithContents: data)
    }

    private func generateCSV() -> String {
        var lines: [String] = []

        // Header
        lines.append("Catalog Number,Country,Year,Denomination,Color,Gum Condition,Centering Grade,Status,Notes")

        // Data rows
        for stamp in stamps {
            let fields = [
                escapeCSV(stamp.catalogNumber),
                escapeCSV(stamp.collectionCountry?.name ?? ""),
                stamp.displayYear,
                escapeCSV(stamp.denomination),
                escapeCSV(stamp.color),
                stamp.gumCondition.rawValue,
                stamp.centeringGrade.rawValue,
                stamp.collectionStatus.rawValue,
                escapeCSV(stamp.notes)
            ]
            lines.append(fields.joined(separator: ","))
        }

        return lines.joined(separator: "\n")
    }

    private func escapeCSV(_ value: String) -> String {
        if value.contains(",") || value.contains("\"") || value.contains("\n") {
            return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
        }
        return value
    }
}

// MARK: - Natural Catalog Number Comparator

/// Compares catalog numbers naturally, handling prefixes like "C", "O", "B" and numeric sorting
struct NaturalCatalogComparator: SortComparator {
    var order: SortOrder = .forward

    func compare(_ lhs: String, _ rhs: String) -> ComparisonResult {
        let lhsParsed = parseCatalogNumber(lhs)
        let rhsParsed = parseCatalogNumber(rhs)

        // Compare prefix first (alphabetically)
        let prefixComparison = lhsParsed.prefix.localizedCompare(rhsParsed.prefix)
        if prefixComparison != .orderedSame {
            return order == .forward ? prefixComparison : prefixComparison.inverted
        }

        // Compare numeric part
        if lhsParsed.number != rhsParsed.number {
            let result: ComparisonResult = lhsParsed.number < rhsParsed.number ? .orderedAscending : .orderedDescending
            return order == .forward ? result : result.inverted
        }

        // Compare suffix (alphabetically)
        let suffixComparison = lhsParsed.suffix.localizedCompare(rhsParsed.suffix)
        return order == .forward ? suffixComparison : suffixComparison.inverted
    }

    private func parseCatalogNumber(_ value: String) -> (prefix: String, number: Int, suffix: String) {
        var prefix = ""
        var numberStr = ""
        var suffix = ""
        var foundNumber = false

        for char in value {
            if char.isNumber {
                foundNumber = true
                numberStr.append(char)
            } else if !foundNumber {
                prefix.append(char)
            } else {
                suffix.append(char)
            }
        }

        let number = Int(numberStr) ?? 0
        return (prefix.uppercased(), number, suffix.lowercased())
    }
}

extension ComparisonResult {
    var inverted: ComparisonResult {
        switch self {
        case .orderedAscending: return .orderedDescending
        case .orderedDescending: return .orderedAscending
        case .orderedSame: return .orderedSame
        }
    }
}

#Preview {
    StampListView(
        filterState: StampFilterState(),
        sidebarSelection: nil,
        selectedStamp: .constant(nil),
        showingGapAnalysis: .constant(false)
    )
    .modelContainer(for: Stamp.self, inMemory: true)
}
