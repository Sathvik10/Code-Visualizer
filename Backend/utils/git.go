package utils

import (
	"fmt"
	"math"
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
	Name         string  `json:"name"`
	Email        string  `json:"email"`
	CommitCount  int     `json:"commitCount"`
	LinesAdded   int     `json:"linesAdded"`
	LinesDeleted int     `json:"linesDeleted"`
	AddedPct     float64 `json:"addedPercentage"`
	DeletedPct   float64 `json:"deletedPercentage"`
	TotalPct     float64 `json:"totalContributionPercentage"`
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
	Name         string  `json:"name"`
	Email        string  `json:"email"`
	CommitCount  int     `json:"commitCount"`
	LinesAdded   int     `json:"linesAdded"`
	LinesDeleted int     `json:"linesDeleted"`
	AddedPct     float64 `json:"addedPercentage"`
	DeletedPct   float64 `json:"deletedPercentage"`
	TotalPct     float64 `json:"totalContributionPercentage"`
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
	stats.Contributors = GetContributorsWithLineStats(cleanPath)

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

func GetContributorsWithLineStats(repoPath string) []GitContributor {
	// Get contributor names and emails first
	contributorsData, err := execGitCommand(repoPath, "shortlog", "-sne", "HEAD")
	if err != nil {
		return []GitContributor{}
	}

	// Parse contributors
	contributorMap := make(map[string]GitContributor)
	totalAdded := 0
	totalDeleted := 0

	lines := strings.Split(contributorsData, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Parse the shortlog output like: "123  John Doe <john@example.com>"
		re := regexp.MustCompile(`^\s*(\d+)\s+(.+)\s+<(.+)>$`)
		matches := re.FindStringSubmatch(line)

		if len(matches) == 4 {
			count, _ := strconv.Atoi(matches[1])
			contributor := GitContributor{
				Name:        matches[2],
				Email:       matches[3],
				CommitCount: count,
			}
			contributorMap[contributor.Email] = contributor
		}
	}

	// Now get line contribution stats
	// Use git log with numstat to get lines added/deleted by author
	logOutput, err := execGitCommand(repoPath, "log", "--numstat", "--pretty=format:commit %H%n%ae", ".")
	if err != nil {
		// Return the contributors we already have if we can't get line stats
		contributors := make([]GitContributor, 0, len(contributorMap))
		for _, contributor := range contributorMap {
			contributors = append(contributors, contributor)
		}
		return contributors
	}

	// Parse log output to extract line contributions
	lines = strings.Split(logOutput, "\n")
	currentEmail := ""

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Check if this is a commit line
		if strings.HasPrefix(line, "commit ") {
			continue
		}

		// Check if this is an email line
		if strings.Contains(line, "@") && !strings.Contains(line, "\t") {
			currentEmail = line
			continue
		}

		// This should be a stat line: "10  5  filename"
		parts := strings.Split(line, "\t")
		if len(parts) >= 2 && currentEmail != "" {
			added, _ := strconv.Atoi(parts[0])
			deleted, _ := strconv.Atoi(parts[1])

			if contributor, exists := contributorMap[currentEmail]; exists {
				contributor.LinesAdded += added
				contributor.LinesDeleted += deleted
				contributorMap[currentEmail] = contributor

				totalAdded += added
				totalDeleted += deleted
			}
		}
	}

	// Calculate percentages
	contributors := make([]GitContributor, 0, len(contributorMap))
	for _, contributor := range contributorMap {
		// Calculate percentages if we have changes
		if totalAdded > 0 {
			contributor.AddedPct = math.Round(float64(contributor.LinesAdded) / float64(totalAdded) * 100)
		}
		if totalDeleted > 0 {
			contributor.DeletedPct = math.Round(float64(contributor.LinesDeleted) / float64(totalDeleted) * 100)
		}

		// Calculate total contribution percentage (average of additions and deletions)
		totalChanges := totalAdded + totalDeleted
		if totalChanges > 0 {
			contributorChanges := contributor.LinesAdded + contributor.LinesDeleted
			contributor.TotalPct = math.Round(float64(contributorChanges) / float64(totalChanges) * 100)
		}

		contributors = append(contributors, contributor)
	}

	return contributors
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
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

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

	// Get commit stats for the file
	contribMap := make(map[string]FileContributor)

	// First get commit counts
	logOutput, err := execGitCommand(cleanPath, "log", "--follow", "--pretty=format:%an <%ae>", "--", filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get git log for file: %w", err)
	}

	lines := strings.Split(logOutput, "\n")
	for _, line := range lines {
		author := strings.TrimSpace(line)
		if author != "" {
			// Split into name and email
			re := regexp.MustCompile(`^(.*) <(.*)>$`)
			matches := re.FindStringSubmatch(author)
			if len(matches) == 3 {
				name := matches[1]
				email := matches[2]
				key := name + " <" + email + ">"

				if contrib, exists := contribMap[key]; exists {
					contrib.CommitCount++
					contribMap[key] = contrib
				} else {
					contribMap[key] = FileContributor{
						Name:        name,
						Email:       email,
						CommitCount: 1,
					}
				}
			}
		}
	}

	// Now get line stats for the file
	numstatOutput, err := execGitCommand(cleanPath, "log", "--follow", "--numstat", "--format=commit %H%n%an <%ae>", "--", filePath)
	if err != nil {
		print(err)
		// Return just commit counts if we can't get line stats
		contributors := make([]FileContributor, 0, len(contribMap))
		for _, contrib := range contribMap {
			contributors = append(contributors, contrib)
		}
		return contributors, nil
	}

	// Process numstat output to get line changes
	lines = strings.Split(numstatOutput, "\n")
	currentAuthor := ""
	totalAdded := 0
	totalDeleted := 0

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Check if this is a commit line
		if strings.HasPrefix(line, "\"commit ") {
			continue
		}

		// Check if this is an author line (contains email in <>)
		re := regexp.MustCompile(`^(.*) <(.*)>$`)
		if matches := re.FindStringSubmatch(line); len(matches) == 3 {
			currentAuthor = line // Store the full "Name <email>" as the key
			continue
		}

		// This should be a stat line: "10  5  filename"
		if currentAuthor != "" {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				added, _ := strconv.Atoi(parts[0])
				deleted, _ := strconv.Atoi(parts[1])

				if added > 0 || deleted > 0 {
					if contrib, exists := contribMap[currentAuthor]; exists {
						contrib.LinesAdded += added
						contrib.LinesDeleted += deleted
						contribMap[currentAuthor] = contrib

						totalAdded += added
						totalDeleted += deleted
					}
				}
			}
		}
	}

	// Calculate percentages and prepare final result
	contributors := make([]FileContributor, 0, len(contribMap))
	for _, contrib := range contribMap {
		// Calculate percentages if we have changes
		if totalAdded > 0 {
			contrib.AddedPct = math.Round(float64(contrib.LinesAdded) / float64(totalAdded) * 100)
		}
		if totalDeleted > 0 {
			contrib.DeletedPct = math.Round(float64(contrib.LinesDeleted) / float64(totalDeleted) * 100)
		}

		// Calculate total contribution percentage (average of additions and deletions)
		totalChanges := totalAdded + totalDeleted
		if totalChanges > 0 {
			contributorChanges := contrib.LinesAdded + contrib.LinesDeleted
			contrib.TotalPct = math.Round(float64(contributorChanges) / float64(totalChanges) * 100)
		}

		contributors = append(contributors, contrib)
	}

	return contributors, nil
}

// Add this to your router setup
// v1.GET("/git/stats", getGitStats)
