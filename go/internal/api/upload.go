package api

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// saveDataURLToFile decodes a base64 data URL and writes the file to baseDir/filename.
// Returns the URL path (e.g. "/uploads/courses/course-1/photo.jpg").
func saveDataURLToFile(baseDir, filename, dataURL string) (string, error) {
	comma := strings.Index(dataURL, ",")
	if comma == -1 {
		return "", fmt.Errorf("invalid data URL format")
	}
	decoded, err := base64.StdEncoding.DecodeString(dataURL[comma+1:])
	if err != nil {
		return "", fmt.Errorf("invalid base64 data")
	}
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		return "", fmt.Errorf("cannot create upload directory: %w", err)
	}
	// filepath.Base prevents path traversal
	dest := filepath.Join(baseDir, filepath.Base(filename))
	if err := os.WriteFile(dest, decoded, 0o644); err != nil {
		return "", fmt.Errorf("cannot write file: %w", err)
	}
	return "/" + filepath.ToSlash(dest), nil
}

// extFromDataURL returns a file extension based on the MIME type in a data URL.
func extFromDataURL(dataURL string) string {
	semi := strings.Index(dataURL, ";")
	if semi == -1 || !strings.HasPrefix(dataURL, "data:") {
		return ".bin"
	}
	switch dataURL[5:semi] {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ".bin"
	}
}
