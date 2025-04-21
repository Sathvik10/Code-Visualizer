package logic

import (
	"net/http"
	"strconv"

	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Router struct {
	packageHandler PackageHandler
}

// NewRouter
func NewRouter() Router {
	return Router{
		packageHandler: NewPackageHandler(),
	}
}

// Handler functions
func (r Router) helloHandler(c *gin.Context) {
	// Get the input string from the request
	input := c.Param("input")

	// Return the response
	c.JSON(http.StatusOK, gin.H{
		"message": "hello",
		"input":   input,
	})
}

// CloneRepoRequest
type CloneRepoRequest struct {
	RepoURL    string `json:"repoURL"`
	FolderName string `json:"foldername"`
}

// cloneRepo
func (r Router) cloneRepo(c *gin.Context) {
	var req CloneRepoRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	path, err := r.packageHandler.CloneRepo(req.RepoURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	filePath := filepath.Join(path, req.FolderName)
	name := filepath.Base(filepath.Clean(path))
	resp, err := r.packageHandler.addPackage(filePath, name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"name":     name,
		"filepath": filePath,
		"response": resp,
	})
}

// addPath
func (r Router) addPath(c *gin.Context) {
	// Get the name path parameter
	name := c.Param("name")

	// Get the file path query parameter
	filePath := c.Query("filepath")

	// Check if the file path is provided
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing filepath query parameter",
		})
		return
	}

	resp, err := r.packageHandler.addPackage(filePath, name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"name":     name,
		"filepath": filePath,
		"response": resp,
	})
}

// getTreeStructure
func (r Router) getTreeStructure(c *gin.Context) {

	name := c.Param("package")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing path package parameter",
		})
		return
	}
	// Get the depth parameter (optional)
	depthStr := c.Query("depth")
	depth := -1 // -1 means unlimited depth
	if depthStr != "" {
		parsedDepth, err := strconv.Atoi(depthStr)
		if err == nil && parsedDepth >= 0 {
			depth = parsedDepth
		}
	}

	resp, err := r.packageHandler.GetTreeStructure(name, depth)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"response": resp,
	})
}

// getLintIssues
func (r Router) getLintIssues(c *gin.Context) {

	name := c.Param("package")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing path package parameter",
		})
		return
	}

	resp, err := r.packageHandler.GetLintIssues(name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"response": resp,
	})
}

// getGitStats
func (r Router) getGitStats(c *gin.Context) {

	name := c.Param("package")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing path package parameter",
		})
		return
	}

	resp, err := r.packageHandler.GetGitStats(name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"response": resp,
	})
}

// getFunctions
func (r Router) getFunctions(c *gin.Context) {
	name := c.Param("package")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing path package parameter",
		})
		return
	}
	// Get the file path query parameter
	filePath := c.Query("filepath")
	// Check if the file path is provided
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing filepath query parameter",
		})
		return
	}

	resp, err := r.packageHandler.FindFunctions(name, filePath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"response": resp,
	})
}

// getFileContent
func (r Router) getFileContent(c *gin.Context) {
	name := c.Param("package")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing path package parameter",
		})
		return
	}
	// Get the file path query parameter
	filePath := c.Query("filepath")
	// Check if the file path is provided
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing filepath query parameter",
		})
		return
	}

	resp, err := r.packageHandler.GetFileContent(name, filePath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"response": resp,
	})
}

// getCodeFlow
func (r Router) getCodeFlow(c *gin.Context) {
	name := c.Param("package")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing path package parameter",
		})
		return
	}
	// Get the file path query parameter
	filePath := c.Query("filepath")
	// Check if the file path is provided
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing filepath query parameter",
		})
		return
	}

	function := c.Query("function")
	if function == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing function query parameter",
		})
		return
	}

	resp, err := r.packageHandler.GetCodeFlow(name, filePath, function)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"response": resp,
	})
}

// getFileContributions
func (r Router) getFileContributions(c *gin.Context) {

	name := c.Param("package")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing path package parameter",
		})
		return
	}
	// Get the file path query parameter
	filePath := c.Query("filepath")
	// Check if the file path is provided
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing filepath query parameter",
		})
		return
	}

	resp, err := r.packageHandler.GetFileContributions(name, filePath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"response": resp,
	})
}

// Router setup
func SetupRouter() *gin.Engine {
	// Create a default gin router with default middleware
	router := gin.Default()

	// Add CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r := NewRouter()

	// API group for versioning
	v1 := router.Group("/api/v1")
	{
		// Hello endpoint
		v1.GET("/hello/:input", r.helloHandler)

		// Clone repository endpoint
		v1.POST("/clone", r.cloneRepo)

		v1.GET("/file/:name", r.addPath)

		v1.GET("/treestructure/:package", r.getTreeStructure)

		v1.GET("/gitstats/:package", r.getGitStats)

		v1.GET("/lintissues/:package", r.getLintIssues)

		v1.GET("/functions/:package", r.getFunctions)

		v1.GET("/filestats/:package", r.getFileContributions)

		v1.GET("/filecontent/:package", r.getFileContent)

		v1.GET("/codeflow/:package", r.getCodeFlow)
	}

	return router
}
