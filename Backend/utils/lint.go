package utils

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// GolangCILintResult represents the structured output from golangci-lint
type GolangCILintResult struct {
	Issues []LintIssue `json:"Issues"`
	Report struct {
		Warnings []string `json:"Warnings"`
		Error    string   `json:"Error"`
	} `json:"Report"`
}

// LintIssue represents a single issue found by golangci-lint
type LintIssue struct {
	FromLinter  string   `json:"FromLinter"`
	Text        string   `json:"Text"`
	SourceLines []string `json:"SourceLines"`
	Pos         struct {
		Filename string `json:"Filename"`
		Line     int    `json:"Line"`
		Column   int    `json:"Column"`
	} `json:"Pos"`
	Replacement *struct {
		NeedOnlyDelete bool   `json:"NeedOnlyDelete"`
		NewLines       string `json:"NewLines"`
	} `json:"Replacement,omitempty"`
	// Additional fields omitted for brevity
}

type LintIssues []LintIssue

// RunGolangCILint executes golangci-lint on the specified repo path
func RunGolangCILint(repoPath string) (LintIssues, error) {
	// Prepare a temporary file for the JSON output
	outputFile := "lint-results.json"
	CreateGolangCIConfig(repoPath, outputFile)

	outputFile = filepath.Join(repoPath, outputFile)
	_, err := os.Stat(outputFile)
	if err != nil {
		// Execute golangci-lint with JSON output
		cmd := exec.Command(
			"golangci-lint", "run",
			"./...", // Check all packages in the module
		)
		cmd.Dir = repoPath
		cmd.Stdout = os.Stdout // Show progress output
		cmd.Stderr = os.Stderr

		fmt.Println("Running golangci-lint. This may take a while...")
		startTime := time.Now()

		// Execute command (ignoring error as it returns non-zero when issues found)
		_ = cmd.Run()

		elapsedTime := time.Since(startTime)
		fmt.Printf("golangci-lint completed in %.2f seconds\n", elapsedTime.Seconds())
	}

	// Check if output file was created
	if _, err := os.Stat(outputFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("golangci-lint did not produce output file")
	}

	// Read and parse the JSON output
	outputBytes, err := os.ReadFile(outputFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read golangci-lint output: %w", err)
	}

	var result GolangCILintResult
	if err := json.Unmarshal(outputBytes, &result); err != nil {
		return nil, fmt.Errorf("failed to parse golangci-lint output: %w", err)
	}

	// Check for errors in the report
	if result.Report.Error != "" {
		return nil, fmt.Errorf("golangci-lint reported error: %s", result.Report.Error)
	}

	// Print any warnings
	return result.Issues, nil
}

// GetLinterSummary categorizes lint issues by linter and file
func GetLinterSummary(issues []LintIssue) map[string]int {
	linterCounts := make(map[string]int)

	for _, issue := range issues {
		linterCounts[issue.FromLinter]++
	}

	return linterCounts
}

// GetFileSummary categorizes lint issues by file
func GetFileSummary(issues []LintIssue) map[string]int {
	fileCounts := make(map[string]int)

	for _, issue := range issues {
		fileCounts[issue.Pos.Filename]++
	}

	return fileCounts
}

// AnalyzeCodeWithGolangCILint runs golangci-lint and returns detailed results
func AnalyzeCodeWithGolangCILint(repoPath string) (LintIssues, error) {
	// Check if golangci-lint is installed
	_, err := exec.LookPath("golangci-lint")
	if err != nil {
		return nil, fmt.Errorf("golangci-lint not found: %w", err)
	}

	// Run the linter
	issues, err := RunGolangCILint(repoPath)
	if err != nil {
		return nil, fmt.Errorf("lint analysis failed: %w", err)
	}

	return issues, nil
}

// CreateGolangCIConfig creates a basic golangci-lint config file
func CreateGolangCIConfig(repoPath, outputpath string) error {
	configContent := fmt.Sprintf(`
version: "2"
linters:
  default: all
issues:
  max-issues-per-linter: 0
  max-same-issues: 0
formatters:
  enable:
    - gofmt
  exclusions:
    generated: lax
    paths:
      - third_party$
      - builtin$
      - examples$
output:
  formats:
    json:
      path: %s
`, outputpath)

	configPath := filepath.Join(repoPath, ".golangci.yml")

	// Check if config already exists
	if _, err := os.Stat(configPath); err == nil {
		fmt.Printf("Config file %s already exists. Not overwriting.\n", configPath)
		return nil
	}

	// Write config file
	if err := os.WriteFile(configPath, []byte(configContent), 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	fmt.Printf("Created golangci-lint config at %s\n", configPath)
	return nil
}
