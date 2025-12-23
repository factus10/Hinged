import Foundation
import SwiftData

@Model
final class Album {
    var name: String
    var albumDescription: String
    var createdAt: Date
    var sortOrder: Int

    var collection: Collection?

    @Relationship(deleteRule: .cascade, inverse: \Stamp.album)
    var stamps: [Stamp]?

    init(
        name: String,
        description: String = "",
        collection: Collection? = nil,
        sortOrder: Int = 0
    ) {
        self.name = name
        self.albumDescription = description
        self.collection = collection
        self.createdAt = Date()
        self.sortOrder = sortOrder
        self.stamps = []
    }

    var stampCount: Int {
        stamps?.count ?? 0
    }

    var ownedStampCount: Int {
        stamps?.filter { $0.isOwned }.count ?? 0
    }

    var wantedStampCount: Int {
        stamps?.filter { !$0.isOwned }.count ?? 0
    }

    var catalogSystem: CatalogSystem {
        collection?.catalogSystem ?? .scott
    }
}
