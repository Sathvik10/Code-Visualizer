package utils

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"strings"
)

// FunctionNode represents a node in our call tree
type FunctionNode struct {
	Name     string
	File     string
	Line     int
	Children []*FunctionNode
}

// NewFunctionNode creates a new function node
func NewFunctionNode(name string, file string, line int) *FunctionNode {
	return &FunctionNode{
		Name:     name,
		File:     file,
		Line:     line,
		Children: []*FunctionNode{},
	}
}

// AddChild adds a called function to this function's children
func (fn *FunctionNode) AddChild(child *FunctionNode) {
	fn.Children = append(fn.Children, child)
}

// CodeAnalyzer analyzes Go code to build function call trees
type CodeAnalyzer struct {
	fset          *token.FileSet
	packages      map[string]*ast.Package
	functionNodes map[string]*FunctionNode
	currentPkg    string
}

// NewCodeAnalyzer creates a new code analyzer
func NewCodeAnalyzer() *CodeAnalyzer {
	return &CodeAnalyzer{
		fset:          token.NewFileSet(),
		packages:      make(map[string]*ast.Package),
		functionNodes: make(map[string]*FunctionNode),
	}
}

// ParseDirectory parses all Go files in a directory
func (ca *CodeAnalyzer) ParseDirectory(dir string) error {
	packages, err := parser.ParseDir(ca.fset, dir, nil, parser.ParseComments)
	if err != nil {
		return err
	}

	for name, pkg := range packages {
		ca.packages[name] = pkg
	}
	return nil
}

// BuildFunctionCallTree builds a function call tree starting from the specified function
func (ca *CodeAnalyzer) BuildFunctionCallTree(funcName string) (*FunctionNode, error) {
	pkgName := ""
	for k := range ca.packages {
		if !strings.Contains(k, "_test") {
			pkgName = k
			break
		}
	}

	pkg, ok := ca.packages[pkgName]
	if !ok {
		return nil, fmt.Errorf("package not found: %s", pkgName)
	}

	// First pass: find and register all functions
	ca.currentPkg = pkgName
	ca.analyzeFunctions(pkg)

	// Second pass: build the call tree
	rootFunc, ok := ca.functionNodes[pkgName+"."+funcName]
	if !ok {
		return nil, fmt.Errorf("function not found: %s.%s", pkgName, funcName)
	}

	ca.analyzeCallExpressions(pkg, rootFunc)
	return rootFunc, nil
}

// analyzeFunctions finds all functions in a package and registers them
func (ca *CodeAnalyzer) analyzeFunctions(pkg *ast.Package) {
	for filename, file := range pkg.Files {
		ast.Inspect(file, func(n ast.Node) bool {
			if funcDecl, ok := n.(*ast.FuncDecl); ok {
				position := ca.fset.Position(funcDecl.Pos())
				funcName := funcDecl.Name.Name

				// Handle methods
				if funcDecl.Recv != nil && len(funcDecl.Recv.List) > 0 {
					var recvType string
					switch t := funcDecl.Recv.List[0].Type.(type) {
					case *ast.StarExpr:
						if ident, ok := t.X.(*ast.Ident); ok {
							recvType = "*" + ident.Name
						}
					case *ast.Ident:
						recvType = t.Name
					}
					if recvType != "" {
						funcName = recvType + "." + funcName
					}
				}

				fullName := ca.currentPkg + "." + funcName
				ca.functionNodes[fullName] = NewFunctionNode(funcName, filename, position.Line)
			}
			return true
		})
	}
}

// analyzeCallExpressions identifies function calls and builds the call tree
func (ca *CodeAnalyzer) analyzeCallExpressions(pkg *ast.Package, rootNode *FunctionNode) {
	visited := make(map[string]bool)

	var analyzeNode func(node *FunctionNode)

	analyzeNode = func(node *FunctionNode) {
		fullName := ca.currentPkg + "." + node.Name
		if visited[fullName] {
			return
		}
		visited[fullName] = true

		// Find function declaration
		var funcDecl *ast.FuncDecl
		for _, file := range pkg.Files {
			ast.Inspect(file, func(n ast.Node) bool {
				if fd, ok := n.(*ast.FuncDecl); ok {
					// Check if this is the function we're looking for
					// Handle both regular functions and methods
					var funcName string
					if fd.Recv != nil && len(fd.Recv.List) > 0 {
						var recvType string
						switch t := fd.Recv.List[0].Type.(type) {
						case *ast.StarExpr:
							if ident, ok := t.X.(*ast.Ident); ok {
								recvType = "*" + ident.Name
							}
						case *ast.Ident:
							recvType = t.Name
						}
						if recvType != "" {
							funcName = recvType + "." + fd.Name.Name
						}
					} else {
						funcName = fd.Name.Name
					}

					if funcName == node.Name {
						funcDecl = fd
						return false
					}
				}
				return true
			})
			if funcDecl != nil {
				break
			}
		}

		if funcDecl == nil {
			return
		}

		// Find function calls inside this function
		ast.Inspect(funcDecl, func(n ast.Node) bool {
			if callExpr, ok := n.(*ast.CallExpr); ok {
				if selExpr, ok := callExpr.Fun.(*ast.SelectorExpr); ok {
					if ident, ok := selExpr.X.(*ast.Ident); ok {
						// This is a method call or a function call from another package
						calledFuncName := ident.Name + "." + selExpr.Sel.Name
						position := ca.fset.Position(callExpr.Pos())

						// Check if we know this function
						if childNode, exists := ca.functionNodes[ca.currentPkg+"."+calledFuncName]; exists {
							node.AddChild(childNode)
							analyzeNode(childNode)
						} else {
							// External function call
							childNode := NewFunctionNode(calledFuncName, position.Filename, position.Line)
							node.AddChild(childNode)
						}
					}
				} else if ident, ok := callExpr.Fun.(*ast.Ident); ok {
					// This is a direct function call
					calledFuncName := ident.Name
					position := ca.fset.Position(callExpr.Pos())

					// Check if we know this function
					if childNode, exists := ca.functionNodes[ca.currentPkg+"."+calledFuncName]; exists {
						node.AddChild(childNode)
						analyzeNode(childNode)
					} else {
						// External function call or built-in
						childNode := NewFunctionNode(calledFuncName, position.Filename, position.Line)
						node.AddChild(childNode)
					}
				}
			}
			return true
		})
	}

	analyzeNode(rootNode)
}

func GetCodeFlow(dir, function string) (*FunctionNode, error) {
	analyzer := NewCodeAnalyzer()
	err := analyzer.ParseDirectory(dir)
	if err != nil {
		fmt.Printf("Error parsing directory: %v\n", err)
		return nil, fmt.Errorf("Error parsing directory: %v\n", err)
	}

	functionTree, err := analyzer.BuildFunctionCallTree(function)
	if err != nil {
		fmt.Printf("Error building function call tree: %v\n", err)
		return nil, fmt.Errorf("Error building function call tree: %v\n", err)
	}

	return functionTree, nil
}
