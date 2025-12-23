import Foundation
import SwiftUI
import SwiftData

// MARK: - User Settings (AppStorage)

@Observable
class UserSettings {
    static let shared = UserSettings()

    // Default catalog system for new collections
    // Format: "builtin:rawValue" or "custom:catalogName"
    @ObservationIgnored
    @AppStorage("defaultCatalogSystem") var defaultCatalogSystemRaw: String = "builtin:scott"

    /// Returns the built-in catalog system if one is selected, nil if custom
    var defaultCatalogSystem: CatalogSystem? {
        get {
            guard defaultCatalogSystemRaw.hasPrefix("builtin:") else { return nil }
            let rawValue = String(defaultCatalogSystemRaw.dropFirst("builtin:".count))
            return CatalogSystem(rawValue: rawValue)
        }
        set {
            if let system = newValue {
                defaultCatalogSystemRaw = "builtin:\(system.rawValue)"
            }
        }
    }

    /// Returns the custom catalog name if one is selected, nil if built-in
    var defaultCustomCatalogName: String? {
        get {
            guard defaultCatalogSystemRaw.hasPrefix("custom:") else { return nil }
            return String(defaultCatalogSystemRaw.dropFirst("custom:".count))
        }
        set {
            if let name = newValue {
                defaultCatalogSystemRaw = "custom:\(name)"
            }
        }
    }

    /// Check if using a built-in catalog
    var isUsingBuiltInCatalog: Bool {
        defaultCatalogSystemRaw.hasPrefix("builtin:")
    }

    /// Set the default to a built-in catalog
    func setDefaultCatalog(_ system: CatalogSystem) {
        defaultCatalogSystemRaw = "builtin:\(system.rawValue)"
    }

    /// Set the default to a custom catalog by name
    func setDefaultCatalog(customName: String) {
        defaultCatalogSystemRaw = "custom:\(customName)"
    }

    /// Get the effective built-in catalog (falls back to scott if custom is selected)
    var effectiveBuiltInCatalog: CatalogSystem {
        defaultCatalogSystem ?? .scott
    }

    // Default collection status for new stamps
    @ObservationIgnored
    @AppStorage("defaultCollectionStatus") var defaultCollectionStatusRaw: String = CollectionStatus.wanted.rawValue

    var defaultCollectionStatus: CollectionStatus {
        get { CollectionStatus(rawValue: defaultCollectionStatusRaw) ?? .wanted }
        set { defaultCollectionStatusRaw = newValue.rawValue }
    }

    // Default gum condition (optional - empty string means no default)
    @ObservationIgnored
    @AppStorage("defaultGumCondition") var defaultGumConditionRaw: String = ""

    var defaultGumCondition: GumCondition? {
        get {
            guard !defaultGumConditionRaw.isEmpty else { return nil }
            return GumCondition(rawValue: defaultGumConditionRaw)
        }
        set { defaultGumConditionRaw = newValue?.rawValue ?? "" }
    }

    // Default centering grade (optional - empty string means no default)
    @ObservationIgnored
    @AppStorage("defaultCenteringGrade") var defaultCenteringGradeRaw: String = ""

    var defaultCenteringGrade: CenteringGrade? {
        get {
            guard !defaultCenteringGradeRaw.isEmpty else { return nil }
            return CenteringGrade(rawValue: defaultCenteringGradeRaw)
        }
        set { defaultCenteringGradeRaw = newValue?.rawValue ?? "" }
    }

    // Currency symbol for prices
    @ObservationIgnored
    @AppStorage("currencySymbol") var currencySymbol: String = "$"

    private init() {}
}

// MARK: - Custom Catalog (SwiftData Model)

@Model
final class CustomCatalog {
    var name: String
    var prefix: String
    var catalogNumberLabel: String
    var sortOrder: Int
    var createdAt: Date

    init(name: String, prefix: String, catalogNumberLabel: String? = nil, sortOrder: Int = 0) {
        self.name = name
        self.prefix = prefix
        self.catalogNumberLabel = catalogNumberLabel ?? "\(name) #"
        self.sortOrder = sortOrder
        self.createdAt = Date()
    }
}

// MARK: - Unified Catalog System

/// Represents either a built-in catalog system or a custom one
enum UnifiedCatalogSystem: Hashable, Identifiable {
    case builtIn(CatalogSystem)
    case custom(PersistentIdentifier)

    var id: String {
        switch self {
        case .builtIn(let system):
            return "builtin-\(system.rawValue)"
        case .custom(let id):
            return "custom-\(id.hashValue)"
        }
    }

    func displayName(customCatalogs: [CustomCatalog]) -> String {
        switch self {
        case .builtIn(let system):
            return system.displayName
        case .custom(let id):
            return customCatalogs.first { $0.persistentModelID == id }?.name ?? "Unknown"
        }
    }

    func prefix(customCatalogs: [CustomCatalog]) -> String {
        switch self {
        case .builtIn(let system):
            return system.prefix
        case .custom(let id):
            return customCatalogs.first { $0.persistentModelID == id }?.prefix ?? ""
        }
    }

    func catalogNumberLabel(customCatalogs: [CustomCatalog]) -> String {
        switch self {
        case .builtIn(let system):
            return system.catalogNumberLabel
        case .custom(let id):
            return customCatalogs.first { $0.persistentModelID == id }?.catalogNumberLabel ?? "Catalog #"
        }
    }
}
