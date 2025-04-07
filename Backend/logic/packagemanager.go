package logic

import (
	"errors"
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
}

// DirectoryInfo represents structure of a directory or file
type DirectoryInfo struct {
	Name     string          `json:"name"`
	Path     string          `json:"path"`
	IsDir    bool            `json:"isDir"`
	Children []DirectoryInfo `json:"children,omitempty"`
}

func NewPackageManager(name, dirPath string) (PackageManager, error) {
	projectInfo := utils.ValidateGoProject(dirPath)
	if !projectInfo.IsGoProject {
		return PackageManager{}, errors.New("not a go project")
	}
	return PackageManager{
		name:        name,
		dirPath:     dirPath,
		ProjectInfo: projectInfo,
	}, nil
}

func (p PackageManager) GetTreeStructure(depth int) DirectoryInfo {
	return p.getDirectoryStructure(p.dirPath, p.dirPath, depth, 0)
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

func (p PackageManager) GetGitStats() utils.GitStats {
	return utils.GetGitStats(p.dirPath)
}

func (p PackageManager) FindFunctions(path string) ([]string, error) {
	return utils.FindFunctions(path)
}

func (p PackageManager) CloneRepo(url, branch string) error {
	return utils.CloneRepo(url, p.dirPath)
}
