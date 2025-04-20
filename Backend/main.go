package main

import (
	"os"

	"tbd.com/logic"
)

func main() {
	// Setup the router
	router := logic.SetupRouter()

	// Get the port from the environment variable
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default to port 8080 if no PORT is set
	}

	// Run the server on the specified port
	router.Run(":" + port)
}
