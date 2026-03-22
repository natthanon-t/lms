package api

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// decodeDataURL extracts and decodes the base64 payload from a data URL.
func decodeDataURL(dataURL string) ([]byte, error) {
	comma := strings.Index(dataURL, ",")
	if comma == -1 {
		return nil, fmt.Errorf("invalid data URL format")
	}
	decoded, err := base64.StdEncoding.DecodeString(dataURL[comma+1:])
	if err != nil {
		return nil, fmt.Errorf("invalid base64 data")
	}
	return decoded, nil
}

// validateImageBytes checks magic bytes to ensure the data is a valid image.
func validateImageBytes(data []byte) error {
	if len(data) < 12 {
		return fmt.Errorf("file too small to be a valid image")
	}
	// JPEG: FF D8 FF
	if data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return nil
	}
	// PNG: 89 50 4E 47
	if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
		return nil
	}
	// GIF: 47 49 46 38
	if data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x38 {
		return nil
	}
	// WebP: RIFF....WEBP
	if data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46 &&
		data[8] == 0x57 && data[9] == 0x45 && data[10] == 0x42 && data[11] == 0x50 {
		return nil
	}
	return fmt.Errorf("unsupported image format")
}

// imageFormats maps MIME type to canonical file extension.
var imageFormats = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

// mimeFromExt returns a MIME type for the given file extension.
func mimeFromExt(ext string) string {
	lower := strings.ToLower(ext)
	for mime, fmtExt := range imageFormats {
		if lower == fmtExt || (mime == "image/jpeg" && lower == ".jpeg") {
			return mime
		}
	}
	return "application/octet-stream"
}

// saveBytesToFile writes pre-decoded data to baseDir/filename.
// Returns the URL path (e.g. "/uploads/avatars/user.jpg").
func saveBytesToFile(baseDir, filename string, data []byte) (string, error) {
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		return "", fmt.Errorf("cannot create upload directory: %w", err)
	}
	// filepath.Base prevents path traversal
	dest := filepath.Join(baseDir, filepath.Base(filename))
	if err := os.WriteFile(dest, data, 0o644); err != nil {
		return "", fmt.Errorf("cannot write file: %w", err)
	}
	return "/" + filepath.ToSlash(dest), nil
}

// saveDataURLToFile decodes a base64 data URL and writes the file to baseDir/filename.
// Returns the URL path (e.g. "/uploads/courses/course-1/photo.jpg").
func saveDataURLToFile(baseDir, filename, dataURL string) (string, error) {
	decoded, err := decodeDataURL(dataURL)
	if err != nil {
		return "", err
	}
	return saveBytesToFile(baseDir, filename, decoded)
}

// extFromDataURL returns a file extension based on the MIME type in a data URL.
func extFromDataURL(dataURL string) string {
	semi := strings.Index(dataURL, ";")
	if semi == -1 || !strings.HasPrefix(dataURL, "data:") {
		return ".bin"
	}
	if ext, ok := imageFormats[dataURL[5:semi]]; ok {
		return ext
	}
	return ".bin"
}
