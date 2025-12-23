import SwiftData

// MARK: - Schema Version 1 (Initial/Current Schema)

enum SchemaV1: VersionedSchema {
    static var versionIdentifier: Schema.Version = Schema.Version(1, 0, 0)

    static var models: [any PersistentModel.Type] {
        [Collection.self, Album.self, Stamp.self, Country.self, CustomCatalog.self]
    }
}

// MARK: - Migration Plan

enum HingedMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] {
        [SchemaV1.self]
    }

    static var stages: [MigrationStage] {
        // No migrations yet - this is the initial version
        // Future migrations will be added here as new stages
        []
    }
}

// MARK: - Migration Stage Examples (for future use)
/*
 When you need to add a migration, follow this pattern:

 1. Create a new schema version:

 enum SchemaV2: VersionedSchema {
     static var versionIdentifier: Schema.Version = Schema.Version(2, 0, 0)
     static var models: [any PersistentModel.Type] {
         [Collection.self, Album.self, Stamp.self, Country.self]
     }
 }

 2. Add the schema to the migration plan:

 static var schemas: [any VersionedSchema.Type] {
     [SchemaV1.self, SchemaV2.self]
 }

 3. Add a migration stage:

 static var stages: [MigrationStage] {
     [migrateV1toV2]
 }

 static let migrateV1toV2 = MigrationStage.lightweight(
     fromVersion: SchemaV1.self,
     toVersion: SchemaV2.self
 )

 For complex migrations that need custom logic:

 static let migrateV1toV2 = MigrationStage.custom(
     fromVersion: SchemaV1.self,
     toVersion: SchemaV2.self,
     willMigrate: { context in
         // Pre-migration logic
     },
     didMigrate: { context in
         // Post-migration logic (e.g., data transformations)
         let stamps = try context.fetch(FetchDescriptor<Stamp>())
         for stamp in stamps {
             // Transform data as needed
         }
         try context.save()
     }
 )
 */
