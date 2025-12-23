import SwiftUI
import SwiftData

struct CountryManagementView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Country.name) private var countries: [Country]

    @State private var selectedCountry: Country?
    @State private var isAddingCountry = false

    var body: some View {
        NavigationSplitView {
            List(selection: $selectedCountry) {
                ForEach(countries) { country in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(country.name)
                            .fontWeight(.medium)
                        Text("\(country.catalogPrefixes.count) catalog prefixes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .tag(country)
                }
                .onDelete(perform: deleteCountries)
            }
            .listStyle(.inset)
            .navigationTitle("Countries")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isAddingCountry = true
                    } label: {
                        Label("Add Country", systemImage: "plus")
                    }
                }
            }
        } detail: {
            if let country = selectedCountry {
                CountryDetailView(country: country)
            } else {
                ContentUnavailableView(
                    "No Country Selected",
                    systemImage: "globe",
                    description: Text("Select a country to view and edit its details.")
                )
            }
        }
        .sheet(isPresented: $isAddingCountry) {
            AddCountrySheet()
        }
        .frame(minWidth: 700, minHeight: 450)
    }

    private func deleteCountries(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(countries[index])
        }
    }
}

// MARK: - Country Detail View

struct CountryDetailView: View {
    @Bindable var country: Country

    var body: some View {
        Form {
            Section("Country Name") {
                TextField("Name", text: $country.name)
            }

            Section("Catalog Prefixes") {
                ForEach(CatalogSystem.allCases) { system in
                    HStack {
                        Text(system.displayName)
                            .frame(width: 150, alignment: .leading)
                        TextField(
                            "Prefix for \(system.displayName)",
                            text: Binding(
                                get: { country.prefix(for: system) ?? "" },
                                set: { country.setPrefix($0.isEmpty ? nil : $0, for: system) }
                            )
                        )
                        .textFieldStyle(.roundedBorder)
                    }
                }
            }
        }
        .formStyle(.grouped)
        .navigationTitle(country.name)
    }
}

// MARK: - Add Country Sheet

struct AddCountrySheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var prefixes: [CatalogSystem: String] = [:]

    var body: some View {
        NavigationStack {
            Form {
                Section("Country Name") {
                    TextField("Name", text: $name)
                }

                Section("Catalog Prefixes (Optional)") {
                    ForEach(CatalogSystem.allCases) { system in
                        HStack {
                            Text(system.displayName)
                                .frame(width: 150, alignment: .leading)
                            TextField(
                                "e.g., \(system.prefix)",
                                text: Binding(
                                    get: { prefixes[system] ?? "" },
                                    set: { prefixes[system] = $0.isEmpty ? nil : $0 }
                                )
                            )
                            .textFieldStyle(.roundedBorder)
                        }
                    }
                }
            }
            .formStyle(.grouped)
            .navigationTitle("Add Country")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        addCountry()
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
        .frame(minWidth: 450, minHeight: 400)
    }

    private func addCountry() {
        let prefixDict = Dictionary(
            uniqueKeysWithValues: prefixes.compactMap { key, value in
                value.isEmpty ? nil : (key.rawValue, value)
            }
        )
        let country = Country(name: name, catalogPrefixes: prefixDict)
        modelContext.insert(country)
    }
}

#Preview {
    CountryManagementView()
        .modelContainer(for: Country.self, inMemory: true)
}
