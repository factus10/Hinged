import Foundation
import SwiftData

@Model
final class Country {
    var name: String
    var catalogPrefixes: [String: String] // CatalogSystem.rawValue -> prefix code

    @Relationship(deleteRule: .nullify, inverse: \Stamp.country)
    var stamps: [Stamp]?

    init(name: String, catalogPrefixes: [String: String] = [:]) {
        self.name = name
        self.catalogPrefixes = catalogPrefixes
        self.stamps = []
    }

    func prefix(for catalogSystem: CatalogSystem) -> String? {
        catalogPrefixes[catalogSystem.rawValue]
    }

    func setPrefix(_ prefix: String?, for catalogSystem: CatalogSystem) {
        if let prefix = prefix {
            catalogPrefixes[catalogSystem.rawValue] = prefix
        } else {
            catalogPrefixes.removeValue(forKey: catalogSystem.rawValue)
        }
    }
}

// MARK: - Default Countries

extension Country {
    static func createDefaultCountries(in context: ModelContext) {
        let countries: [(name: String, prefixes: [CatalogSystem: String])] = [
            ("United States", [.scott: "US", .stanleyGibbons: "USA", .michel: "USA"]),
            ("United Kingdom", [.scott: "GB", .stanleyGibbons: "GB", .michel: "GB"]),
            ("Germany", [.scott: "GER", .stanleyGibbons: "G", .michel: "D"]),
            ("France", [.scott: "FR", .stanleyGibbons: "F", .michel: "F", .yvertTellier: "F"]),
            ("Japan", [.scott: "JPN", .stanleyGibbons: "J", .sakura: "J"]),
            ("Canada", [.scott: "CAN", .stanleyGibbons: "C"]),
            ("Australia", [.scott: "AUS", .stanleyGibbons: "A"]),
            ("China", [.scott: "PRC", .stanleyGibbons: "C"]),
            ("Sweden", [.scott: "SWE", .facit: "S"]),
            ("Italy", [.scott: "IT", .stanleyGibbons: "I"]),
        ]

        for (name, prefixes) in countries {
            let prefixDict = Dictionary(uniqueKeysWithValues: prefixes.map { ($0.key.rawValue, $0.value) })
            let country = Country(name: name, catalogPrefixes: prefixDict)
            context.insert(country)
        }
    }
}
