import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Country.name) private var countries: [Country]
    @Query(sort: \CustomCatalog.sortOrder) private var customCatalogs: [CustomCatalog]

    private var settings = UserSettings.shared

    @State private var selectedTab = "defaults"

    var body: some View {
        TabView(selection: $selectedTab) {
            DefaultsSettingsTab(settings: settings, customCatalogs: customCatalogs)
                .tabItem {
                    Label("Defaults", systemImage: "slider.horizontal.3")
                }
                .tag("defaults")

            CatalogsSettingsTab(customCatalogs: customCatalogs)
                .tabItem {
                    Label("Catalogs", systemImage: "books.vertical")
                }
                .tag("catalogs")

            CountriesSettingsTab(countries: countries)
                .tabItem {
                    Label("Countries", systemImage: "globe")
                }
                .tag("countries")
        }
        .frame(width: 500, height: 400)
    }
}

// MARK: - Defaults Settings Tab

struct DefaultsSettingsTab: View {
    @Bindable var settings: UserSettings
    let customCatalogs: [CustomCatalog]

    var body: some View {
        Form {
            Section("New Collections") {
                Picker("Default Catalog System", selection: Binding(
                    get: { settings.defaultCatalogSystemRaw },
                    set: { settings.defaultCatalogSystemRaw = $0 }
                )) {
                    Section("Built-in") {
                        ForEach(CatalogSystem.allCases) { system in
                            Text(system.displayName).tag("builtin:\(system.rawValue)")
                        }
                    }
                    if !customCatalogs.isEmpty {
                        Section("Custom") {
                            ForEach(customCatalogs) { catalog in
                                Text(catalog.name).tag("custom:\(catalog.name)")
                            }
                        }
                    }
                }
            }

            Section("New Stamps") {
                Picker("Default Collection Status", selection: $settings.defaultCollectionStatus) {
                    ForEach(CollectionStatus.allCases) { status in
                        Text(status.displayName).tag(status)
                    }
                }

                Picker("Default Gum Condition", selection: Binding(
                    get: { settings.defaultGumCondition ?? .unspecified },
                    set: { settings.defaultGumCondition = $0 == .unspecified ? nil : $0 }
                )) {
                    Text("None (leave blank)").tag(GumCondition.unspecified)
                    Divider()
                    ForEach(GumCondition.allCases.filter { $0 != .unspecified }) { condition in
                        Text(condition.displayName).tag(condition)
                    }
                }

                Picker("Default Centering Grade", selection: Binding(
                    get: { settings.defaultCenteringGrade ?? .unspecified },
                    set: { settings.defaultCenteringGrade = $0 == .unspecified ? nil : $0 }
                )) {
                    Text("None (leave blank)").tag(CenteringGrade.unspecified)
                    Divider()
                    ForEach(CenteringGrade.allCases.filter { $0 != .unspecified }) { grade in
                        Text(grade.displayName).tag(grade)
                    }
                }
            }

            Section("Display") {
                HStack {
                    Text("Currency Symbol")
                    Spacer()
                    TextField("$", text: $settings.currencySymbol)
                        .frame(width: 60)
                        .textFieldStyle(.roundedBorder)
                        .multilineTextAlignment(.center)
                }
                Text("Used when displaying purchase prices")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

// MARK: - Catalogs Settings Tab

struct CatalogsSettingsTab: View {
    @Environment(\.modelContext) private var modelContext
    let customCatalogs: [CustomCatalog]

    @State private var isAddingCatalog = false
    @State private var catalogToEdit: CustomCatalog?

    var body: some View {
        VStack(spacing: 0) {
            // Built-in catalogs section
            Form {
                Section("Built-in Catalogs") {
                    ForEach(CatalogSystem.allCases.filter { $0 != .other }) { system in
                        HStack {
                            Text(system.displayName)
                            Spacer()
                            Text(system.prefix)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .formStyle(.grouped)

            Divider()

            // Custom catalogs section
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Custom Catalogs")
                        .font(.headline)
                    Spacer()
                    Button {
                        isAddingCatalog = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.borderless)
                }
                .padding(.horizontal)
                .padding(.top, 12)

                if customCatalogs.isEmpty {
                    ContentUnavailableView {
                        Label("No Custom Catalogs", systemImage: "book.closed")
                    } description: {
                        Text("Add custom catalogs for specialty collecting.")
                    }
                    .frame(maxHeight: .infinity)
                } else {
                    List {
                        ForEach(customCatalogs) { catalog in
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(catalog.name)
                                    Text("Prefix: \(catalog.prefix)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Button {
                                    catalogToEdit = catalog
                                } label: {
                                    Image(systemName: "pencil")
                                }
                                .buttonStyle(.borderless)
                            }
                        }
                        .onDelete(perform: deleteCatalogs)
                    }
                }
            }
        }
        .sheet(isPresented: $isAddingCatalog) {
            AddCustomCatalogSheet(sortOrder: customCatalogs.count)
        }
        .sheet(item: $catalogToEdit) { catalog in
            EditCustomCatalogSheet(catalog: catalog)
        }
    }

    private func deleteCatalogs(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(customCatalogs[index])
        }
    }
}

// MARK: - Countries Settings Tab

struct CountriesSettingsTab: View {
    @Environment(\.modelContext) private var modelContext
    let countries: [Country]

    @State private var isAddingCountry = false
    @State private var countryToEdit: Country?
    @State private var countryToDelete: Country?
    @State private var showDeleteConfirmation = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("\(countries.count) countries")
                    .foregroundStyle(.secondary)
                Spacer()
                Button {
                    isAddingCountry = true
                } label: {
                    Image(systemName: "plus")
                }
                .buttonStyle(.borderless)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)

            Divider()

            List {
                ForEach(countries) { country in
                    HStack {
                        Text(country.name)
                        Spacer()
                        if !country.catalogPrefixes.isEmpty {
                            Text("\(country.catalogPrefixes.count) prefix(es)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Button {
                            countryToEdit = country
                        } label: {
                            Image(systemName: "pencil")
                        }
                        .buttonStyle(.borderless)
                    }
                }
                .onDelete(perform: deleteCountries)
            }
        }
        .sheet(isPresented: $isAddingCountry) {
            SettingsAddCountrySheet()
        }
        .sheet(item: $countryToEdit) { country in
            SettingsEditCountrySheet(country: country)
        }
    }

    private func deleteCountries(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(countries[index])
        }
    }
}

// MARK: - Add Custom Catalog Sheet

struct AddCustomCatalogSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let sortOrder: Int

    @State private var name = ""
    @State private var prefix = ""
    @State private var catalogNumberLabel = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                TextField("Prefix (e.g., SC for Scott)", text: $prefix)
                TextField("Number Label (e.g., Scott #)", text: $catalogNumberLabel)
                    .onAppear {
                        if catalogNumberLabel.isEmpty && !name.isEmpty {
                            catalogNumberLabel = "\(name) #"
                        }
                    }
                    .onChange(of: name) { _, newValue in
                        if catalogNumberLabel.isEmpty || catalogNumberLabel == "\(name) #" {
                            catalogNumberLabel = "\(newValue) #"
                        }
                    }
            }
            .formStyle(.grouped)
            .navigationTitle("Add Custom Catalog")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let catalog = CustomCatalog(
                            name: name,
                            prefix: prefix,
                            catalogNumberLabel: catalogNumberLabel.isEmpty ? "\(name) #" : catalogNumberLabel,
                            sortOrder: sortOrder
                        )
                        modelContext.insert(catalog)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
        .frame(width: 400, height: 250)
    }
}

// MARK: - Edit Custom Catalog Sheet

struct EditCustomCatalogSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var catalog: CustomCatalog

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $catalog.name)
                TextField("Prefix", text: $catalog.prefix)
                TextField("Number Label", text: $catalog.catalogNumberLabel)
            }
            .formStyle(.grouped)
            .navigationTitle("Edit Catalog")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .frame(width: 400, height: 250)
    }
}

// MARK: - Settings Add Country Sheet

struct SettingsAddCountrySheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Country Name", text: $name)
            }
            .formStyle(.grouped)
            .navigationTitle("Add Country")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let country = Country(name: name)
                        modelContext.insert(country)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
        .frame(width: 350, height: 150)
    }
}

// MARK: - Settings Edit Country Sheet

struct SettingsEditCountrySheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var country: Country

    var body: some View {
        NavigationStack {
            Form {
                TextField("Country Name", text: $country.name)

                Section("Catalog Prefixes") {
                    if country.catalogPrefixes.isEmpty {
                        Text("No custom prefixes defined")
                            .foregroundStyle(.secondary)
                            .italic()
                    } else {
                        ForEach(Array(country.catalogPrefixes.keys.sorted()), id: \.self) { key in
                            HStack {
                                Text(key)
                                Spacer()
                                Text(country.catalogPrefixes[key] ?? "")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .formStyle(.grouped)
            .navigationTitle("Edit Country")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .frame(width: 400, height: 300)
    }
}

#Preview {
    SettingsView()
        .modelContainer(for: [Country.self, CustomCatalog.self], inMemory: true)
}
