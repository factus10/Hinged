import Foundation

// MARK: - Catalog System

enum CatalogSystem: String, Codable, CaseIterable, Identifiable {
    case scott
    case stanleyGibbons
    case michel
    case yvertTellier
    case sakura
    case facit
    case other

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .scott: return "Scott"
        case .stanleyGibbons: return "Stanley Gibbons"
        case .michel: return "Michel"
        case .yvertTellier: return "Yvert et Tellier"
        case .sakura: return "Sakura"
        case .facit: return "Facit"
        case .other: return "Other"
        }
    }

    var prefix: String {
        switch self {
        case .scott: return "Sc"
        case .stanleyGibbons: return "SG"
        case .michel: return "Mi"
        case .yvertTellier: return "YT"
        case .sakura: return "Sk"
        case .facit: return "Fa"
        case .other: return ""
        }
    }

    var catalogNumberLabel: String {
        switch self {
        case .scott: return "Scott #"
        case .stanleyGibbons: return "SG #"
        case .michel: return "Michel #"
        case .yvertTellier: return "Y&T #"
        case .sakura: return "Sakura #"
        case .facit: return "Facit #"
        case .other: return "Catalog #"
        }
    }
}

// MARK: - Gum Condition

enum GumCondition: String, Codable, CaseIterable, Identifiable {
    case unspecified
    case mintNeverHinged
    case mintLightlyHinged
    case mintHinged
    case hingeRemnant
    case originalGum
    case noGum
    case regummed
    case used
    case cancelledToOrder

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .unspecified: return "Unspecified"
        case .mintNeverHinged: return "Mint Never Hinged"
        case .mintLightlyHinged: return "Mint Lightly Hinged"
        case .mintHinged: return "Mint Hinged"
        case .hingeRemnant: return "Hinge Remnant"
        case .originalGum: return "Original Gum"
        case .noGum: return "No Gum"
        case .regummed: return "Regummed"
        case .used: return "Used"
        case .cancelledToOrder: return "Cancelled to Order"
        }
    }

    var shorthand: String {
        switch self {
        case .unspecified: return "—"
        case .mintNeverHinged: return "MNH"
        case .mintLightlyHinged: return "MLH"
        case .mintHinged: return "MH"
        case .hingeRemnant: return "HR"
        case .originalGum: return "OG"
        case .noGum: return "NG"
        case .regummed: return "RG"
        case .used: return "U"
        case .cancelledToOrder: return "CTO"
        }
    }
}

// MARK: - Centering Grade

enum CenteringGrade: String, Codable, CaseIterable, Identifiable {
    case unspecified
    case superb
    case extremelyFine
    case veryFine
    case fineVeryFine
    case fine
    case veryGood
    case good
    case average
    case poor
    case spaceFiller

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .unspecified: return "Unspecified"
        case .superb: return "Superb"
        case .extremelyFine: return "Extremely Fine"
        case .veryFine: return "Very Fine"
        case .fineVeryFine: return "Fine-Very Fine"
        case .fine: return "Fine"
        case .veryGood: return "Very Good"
        case .good: return "Good"
        case .average: return "Average"
        case .poor: return "Poor"
        case .spaceFiller: return "Space Filler"
        }
    }

    var shorthand: String {
        switch self {
        case .unspecified: return "—"
        case .superb: return "S"
        case .extremelyFine: return "XF"
        case .veryFine: return "VF"
        case .fineVeryFine: return "FVF"
        case .fine: return "F"
        case .veryGood: return "VG"
        case .good: return "G"
        case .average: return "AVG"
        case .poor: return "P"
        case .spaceFiller: return "SF"
        }
    }
}

// MARK: - Collection Status

enum CollectionStatus: String, Codable, CaseIterable, Identifiable {
    case owned
    case wanted
    case notCollecting

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .owned: return "Owned"
        case .wanted: return "Wanted"
        case .notCollecting: return "Not Collecting"
        }
    }

    var shortDisplayName: String {
        switch self {
        case .owned: return "Owned"
        case .wanted: return "Want"
        case .notCollecting: return "Skip"
        }
    }

    var systemImage: String {
        switch self {
        case .owned: return "checkmark.circle.fill"
        case .wanted: return "heart.fill"
        case .notCollecting: return "minus.circle.fill"
        }
    }

    var color: String {
        switch self {
        case .owned: return "green"
        case .wanted: return "red"
        case .notCollecting: return "gray"
        }
    }
}

// MARK: - Smart Collection Type

enum SmartCollectionType: String, Codable, CaseIterable, Identifiable {
    case allOwned
    case wantList
    case notCollecting
    case recentAdditions

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .allOwned: return "All Owned"
        case .wantList: return "Want List"
        case .notCollecting: return "Not Collecting"
        case .recentAdditions: return "Recent Additions"
        }
    }

    var systemImage: String {
        switch self {
        case .allOwned: return "checkmark.seal.fill"
        case .wantList: return "heart.fill"
        case .notCollecting: return "minus.circle"
        case .recentAdditions: return "clock.fill"
        }
    }
}
