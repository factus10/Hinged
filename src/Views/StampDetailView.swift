import SwiftUI
import SwiftData

struct StampDetailView: View {
    @Bindable var stamp: Stamp
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Country.name) private var countries: [Country]

    @State private var isEditingImage = false

    private var isWorldwideCollection: Bool {
        stamp.album?.collection?.isWorldwide ?? false
    }

    var body: some View {
        Form {
            imageSection
            identificationSection
            physicalCharacteristicsSection
            conditionSection
            acquisitionSection
            notesSection
        }
        .formStyle(.grouped)
        .navigationTitle("Stamp Details")
        .toolbar {
            ToolbarItem {
                Menu {
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
                } label: {
                    Label(stamp.collectionStatus.displayName, systemImage: stamp.collectionStatus.systemImage)
                }
            }
        }
    }

    // MARK: - Image Section

    private var imageSection: some View {
        Section {
            HStack {
                Spacer()
                stampImageView
                Spacer()
            }
        }
    }

    private var stampImageView: some View {
        Group {
            if let imageData = stamp.imageData,
               let nsImage = NSImage(data: imageData) {
                Image(nsImage: nsImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxHeight: 300)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(radius: 2)
                    .onTapGesture {
                        isEditingImage = true
                    }
            } else {
                Button {
                    isEditingImage = true
                } label: {
                    VStack(spacing: 12) {
                        Image(systemName: "photo.badge.plus")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("Add Image")
                            .font(.headline)
                    }
                    .frame(width: 200, height: 200)
                    .background(.quaternary)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
        }
        .fileImporter(
            isPresented: $isEditingImage,
            allowedContentTypes: [.image],
            allowsMultipleSelection: false
        ) { result in
            handleImageImport(result)
        }
        .contextMenu {
            if stamp.imageData != nil {
                Button("Replace Image...") {
                    isEditingImage = true
                }
                Button("Remove Image", role: .destructive) {
                    stamp.imageData = nil
                }
            }
        }
    }

    private func handleImageImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            if url.startAccessingSecurityScopedResource() {
                defer { url.stopAccessingSecurityScopedResource() }
                if let data = try? Data(contentsOf: url) {
                    stamp.imageData = data
                    stamp.markUpdated()
                }
            }
        case .failure(let error):
            print("Image import error: \(error)")
        }
    }

    // MARK: - Identification Section

    private var identificationSection: some View {
        Section("Identification") {
            LabeledContent(stamp.catalogSystem.catalogNumberLabel) {
                TextField("", text: $stamp.catalogNumber)
                    .textFieldStyle(EditableFieldStyle())
            }

            if isWorldwideCollection {
                Picker("Country", selection: $stamp.country) {
                    Text("Not Set").tag(nil as Country?)
                    Divider()
                    ForEach(countries) { country in
                        Text(country.name).tag(country as Country?)
                    }
                }
            } else {
                LabeledContent("Country", value: stamp.collectionCountry?.name ?? "—")
            }

            LabeledContent("Year of Issue") {
                TextField(
                    "",
                    value: $stamp.yearOfIssue,
                    format: .number.grouping(.never)
                )
                .textFieldStyle(EditableFieldStyle())
            }

            LabeledContent("Denomination") {
                TextField("", text: $stamp.denomination)
                    .textFieldStyle(EditableFieldStyle())
            }
        }
    }

    // MARK: - Physical Characteristics Section

    private var physicalCharacteristicsSection: some View {
        Section("Physical Characteristics") {
            LabeledContent("Color") {
                TextField("", text: $stamp.color)
                    .textFieldStyle(EditableFieldStyle())
            }

            LabeledContent("Perforation") {
                TextField(
                    "",
                    value: $stamp.perforationGauge,
                    format: .number.precision(.fractionLength(1))
                )
                .textFieldStyle(EditableFieldStyle())
            }

            LabeledContent("Watermark") {
                TextField("", text: Binding(
                    get: { stamp.watermark ?? "" },
                    set: { stamp.watermark = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(EditableFieldStyle())
            }
        }
    }

    // MARK: - Condition Section

    private var conditionSection: some View {
        Section("Condition") {
            Picker("Gum", selection: $stamp.gumCondition) {
                ForEach(GumCondition.allCases) { condition in
                    Text("\(condition.shorthand) - \(condition.displayName)")
                        .tag(condition)
                }
            }

            Picker("Centering", selection: $stamp.centeringGrade) {
                ForEach(CenteringGrade.allCases) { grade in
                    Text("\(grade.shorthand) - \(grade.displayName)")
                        .tag(grade)
                }
            }

            Picker("Status", selection: $stamp.collectionStatus) {
                ForEach(CollectionStatus.allCases) { status in
                    Text(status.displayName).tag(status)
                }
            }
        }
    }

    // MARK: - Acquisition Section

    private var acquisitionSection: some View {
        Section("Acquisition") {
            LabeledContent("Price") {
                TextField(
                    "",
                    value: $stamp.purchasePrice,
                    format: .currency(code: Locale.current.currency?.identifier ?? "USD")
                )
                .textFieldStyle(EditableFieldStyle())
            }

            HStack {
                Text("Date")
                Spacer()
                if let date = stamp.purchaseDate {
                    DatePicker(
                        "",
                        selection: Binding(
                            get: { date },
                            set: { stamp.purchaseDate = $0 }
                        ),
                        displayedComponents: .date
                    )
                    .labelsHidden()

                    Button {
                        stamp.purchaseDate = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                } else {
                    Button("Set Date") {
                        stamp.purchaseDate = Date()
                    }
                    .buttonStyle(.bordered)
                }
            }

            LabeledContent("Source") {
                TextField("", text: $stamp.acquisitionSource)
                    .textFieldStyle(EditableFieldStyle())
            }
        }
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        Section("Notes") {
            TextEditor(text: $stamp.notes)
                .frame(minHeight: 100)
        }
    }
}

// MARK: - Add Stamp Sheet

struct AddStampSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query private var albums: [Album]
    @Query(sort: \Country.name) private var countries: [Country]

    let preselectedAlbum: Album?
    let quickAddMode: Bool

    @State private var catalogNumber = ""
    @State private var yearOfIssue: Int?
    @State private var denomination = ""
    @State private var color = ""
    @State private var perforationGauge: Decimal?
    @State private var watermark = ""
    @State private var gumCondition: GumCondition = .unspecified
    @State private var centeringGrade: CenteringGrade = .unspecified
    @State private var collectionStatus: CollectionStatus?
    @State private var notes = ""
    @State private var purchasePrice: Decimal?
    @State private var purchaseDate: Date?
    @State private var acquisitionSource = ""
    @State private var selectedAlbum: Album?
    @State private var selectedCountry: Country?

    @FocusState private var catalogNumberFocused: Bool

    private var isWorldwideCollection: Bool {
        selectedAlbum?.collection?.isWorldwide ?? false
    }

    var body: some View {
        NavigationStack {
            Form {
                if quickAddMode {
                    quickAddForm
                } else {
                    fullForm
                }
            }
            .formStyle(.grouped)
            .navigationTitle(quickAddMode ? "Quick Add Stamp" : "Add Stamp")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if quickAddMode {
                        Button("Add & Next") {
                            addStamp()
                            resetForm()
                            catalogNumberFocused = true
                        }
                        .disabled(!canSave)
                    } else {
                        Button("Add") {
                            addStamp()
                            dismiss()
                        }
                        .disabled(!canSave)
                    }
                }
            }
            .onAppear {
                selectedAlbum = preselectedAlbum
                catalogNumberFocused = true
            }
        }
        .frame(minWidth: 500, minHeight: quickAddMode ? 300 : 600)
    }

    private var canSave: Bool {
        !catalogNumber.isEmpty && selectedAlbum != nil && collectionStatus != nil
    }

    // MARK: - Quick Add Form

    private var quickAddForm: some View {
        Group {
            Section("Essential Info") {
                TextField("Catalog Number", text: $catalogNumber)
                    .focused($catalogNumberFocused)

                if isWorldwideCollection {
                    Picker("Country", selection: $selectedCountry) {
                        Text("Not Set").tag(nil as Country?)
                        Divider()
                        ForEach(countries) { country in
                            Text(country.name).tag(country as Country?)
                        }
                    }
                } else {
                    LabeledContent("Country", value: selectedAlbum?.collection?.country?.name ?? "—")
                }

                TextField("Year", value: $yearOfIssue, format: .number.grouping(.never))

                HStack {
                    Picker("Gum", selection: $gumCondition) {
                        ForEach(GumCondition.allCases) { condition in
                            Text(condition.shorthand).tag(condition)
                        }
                    }
                    Picker("Grade", selection: $centeringGrade) {
                        ForEach(CenteringGrade.allCases) { grade in
                            Text(grade.shorthand).tag(grade)
                        }
                    }
                }

                Picker("Status", selection: $collectionStatus) {
                    Text("Select...").tag(nil as CollectionStatus?)
                    Divider()
                    ForEach(CollectionStatus.allCases) { status in
                        Text(status.displayName).tag(status as CollectionStatus?)
                    }
                }
            }

            Section {
                Picker("Album", selection: $selectedAlbum) {
                    Text("Select Album").tag(nil as Album?)
                    Divider()
                    ForEach(albums) { album in
                        Text("\(album.collection?.name ?? "") / \(album.name)").tag(album as Album?)
                    }
                }
            }
        }
    }

    // MARK: - Full Form

    private var fullForm: some View {
        Group {
            Section("Identification") {
                TextField("Catalog Number", text: $catalogNumber)
                    .focused($catalogNumberFocused)

                if isWorldwideCollection {
                    Picker("Country", selection: $selectedCountry) {
                        Text("Not Set").tag(nil as Country?)
                        Divider()
                        ForEach(countries) { country in
                            Text(country.name).tag(country as Country?)
                        }
                    }
                } else {
                    LabeledContent("Country", value: selectedAlbum?.collection?.country?.name ?? "—")
                }

                TextField("Year of Issue", value: $yearOfIssue, format: .number.grouping(.never))
                TextField("Denomination", text: $denomination)
            }

            Section("Physical Characteristics") {
                TextField("Color", text: $color)
                TextField("Perforation Gauge", value: $perforationGauge, format: .number.precision(.fractionLength(1)))
                TextField("Watermark", text: $watermark)
            }

            Section("Condition") {
                Picker("Gum Condition", selection: $gumCondition) {
                    ForEach(GumCondition.allCases) { condition in
                        Text("\(condition.shorthand) - \(condition.displayName)").tag(condition)
                    }
                }
                Picker("Centering Grade", selection: $centeringGrade) {
                    ForEach(CenteringGrade.allCases) { grade in
                        Text("\(grade.shorthand) - \(grade.displayName)").tag(grade)
                    }
                }
                Picker("Status", selection: $collectionStatus) {
                    Text("Select...").tag(nil as CollectionStatus?)
                    Divider()
                    ForEach(CollectionStatus.allCases) { status in
                        Text(status.displayName).tag(status as CollectionStatus?)
                    }
                }
            }

            Section("Acquisition") {
                TextField("Purchase Price", value: $purchasePrice, format: .currency(code: Locale.current.currency?.identifier ?? "USD"))

                HStack {
                    Text("Purchase Date")
                    Spacer()
                    if let date = purchaseDate {
                        DatePicker("", selection: Binding(
                            get: { date },
                            set: { purchaseDate = $0 }
                        ), displayedComponents: .date)
                        .labelsHidden()

                        Button {
                            purchaseDate = nil
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                    } else {
                        Button("Set Date") {
                            purchaseDate = Date()
                        }
                        .buttonStyle(.bordered)
                    }
                }

                TextField("Acquisition Source", text: $acquisitionSource)
            }

            Section("Notes") {
                TextEditor(text: $notes)
                    .frame(minHeight: 60)
            }

            Section {
                Picker("Album", selection: $selectedAlbum) {
                    Text("Select Album").tag(nil as Album?)
                    Divider()
                    ForEach(albums) { album in
                        Text("\(album.collection?.name ?? "") / \(album.name)").tag(album as Album?)
                    }
                }
            }
        }
    }

    // MARK: - Actions

    private func addStamp() {
        guard let collectionStatus = collectionStatus else { return }
        let stamp = Stamp(
            catalogNumber: catalogNumber,
            yearOfIssue: yearOfIssue,
            denomination: denomination,
            color: color,
            perforationGauge: perforationGauge,
            watermark: watermark.isEmpty ? nil : watermark,
            gumCondition: gumCondition,
            centeringGrade: centeringGrade,
            collectionStatus: collectionStatus,
            notes: notes,
            purchasePrice: purchasePrice,
            purchaseDate: purchaseDate,
            acquisitionSource: acquisitionSource,
            album: selectedAlbum
        )
        // For worldwide collections, set the stamp's individual country
        if isWorldwideCollection {
            stamp.country = selectedCountry
        }
        modelContext.insert(stamp)
    }

    private func resetForm() {
        catalogNumber = ""
        yearOfIssue = nil
        denomination = ""
        color = ""
        perforationGauge = nil
        watermark = ""
        notes = ""
        purchasePrice = nil
        purchaseDate = nil
        acquisitionSource = ""
        // Keep: album (which determines country), collectionStatus, condition defaults for batch entry
    }
}

// MARK: - Editable Field Style

struct EditableFieldStyle: TextFieldStyle {
    @FocusState private var isFocused: Bool

    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .textFieldStyle(.plain)
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(isFocused ? Color.accentColor.opacity(0.1) : Color.primary.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(isFocused ? Color.accentColor : Color.clear, lineWidth: 1)
            )
            .focused($isFocused)
    }
}

#Preview {
    AddStampSheet(preselectedAlbum: nil, quickAddMode: false)
        .modelContainer(for: Stamp.self, inMemory: true)
}
