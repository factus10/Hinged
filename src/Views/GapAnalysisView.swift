import SwiftUI
import SwiftData

struct GapAnalysisView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \Country.name) private var countries: [Country]
    @Query private var allStamps: [Stamp]

    @State private var selectedCountry: Country?
    @State private var startYear: Int = 1900
    @State private var endYear: Int = Calendar.current.component(.year, from: Date())
    @State private var showOnlyWanted: Bool = true
    @State private var hasSearched: Bool = false

    private var analysisResults: GapAnalysisResults {
        guard let country = selectedCountry else {
            return GapAnalysisResults.empty
        }

        let countryStamps = allStamps.filter { stamp in
            stamp.collectionCountry?.persistentModelID == country.persistentModelID &&
            (stamp.yearStart ?? 0) >= startYear &&
            (stamp.yearStart ?? Int.max) <= endYear
        }

        let ownedStamps = countryStamps.filter { $0.collectionStatus == .owned }
        let wantedStamps = countryStamps.filter { $0.collectionStatus == .wanted }

        // Analyze catalog number sequences to find potential gaps
        let ownedNumbers = Set(ownedStamps.compactMap { extractNumericPart($0.catalogNumber) })
        let wantedNumbers = Set(wantedStamps.compactMap { extractNumericPart($0.catalogNumber) })
        let allNumbers = ownedNumbers.union(wantedNumbers)

        var potentialGaps: [Int] = []
        if let minNum = allNumbers.min(), let maxNum = allNumbers.max(), maxNum - minNum < 1000 {
            for num in minNum...maxNum {
                if !allNumbers.contains(num) {
                    potentialGaps.append(num)
                }
            }
        }

        // Group wanted stamps by year
        let wantedByYear = Dictionary(grouping: wantedStamps) { $0.yearStart ?? 0 }
            .sorted { $0.key < $1.key }

        return GapAnalysisResults(
            country: country,
            startYear: startYear,
            endYear: endYear,
            totalOwned: ownedStamps.count,
            totalWanted: wantedStamps.count,
            wantedStamps: wantedStamps.sorted { ($0.yearStart ?? 0) < ($1.yearStart ?? 0) },
            ownedStamps: ownedStamps.sorted { ($0.yearStart ?? 0) < ($1.yearStart ?? 0) },
            wantedByYear: wantedByYear,
            potentialGaps: potentialGaps,
            completionPercentage: ownedStamps.isEmpty && wantedStamps.isEmpty ? 0 :
                Double(ownedStamps.count) / Double(ownedStamps.count + wantedStamps.count) * 100
        )
    }

    var body: some View {
        NavigationStack {
            HSplitView {
                queryPanel
                    .frame(minWidth: 280, maxWidth: 320)

                resultsPanel
                    .frame(minWidth: 500)
            }
            .navigationTitle("Gap Analysis")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .frame(minWidth: 900, minHeight: 600)
    }

    // MARK: - Query Panel

    private var queryPanel: some View {
        VStack(spacing: 0) {
            Form {
                Section("Country") {
                    Picker("Select Country", selection: $selectedCountry) {
                        Text("Choose a country...").tag(nil as Country?)
                        Divider()
                        ForEach(countries) { country in
                            Text(country.name).tag(country as Country?)
                        }
                    }
                    .labelsHidden()
                }

                Section("Year Range") {
                    Stepper(value: $startYear, in: 1840...endYear) {
                        HStack {
                            Text("From:")
                            Spacer()
                            Text(String(startYear))
                                .monospacedDigit()
                        }
                    }

                    Stepper(value: $endYear, in: startYear...Calendar.current.component(.year, from: Date())) {
                        HStack {
                            Text("To:")
                            Spacer()
                            Text(String(endYear))
                                .monospacedDigit()
                        }
                    }

                    yearRangePresets
                }

                Section("Options") {
                    Toggle("Show only wanted stamps", isOn: $showOnlyWanted)
                }

                Section {
                    Button {
                        hasSearched = true
                    } label: {
                        Label("Analyze Collection", systemImage: "magnifyingglass.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(selectedCountry == nil)
                }

                if hasSearched && selectedCountry != nil {
                    summarySection
                }
            }
            .formStyle(.grouped)

            Spacer()
        }
    }

    private var yearRangePresets: some View {
        HStack {
            Button("Classic") {
                startYear = 1840
                endYear = 1940
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            Button("Modern") {
                startYear = 1941
                endYear = 2000
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            Button("Recent") {
                startYear = 2001
                endYear = Calendar.current.component(.year, from: Date())
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
    }

    private var summarySection: some View {
        Section("Summary") {
            LabeledContent("Owned") {
                Text("\(analysisResults.totalOwned)")
                    .foregroundStyle(.green)
                    .fontWeight(.semibold)
            }

            LabeledContent("Wanted") {
                Text("\(analysisResults.totalWanted)")
                    .foregroundStyle(.orange)
                    .fontWeight(.semibold)
            }

            LabeledContent("Completion") {
                Text(String(format: "%.1f%%", analysisResults.completionPercentage))
                    .fontWeight(.semibold)
            }

            if !analysisResults.potentialGaps.isEmpty {
                LabeledContent("Potential Gaps") {
                    Text("\(analysisResults.potentialGaps.count)")
                        .foregroundStyle(.red)
                        .fontWeight(.semibold)
                }
            }

            completionBar
        }
    }

    private var completionBar: some View {
        VStack(alignment: .leading, spacing: 4) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(.secondary.opacity(0.2))

                    RoundedRectangle(cornerRadius: 4)
                        .fill(.green)
                        .frame(width: geometry.size.width * analysisResults.completionPercentage / 100)
                }
            }
            .frame(height: 8)
        }
    }

    // MARK: - Results Panel

    private var resultsPanel: some View {
        Group {
            if !hasSearched {
                ContentUnavailableView(
                    "Select Analysis Criteria",
                    systemImage: "doc.text.magnifyingglass",
                    description: Text("Choose a country and year range, then click Analyze Collection.")
                )
            } else if selectedCountry == nil {
                ContentUnavailableView(
                    "No Country Selected",
                    systemImage: "globe",
                    description: Text("Please select a country to analyze.")
                )
            } else if analysisResults.totalOwned == 0 && analysisResults.totalWanted == 0 {
                ContentUnavailableView(
                    "No Stamps Found",
                    systemImage: "tray",
                    description: Text("No stamps from \(selectedCountry?.name ?? "this country") in the selected year range.")
                )
            } else {
                resultsList
            }
        }
    }

    private var resultsList: some View {
        List {
            if !analysisResults.potentialGaps.isEmpty {
                gapsSection
            }

            if showOnlyWanted {
                wantedStampsSection
            } else {
                allStampsSection
            }
        }
        .listStyle(.inset)
    }

    private var gapsSection: some View {
        Section {
            DisclosureGroup {
                let displayedGaps = analysisResults.potentialGaps.prefix(50)
                let gapRanges = compressGapsToRanges(Array(displayedGaps))

                ForEach(gapRanges, id: \.self) { range in
                    HStack {
                        Image(systemName: "questionmark.circle")
                            .foregroundStyle(.orange)
                        Text(range)
                            .font(.system(.body, design: .monospaced))
                        Spacer()
                        Button("Add to Want List") {
                            // Will be implemented in next iteration
                        }
                        .buttonStyle(.borderless)
                        .font(.caption)
                    }
                }

                if analysisResults.potentialGaps.count > 50 {
                    Text("...and \(analysisResults.potentialGaps.count - 50) more potential gaps")
                        .foregroundStyle(.secondary)
                        .italic()
                }
            } label: {
                Label {
                    Text("Potential Catalog Number Gaps (\(analysisResults.potentialGaps.count))")
                } icon: {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                }
            }
        } header: {
            Text("Missing Numbers")
        } footer: {
            Text("These catalog numbers fall between your lowest and highest entries but aren't in your collection.")
        }
    }

    private var wantedStampsSection: some View {
        ForEach(analysisResults.wantedByYear, id: \.key) { year, stamps in
            Section(year == 0 ? "Unknown Year" : String(year)) {
                ForEach(stamps) { stamp in
                    GapAnalysisStampRow(stamp: stamp, showStatus: false)
                }
            }
        }
    }

    private var allStampsSection: some View {
        Group {
            if !analysisResults.wantedStamps.isEmpty {
                Section("Wanted (\(analysisResults.totalWanted))") {
                    ForEach(analysisResults.wantedStamps) { stamp in
                        GapAnalysisStampRow(stamp: stamp, showStatus: true)
                    }
                }
            }

            if !analysisResults.ownedStamps.isEmpty {
                Section("Owned (\(analysisResults.totalOwned))") {
                    ForEach(analysisResults.ownedStamps) { stamp in
                        GapAnalysisStampRow(stamp: stamp, showStatus: true)
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private func extractNumericPart(_ catalogNumber: String) -> Int? {
        let digits = catalogNumber.filter { $0.isNumber }
        return Int(digits)
    }

    private func compressGapsToRanges(_ gaps: [Int]) -> [String] {
        guard !gaps.isEmpty else { return [] }

        var ranges: [String] = []
        var rangeStart = gaps[0]
        var rangeEnd = gaps[0]

        for i in 1..<gaps.count {
            if gaps[i] == rangeEnd + 1 {
                rangeEnd = gaps[i]
            } else {
                if rangeStart == rangeEnd {
                    ranges.append("#\(rangeStart)")
                } else {
                    ranges.append("#\(rangeStart)-\(rangeEnd)")
                }
                rangeStart = gaps[i]
                rangeEnd = gaps[i]
            }
        }

        // Add the last range
        if rangeStart == rangeEnd {
            ranges.append("#\(rangeStart)")
        } else {
            ranges.append("#\(rangeStart)-\(rangeEnd)")
        }

        return ranges
    }
}

// MARK: - Gap Analysis Results

struct GapAnalysisResults {
    let country: Country?
    let startYear: Int
    let endYear: Int
    let totalOwned: Int
    let totalWanted: Int
    let wantedStamps: [Stamp]
    let ownedStamps: [Stamp]
    let wantedByYear: [(key: Int, value: [Stamp])]
    let potentialGaps: [Int]
    let completionPercentage: Double

    static var empty: GapAnalysisResults {
        GapAnalysisResults(
            country: nil,
            startYear: 0,
            endYear: 0,
            totalOwned: 0,
            totalWanted: 0,
            wantedStamps: [],
            ownedStamps: [],
            wantedByYear: [],
            potentialGaps: [],
            completionPercentage: 0
        )
    }
}

// MARK: - Stamp Row

struct GapAnalysisStampRow: View {
    let stamp: Stamp
    let showStatus: Bool

    var body: some View {
        HStack(spacing: 12) {
            if showStatus {
                Image(systemName: stamp.isOwned ? "checkmark.circle.fill" : "heart.fill")
                    .foregroundStyle(stamp.isOwned ? .green : .orange)
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(stamp.displayCatalogNumber)
                        .font(.system(.body, design: .monospaced))
                        .fontWeight(.medium)

                    if !stamp.displayYear.isEmpty {
                        Text("(\(stamp.displayYear))")
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(spacing: 8) {
                    if !stamp.denomination.isEmpty {
                        Text(stamp.denomination)
                    }
                    if !stamp.color.isEmpty {
                        Text(stamp.color)
                    }
                    Text(stamp.conditionShorthand)
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(.secondary.opacity(0.2))
                        .clipShape(Capsule())
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            if stamp.collectionStatus != .owned {
                Button {
                    stamp.collectionStatus = .owned
                } label: {
                    Label("Mark Owned", systemImage: "checkmark.circle")
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
        .padding(.vertical, 2)
    }
}

#Preview {
    GapAnalysisView()
        .modelContainer(for: [Stamp.self, Country.self], inMemory: true)
}
