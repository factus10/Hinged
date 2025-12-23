import Foundation
import SwiftData

@Model
final class Collection {
    var name: String
    var collectionDescription: String
    var catalogSystemRaw: String
    var createdAt: Date
    var sortOrder: Int

    var country: Country?

    @Relationship(deleteRule: .cascade, inverse: \Album.collection)
    var albums: [Album]?

    var catalogSystem: CatalogSystem {
        get { CatalogSystem(rawValue: catalogSystemRaw) ?? .scott }
        set { catalogSystemRaw = newValue.rawValue }
    }

    var countryPrefix: String {
        country?.prefix(for: catalogSystem) ?? ""
    }

    /// Returns true if this is a worldwide collection (no specific country)
    var isWorldwide: Bool {
        country == nil
    }

    init(
        name: String,
        description: String = "",
        catalogSystem: CatalogSystem = .scott,
        country: Country? = nil,
        sortOrder: Int = 0
    ) {
        self.name = name
        self.collectionDescription = description
        self.catalogSystemRaw = catalogSystem.rawValue
        self.country = country
        self.createdAt = Date()
        self.sortOrder = sortOrder
        self.albums = []
    }

    var stampCount: Int {
        albums?.reduce(0) { $0 + ($1.stamps?.count ?? 0) } ?? 0
    }

    var ownedStampCount: Int {
        albums?.reduce(0) { total, album in
            total + (album.stamps?.filter { $0.isOwned }.count ?? 0)
        } ?? 0
    }

    var wantedStampCount: Int {
        albums?.reduce(0) { total, album in
            total + (album.stamps?.filter { !$0.isOwned }.count ?? 0)
        } ?? 0
    }
}
