import Foundation
import SwiftData

enum SidebarSelection: Hashable {
    case smartCollection(SmartCollectionType)
    case album(PersistentIdentifier)
    case collection(PersistentIdentifier)

    var title: String {
        switch self {
        case .smartCollection(let type):
            return type.displayName
        case .album, .collection:
            return "" // Will be resolved from context
        }
    }
}
