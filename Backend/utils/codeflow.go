package utils

import (
	"fmt"
	"go/ast"
	"go/token"
	"go/types"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"golang.org/x/tools/go/packages"
)

var ignoreList = []string{"fmt", "error", "make", "map", "len", "append", "Error", "strings", "slices", "log", "errors", "string"}

// FunctionNode represents a node in our call tree
type FunctionNode struct {
	Name       string
	Package    string
	File       string
	Line       int
	Doc        string
	Children   []*FunctionNode
	IsExternal bool // Whether this function is from an external package we couldn't analyze
	IsAnalysed bool
}

// NewFunctionNode creates a new function node
func NewFunctionNode(name, pkg, file string, line int, isExternal bool, doc string) *FunctionNode {
	return &FunctionNode{
		Name:       name,
		Package:    pkg,
		File:       file,
		Line:       line,
		Children:   []*FunctionNode{},
		IsExternal: isExternal,
		Doc:        doc,
		IsAnalysed: false,
	}
}

// AddChild adds a called function to this function's children
func (fn *FunctionNode) AddChild(child *FunctionNode) {
	for _, existing := range fn.Children {
		// Avoid duplicate children with the same name and package
		if existing.Name == child.Name && existing.Package == child.Package {
			return
		}
	}
	fn.Children = append(fn.Children, child)
}

func (fn *FunctionNode) AddRecursiveChildNode(child *FunctionNode, position int) {
	childNode := NewFunctionNode(child.Name, child.Package, child.File, position, child.IsExternal, child.Doc)
	fn.Children = append(fn.Children, childNode)
}

// CallGraphAnalyzer analyzes Go code to build function call graphs
type CallGraphAnalyzer struct {
	fset          *token.FileSet
	pkgs          map[string]*packages.Package
	functionNodes map[string]*FunctionNode
	moduleName    string
	pathToPackage map[string]string
}

// NewCallGraphAnalyzer creates a new analyzer with the packages.Load config
func NewCallGraphAnalyzer(moduleName string) *CallGraphAnalyzer {
	return &CallGraphAnalyzer{
		fset:          token.NewFileSet(),
		functionNodes: make(map[string]*FunctionNode),
		pkgs:          make(map[string]*packages.Package),
		pathToPackage: make(map[string]string),
		moduleName:    moduleName,
	}
}

// LoadPackages loads packages using the x/tools/go/packages API
func (ca *CallGraphAnalyzer) LoadPackages(modulePath string, patterns ...string) error {
	config := &packages.Config{
		Mode: packages.NeedName |
			packages.NeedFiles |
			packages.NeedSyntax |
			packages.NeedTypes |
			packages.NeedTypesInfo |
			packages.NeedImports |
			packages.NeedDeps,
		Fset: ca.fset,
		Dir:  modulePath,
		Env:  append(os.Environ(), "GO111MODULE=on"),
		// ParseFile can be customized if needed to handle build tags, etc.
	}

	var err error
	pkgs, err := packages.Load(config, patterns...)
	if err != nil {
		return fmt.Errorf("error loading packages: %v", err)
	}

	if packages.PrintErrors(pkgs) > 0 {
		// Continue with what we have, but warn the user
		fmt.Println("Warning: Some packages had errors, analysis may be incomplete")
	}

	// Register all functions from loaded packages
	for _, pkg := range pkgs {
		ca.pathToPackage[pkg.Dir] = pkg.PkgPath
		ca.pkgs[pkg.PkgPath] = pkg
		ca.registerFunctions(pkg)
	}

	return nil
}

// registerFunctions finds and registers all functions in the loaded packages
func (ca *CallGraphAnalyzer) registerFunctions(pkg *packages.Package) {
	for _, file := range pkg.Syntax {
		filename := ca.fset.Position(file.Pos()).Filename

		ast.Inspect(file, func(n ast.Node) bool {
			if funcDecl, ok := n.(*ast.FuncDecl); ok {
				position := ca.fset.Position(funcDecl.Pos())
				funcName := funcDecl.Name.Name

				// Handle methods
				if funcDecl.Recv != nil && len(funcDecl.Recv.List) > 0 {
					var recvType string
					recvExpr := funcDecl.Recv.List[0].Type

					// Try to get the receiver type using type info
					tv, ok := pkg.TypesInfo.Types[recvExpr]
					if ok {
						// Remove pointer if present
						t := tv.Type
						if ptr, ok := t.(*types.Pointer); ok {
							t = ptr.Elem()
						}

						// Get type name
						if named, ok := t.(*types.Named); ok {
							recvType = named.Obj().Name()
						} else {
							// Fallback to string representation
							recvType = t.String()
						}
					} else {
						// Fallback for when type info is not available
						switch t := recvExpr.(type) {
						case *ast.StarExpr:
							if ident, ok := t.X.(*ast.Ident); ok {
								recvType = ident.Name
							}
						case *ast.Ident:
							recvType = t.Name
						}
					}

					if recvType != "" {
						funcName = recvType + "." + funcName
					}
				}

				doc := ""
				if funcDecl.Doc != nil {
					doc = strings.TrimSpace(funcDecl.Doc.Text())
				}

				fullName := pkg.PkgPath + "." + funcName
				isExternal := !strings.HasPrefix(pkg.PkgPath, ca.moduleName)
				ca.functionNodes[fullName] = NewFunctionNode(funcName, pkg.PkgPath, filename, position.Line, isExternal, doc)
			}
			return true
		})
	}
}

// BuildFunctionCallTree builds a call tree starting from the specified function
func (ca *CallGraphAnalyzer) BuildFunctionCallTree(pkgPath, funcName string, visited map[string]bool) (*FunctionNode, error) {
	pkgName, ok := ca.pathToPackage[pkgPath]

	if !ok {
		return nil, fmt.Errorf("Package not found: %s", pkgPath)
	}

	fullFuncName := pkgName + "." + funcName
	// for name, node := range ca.functionNodes {
	// 	println(name + "    " + node.Package)
	// }

	rootNode, ok := ca.functionNodes[fullFuncName]
	if !ok {
		return nil, fmt.Errorf("function not found: %s", fullFuncName)
	}

	if rootNode.IsAnalysed {
		return rootNode, nil
	}

	// Build the call tree
	ca.analyzeFunction(rootNode, visited, 0)

	rootNode.IsAnalysed = true

	return rootNode, nil
}

// analyzeFunction analyzes a function and its callees recursively
func (ca *CallGraphAnalyzer) analyzeFunction(node *FunctionNode, visited map[string]bool, depth int) bool {
	if depth > 3 {
		return false
	}
	fullName := node.Package + "." + node.Name
	if visited[fullName] {
		return false // Already processed
	}
	visited[fullName] = true

	if node.IsAnalysed {
		return true
	}

	// Find the package that contains this function
	var pkg *packages.Package
	for _, p := range ca.pkgs {
		if p.PkgPath == node.Package {
			pkg = p
			break
		}
	}

	if pkg == nil {
		// Package not loaded or external
		return false
	}

	// Find the function declaration
	var funcDecl *ast.FuncDecl
	var cm ast.CommentMap
	for _, f := range pkg.Syntax {
		filename := ca.fset.Position(f.Pos()).Filename
		if filename == node.File {
			ast.Inspect(f, func(n ast.Node) bool {
				if fd, ok := n.(*ast.FuncDecl); ok {
					position := ca.fset.Position(fd.Pos())
					if position.Line == node.Line {

						cm = ast.NewCommentMap(ca.fset, f, f.Comments)
						funcDecl = fd
						return false
					}
				}
				return true
			})
		}
		if funcDecl != nil {
			break
		}
	}

	if funcDecl == nil {
		return false
	}

	// Analyze function body for calls
	ast.Inspect(funcDecl, func(n ast.Node) bool {
		if callExpr, ok := n.(*ast.CallExpr); ok {
			position := ca.fset.Position(callExpr.Pos())

			// Get type info for the call
			tv, ok := pkg.TypesInfo.Types[callExpr.Fun]
			if ok {
				// Try to get function being called using type info
				if sig, ok := tv.Type.(*types.Signature); ok {
					if fn := sig.Recv(); fn != nil {

						// This is a method call, get receiver type
						t := fn.Type()
						var methodName string

						// Extract method name from AST
						if selExpr, ok := callExpr.Fun.(*ast.SelectorExpr); ok {
							methodName = selExpr.Sel.Name

							// Get the receiver type name
							var recvType string
							if named, ok := t.(*types.Named); ok {
								recvType = named.Obj().Name()
							} else {
								// Fallback
								recvType = t.String()
							}

							qualifiedName := recvType + "." + methodName
							calleePkgPath := pkg.PkgPath // Assume same package

							// Try to find the method in loaded packages
							calleeFullName := calleePkgPath + "." + qualifiedName
							if calleeNode, exists := ca.functionNodes[calleeFullName]; exists {
								addChild := ca.analyzeFunction(calleeNode, visited, depth+1)
								if addChild {
									node.AddChild(calleeNode)
								} else {
									node.AddRecursiveChildNode(calleeNode, position.Line)
								}
							} else {

								doc := ""
								if groups := cm[selExpr]; len(groups) > 0 {
									for _, cg := range groups {
										doc = doc + " - " + cg.Text() + "\n"
									}
								}

								// Create placeholder for method we can't find
								isExternal := !strings.HasPrefix(calleePkgPath, ca.moduleName)
								calleeNode := NewFunctionNode(qualifiedName, calleePkgPath, position.Filename, position.Line, isExternal, doc)
								node.AddChild(calleeNode)
							}
						}
					}
				}
			}

			// Fallback to AST-based analysis when type info doesn't help
			switch funExpr := callExpr.Fun.(type) {
			case *ast.SelectorExpr:

				var selectors []string
				var currentExpr ast.Expr = funExpr
				var ident *ast.Ident
				for {
					if sel, ok := currentExpr.(*ast.SelectorExpr); ok {
						selectors = append([]string{sel.Sel.Name}, selectors...)
						currentExpr = sel.X
						ident = sel.Sel
					} else if ident, ok := currentExpr.(*ast.Ident); ok {
						selectors = append([]string{ident.Name}, selectors...)
						break
					} else {
						break
					}
				}

				if len(selectors) < 3 {
					ident, ok = funExpr.X.(*ast.Ident)
					if !ok {
						ident = nil
					}
				}

				if ident != nil {

					if slices.Contains(ignoreList, ident.Name) {
						return true
					}

					calledName := funExpr.Sel.Name
					xName := ident.Name

					// Check if this is an imported package
					var calleePkg *packages.Package
					for _, imp := range pkg.Imports {
						if imp.Name == xName || filepath.Base(imp.PkgPath) == xName {
							calleePkg = imp
							break
						}
					}

					if calleePkg != nil {
						// It's a function from another package
						calleePkgPath := calleePkg.PkgPath
						calleeFullName := calleePkgPath + "." + calledName

						if calleeNode, exists := ca.functionNodes[calleeFullName]; exists {
							addChild := ca.analyzeFunction(calleeNode, visited, depth+1)
							if addChild {
								node.AddChild(calleeNode)
							} else {
								node.AddRecursiveChildNode(calleeNode, position.Line)
							}
						} else {

							doc := ""
							if groups := cm[funExpr]; len(groups) > 0 {
								for _, cg := range groups {
									doc = doc + " - " + cg.Text() + "\n"
								}
							}

							// Create a placeholder for functions we can't find
							isExternal := !strings.HasPrefix(calleePkgPath, ca.moduleName)
							calleeNode := NewFunctionNode(calledName, calleePkgPath, position.Filename, position.Line, isExternal, doc)
							node.AddChild(calleeNode)
						}
					} else {

						// It's probably a method call on a local variable
						// Use object use information to try to determine type
						obj := pkg.TypesInfo.Uses[ident]
						if obj != nil {
							var typeName string
							var pkgName string
							if v, ok := obj.(*types.Var); ok {
								t := v.Type()

								// Unwrap pointer if needed
								if ptr, ok := t.(*types.Pointer); ok {
									t = ptr.Elem()
								}

								// Try to get type name
								if named, ok := t.(*types.Named); ok {
									typeName = named.Obj().Name()
									if named.Obj().Pkg() != nil {
										pkgName = named.Obj().Pkg().Path()
									}
								} else {
									typeName = t.String()
								}

								if typeName != "" {
									// println("exists " + typeName + "-" + calledName + "-" + pkg.PkgPath + "-" + pkgName)

									qualifiedName := typeName + "." + calledName
									calleeFullName := pkgName + "." + qualifiedName

									if calleeNode, exists := ca.functionNodes[calleeFullName]; exists {
										addChild := ca.analyzeFunction(calleeNode, visited, depth+1)
										if addChild {
											node.AddChild(calleeNode)
										} else {
											node.AddRecursiveChildNode(calleeNode, position.Line)
										}

									} else {

										doc := ""
										if groups := cm[funExpr]; len(groups) > 0 {
											for _, cg := range groups {
												doc = doc + " - " + cg.Text() + "\n"
											}
										}

										// Create placeholder for methods we can't resolve
										calleeNode := NewFunctionNode(qualifiedName, pkgName, position.Filename, position.Line, false, doc)
										node.AddChild(calleeNode)
									}
									return true
								}
							}
						}

						doc := ""
						if groups := cm[funExpr]; len(groups) > 0 {
							for _, cg := range groups {
								doc = doc + " - " + cg.Text() + "\n"
							}
						}

						// If we can't determine the type, create a generic placeholder
						placeholder := NewFunctionNode(xName+"."+calledName, pkg.PkgPath, position.Filename, position.Line, false, doc)
						node.AddChild(placeholder)
					}
				}

			case *ast.Ident:
				// Direct function call in the same package
				calledName := funExpr.Name
				calleeFullName := pkg.PkgPath + "." + calledName
				obj := pkg.TypesInfo.Uses[funExpr]
				if _, isBuiltin := obj.(*types.Builtin); isBuiltin {
					return true
				}

				if calleeNode, exists := ca.functionNodes[calleeFullName]; exists {
					addChild := ca.analyzeFunction(calleeNode, visited, depth+1)
					if addChild {
						node.AddChild(calleeNode)
					} else {
						node.AddRecursiveChildNode(calleeNode, position.Line)
					}
				} else {

					doc := ""
					if groups := cm[funExpr]; len(groups) > 0 {
						for _, cg := range groups {
							doc = doc + " - " + cg.Text() + "\n"
						}
					}

					// Create placeholder
					calleeNode := NewFunctionNode(calledName, pkg.PkgPath, position.Filename, position.Line, false, doc)
					node.AddChild(calleeNode)
				}
			}
		}
		return true
	})

	return true
}
