import SwiftUI
import SwiftData

// MARK: - Focused Album

struct FocusedAlbumKey: FocusedValueKey {
    typealias Value = Album
}

extension FocusedValues {
    var selectedAlbum: Album? {
        get { self[FocusedAlbumKey.self] }
        set { self[FocusedAlbumKey.self] = newValue }
    }
}

// MARK: - Album Actions

struct AlbumActions {
    var add: () -> Void
    var rename: () -> Void
    var delete: () -> Void
}

struct FocusedAlbumActionsKey: FocusedValueKey {
    typealias Value = AlbumActions
}

extension FocusedValues {
    var albumActions: AlbumActions? {
        get { self[FocusedAlbumActionsKey.self] }
        set { self[FocusedAlbumActionsKey.self] = newValue }
    }
}

// MARK: - Focused Collection

struct FocusedCollectionKey: FocusedValueKey {
    typealias Value = Collection
}

extension FocusedValues {
    var selectedCollection: Collection? {
        get { self[FocusedCollectionKey.self] }
        set { self[FocusedCollectionKey.self] = newValue }
    }
}

// MARK: - Collection Actions

struct CollectionActions {
    var add: () -> Void
    var edit: () -> Void
    var delete: () -> Void
}

struct FocusedCollectionActionsKey: FocusedValueKey {
    typealias Value = CollectionActions
}

extension FocusedValues {
    var collectionActions: CollectionActions? {
        get { self[FocusedCollectionActionsKey.self] }
        set { self[FocusedCollectionActionsKey.self] = newValue }
    }
}
