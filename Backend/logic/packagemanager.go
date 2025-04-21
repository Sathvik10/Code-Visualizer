package logic

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"tbd.com/utils"
)

var defaultIgnoreList = []string{
	".git",           // Git repository data
	".DS_Store",      // macOS system files
	".vscode",        // VS Code settings
	".idea",          // IntelliJ IDEA settings
	"node_modules",   // Node.js dependencies
	"__pycache__",    // Python cache
	".env",           // Environment variables
	"*.tmp",          // Temporary files
	"*.swp",          // Vim swap files
	"*.swo",          // Vim swap files
	"Thumbs.db",      // Windows thumbnail cache
	".gitignore",     // Git ignore file
	".gitattributes", // Git attributes file
	"*.log",          // Log files
	"vendor",         // Go vendor directory
	"bin",            // Binary directory
	"build",          // Build output directory
	"dist",           // Distribution directory
	".cache",         // Cache directory
	".github",        // GitHub settings
	".gitlab",        // GitLab settings
	"coverage",       // Test coverage reports
	"*.o",            // Object files
	"*.out",          // Output files
	"*.so",           // Shared object files
	"*.dll",          // DLL files
	"*.exe",          // Executable files
}

type PackageManager struct {
	name        string
	dirPath     string
	ProjectInfo utils.GoProjectInfo
	ca          *utils.CallGraphAnalyzer
}

// DirectoryInfo represents structure of a directory or file
type DirectoryInfo struct {
	Name     string          `json:"name"`
	Path     string          `json:"path"`
	IsDir    bool            `json:"isDir"`
	Children []DirectoryInfo `json:"children,omitempty"`
}

// NewPackageManager
func NewPackageManager(name, dirPath string) (PackageManager, error) {
	var err error
	projectInfo := utils.ValidateGoProject(dirPath)
	if !projectInfo.IsGoProject {
		return PackageManager{}, errors.New("not a go project")
	}
	ca := utils.NewCallGraphAnalyzer(dirPath)

	dirPath, err = filepath.Abs(dirPath)
	if err != nil {
		return PackageManager{}, fmt.Errorf("Error : ", err)
	}

	allPaths := []string{}
	filepath.WalkDir(dirPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if strings.Contains(path, "vendor") {
				return nil
			}

			if strings.Contains(path, ".git") {
				return nil
			}
			allPaths = append(allPaths, path)
		}
		return nil
	})

	fmt.Println("Loading packages...")

	err = ca.LoadPackages(dirPath, allPaths...)
	if err != nil {
		return PackageManager{}, err
	}

	return PackageManager{
		name:        name,
		dirPath:     dirPath,
		ProjectInfo: projectInfo,
		ca:          ca,
	}, nil
}

// GetTreeStructure
func (p PackageManager) GetTreeStructure(depth int) DirectoryInfo {
	return p.getDirectoryStructure(p.dirPath, p.dirPath, depth, 0)
}

func (p PackageManager) GetCodeFlow(path, functionName string) (*utils.FunctionNode, error) {
	dir, err := filepath.Abs(path)
	if err != nil {
		fmt.Printf("Error building function call tree: %v\n", err)
		return nil, fmt.Errorf("Error building function call tree: %v\n", err)
	}

	dir = filepath.Dir(dir)
	fmt.Println("Building function call tree...")
	visited := make(map[string]bool)
	functionTree, err := p.ca.BuildFunctionCallTree(dir, functionName, visited)
	if err != nil {
		fmt.Printf("Error building function call tree: %v\n", err)
		return nil, fmt.Errorf("Error building function call tree: %v\n", err)
	}

	return functionTree, nil
}

// getDirectoryStructure recursively builds the directory structure
func (p PackageManager) getDirectoryStructure(basePath, currentPath string, maxDepth, currentDepth int) DirectoryInfo {
	info, err := os.Stat(currentPath)
	if err != nil {
		// Return empty structure if error
		return DirectoryInfo{
			Name:  filepath.Base(currentPath),
			Path:  strings.TrimPrefix(currentPath, basePath),
			IsDir: false,
		}
	}

	// Create current directory/file info
	dirInfo := DirectoryInfo{
		Name:  filepath.Base(currentPath),
		Path:  strings.TrimPrefix(currentPath, basePath),
		IsDir: info.IsDir(),
	}

	// If it's not a directory or we've reached max depth, don't process children
	if !info.IsDir() || (maxDepth >= 0 && currentDepth >= maxDepth) {
		return dirInfo
	}

	// Read directory contents
	files, err := os.ReadDir(currentPath)
	if err != nil {
		return dirInfo
	}

	// Process each file/directory
	dirInfo.Children = make([]DirectoryInfo, 0, len(files))
	for _, file := range files {

		if p.shouldIgnore(file.Name(), defaultIgnoreList) {
			continue
		}

		childPath := filepath.Join(currentPath, file.Name())
		childInfo := p.getDirectoryStructure(basePath, childPath, maxDepth, currentDepth+1)
		dirInfo.Children = append(dirInfo.Children, childInfo)
	}

	return dirInfo
}

// shouldIgnore
func (p PackageManager) shouldIgnore(name string, ignorePatterns []string) bool {
	for _, pattern := range ignorePatterns {
		// Handle wildcard patterns
		if strings.HasPrefix(pattern, "*") {
			suffix := pattern[1:]
			if strings.HasSuffix(name, suffix) {
				return true
			}
		} else if name == pattern {
			return true
		}
	}
	return false
}

// GetGitStats
func (p PackageManager) GetGitStats() utils.GitStats {
	return utils.GetGitStats(p.dirPath)
}

// GetLintIssues
func (p PackageManager) GetLintIssues() (utils.LintIssues, error) {
	return utils.AnalyzeCodeWithGolangCILint(p.dirPath)
}

// FindFunctions
func (p PackageManager) FindFunctions(path string) ([]string, error) {
	return utils.FindFunctions(path)
}

// CloneRepo
func (p PackageManager) CloneRepo(url, branch string) error {
	return utils.CloneRepo(url, p.dirPath)
}

// GetFileContributions
func (p PackageManager) GetFileContributions(filePath string) ([]utils.FileContributor, error) {
	return utils.GetFileContributions(p.dirPath, filePath)
}

// GetFileContent
func (p PackageManager) GetFileContent(filePath string) (string, error) {
	stats, err := os.Stat(filePath)
	if err != nil {
		return "", err
	}
	if stats.IsDir() {
		return ":) Please select a file", nil
	}
	data, err := os.ReadFile(filePath) // or os.ReadFile for Go 1.16+
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// GetCodeCoverage retrieves code coverage statistics for the package
func (p PackageManager) GetCodeCoverage(specificPath string) (utils.CoverageStats, error) {
	// Clean and normalize the path
	cleanPath := ""
	if specificPath != "" {
		var err error
		cleanPath, err = filepath.Rel(p.dirPath, filepath.Join(p.dirPath, specificPath))
		if err != nil {
			return utils.CoverageStats{}, err
		}
	}

	return utils.GetCodeCoverage(p.dirPath, cleanPath)
}
