import Foundation
import SwiftUI
import SwiftData
import UniformTypeIdentifiers

// MARK: - Backup File Type

extension UTType {
    static var hingedBackup: UTType {
        UTType(exportedAs: "com.factus10.hinged.backup", conformingTo: .json)
    }
}

// MARK: - Backup Data Structures

struct HingedBackup: Codable {
    static let currentVersion = 1

    let version: Int
    let exportDate: Date
    let appVersion: String
    let countries: [CountryBackup]
    let collections: [CollectionBackup]
    let albums: [AlbumBackup]
    let stamps: [StampBackup]

    init(countries: [CountryBackup], collections: [CollectionBackup], albums: [AlbumBackup], stamps: [StampBackup]) {
        self.version = Self.currentVersion
        self.exportDate = Date()
        self.appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown"
        self.countries = countries
        self.collections = collections
        self.albums = albums
        self.stamps = stamps
    }
}

struct CountryBackup: Codable {
    let id: String  // Temporary ID for relationship mapping
    let name: String
    let catalogPrefixes: [String: String]
}

struct CollectionBackup: Codable {
    let id: String
    let name: String
    let description: String
    let catalogSystemRaw: String
    let createdAt: Date
    let sortOrder: Int
    let countryId: String?  // Reference to CountryBackup.id
}

struct AlbumBackup: Codable {
    let id: String
    let name: String
    let description: String
    let createdAt: Date
    let sortOrder: Int
    let collectionId: String  // Reference to CollectionBackup.id
}

struct StampBackup: Codable {
    let id: String
    let catalogNumber: String
    let yearStart: Int?
    let yearEnd: Int?
    let denomination: String
    let color: String
    let perforationGauge: Decimal?
    let watermark: String?
    let gumConditionRaw: String
    let centeringGradeRaw: String
    let collectionStatusRaw: String
    let notes: String
    let purchasePrice: Decimal?
    let purchaseDate: Date?
    let acquisitionSource: String
    let imageData: String?  // Base64 encoded
    let createdAt: Date
    let updatedAt: Date
    let albumId: String  // Reference to AlbumBackup.id
    let countryId: String?  // Reference to CountryBackup.id (for worldwide collections)

    // Support decoding old backups with yearOfIssue field
    private enum CodingKeys: String, CodingKey {
        case id, catalogNumber, yearStart, yearEnd, yearOfIssue
        case denomination, color, perforationGauge, watermark
        case gumConditionRaw, centeringGradeRaw, collectionStatusRaw
        case notes, purchasePrice, purchaseDate, acquisitionSource
        case imageData, createdAt, updatedAt, albumId, countryId
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        catalogNumber = try container.decode(String.self, forKey: .catalogNumber)

        // Handle migration from old yearOfIssue to new yearStart/yearEnd
        if let yearOfIssue = try container.decodeIfPresent(Int.self, forKey: .yearOfIssue) {
            yearStart = yearOfIssue
            yearEnd = nil
        } else {
            yearStart = try container.decodeIfPresent(Int.self, forKey: .yearStart)
            yearEnd = try container.decodeIfPresent(Int.self, forKey: .yearEnd)
        }

        denomination = try container.decode(String.self, forKey: .denomination)
        color = try container.decode(String.self, forKey: .color)
        perforationGauge = try container.decodeIfPresent(Decimal.self, forKey: .perforationGauge)
        watermark = try container.decodeIfPresent(String.self, forKey: .watermark)
        gumConditionRaw = try container.decode(String.self, forKey: .gumConditionRaw)
        centeringGradeRaw = try container.decode(String.self, forKey: .centeringGradeRaw)
        collectionStatusRaw = try container.decode(String.self, forKey: .collectionStatusRaw)
        notes = try container.decode(String.self, forKey: .notes)
        purchasePrice = try container.decodeIfPresent(Decimal.self, forKey: .purchasePrice)
        purchaseDate = try container.decodeIfPresent(Date.self, forKey: .purchaseDate)
        acquisitionSource = try container.decode(String.self, forKey: .acquisitionSource)
        imageData = try container.decodeIfPresent(String.self, forKey: .imageData)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        albumId = try container.decode(String.self, forKey: .albumId)
        countryId = try container.decodeIfPresent(String.self, forKey: .countryId)
    }

    init(id: String, catalogNumber: String, yearStart: Int?, yearEnd: Int?,
         denomination: String, color: String, perforationGauge: Decimal?,
         watermark: String?, gumConditionRaw: String, centeringGradeRaw: String,
         collectionStatusRaw: String, notes: String, purchasePrice: Decimal?,
         purchaseDate: Date?, acquisitionSource: String, imageData: String?,
         createdAt: Date, updatedAt: Date, albumId: String, countryId: String?) {
        self.id = id
        self.catalogNumber = catalogNumber
        self.yearStart = yearStart
        self.yearEnd = yearEnd
        self.denomination = denomination
        self.color = color
        self.perforationGauge = perforationGauge
        self.watermark = watermark
        self.gumConditionRaw = gumConditionRaw
        self.centeringGradeRaw = centeringGradeRaw
        self.collectionStatusRaw = collectionStatusRaw
        self.notes = notes
        self.purchasePrice = purchasePrice
        self.purchaseDate = purchaseDate
        self.acquisitionSource = acquisitionSource
        self.imageData = imageData
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.albumId = albumId
        self.countryId = countryId
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(catalogNumber, forKey: .catalogNumber)
        try container.encodeIfPresent(yearStart, forKey: .yearStart)
        try container.encodeIfPresent(yearEnd, forKey: .yearEnd)
        try container.encode(denomination, forKey: .denomination)
        try container.encode(color, forKey: .color)
        try container.encodeIfPresent(perforationGauge, forKey: .perforationGauge)
        try container.encodeIfPresent(watermark, forKey: .watermark)
        try container.encode(gumConditionRaw, forKey: .gumConditionRaw)
        try container.encode(centeringGradeRaw, forKey: .centeringGradeRaw)
        try container.encode(collectionStatusRaw, forKey: .collectionStatusRaw)
        try container.encode(notes, forKey: .notes)
        try container.encodeIfPresent(purchasePrice, forKey: .purchasePrice)
        try container.encodeIfPresent(purchaseDate, forKey: .purchaseDate)
        try container.encode(acquisitionSource, forKey: .acquisitionSource)
        try container.encodeIfPresent(imageData, forKey: .imageData)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
        try container.encode(albumId, forKey: .albumId)
        try container.encodeIfPresent(countryId, forKey: .countryId)
    }
}

// MARK: - Backup Manager

@MainActor
class BackupManager {

    // MARK: - Export

    static func createBackup(from context: ModelContext) throws -> HingedBackup {
        // Fetch all data
        let countries = try context.fetch(FetchDescriptor<Country>(sortBy: [SortDescriptor(\.name)]))
        let collections = try context.fetch(FetchDescriptor<Collection>(sortBy: [SortDescriptor(\.sortOrder)]))
        let albums = try context.fetch(FetchDescriptor<Album>(sortBy: [SortDescriptor(\.sortOrder)]))
        let stamps = try context.fetch(FetchDescriptor<Stamp>(sortBy: [SortDescriptor(\.catalogNumber)]))

        // Create ID mappings
        var countryIdMap: [ObjectIdentifier: String] = [:]
        var collectionIdMap: [ObjectIdentifier: String] = [:]
        var albumIdMap: [ObjectIdentifier: String] = [:]

        // Export countries
        let countryBackups = countries.map { country -> CountryBackup in
            let id = UUID().uuidString
            countryIdMap[ObjectIdentifier(country)] = id
            return CountryBackup(
                id: id,
                name: country.name,
                catalogPrefixes: country.catalogPrefixes
            )
        }

        // Export collections
        let collectionBackups = collections.map { collection -> CollectionBackup in
            let id = UUID().uuidString
            collectionIdMap[ObjectIdentifier(collection)] = id
            return CollectionBackup(
                id: id,
                name: collection.name,
                description: collection.collectionDescription,
                catalogSystemRaw: collection.catalogSystemRaw,
                createdAt: collection.createdAt,
                sortOrder: collection.sortOrder,
                countryId: collection.country.map { countryIdMap[ObjectIdentifier($0)] } ?? nil
            )
        }

        // Export albums
        let albumBackups = albums.compactMap { album -> AlbumBackup? in
            guard let collection = album.collection,
                  let collectionId = collectionIdMap[ObjectIdentifier(collection)] else {
                return nil  // Skip orphaned albums
            }
            let id = UUID().uuidString
            albumIdMap[ObjectIdentifier(album)] = id
            return AlbumBackup(
                id: id,
                name: album.name,
                description: album.albumDescription,
                createdAt: album.createdAt,
                sortOrder: album.sortOrder,
                collectionId: collectionId
            )
        }

        // Export stamps
        let stampBackups = stamps.compactMap { stamp -> StampBackup? in
            guard let album = stamp.album,
                  let albumId = albumIdMap[ObjectIdentifier(album)] else {
                return nil  // Skip orphaned stamps
            }

            // Encode image data as base64 if present
            let imageBase64 = stamp.loadImageData()?.base64EncodedString()

            return StampBackup(
                id: UUID().uuidString,
                catalogNumber: stamp.catalogNumber,
                yearStart: stamp.yearStart,
                yearEnd: stamp.yearEnd,
                denomination: stamp.denomination,
                color: stamp.color,
                perforationGauge: stamp.perforationGauge,
                watermark: stamp.watermark,
                gumConditionRaw: stamp.gumConditionRaw,
                centeringGradeRaw: stamp.centeringGradeRaw,
                collectionStatusRaw: stamp.collectionStatusRaw,
                notes: stamp.notes,
                purchasePrice: stamp.purchasePrice,
                purchaseDate: stamp.purchaseDate,
                acquisitionSource: stamp.acquisitionSource,
                imageData: imageBase64,
                createdAt: stamp.createdAt,
                updatedAt: stamp.updatedAt,
                albumId: albumId,
                countryId: stamp.country.map { countryIdMap[ObjectIdentifier($0)] } ?? nil
            )
        }

        return HingedBackup(
            countries: countryBackups,
            collections: collectionBackups,
            albums: albumBackups,
            stamps: stampBackups
        )
    }

    nonisolated static func exportToData(_ backup: HingedBackup) throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(backup)
    }

    // MARK: - Import

    nonisolated static func importFromData(_ data: Data) throws -> HingedBackup {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let backup = try decoder.decode(HingedBackup.self, from: data)

        // Validate version
        if backup.version > HingedBackup.currentVersion {
            throw BackupError.unsupportedVersion(backup.version)
        }

        return backup
    }

    static func restoreBackup(_ backup: HingedBackup, to context: ModelContext, mode: ImportMode) throws -> ImportResult {
        var result = ImportResult()

        // If replacing, delete all existing data first
        if mode == .replace {
            try deleteAllData(from: context)
        }

        // Build lookup maps for relationships
        var countryMap: [String: Country] = [:]
        var collectionMap: [String: Collection] = [:]
        var albumMap: [String: Album] = [:]

        // If merging, load existing countries by name for deduplication
        var existingCountryNames: Set<String> = []
        if mode == .merge {
            let existingCountries = try context.fetch(FetchDescriptor<Country>())
            for country in existingCountries {
                existingCountryNames.insert(country.name.lowercased())
                // Map backup IDs to existing countries if names match
                for backupCountry in backup.countries {
                    if backupCountry.name.lowercased() == country.name.lowercased() {
                        countryMap[backupCountry.id] = country
                    }
                }
            }
        }

        // Import countries
        for countryBackup in backup.countries {
            if mode == .merge && existingCountryNames.contains(countryBackup.name.lowercased()) {
                result.countriesSkipped += 1
                continue  // Skip existing countries
            }

            let country = Country(
                name: countryBackup.name,
                catalogPrefixes: countryBackup.catalogPrefixes
            )
            context.insert(country)
            countryMap[countryBackup.id] = country
            result.countriesImported += 1
        }

        // Import collections
        for collectionBackup in backup.collections {
            let collection = Collection(
                name: collectionBackup.name,
                description: collectionBackup.description,
                catalogSystem: CatalogSystem(rawValue: collectionBackup.catalogSystemRaw) ?? .scott,
                country: collectionBackup.countryId.flatMap { countryMap[$0] },
                sortOrder: collectionBackup.sortOrder
            )
            // Preserve original creation date
            collection.createdAt = collectionBackup.createdAt
            context.insert(collection)
            collectionMap[collectionBackup.id] = collection
            result.collectionsImported += 1
        }

        // Import albums
        for albumBackup in backup.albums {
            guard let collection = collectionMap[albumBackup.collectionId] else {
                result.albumsSkipped += 1
                continue
            }

            let album = Album(
                name: albumBackup.name,
                description: albumBackup.description,
                collection: collection,
                sortOrder: albumBackup.sortOrder
            )
            album.createdAt = albumBackup.createdAt
            context.insert(album)
            albumMap[albumBackup.id] = album
            result.albumsImported += 1
        }

        // Import stamps
        for stampBackup in backup.stamps {
            guard let album = albumMap[stampBackup.albumId] else {
                result.stampsSkipped += 1
                continue
            }

            // Decode image data from base64 and save to file
            var imageFilename: String?
            if let imageBase64 = stampBackup.imageData,
               let imageData = Data(base64Encoded: imageBase64) {
                let ext = ImageStorage.fileExtension(for: imageData)
                let filename = ImageStorage.generateFilename(extension: ext)
                if ImageStorage.saveImage(data: imageData, filename: filename) != nil {
                    imageFilename = filename
                }
            }

            let stamp = Stamp(
                catalogNumber: stampBackup.catalogNumber,
                yearStart: stampBackup.yearStart,
                yearEnd: stampBackup.yearEnd,
                denomination: stampBackup.denomination,
                color: stampBackup.color,
                perforationGauge: stampBackup.perforationGauge,
                watermark: stampBackup.watermark,
                gumCondition: GumCondition(rawValue: stampBackup.gumConditionRaw) ?? .unspecified,
                centeringGrade: CenteringGrade(rawValue: stampBackup.centeringGradeRaw) ?? .unspecified,
                collectionStatus: CollectionStatus(rawValue: stampBackup.collectionStatusRaw) ?? .wanted,
                notes: stampBackup.notes,
                purchasePrice: stampBackup.purchasePrice,
                purchaseDate: stampBackup.purchaseDate,
                acquisitionSource: stampBackup.acquisitionSource,
                imageFilename: imageFilename,
                album: album
            )
            stamp.createdAt = stampBackup.createdAt
            stamp.updatedAt = stampBackup.updatedAt

            // Set country for worldwide collections
            if let countryId = stampBackup.countryId {
                stamp.country = countryMap[countryId]
            }

            context.insert(stamp)
            result.stampsImported += 1
        }

        try context.save()
        return result
    }

    private static func deleteAllData(from context: ModelContext) throws {
        // Delete in reverse order of relationships
        try context.delete(model: Stamp.self)
        try context.delete(model: Album.self)
        try context.delete(model: Collection.self)
        try context.delete(model: Country.self)
    }
}

// MARK: - Supporting Types

enum ImportMode {
    case replace  // Delete existing data first
    case merge    // Keep existing data, add new
}

struct ImportResult {
    var countriesImported = 0
    var countriesSkipped = 0
    var collectionsImported = 0
    var collectionsSkipped = 0
    var albumsImported = 0
    var albumsSkipped = 0
    var stampsImported = 0
    var stampsSkipped = 0

    var totalImported: Int {
        countriesImported + collectionsImported + albumsImported + stampsImported
    }

    var totalSkipped: Int {
        countriesSkipped + collectionsSkipped + albumsSkipped + stampsSkipped
    }

    var summary: String {
        var parts: [String] = []
        if collectionsImported > 0 { parts.append("\(collectionsImported) collection(s)") }
        if albumsImported > 0 { parts.append("\(albumsImported) album(s)") }
        if stampsImported > 0 { parts.append("\(stampsImported) stamp(s)") }
        if countriesImported > 0 { parts.append("\(countriesImported) country/countries") }

        if parts.isEmpty {
            return "No data imported"
        }
        return "Imported " + parts.joined(separator: ", ")
    }
}

enum BackupError: LocalizedError {
    case unsupportedVersion(Int)
    case invalidData
    case exportFailed(Error)
    case importFailed(Error)

    var errorDescription: String? {
        switch self {
        case .unsupportedVersion(let version):
            return "This backup file was created with a newer version of Hinged (backup version \(version)). Please update Hinged to import this file."
        case .invalidData:
            return "The backup file is corrupted or invalid."
        case .exportFailed(let error):
            return "Failed to export data: \(error.localizedDescription)"
        case .importFailed(let error):
            return "Failed to import data: \(error.localizedDescription)"
        }
    }
}

// MARK: - File Document for Export

struct HingedBackupDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.hingedBackup, .json] }
    static var writableContentTypes: [UTType] { [.hingedBackup] }

    let backup: HingedBackup

    init(backup: HingedBackup) {
        self.backup = backup
    }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw BackupError.invalidData
        }
        self.backup = try BackupManager.importFromData(data)
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        let data = try BackupManager.exportToData(backup)
        return FileWrapper(regularFileWithContents: data)
    }
}
