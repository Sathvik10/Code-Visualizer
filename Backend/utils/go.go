package utils

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"math/rand"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// GoProjectInfo contains information about a Go project
type GoProjectInfo struct {
	IsGoProject  bool     `json:"isGoProject"`
	ModuleName   string   `json:"moduleName,omitempty"`
	GoVersion    string   `json:"goVersion,omitempty"`
	GoFiles      int      `json:"goFiles,omitempty"`
	Packages     []string `json:"packages,omitempty"`
	HasTests     bool     `json:"hasTests,omitempty"`
	Dependencies int      `json:"dependencies,omitempty"`
	Error        string   `json:"error,omitempty"`
}

// validateGoProject checks if a directory is a Go project
func ValidateGoProject(cleanPath string) GoProjectInfo {
	// Initialize project info
	projectInfo := GoProjectInfo{
		IsGoProject: false,
	}

	// Check for go.mod file (primary indicator of a Go module)
	goModPath := filepath.Join(cleanPath, "go.mod")
	if _, err := os.Stat(goModPath); err == nil {
		projectInfo.IsGoProject = true

		// Parse go.mod to extract module name and Go version
		goModContent, err := os.ReadFile(goModPath)
		if err == nil {
			// Extract module name using regex
			moduleRegex := regexp.MustCompile(`module\s+([^\s]+)`)
			moduleMatches := moduleRegex.FindSubmatch(goModContent)
			if len(moduleMatches) > 1 {
				projectInfo.ModuleName = string(moduleMatches[1])
			}

			// Extract Go version using regex
			goVersionRegex := regexp.MustCompile(`go\s+(\d+\.\d+(?:\.\d+)?)`)
			versionMatches := goVersionRegex.FindSubmatch(goModContent)
			if len(versionMatches) > 1 {
				projectInfo.GoVersion = string(versionMatches[1])
			}

			// Count dependencies
			depsRegex := regexp.MustCompile(`require\s+[^\s]+`)
			depsMatches := depsRegex.FindAllSubmatch(goModContent, -1)
			projectInfo.Dependencies = len(depsMatches)
		}
	} else {
		// Even without go.mod, check for .go files as a fallback
		// This could be a pre-modules Go project
		files, err := os.ReadDir(cleanPath)
		if err == nil {
			for _, file := range files {
				if !file.IsDir() && strings.HasSuffix(file.Name(), ".go") {
					projectInfo.IsGoProject = true
					break
				}
			}
		}
	}

	// If it's a Go project, collect more information
	if projectInfo.IsGoProject {
		// Count Go files and identify packages
		packages := make(map[string]struct{})
		var hasTests bool
		var goFileCount int

		// Walk the directory recursively
		err := filepath.Walk(cleanPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil // Skip files that can't be accessed
			}

			// Skip vendor directory if present
			if info.IsDir() && info.Name() == "vendor" {
				return filepath.SkipDir
			}

			// Process .go files only
			if !info.IsDir() && strings.HasSuffix(info.Name(), ".go") {
				goFileCount++

				// Check if it's a test file
				if strings.HasSuffix(info.Name(), "_test.go") {
					hasTests = true
				}

				// Extract package name (simple implementation)
				content, err := os.ReadFile(path)
				if err == nil {
					pkgRegex := regexp.MustCompile(`package\s+([^\s]+)`)
					matches := pkgRegex.FindSubmatch(content)
					if len(matches) > 1 {
						pkgName := string(matches[1])
						packages[pkgName] = struct{}{}
					}
				}
			}
			return nil
		})

		if err == nil {
			projectInfo.GoFiles = goFileCount
			projectInfo.HasTests = hasTests

			// Convert package set to slice
			projectInfo.Packages = make([]string, 0, len(packages))
			for pkg := range packages {
				projectInfo.Packages = append(projectInfo.Packages, pkg)
			}
		}
	}

	return projectInfo
}

// FindFunctions extracts all function names from a Go file or directory
func FindFunctions(path string) ([]string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, err
	}
	path = filepath.Join(cwd, path)
	fileInfo, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("error accessing path %s: %w", path, err)
	}

	var functions []string

	if fileInfo.IsDir() {
		// Process all Go files in the directory
		return nil, fmt.Errorf("not a Go file: %s", path)
	} else {
		// Process single Go file
		if !strings.HasSuffix(path, ".go") {
			return nil, fmt.Errorf("not a Go file: %s", path)
		}
		functions, err = extractFunctionsFromFile(path)
		if err != nil {
			return nil, fmt.Errorf("error processing file %s: %w", path, err)
		}
	}

	return functions, nil
}

// extractFunctionsFromFile parses a Go source file and extracts all function names
func extractFunctionsFromFile(filePath string) ([]string, error) {
	// Create file set
	fset := token.NewFileSet()

	// Parse the Go source file
	node, err := parser.ParseFile(fset, filePath, nil, 0)
	if err != nil {
		return nil, fmt.Errorf("parsing error: %w", err)
	}

	var functions []string

	// Extract function names
	ast.Inspect(node, func(n ast.Node) bool {
		switch fn := n.(type) {
		case *ast.FuncDecl:
			// Get function name
			funcName := fn.Name.Name

			// For methods, include the receiver type
			if fn.Recv != nil {
				for _, field := range fn.Recv.List {
					var typeName string

					// Check if it's a pointer receiver
					if star, ok := field.Type.(*ast.StarExpr); ok {
						if ident, ok := star.X.(*ast.Ident); ok {
							typeName = "*" + ident.Name
						}
					} else if ident, ok := field.Type.(*ast.Ident); ok {
						typeName = ident.Name
					}

					if typeName != "" {
						funcName = fmt.Sprintf("(%s).%s", typeName, funcName)
						break
					}
				}
			}

			functions = append(functions, funcName)
		}
		return true
	})

	return functions, nil
}

func GenerateRandomAlphanumericString(length int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
