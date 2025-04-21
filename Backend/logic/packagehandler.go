package logic

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"tbd.com/utils"
)

// PackageHandler
type PackageHandler struct {
	packages map[string]PackageManager
}

// NewPackageHandler
func NewPackageHandler() PackageHandler {
	return PackageHandler{
		packages: make(map[string]PackageManager),
	}
}

// addPackage
func (p PackageHandler) addPackage(filePath, name string) (string, error) {

	// Validate the file path to prevent directory traversal attacks
	cleanPath := filepath.Clean(filePath)
	if !filepath.IsAbs(cleanPath) {
		cleanPath = filepath.Join(".", cleanPath)
	}

	// Check if file exists
	info, err := os.Stat(cleanPath)
	if err != nil {
		return "", err
	}

	// Check if it's a directory
	if !info.IsDir() {
		return "", errors.New("path is a file, not a directory file")
	}

	if _, ok := p.packages[name]; ok {
		return "Success", nil
		// return "", errors.New("package name already in use. give another name")
	}

	pm, err := NewPackageManager(name, cleanPath)
	if err != nil {
		return "", err
	}

	p.packages[name] = pm

	return "Success", nil
}

// GetTreeStructure
func (p PackageHandler) GetTreeStructure(name string, depth int) (DirectoryInfo, error) {
	if _, ok := p.packages[name]; !ok {
		return DirectoryInfo{}, errors.New("unknown package")
	}
	return p.packages[name].GetTreeStructure(depth), nil
}

// GetGitStats
func (p PackageHandler) GetGitStats(name string) (utils.GitStats, error) {
	if _, ok := p.packages[name]; !ok {
		return utils.GitStats{}, errors.New("unknown package")
	}
	return p.packages[name].GetGitStats(), nil
}

// GetLintIssues
func (p PackageHandler) GetLintIssues(name string) (utils.LintIssues, error) {
	if _, ok := p.packages[name]; !ok {
		return utils.LintIssues{}, errors.New("unknown package")
	}
	return p.packages[name].GetLintIssues()
}

// FindFunctions
func (p PackageHandler) FindFunctions(name, path string) ([]string, error) {
	if _, ok := p.packages[name]; !ok {
		return nil, errors.New("unknown package")
	}
	return p.packages[name].FindFunctions(path)
}

// GetFileContributions
func (p PackageHandler) GetFileContributions(name, filePath string) ([]utils.FileContributor, error) {
	if _, ok := p.packages[name]; !ok {
		return nil, errors.New("unknown package")
	}
	return p.packages[name].GetFileContributions(filePath)
}

// GetFileContent
func (p PackageHandler) GetFileContent(name, filePath string) (string, error) {
	if _, ok := p.packages[name]; !ok {
		return "", errors.New("unknown package")
	}
	return p.packages[name].GetFileContent(filePath)
}

// GetFileContent
func (p PackageHandler) GetCodeFlow(name, path, function string) (*utils.FunctionNode, error) {
	if _, ok := p.packages[name]; !ok {
		return nil, errors.New("unknown package")
	}
	return p.packages[name].GetCodeFlow(path, function)
}

// CloneRepo clones a GitHub repo into a local directory named after the username and repo name.
// If the folder already exists, it assumes it's already cloned and returns successfully.
func (p PackageHandler) CloneRepo(repoURL string) (string, error) {
	// Get present working directory
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// Extract username and repo name from URL
	trimmedURL := strings.TrimSuffix(repoURL, "/")
	parts := strings.Split(trimmedURL, "/")
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid repo URL: %s", repoURL)
	}
	username := parts[len(parts)-2]
	repoName := parts[len(parts)-1]

	// Create folder name
	folderName := username + "-" + repoName
	packDir := filepath.Join("repos", folderName)

	if _, err := os.Stat(filepath.Join(cwd, packDir)); err == nil {
		// Directory already exists, no need to clone
		return packDir, nil
	}

	// Create the directory
	if err := os.MkdirAll(packDir, os.ModePerm); err != nil {
		return "", err
	}

	// Clone the repository
	return packDir, utils.CloneRepo(repoURL, filepath.Join(cwd, packDir))
}
