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
    /// Ensures all default countries exist, adding any that are missing
    static func ensureDefaultCountries(in context: ModelContext) {
        // Fetch existing country names
        let existingCountries = (try? context.fetch(FetchDescriptor<Country>())) ?? []
        let existingNames = Set(existingCountries.map { $0.name.lowercased() })

        // Countries with catalog prefixes for major philatelic nations
        let countriesWithPrefixes: [(name: String, prefixes: [CatalogSystem: String])] = [
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
            ("Spain", [.scott: "SP", .stanleyGibbons: "S"]),
            ("Netherlands", [.scott: "NETH", .stanleyGibbons: "N"]),
            ("Belgium", [.scott: "BEL", .stanleyGibbons: "B"]),
            ("Switzerland", [.scott: "SWI", .stanleyGibbons: "SW"]),
            ("Austria", [.scott: "AUS", .stanleyGibbons: "AU"]),
            ("Russia", [.scott: "RUS", .stanleyGibbons: "R"]),
            ("India", [.scott: "IND", .stanleyGibbons: "I"]),
            ("Brazil", [.scott: "BRA", .stanleyGibbons: "BR"]),
            ("New Zealand", [.scott: "NZ", .stanleyGibbons: "NZ"]),
            ("South Africa", [.scott: "SA", .stanleyGibbons: "SA"]),
        ]

        // All other current countries (alphabetical)
        let otherCountries = [
            "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
            "Antigua and Barbuda", "Argentina", "Armenia", "Azerbaijan",
            "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
            "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
            "Botswana", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
            "Cabo Verde", "Cambodia", "Cameroon", "Central African Republic", "Chad",
            "Chile", "Colombia", "Comoros", "Congo (Democratic Republic)", "Congo (Republic)",
            "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
            "Denmark", "Djibouti", "Dominica", "Dominican Republic",
            "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
            "Estonia", "Eswatini", "Ethiopia",
            "Fiji", "Finland",
            "Gabon", "Gambia", "Georgia", "Ghana", "Greece",
            "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
            "Haiti", "Honduras", "Hungary",
            "Iceland", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Ivory Coast",
            "Jamaica", "Jordan",
            "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan",
            "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
            "Liechtenstein", "Lithuania", "Luxembourg",
            "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
            "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
            "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
            "Namibia", "Nauru", "Nepal", "Nicaragua", "Niger", "Nigeria",
            "North Korea", "North Macedonia", "Norway",
            "Oman",
            "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru",
            "Philippines", "Poland", "Portugal",
            "Qatar",
            "Romania", "Rwanda",
            "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
            "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal",
            "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
            "Solomon Islands", "Somalia", "South Korea", "South Sudan", "Sri Lanka", "Sudan",
            "Suriname", "Syria",
            "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
            "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
            "Uganda", "Ukraine", "United Arab Emirates", "Uruguay", "Uzbekistan",
            "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
            "Yemen",
            "Zambia", "Zimbabwe"
        ]

        // Insert countries with prefixes (if not already present)
        for (name, prefixes) in countriesWithPrefixes {
            guard !existingNames.contains(name.lowercased()) else { continue }
            let prefixDict = Dictionary(uniqueKeysWithValues: prefixes.map { ($0.key.rawValue, $0.value) })
            let country = Country(name: name, catalogPrefixes: prefixDict)
            context.insert(country)
        }

        // Insert other countries without prefixes (if not already present)
        for name in otherCountries {
            guard !existingNames.contains(name.lowercased()) else { continue }
            let country = Country(name: name)
            context.insert(country)
        }
    }

    /// Legacy method name for compatibility
    static func createDefaultCountries(in context: ModelContext) {
        ensureDefaultCountries(in: context)
    }
}
