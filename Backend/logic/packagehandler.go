package logic

import (
	"errors"
	"os"
	"path/filepath"

	"tbd.com/utils"
)

type PackageHandler struct {
	packages map[string]PackageManager
}

func NewPackageHandler() PackageHandler {
	return PackageHandler{
		packages: make(map[string]PackageManager),
	}
}

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
		return "", errors.New("package name already in use. give another name")
	}

	pm, err := NewPackageManager(name, cleanPath)
	if err != nil {
		return "", err
	}

	p.packages[name] = pm

	return "Success", nil
}

func (p PackageHandler) GetTreeStructure(name string, depth int) (DirectoryInfo, error) {
	if _, ok := p.packages[name]; !ok {
		return DirectoryInfo{}, errors.New("unknown package")
	}
	return p.packages[name].GetTreeStructure(depth), nil
}

func (p PackageHandler) GetGitStats(name string) (utils.GitStats, error) {
	if _, ok := p.packages[name]; !ok {
		return utils.GitStats{}, errors.New("unknown package")
	}
	return p.packages[name].GetGitStats(), nil
}

func (p PackageHandler) GetLintIssues(name string) (utils.LintIssues, error) {
	if _, ok := p.packages[name]; !ok {
		return utils.LintIssues{}, errors.New("unknown package")

	}
	return p.packages[name].GetLintIssues()
}

func (p PackageHandler) FindFunctions(name, path string) ([]string, error) {
	if _, ok := p.packages[name]; !ok {
		return nil, errors.New("unknown package")
	}
	return p.packages[name].FindFunctions(path)
}

func (p PackageHandler) GetFileContributions(name, filePath string) ([]utils.FileContributor, error) {
	if _, ok := p.packages[name]; !ok {
		return nil, errors.New("unknown package")
	}
	return p.packages[name].GetFileContributions(filePath)
}

func (p PackageHandler) GetFileContent(name, filePath string) (string, error) {
	if _, ok := p.packages[name]; !ok {
		return "", errors.New("unknown package")
	}
	return p.packages[name].GetFileContent(filePath)
}

func (p PackageHandler) CloneRepo(repoURL string) (string, error) {
	// Get present working directory
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	// Create the directory for the package if it doesn't exist
	packDir := filepath.Join("repos", utils.GenerateRandomAlphanumericString(5))
	if _, err := os.Stat(packDir); os.IsNotExist(err) {
		if err := os.MkdirAll(packDir, os.ModePerm); err != nil {
			return "", err
		}
	}
	return packDir, utils.CloneRepo(repoURL, filepath.Join(cwd, packDir))
	// return nil
}
