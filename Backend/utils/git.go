package utils

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// GitStats represents git repository statistics
type GitStats struct {
	RepoPath     string           `json:"repoPath"`
	BranchName   string           `json:"branchName"`
	LastCommit   GitCommit        `json:"lastCommit"`
	CommitCount  int              `json:"commitCount"`
	Contributors []GitContributor `json:"contributors"`
	FileStats    GitFileStats     `json:"fileStats"`
	Status       []GitStatusEntry `json:"status,omitempty"`
	Error        string           `json:"error,omitempty"`
}

// GitCommit represents a git commit
type GitCommit struct {
	Hash    string `json:"hash"`
	Author  string `json:"author"`
	Email   string `json:"email"`
	Date    string `json:"date"`
	Message string `json:"message"`
}

// GitContributor represents statistics for a single contributor
type GitContributor struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	CommitCount int    `json:"commitCount"`
}

// GitFileStats represents file statistics for the repository
type GitFileStats struct {
	TotalFiles   int `json:"totalFiles"`
	AddedLines   int `json:"addedLines"`
	DeletedLines int `json:"deletedLines"`
	TotalLines   int `json:"totalLines"`
}

// GitStatusEntry represents a single entry in git status
type GitStatusEntry struct {
	Path   string `json:"path"`
	Status string `json:"status"`
}

// FileContributor represents commit count per person for a file
type FileContributor struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	CommitCount int    `json:"commitCount"`
}

// getGitStats retrieves git statistics for a repository
func GetGitStats(cleanPath string) GitStats {
	// Initialize stats object
	stats := GitStats{
		RepoPath: cleanPath,
	}

	// Get current branch
	branch, err := execGitCommand(cleanPath, "rev-parse", "--abbrev-ref", "HEAD")
	if err == nil {
		stats.BranchName = strings.TrimSpace(branch)
	} else {
		stats.Error = "Failed to get branch information"
		return stats
	}

	// Get last commit info
	lastCommitHash, err := execGitCommand(cleanPath, "rev-parse", "HEAD")
	if err == nil {
		stats.LastCommit.Hash = strings.TrimSpace(lastCommitHash)

		// Get commit details
		commitInfo, err := execGitCommand(cleanPath, "show", "-s", "--format=%an%n%ae%n%ad%n%s", stats.LastCommit.Hash)
		if err == nil {
			lines := strings.Split(commitInfo, "\n")
			if len(lines) >= 4 {
				stats.LastCommit.Author = lines[0]
				stats.LastCommit.Email = lines[1]
				stats.LastCommit.Date = lines[2]
				stats.LastCommit.Message = lines[3]
			}
		}
	}

	// Get commit count
	commitCountStr, err := execGitCommand(cleanPath, "rev-list", "--count", "HEAD")
	if err == nil {
		stats.CommitCount, _ = strconv.Atoi(strings.TrimSpace(commitCountStr))
	}

	// Get contributors
	contributorsData, err := execGitCommand(cleanPath, "shortlog", "-sne", "HEAD")
	if err == nil {
		lines := strings.Split(contributorsData, "\n")
		stats.Contributors = make([]GitContributor, 0, len(lines))

		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			// Parse the shortlog output like: "123	John Doe <john@example.com>"
			re := regexp.MustCompile(`^\s*(\d+)\s+(.+)\s+<(.+)>$`)
			matches := re.FindStringSubmatch(line)

			if len(matches) == 4 {
				count, _ := strconv.Atoi(matches[1])
				contributor := GitContributor{
					Name:        matches[2],
					Email:       matches[3],
					CommitCount: count,
				}
				stats.Contributors = append(stats.Contributors, contributor)
			}
		}
	}

	// Get file stats
	stats.FileStats = GitFileStats{}

	// Count files tracked by git
	fileCountStr, err := execGitCommand(cleanPath, "ls-files", "--cached", "--others", "--exclude-standard", "--count")
	if err == nil {
		stats.FileStats.TotalFiles, _ = strconv.Atoi(strings.TrimSpace(fileCountStr))
	}

	// Get line stats
	diffStats, err := execGitCommand(cleanPath, "diff", "--shortstat", "HEAD~1", "HEAD")
	if err == nil && diffStats != "" {
		// Parse diff stats like: "10 files changed, 200 insertions(+), 100 deletions(-)"
		reInsertions := regexp.MustCompile(`(\d+) insertion`)
		reDeletions := regexp.MustCompile(`(\d+) deletion`)

		insertMatches := reInsertions.FindStringSubmatch(diffStats)
		if len(insertMatches) == 2 {
			stats.FileStats.AddedLines, _ = strconv.Atoi(insertMatches[1])
		}

		deleteMatches := reDeletions.FindStringSubmatch(diffStats)
		if len(deleteMatches) == 2 {
			stats.FileStats.DeletedLines, _ = strconv.Atoi(deleteMatches[1])
		}
	}

	// Calculate total lines (approximate)
	linesOutput, err := execGitCommand(cleanPath, "ls-files", "|", "xargs", "wc", "-l")
	if err == nil {
		lines := strings.Split(linesOutput, "\n")
		for _, line := range lines {
			// Look for the total line count
			if strings.Contains(line, "total") {
				totalParts := strings.Fields(line)
				if len(totalParts) >= 1 {
					stats.FileStats.TotalLines, _ = strconv.Atoi(totalParts[0])
				}
				break
			}
		}
	}

	// Get current status
	statusOutput, err := execGitCommand(cleanPath, "status", "--porcelain")
	if err == nil && statusOutput != "" {
		lines := strings.Split(statusOutput, "\n")
		stats.Status = make([]GitStatusEntry, 0, len(lines))

		for _, line := range lines {
			if line = strings.TrimSpace(line); line == "" {
				continue
			}

			// Status is first 2 chars, path is the rest
			if len(line) > 3 {
				status := line[0:2]
				path := strings.TrimSpace(line[2:])

				entry := GitStatusEntry{
					Path:   path,
					Status: translateGitStatus(status),
				}
				stats.Status = append(stats.Status, entry)
			}
		}
	}

	return stats
}

// execGitCommand runs a git command in the specified directory
func execGitCommand(dir string, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir

	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	return string(output), nil
}

// translateGitStatus converts git status codes to readable descriptions
func translateGitStatus(code string) string {
	code = strings.TrimSpace(code)

	switch code {
	case "M":
		return "Modified"
	case "A":
		return "Added"
	case "D":
		return "Deleted"
	case "R":
		return "Renamed"
	case "C":
		return "Copied"
	case "U":
		return "Updated but unmerged"
	case "??":
		return "Untracked"
	case "!!":
		return "Ignored"
	default:
		return code
	}
}

func CloneRepo(url, dir string) error {
	fmt.Println("Cloning repo from URL:", url)
	fmt.Println("Cloning to directory:", dir)

	// Execute git clone command
	cmd := exec.Command("git", "clone", url, dir)
	// cmd.Stdout = os.Stdout
	// cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git clone failed: %w", err)
	}

	return nil
}

func GetFileContributions(cleanPath, filePath string) ([]FileContributor, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, err
	}
	filePath = filepath.Join(cwd, filePath)
	fmt.Println("File path:", filePath)
	logOutput, err := execGitCommand(cleanPath, "log", "--follow", "--pretty=format:%an <%ae>", "--", filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get git log for file: %w", err)
	}

	lines := strings.Split(logOutput, "\n")
	contribMap := make(map[string]int)

	for _, line := range lines {
		author := strings.TrimSpace(line)
		if author != "" {
			contribMap[author]++
		}
	}

	contributors := make([]FileContributor, 0, len(contribMap))
	for fullAuthor, count := range contribMap {
		// Split into name and email
		re := regexp.MustCompile(`^(.*) <(.*)>$`)
		matches := re.FindStringSubmatch(fullAuthor)
		if len(matches) == 3 {
			contributors = append(contributors, FileContributor{
				Name:        matches[1],
				Email:       matches[2],
				CommitCount: count,
			})
		}
	}

	return contributors, nil
}

// Add this to your router setup
// v1.GET("/git/stats", getGitStats)
