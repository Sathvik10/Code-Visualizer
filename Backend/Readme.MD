1. go mod tidy
2. go mod vendor
3. go run .

Install goclangci-lint https://golangci-lint.run/welcome/install/#local-installation

API:

curl "http://localhost:8080/api/v1/file/kote?filepath=/Users/sathvikkote/Docs/Sathvik/Workspace/GitHub/go"

Resp: {"filepath":"/Users/sathvikkote/Docs/Sathvik/Workspace/GitHub/go","name":"kote","response":"Success"}

curl "http://localhost:8080/api/v1/gitstats/kote"

curl "http://localhost:8080/api/v1/treestructure/kote"

curl "http://localhost:8080/api/v1/lintissues/bzbmd"
