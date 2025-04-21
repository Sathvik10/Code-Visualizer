package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// CoverageStats represents code coverage statistics
type CoverageStats struct {
	TotalCoverage  float64                 `json:"totalCoverage"`
	FilesCovered   int                     `json:"filesCovered"`
	TotalFiles     int                     `json:"totalFiles"`
	FileCoverages  map[string]FileCoverage `json:"fileCoverages"`
	CoverageReport string                  `json:"coverageReport"`
}

// FileCoverage represents coverage for a single file
type FileCoverage struct {
	FilePath     string  `json:"filePath"`
	CoveragePerc float64 `json:"coveragePerc"`
	Statements   int     `json:"statements"`
	Covered      int     `json:"covered"`
}

// CacheEntry with timestamp for expiration
type CacheEntry struct {
	Stats    CoverageStats `json:"stats"`
	Modified time.Time     `json:"modified"`
}

// CacheFile represents the entire cache storage
type CacheFile struct {
	Entries map[string]CacheEntry `json:"entries"`
}

// Cache configuration
var (
	cacheMutex    sync.RWMutex
	cacheDuration = 10 * time.Minute // Cache expiration time
	cacheFilePath = filepath.Join(os.TempDir(), "coverage-cache.json")
)

// GetCodeCoverage runs go test with coverage and returns the results
// Now with file-based caching for persistence and lower memory usage
func GetCodeCoverage(projectPath string, specificPath string) (CoverageStats, error) {
	// Create cache key from project path and specific path
	cacheKey := projectPath
	if specificPath != "" && specificPath != "/" {
		cacheKey = filepath.Join(cacheKey, specificPath)
	}

	// Check cache first
	cacheMutex.RLock()
	cacheData, err := loadCacheFromFile()
	if err == nil {
		if entry, exists := cacheData.Entries[cacheKey]; exists {
			// Check if cache is still valid (not expired)
			if time.Since(entry.Modified) < cacheDuration {
				cacheMutex.RUnlock()
				return entry.Stats, nil
			}
		}
	}
	cacheMutex.RUnlock()

	// Cache miss or expired, compute coverage
	result := CoverageStats{
		FileCoverages: make(map[string]FileCoverage),
	}

	// Determine the target directory for coverage analysis
	targetPath := projectPath
	if specificPath != "" && specificPath != "/" {
		targetPath = filepath.Join(projectPath, specificPath)
	}

	// Create a temporary file for coverage profile
	coverageFile := filepath.Join(os.TempDir(), "coverage.out")

	// Execute go test with coverage
	cmd := exec.Command("go", "test", "./...", "-coverprofile="+coverageFile)
	cmd.Dir = targetPath

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil {
		// Tests may fail but still generate coverage data
		if _, statErr := os.Stat(coverageFile); statErr != nil {
			return result, fmt.Errorf("failed to run tests: %v\n%s", err, stderr.String())
		}
	}

	// Read coverage data
	coverData, err := os.ReadFile(coverageFile)
	if err != nil {
		return result, fmt.Errorf("failed to read coverage file: %v", err)
	}

	// Get detailed coverage report
	cmd = exec.Command("go", "tool", "cover", "-func="+coverageFile)
	cmd.Dir = targetPath

	var funcOutput bytes.Buffer
	cmd.Stdout = &funcOutput
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return result, fmt.Errorf("failed to generate coverage report: %v\n%s", err, stderr.String())
	}

	result.CoverageReport = funcOutput.String()

	// Parse per-file coverage
	coverLines := strings.Split(string(coverData), "\n")
	if len(coverLines) <= 1 {
		return result, fmt.Errorf("no coverage data found")
	}

	// Parse function output for file coverages
	funcLines := strings.Split(funcOutput.String(), "\n")

	var totalFiles, filesCovered int
	totalRegex := regexp.MustCompile(`total:\s+\(statements\)\s+([^%]+)%`)

	for _, line := range funcLines {
		// Skip empty lines
		if strings.TrimSpace(line) == "" {
			continue
		}

		// Check if it's the total line
		totalMatches := totalRegex.FindStringSubmatch(line)
		if len(totalMatches) > 1 {
			coverStr := strings.TrimSpace(totalMatches[1])
			result.TotalCoverage, _ = strconv.ParseFloat(coverStr, 64)
			continue
		}

		// Process individual file lines
		// Convert tabs to commas for easy parsing
		csvLine := strings.ReplaceAll(line, "\t", ",")
		parts := strings.Split(csvLine, ",")

		// Clean up the parts by removing empty strings
		var cleanParts []string
		for _, part := range parts {
			if strings.TrimSpace(part) != "" {
				cleanParts = append(cleanParts, strings.TrimSpace(part))
			}
		}

		// Need at least file path and coverage percentage
		if len(cleanParts) < 3 {
			continue
		}

		// Last element should be coverage percentage
		coverageStr := strings.TrimSuffix(cleanParts[len(cleanParts)-1], "%")
		coverageFloat, err := strconv.ParseFloat(coverageStr, 64)
		if err != nil {
			continue
		}

		// Extract file path
		fileParts := strings.Split(cleanParts[0], ":")
		filePath := fileParts[0]

		// Add to file coverages
		relPath := strings.TrimPrefix(filePath, projectPath)
		totalFiles++
		if coverageFloat > 0 {
			filesCovered++
		}

		// Extract statements and covered for this file
		stmts, covered := getStatementsAndCovered(coverLines, filePath)

		result.FileCoverages[relPath] = FileCoverage{
			FilePath:     relPath,
			CoveragePerc: coverageFloat,
			Statements:   stmts,
			Covered:      covered,
		}
	}

	result.TotalFiles = totalFiles
	result.FilesCovered = filesCovered

	// Clean up temporary file
	os.Remove(coverageFile)

	// Store in cache
	cacheMutex.Lock()
	defer cacheMutex.Unlock()

	// Load latest cache data or create new if not exists
	cacheData, err = loadCacheFromFile()
	if err != nil {
		cacheData = CacheFile{
			Entries: make(map[string]CacheEntry),
		}
	}

	// Update cache with new data
	cacheData.Entries[cacheKey] = CacheEntry{
		Stats:    result,
		Modified: time.Now(),
	}

	// Save updated cache
	saveCacheToFile(cacheData)

	return result, nil
}

// Helper function to extract statements and covered counts from coverage profile
func getStatementsAndCovered(coverLines []string, filePath string) (int, int) {
	stmts := 0
	covered := 0

	// Skip first mode line
	for i := 1; i < len(coverLines); i++ {
		line := coverLines[i]
		if !strings.HasPrefix(line, filePath+":") {
			continue
		}

		parts := strings.Split(line, " ")
		if len(parts) < 3 {
			continue
		}

		// Format: file:line.column,line.column numstmt count
		stmtCount, err := strconv.Atoi(parts[1])
		if err != nil {
			continue
		}

		coverCount, err := strconv.Atoi(parts[2])
		if err != nil {
			continue
		}

		stmts += stmtCount
		if coverCount > 0 {
			covered += stmtCount
		}
	}

	return stmts, covered
}

// loadCacheFromFile loads the cache from the file system
func loadCacheFromFile() (CacheFile, error) {
	var cacheData CacheFile

	// Check if file exists
	if _, err := os.Stat(cacheFilePath); os.IsNotExist(err) {
		return CacheFile{Entries: make(map[string]CacheEntry)}, err
	}

	// Read file
	data, err := os.ReadFile(cacheFilePath)
	if err != nil {
		return CacheFile{Entries: make(map[string]CacheEntry)}, err
	}

	// Parse JSON
	err = json.Unmarshal(data, &cacheData)
	if err != nil {
		return CacheFile{Entries: make(map[string]CacheEntry)}, err
	}

	return cacheData, nil
}

// saveCacheToFile saves the cache to the file system
func saveCacheToFile(cacheData CacheFile) error {
	// Convert to JSON
	data, err := json.Marshal(cacheData)
	if err != nil {
		return err
	}

	// Write to file
	return os.WriteFile(cacheFilePath, data, 0644)
}

// ClearCoverageCache clears the coverage cache file
func ClearCoverageCache() error {
	cacheMutex.Lock()
	defer cacheMutex.Unlock()

	// Remove cache file if it exists
	if _, err := os.Stat(cacheFilePath); err == nil {
		return os.Remove(cacheFilePath)
	}
	return nil
}

// SetCacheDuration changes the duration for which cache entries remain valid
func SetCacheDuration(duration time.Duration) {
	cacheMutex.Lock()
	defer cacheMutex.Unlock()
	cacheDuration = duration
}

// SetCacheFilePath changes the path where the cache file is stored
func SetCacheFilePath(path string) {
	cacheMutex.Lock()
	defer cacheMutex.Unlock()
	cacheFilePath = path
}
