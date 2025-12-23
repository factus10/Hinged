import Foundation
import AppKit

/// Manages stamp image storage in ~/Documents/Hinged/Images/
enum ImageStorage {

    /// The base folder for all Hinged data
    static var hingedFolderURL: URL {
        let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return documentsURL.appendingPathComponent("Hinged", isDirectory: true)
    }

    /// The folder where stamp images are stored
    static var imagesFolderURL: URL {
        hingedFolderURL.appendingPathComponent("Images", isDirectory: true)
    }

    /// Ensures the Images folder exists
    static func ensureImagesFolderExists() {
        try? FileManager.default.createDirectory(
            at: imagesFolderURL,
            withIntermediateDirectories: true
        )
    }

    /// Generates a unique filename for a new image
    static func generateFilename(extension ext: String = "jpg") -> String {
        "\(UUID().uuidString).\(ext)"
    }

    /// Returns the full URL for an image filename
    static func url(for filename: String) -> URL {
        imagesFolderURL.appendingPathComponent(filename)
    }

    /// Saves image data to the Images folder
    /// - Parameters:
    ///   - data: The image data to save
    ///   - filename: Optional filename (if nil, generates a new one)
    /// - Returns: The filename used, or nil if save failed
    @discardableResult
    static func saveImage(data: Data, filename: String? = nil) -> String? {
        ensureImagesFolderExists()

        let actualFilename = filename ?? generateFilename()
        let fileURL = url(for: actualFilename)

        do {
            try data.write(to: fileURL)
            return actualFilename
        } catch {
            print("Failed to save image: \(error)")
            return nil
        }
    }

    /// Loads image data from the Images folder
    /// - Parameter filename: The filename to load
    /// - Returns: The image data, or nil if not found
    static func loadImage(filename: String) -> Data? {
        let fileURL = url(for: filename)
        return try? Data(contentsOf: fileURL)
    }

    /// Loads an NSImage from the Images folder
    /// - Parameter filename: The filename to load
    /// - Returns: The NSImage, or nil if not found or invalid
    static func loadNSImage(filename: String) -> NSImage? {
        guard let data = loadImage(filename: filename) else { return nil }
        return NSImage(data: data)
    }

    /// Deletes an image from the Images folder
    /// - Parameter filename: The filename to delete
    static func deleteImage(filename: String) {
        let fileURL = url(for: filename)
        try? FileManager.default.removeItem(at: fileURL)
    }

    /// Checks if an image exists
    /// - Parameter filename: The filename to check
    /// - Returns: true if the file exists
    static func imageExists(filename: String) -> Bool {
        let fileURL = url(for: filename)
        return FileManager.default.fileExists(atPath: fileURL.path)
    }

    /// Returns all image filenames in the Images folder
    static func allImageFilenames() -> [String] {
        guard let contents = try? FileManager.default.contentsOfDirectory(
            at: imagesFolderURL,
            includingPropertiesForKeys: nil
        ) else {
            return []
        }
        return contents.map { $0.lastPathComponent }
    }

    /// Determines appropriate file extension from image data
    static func fileExtension(for data: Data) -> String {
        // Check magic bytes for common image formats
        if data.count >= 3 {
            let bytes = [UInt8](data.prefix(3))

            // PNG: 89 50 4E
            if bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E {
                return "png"
            }

            // JPEG: FF D8 FF
            if bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF {
                return "jpg"
            }

            // GIF: 47 49 46
            if bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 {
                return "gif"
            }
        }

        // Check for WebP (RIFF....WEBP)
        if data.count >= 12 {
            let riff = String(data: data.prefix(4), encoding: .ascii)
            let webp = String(data: data.subdata(in: 8..<12), encoding: .ascii)
            if riff == "RIFF" && webp == "WEBP" {
                return "webp"
            }
        }

        // Default to jpg
        return "jpg"
    }
}
