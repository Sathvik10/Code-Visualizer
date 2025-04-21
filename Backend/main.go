package main

import "tbd.com/logic"

func main() {

	// Setup the router
	router := logic.SetupRouter()

	// Run the server on port 8080
	router.Run("0.0.0.0:8080")
}
