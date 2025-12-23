import SwiftUI
import SwiftData

struct SidebarView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Collection.sortOrder) private var collections: [Collection]
    @Query private var albums: [Album]
    @Binding var selection: SidebarSelection?

    @State private var isAddingCollection = false
    @State private var selectedCollectionForAlbum: Collection?
    @State private var collectionToEdit: Collection?
    @State private var albumToRename: Album?
    @State private var albumToDelete: Album?
    @State private var showDeleteConfirmation = false

    private var selectedAlbum: Album? {
        guard case .album(let albumID) = selection else { return nil }
        return albums.first { $0.persistentModelID == albumID }
    }

    private var selectedCollection: Collection? {
        guard case .collection(let collectionID) = selection else { return nil }
        return collections.first { $0.persistentModelID == collectionID }
    }

    var body: some View {
        List(selection: $selection) {
            smartCollectionsSection
            collectionsSection
        }
        .listStyle(.sidebar)
        .navigationTitle("Stamps")
        .focusedSceneValue(\.selectedAlbum, selectedAlbum)
        .focusedSceneValue(\.albumActions, selectedAlbum.map { album in
            AlbumActions(
                rename: { albumToRename = album },
                delete: { handleDeleteAlbum(album) }
            )
        })
        .focusedSceneValue(\.selectedCollection, selectedCollection)
        .focusedSceneValue(\.collectionActions, selectedCollection.map { collection in
            CollectionActions(
                edit: { collectionToEdit = collection },
                delete: { deleteCollection(collection) }
            )
        })
        .toolbar {
            ToolbarItemGroup {
                Menu {
                    Button("New Collection...") {
                        isAddingCollection = true
                    }
                    if !collections.isEmpty {
                        Menu("New Album in...") {
                            ForEach(collections) { collection in
                                Button(collection.name) {
                                    selectedCollectionForAlbum = collection
                                }
                            }
                        }
                    }
                } label: {
                    Label("Add", systemImage: "plus")
                }
                .help("Add a new collection or album")
            }
        }
        .sheet(isPresented: $isAddingCollection) {
            AddCollectionSheet()
        }
        .sheet(item: $selectedCollectionForAlbum) { collection in
            AddAlbumSheet(collection: collection)
        }
        .sheet(item: $albumToRename) { album in
            RenameAlbumSheet(album: album)
        }
        .sheet(item: $collectionToEdit) { collection in
            EditCollectionSheet(collection: collection)
        }
        .alert(
            "Delete Album?",
            isPresented: $showDeleteConfirmation,
            presenting: albumToDelete
        ) { album in
            Button("Cancel", role: .cancel) {
                albumToDelete = nil
            }
            Button("Delete", role: .destructive) {
                modelContext.delete(album)
                albumToDelete = nil
            }
        } message: { album in
            Text("This album contains \(album.stampCount) stamps. Deleting it will also delete all stamps in the album. This cannot be undone.")
        }
    }

    private func handleDeleteAlbum(_ album: Album) {
        if album.stampCount > 0 {
            albumToDelete = album
            showDeleteConfirmation = true
        } else {
            modelContext.delete(album)
        }
    }

    // MARK: - Smart Collections Section

    private var smartCollectionsSection: some View {
        Section("Smart Collections") {
            ForEach(SmartCollectionType.allCases) { type in
                Label(type.displayName, systemImage: type.systemImage)
                    .tag(SidebarSelection.smartCollection(type))
            }
        }
    }

    // MARK: - Collections Section

    private var collectionsSection: some View {
        Section("Collections") {
            if collections.isEmpty {
                Text("No collections yet")
                    .foregroundStyle(.secondary)
                    .italic()
            } else {
                ForEach(collections) { collection in
                    collectionRow(collection)
                }
                .onDelete(perform: deleteCollections)
            }
        }
    }

    private func collectionRow(_ collection: Collection) -> some View {
        DisclosureGroup {
            if let albums = collection.albums, !albums.isEmpty {
                ForEach(albums.sorted(by: { $0.sortOrder < $1.sortOrder })) { album in
                    albumRow(album)
                }
                .onDelete { indexSet in
                    deleteAlbums(at: indexSet, from: collection)
                }
            } else {
                Text("No albums")
                    .foregroundStyle(.secondary)
                    .italic()
                    .font(.caption)
            }
        } label: {
            Label {
                VStack(alignment: .leading, spacing: 2) {
                    Text(collection.name)
                    Text("\(collection.country?.name ?? "Worldwide") · \(collection.catalogSystem.displayName) · \(collection.stampCount) stamps")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } icon: {
                Image(systemName: "folder.fill")
            }
            .tag(SidebarSelection.collection(collection.persistentModelID))
            .contextMenu {
                Button("Edit Collection...") {
                    collectionToEdit = collection
                }
                Button("Add Album...") {
                    selectedCollectionForAlbum = collection
                }
                Divider()
                Button("Delete Collection", role: .destructive) {
                    deleteCollection(collection)
                }
            }
        }
    }

    private func albumRow(_ album: Album) -> some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(album.name)
                Text("\(album.stampCount) stamps")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        } icon: {
            Image(systemName: "book.closed.fill")
        }
        .tag(SidebarSelection.album(album.persistentModelID))
        .contextMenu {
            Button("Rename...") {
                albumToRename = album
            }
            Divider()
            Button("Delete Album", role: .destructive) {
                handleDeleteAlbum(album)
            }
        }
    }

    // MARK: - Actions

    private func deleteCollections(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(collections[index])
        }
    }

    private func deleteCollection(_ collection: Collection) {
        modelContext.delete(collection)
    }

    private func deleteAlbums(at offsets: IndexSet, from collection: Collection) {
        guard let albums = collection.albums?.sorted(by: { $0.sortOrder < $1.sortOrder }) else { return }
        for index in offsets {
            modelContext.delete(albums[index])
        }
    }

    private func deleteAlbum(_ album: Album) {
        modelContext.delete(album)
    }
}

// MARK: - Add Collection Sheet

struct AddCollectionSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Country.name) private var countries: [Country]

    @State private var name = ""
    @State private var description = ""
    @State private var catalogSystem: CatalogSystem = .scott
    @State private var selectedCountry: Country?
    @State private var isAddingCountry = false
    @State private var newCountryName = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $name)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Catalog") {
                    Picker("Catalog System", selection: $catalogSystem) {
                        ForEach(CatalogSystem.allCases) { system in
                            Text(system.displayName).tag(system)
                        }
                    }
                }

                Section("Country") {
                    Picker("Country", selection: $selectedCountry) {
                        Text("Worldwide").tag(nil as Country?)
                        Divider()
                        ForEach(countries) { country in
                            Text(country.name).tag(country as Country?)
                        }
                    }

                    if isAddingCountry {
                        HStack {
                            TextField("New country name", text: $newCountryName)
                                .textFieldStyle(.roundedBorder)
                            Button("Add") {
                                addNewCountry()
                            }
                            .disabled(newCountryName.isEmpty)
                            Button("Cancel") {
                                isAddingCountry = false
                                newCountryName = ""
                            }
                        }
                    } else {
                        Button("Add New Country...") {
                            isAddingCountry = true
                        }
                    }
                }

                if selectedCountry == nil {
                    Section {
                        Text("Worldwide collections allow stamps from any country. You can set the country on each stamp individually.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .formStyle(.grouped)
            .navigationTitle("New Collection")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        addCollection()
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
        .frame(minWidth: 450, minHeight: 350)
    }

    private func addNewCountry() {
        let country = Country(name: newCountryName)
        modelContext.insert(country)
        selectedCountry = country
        newCountryName = ""
        isAddingCountry = false
    }

    private func addCollection() {
        let collection = Collection(
            name: name,
            description: description,
            catalogSystem: catalogSystem,
            country: selectedCountry
        )
        modelContext.insert(collection)
    }
}

// MARK: - Add Album Sheet

struct AddAlbumSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let collection: Collection

    @State private var name = ""
    @State private var description = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                TextField("Description", text: $description, axis: .vertical)
                    .lineLimit(3...6)

                LabeledContent("Collection", value: collection.name)
                LabeledContent("Catalog System", value: collection.catalogSystem.displayName)
            }
            .formStyle(.grouped)
            .navigationTitle("New Album")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        addAlbum()
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
        .frame(minWidth: 400, minHeight: 250)
    }

    private func addAlbum() {
        let album = Album(
            name: name,
            description: description,
            collection: collection,
            sortOrder: (collection.albums?.count ?? 0)
        )
        modelContext.insert(album)
        // Explicitly update the inverse relationship to trigger SwiftUI update
        if collection.albums == nil {
            collection.albums = [album]
        } else {
            collection.albums?.append(album)
        }
    }
}

// MARK: - Edit Collection Sheet

struct EditCollectionSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Country.name) private var countries: [Country]

    @Bindable var collection: Collection

    @State private var isAddingCountry = false
    @State private var newCountryName = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $collection.name)
                    TextField("Description", text: $collection.collectionDescription, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Catalog") {
                    Picker("Catalog System", selection: $collection.catalogSystem) {
                        ForEach(CatalogSystem.allCases) { system in
                            Text(system.displayName).tag(system)
                        }
                    }
                }

                Section("Country") {
                    Picker("Country", selection: $collection.country) {
                        Text("Worldwide").tag(nil as Country?)
                        Divider()
                        ForEach(countries) { country in
                            Text(country.name).tag(country as Country?)
                        }
                    }

                    if isAddingCountry {
                        HStack {
                            TextField("New country name", text: $newCountryName)
                                .textFieldStyle(.roundedBorder)
                            Button("Add") {
                                addNewCountry()
                            }
                            .disabled(newCountryName.isEmpty)
                            Button("Cancel") {
                                isAddingCountry = false
                                newCountryName = ""
                            }
                        }
                    } else {
                        Button("Add New Country...") {
                            isAddingCountry = true
                        }
                    }
                }

                if collection.isWorldwide {
                    Section {
                        Text("Worldwide collections allow stamps from any country. You can set the country on each stamp individually.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section {
                    LabeledContent("Albums", value: "\(collection.albums?.count ?? 0)")
                    LabeledContent("Stamps", value: "\(collection.stampCount)")
                }
            }
            .formStyle(.grouped)
            .navigationTitle("Edit Collection")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .frame(minWidth: 450, minHeight: 400)
    }

    private func addNewCountry() {
        let country = Country(name: newCountryName)
        modelContext.insert(country)
        collection.country = country
        newCountryName = ""
        isAddingCountry = false
    }
}

// MARK: - Rename Album Sheet

struct RenameAlbumSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var album: Album

    @State private var newName: String = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Album Name", text: $newName)
            }
            .formStyle(.grouped)
            .navigationTitle("Rename Album")
            .onAppear {
                newName = album.name
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Rename") {
                        album.name = newName
                        dismiss()
                    }
                    .disabled(newName.isEmpty)
                }
            }
        }
        .frame(minWidth: 350, minHeight: 150)
    }
}

#Preview {
    SidebarView(selection: .constant(nil))
        .modelContainer(for: Collection.self, inMemory: true)
}
