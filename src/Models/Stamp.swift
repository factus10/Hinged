import Foundation
import SwiftData
import AppKit

@Model
final class Stamp {
    // Catalog identification
    var catalogNumber: String

    // Basic stamp information
    var yearStart: Int?
    var yearEnd: Int?
    var denomination: String
    var color: String
    var perforationGauge: Decimal?
    var watermark: String?

    // Condition
    var gumConditionRaw: String
    var centeringGradeRaw: String

    // Collection status
    var collectionStatusRaw: String
    var notes: String

    // Acquisition details
    var purchasePrice: Decimal?
    var purchaseDate: Date?
    var acquisitionSource: String

    // Image storage - stores filename, actual image in ~/Documents/Hinged/Images/
    var imageFilename: String?

    // Metadata
    var createdAt: Date
    var updatedAt: Date

    // Relationships
    var album: Album?
    var country: Country?

    // MARK: - Computed Properties

    var gumCondition: GumCondition {
        get { GumCondition(rawValue: gumConditionRaw) ?? .unspecified }
        set { gumConditionRaw = newValue.rawValue }
    }

    var centeringGrade: CenteringGrade {
        get { CenteringGrade(rawValue: centeringGradeRaw) ?? .unspecified }
        set { centeringGradeRaw = newValue.rawValue }
    }

    var collectionStatus: CollectionStatus {
        get { CollectionStatus(rawValue: collectionStatusRaw) ?? .wanted }
        set { collectionStatusRaw = newValue.rawValue }
    }

    /// Convenience property for checking if stamp is owned
    var isOwned: Bool {
        collectionStatus == .owned
    }

    var conditionShorthand: String {
        "\(gumCondition.shorthand) \(centeringGrade.shorthand)"
    }

    var catalogSystem: CatalogSystem {
        album?.catalogSystem ?? .scott
    }

    /// Returns the country - from the collection if set, otherwise from the stamp itself
    var collectionCountry: Country? {
        album?.collection?.country ?? country
    }

    var displayCatalogNumber: String {
        let prefix = collectionCountry?.prefix(for: catalogSystem) ?? ""
        if prefix.isEmpty {
            return catalogNumber
        }
        return "\(prefix) \(catalogNumber)"
    }

    // MARK: - Year Helpers

    /// Display string for year - shows single year or range
    var displayYear: String {
        guard let start = yearStart else { return "" }
        if let end = yearEnd, end != start {
            return "\(start)-\(end)"
        }
        return "\(start)"
    }

    // MARK: - Sort Helpers

    /// Returns year for sorting, with nil years sorted to the end
    var yearForSort: Int {
        yearStart ?? Int.max
    }

    /// Returns country name for sorting, with nil countries sorted to the end
    var countryNameForSort: String {
        collectionCountry?.name ?? "~~~"  // Sorts nil to end
    }

    // MARK: - Initialization

    init(
        catalogNumber: String,
        yearStart: Int? = nil,
        yearEnd: Int? = nil,
        denomination: String = "",
        color: String = "",
        perforationGauge: Decimal? = nil,
        watermark: String? = nil,
        gumCondition: GumCondition = .unspecified,
        centeringGrade: CenteringGrade = .unspecified,
        collectionStatus: CollectionStatus = .owned,
        notes: String = "",
        purchasePrice: Decimal? = nil,
        purchaseDate: Date? = nil,
        acquisitionSource: String = "",
        imageFilename: String? = nil,
        album: Album? = nil
    ) {
        self.catalogNumber = catalogNumber
        self.country = nil  // Country comes from album.collection.country
        self.yearStart = yearStart
        self.yearEnd = yearEnd
        self.denomination = denomination
        self.color = color
        self.perforationGauge = perforationGauge
        self.watermark = watermark
        self.gumConditionRaw = gumCondition.rawValue
        self.centeringGradeRaw = centeringGrade.rawValue
        self.collectionStatusRaw = collectionStatus.rawValue
        self.notes = notes
        self.purchasePrice = purchasePrice
        self.purchaseDate = purchaseDate
        self.acquisitionSource = acquisitionSource
        self.imageFilename = imageFilename
        self.album = album
        self.createdAt = Date()
        self.updatedAt = Date()
    }

    // MARK: - Image Helpers

    /// Whether this stamp has an associated image
    var hasImage: Bool {
        guard let filename = imageFilename else { return false }
        return ImageStorage.imageExists(filename: filename)
    }

    /// Loads the stamp's image data from disk
    func loadImageData() -> Data? {
        guard let filename = imageFilename else { return nil }
        return ImageStorage.loadImage(filename: filename)
    }

    /// Loads the stamp's image as NSImage
    func loadImage() -> NSImage? {
        guard let filename = imageFilename else { return nil }
        return ImageStorage.loadNSImage(filename: filename)
    }

    /// Saves image data and updates the imageFilename
    /// - Parameter data: The image data to save
    func saveImage(data: Data) {
        // Delete old image if exists
        if let oldFilename = imageFilename {
            ImageStorage.deleteImage(filename: oldFilename)
        }

        // Save new image with appropriate extension
        let ext = ImageStorage.fileExtension(for: data)
        let filename = ImageStorage.generateFilename(extension: ext)
        if ImageStorage.saveImage(data: data, filename: filename) != nil {
            imageFilename = filename
        }
    }

    /// Removes the stamp's image
    func removeImage() {
        if let filename = imageFilename {
            ImageStorage.deleteImage(filename: filename)
        }
        imageFilename = nil
    }

    func markUpdated() {
        updatedAt = Date()
    }
}

// MARK: - Query Helpers

extension Stamp {
    static func ownedPredicate() -> Predicate<Stamp> {
        let owned = CollectionStatus.owned.rawValue
        return #Predicate<Stamp> { stamp in
            stamp.collectionStatusRaw == owned
        }
    }

    static func wantedPredicate() -> Predicate<Stamp> {
        let wanted = CollectionStatus.wanted.rawValue
        return #Predicate<Stamp> { stamp in
            stamp.collectionStatusRaw == wanted
        }
    }

    static func notCollectingPredicate() -> Predicate<Stamp> {
        let notCollecting = CollectionStatus.notCollecting.rawValue
        return #Predicate<Stamp> { stamp in
            stamp.collectionStatusRaw == notCollecting
        }
    }

    static func recentAdditionsPredicate(days: Int = 30) -> Predicate<Stamp> {
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        return #Predicate<Stamp> { stamp in
            stamp.createdAt >= cutoffDate
        }
    }

    static func yearRangePredicate(from startYear: Int, to endYear: Int) -> Predicate<Stamp> {
        #Predicate<Stamp> { stamp in
            (stamp.yearStart ?? 0) >= startYear && (stamp.yearStart ?? 0) <= endYear
        }
    }
}
