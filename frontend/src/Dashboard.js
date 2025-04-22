import React, { useEffect, useState, useMemo, use } from "react";
import PieChart from "./PieChart";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import TidyTree from "./TidyTree";
import CodeFlowTree from "./CodeFlowTree";
import CircularPacking from "./CirclePack";
import Navbar from "./components/NavBar";
import LintIssuesByLinter from "./LintIssueTracker";
import LintingCodeViewer from "./LintingCodeViewer";
import FunctionTable from "./FunctionTable";
import CoverageDashboardPanel from "./CoverageDashboardPanel";
import { Modal, ChartContainer } from "./Modal";




const FunctionDescriptionPanel = ({
	fileContent1,
	lintIssues,
	filepath,
	focusedLine,
	getLintErrorsForFile,
}) => {
	// state to track whether linting is on or off
	const [lintingEnabled, setLintingEnabled] = useState(true);

	// toggle handler
	const toggleLinting = () => setLintingEnabled((enabled) => !enabled);

	// choose between real errors or none
	const currentLintErrors = lintingEnabled
		? getLintErrorsForFile(lintIssues, filepath)
		: [];

	return (
		<div className="bg-white rounded-2xl p-4 border border-gray-200 h-[600px] overflow-auto">
			<div className="flex items-center justify-between mb-2">
				<h2 className="text-lg font-semibold">Function Description</h2>
				<button
					onClick={toggleLinting}
					className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
				>
					{lintingEnabled ? "Disable Linting" : "Enable Linting"}
				</button>
			</div>

			<LintingCodeViewer
				fileContent={fileContent1}
				lintErrors={currentLintErrors}
				focusLine={focusedLine}
			/>
		</div>
	);
};

const Dashboard = () => {
	const [chartData, setChartData] = useState([]);
	const [treeStructureData, setTreeStructureData] = useState([]);
	const [fileChartData, setFileChartData] = useState([]);
	const [fileContent1, setFileContent] = useState(
		"Please select a file to view"
	);

	const [repoURL, setRepoURL] = useState("");
	const [folderName, setFolderName] = useState("");
	const [isButtonDisabled, setIsButtonDisabled] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [focusedLine, setFocusedLine] = useState(-1);

	const [lintIssues, setLintIssues] = useState([]);

	// for the functions api
	const [functions, setFunctions] = useState([]);

	// for the codeflow api
	const [selectedFunction, setSelectedFunction] = useState(null);
	const [codeFlowTree, setCodeFlowTree] = useState(null);
	const [shouldFetchFlow, setShouldFetchFlow] = useState(false);

	const projectName = localStorage.getItem("projectName");
	const [filepath, setFilepath] = useState(
		localStorage.getItem("filepath") || ""
	);

	const [fileViewerPath, setFileViewerPath] = useState("");
	const apipath = localStorage.getItem("apipath");

	const navigate = useNavigate();

	const [lintingEnabled, setLintingEnabled] = useState(false);

	// toggle handler
	const toggleLinting = () => setLintingEnabled((enabled) => !enabled);

	// ─── Sidebar collapse & search state ─────────────────────────
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [sidebarSearch, setSidebarSearch] = useState("");
	const [viewMode, setViewMode] = useState("stats"); // "stats" | "explorer" | "coverage"

	// near the top of your Dashboard() before any useEffects:
	const isFileSelected = filepath && filepath.endsWith(".go");

	// Add state for modals
	const [modalState, setModalState] = useState({
		isOpen: false,
		title: "",
		content: null,
		type: ""
	});

	const openModal = (title, content, type) => {
		setModalState({
			isOpen: true,
			title,
			content,
			type,
		});
	};

	const closeModal = () => {
		setModalState({
			isOpen: false,
			title: "",
			content: null,
		});
	};

	const GetCodeFlowTree = () => {
		return codeFlowTree === null ? (
			<div className="flex items-center justify-center h-full">
				<p className="text-gray-500">
					Select a function to
					view its flow
				</p>
			</div>
		) : (
			<div className="flex gap-4 h-full">
				{/* Left column: 35% */}
				<div
					className="
					w-[35%]
					bg-white rounded-2xl p-4
					border border-gray-200
					overflow-auto
					"
				>
					<h2 className="text-lg font-semibold mb-2">Code Flow</h2>
					<CodeFlowTree
					data={codeFlowTree}
					onNodeClick={handleCodeFlowNodeClicked}
					/>
				</div>

				{/* Right column: 65% */}
				<div
					className="
					w-[65%]
					bg-white rounded-2xl p-4
					border border-gray-200
					overflow-auto
					"
				>
					<h2 className="text-lg font-semibold mb-2">Code Viewer</h2>
					<LintingCodeViewer
					fileContent={fileContent1}
					lintErrors={getLintErrorsForFile(lintIssues, filepath)}
					focusLine={focusedLine}
					/>
				</div>
			</div>

		)
	}

	// Recursively filter the tree by name
	const filterTree = (node, query) => {
		if (!query) return node;
		const nameMatches = node.name
			.toLowerCase()
			.includes(query.toLowerCase());
		const filteredChildren = (node.children || [])
			.map((child) => filterTree(child, query))
			.filter(Boolean);
		if (nameMatches || filteredChildren.length) {
			return { ...node, children: filteredChildren };
		}
		return null;
	};

	const filteredTreeData = useMemo(() => {
		return (
			filterTree(treeStructureData, sidebarSearch) || {
				name: "No results",
				children: [],
			}
		);
	}, [treeStructureData, sidebarSearch]);

	useEffect(() => {
		if (!isFileSelected) {
			setFocusedLine(-1);
		}
	}, [isFileSelected]);

	useEffect(() => {
		if (fileViewerPath.endsWith(".go")) {
			fetch(
				`http://localhost:8080/api/v1/filecontent/${projectName}?filepath=${fileViewerPath}`
			)
				.then((res) => res.json())
				.then((res) => {
					setFileContent(res.response);
				})
				.catch((err) => {
					console.error("Error fetching stats:", err);
					navigate("/");
				});
		} else {
			setFileContent("Please select a file to view");
		}
	}, [fileViewerPath]);

	useEffect(() => {
		if (filepath.endsWith(".go")) {
			if (filepath != fileViewerPath) {
				setFileViewerPath(filepath);
			}
		}
	}, [filepath]);

	// Fetch Git stats
	useEffect(() => {
		fetch(`http://localhost:8080/api/v1/gitstats/${projectName}`)
			.then((res) => res.json())
			.then((json) => {
				const contributors = json.response.contributors;

				// Aggregate data
				const aggregated = {};
				contributors.forEach((c) => {
					const key = `${c.name}|${c.email}`;
					if (!aggregated[key]) {
						aggregated[key] = {
							name: c.name,
							email: c.email,
							count: 0,
							measure: "%",
						};
					}
					aggregated[key].count += c.totalContributionPercentage;
				});

				setChartData(Object.values(aggregated));
			})
			.catch((err) => {
				console.error("Error fetching stats:", err);
				navigate("/");
			});
	}, [navigate, projectName]);

	// Fetch Tree structure
	useEffect(() => {
		fetch(`http://localhost:8080/api/v1/treestructure/${projectName}`)
			.then((res) => res.json())
			.then((json) => {
				const buildTree = (node) => {
					return {
						name: node.name || "root",
						path: node.path || "",
						children: (node.children || [])
							.filter((child) => child.isDir || child.name)
							.map(buildTree),
					};
				};
				setTreeStructureData(buildTree(json.response));
			})
			.catch((err) => {
				console.error("Error fetching:", err);
				navigate("/");
			});
	}, [projectName]);

	// Fetch Code Flow
	useEffect(() => {
		if (!shouldFetchFlow || !selectedFunction) return;

		fetch(
			`http://localhost:8080/api/v1/codeflow/${projectName}?filepath=${apipath}&function=${selectedFunction}`
		)
			.then((res) => res.json())
			.then((json) => {
				const transformCodeFlowToTree = (node) => {
					if (!node) return null;

					return {
						name: node.Name || "Unnamed",
						path: `${node.File}`,
						children: (node.Children || []).map(
							transformCodeFlowToTree
						),
						comment: node.Doc,
						line: node.Line,
					};
				};
				setCodeFlowTree(transformCodeFlowToTree(json.response)); // store tree root
				setShouldFetchFlow(false);
			})
			.catch((err) => {
				console.error("Error fetching Code Flow:", err);
				setShouldFetchFlow(false);
			});
	}, [shouldFetchFlow, projectName, apipath, selectedFunction]);

	// Fetch File stats
	useEffect(() => {
		fetch(
			`http://localhost:8080/api/v1/filestats/${projectName}?filepath=${apipath}`
		)
			.then((res) => res.json())
			.then((json) => {
				const contributors = json.response;
				const aggregated = {};
				contributors.forEach((c) => {
					const key = `${c.name}|${c.email}`;
					if (!aggregated[key]) {
						aggregated[key] = {
							name: c.name,
							email: c.email,
							count: 0,
						};
						aggregated[key] = {
							name: c.name,
							email: c.email,
							count: 0,
							measure: "%",
						};
					}
					aggregated[key].count += c.totalContributionPercentage;
				});

				setFileChartData(Object.values(aggregated));
			})
			.catch((err) => {
				console.error("Error fetching file-level contributions:", err);
			});
	}, [projectName, filepath, apipath]);

	useEffect(() => {
		fetch(`http://localhost:8080/api/v1/lintissues/${projectName}`)
			.then((res) => res.json())
			.then((res) => {
				setLintIssues(res.response);
			})
			.catch((err) => {
				console.error("Error fetching file-level contributions:", err);
			});
	}, [navigate, filepath, projectName]);

	// Fetch function list when a Go file is selected
	useEffect(() => {
		if (filepath.endsWith(".go")) {
			fetch(
				`http://localhost:8080/api/v1/functions/${projectName}?filepath=${apipath}`
			)
				.then((res) => res.json())
				.then((data) => {
					var resp = data.response || [];
					for (var i = 0; i < resp.length; i++) {
						resp[i] = resp[i].replace("(*", "");
						resp[i] = resp[i].replace("(", "");
						resp[i] = resp[i].replace(")", "");
					}

					setFunctions(data.response || []);
					setSelectedFunction(null);
				})
				.catch((err) => {
					console.error("Error fetching functions:", err);
				});
		} else {
			setFunctions([]);
			setSelectedFunction(null);
			setCodeFlowTree(null);
		}
	}, [filepath, projectName, apipath]);

	const handleNodeClick = (clickedPath) => {
		const basePath = localStorage.getItem("filepath") || "";
		const combinedPath = basePath.endsWith("/")
			? basePath + clickedPath
			: basePath + "/" + clickedPath;

		localStorage.setItem("apipath", combinedPath);
		setFilepath(combinedPath);
		// clear the function table and code flow tree when you click a new file
		localStorage.setItem("functionname", "");
		setSelectedFunction(null);
		setCodeFlowTree(null);
	};

	const handleCodeFlowNodeClicked = (focusLine, file) => {
		if (file != fileViewerPath) {
			setFileViewerPath(file);
		}
		setFocusedLine(focusLine);
	};

	const handleFunctionClick = (functionName) => {
		localStorage.setItem("functionname", functionName);
		setSelectedFunction(functionName);
		setShouldFetchFlow(true);
	};

	const getLintErrorsForFile = (lintIssues, filepath) => {
		const lintErrors = [];
		if (!filepath.endsWith(".go")) {
			return lintErrors;
		}

		if (!(Array.isArray(lintIssues) && lintIssues.length > 0)) {
			return lintErrors;
		}

		const relativePath = getRelativePath(filepath);
		lintIssues.forEach((li) => {
			if (li.Pos.Filename == relativePath) {
				lintErrors.push({
					line: li.Pos.Line,
					message: li.FromLinter + " : " + li.Text,
				});
			}
		});
		return lintErrors;
	};

	const handleClone = async (event) => {
		event.preventDefault();
		setIsButtonDisabled(true);
		setIsLoading(true);
		setErrorMessage("");

		try {
			const res = await fetch("http://localhost:8080/api/v1/clone", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					repoURL: repoURL,
					foldername: folderName,
				}),
			});

			if (!res.ok) {
				throw new Error(`failed with status ${res.status}`);
			}

			const data = await res.json();

			if (data.response === "Success") {
				localStorage.setItem("projectName", data.name);
				localStorage.setItem("filepath", data.filepath);
				localStorage.setItem("apipath", data.filepath);
				navigate("/dashboard");
			} else {
				setErrorMessage(
					"Clone failed. Please check the repository and folder name."
				);
			}
		} catch (error) {
			setErrorMessage(
				`Error Cloning: ${error.message} | Please check the repository and folder name.`
			);
		} finally {
			setIsButtonDisabled(false);
			setIsLoading(false);
		}
	};

	const getRelativePath = (filepath) => {
		const basePath = localStorage.getItem("filepath") || "";
		if (filepath == basePath) return null;

		const relativePath = filepath.startsWith(basePath)
			? filepath.slice(basePath.length).replace(/^\\+|^\/+/, "")
			: filepath;
		return relativePath;
	};

	return (
		<>
			<div className="fixed top-0 left-0 w-full bg-white z-50 shadow h-20 flex items-center px-6">
				<Navbar
					repoURL={repoURL}
					setRepoURL={setRepoURL}
					folderName={folderName}
					setFolderName={setFolderName}
					handleClone={handleClone}
					isLoading={isLoading}
					isButtonDisabled={isButtonDisabled}
					setIsButtonDisabled={setIsButtonDisabled}
					setIsLoading={setIsLoading}
					errorMessage={errorMessage}
					setErrorMessage={setErrorMessage}
				/>
				{/* View Mode Toggle */}
				<div className="flex items-center gap-2">
					<span className="font-semibold text-gray-700 select-none text-base  whitespace-nowrap">
						View Mode :
					</span>
					<button
						onClick={() => setViewMode("stats")}
						className={`px-3.5 py-1.5 rounded text-sm ${
							viewMode === "stats"
								? "bg-blue-500 text-white"
								: "bg-gray-200 hover:bg-gray-300"
						}`}
					>
						Stats
					</button>
					<button
						onClick={() => setViewMode("explorer")}
						className={`px-3.5 py-1.5 rounded text-sm ${
							viewMode === "explorer"
								? "bg-blue-500 text-white"
								: "bg-gray-200 hover:bg-gray-300"
						}`}
					>
						Explorer
					</button>
					<button
						onClick={() => setViewMode("coverage")}
						className={`px-3.5 py-1.5 rounded text-sm ${
							viewMode === "coverage"
								? "bg-blue-500 text-white"
								: "bg-gray-200 hover:bg-gray-300"
						}`}
					>
						Coverage
					</button>
				</div>
			</div>

			<div className="w-full h-screen pt-16 flex overflow-hidden">
				{/* Fixed Tree Column */}
				{/* <div className="w-1/4 bg-white rounded-2xl p-4 h-full overflow-hidden border border-gray-200 sticky left-0 z-10">
          <TidyTree data={treeStructureData} onNodeClick={handleNodeClick} />
        </div> */}

				{/* ─── Streamlined Sidebar ─────────────────────────────────── */}
				<div
					className={`
            flex-none
            ${isSidebarOpen ? "w-1/4 p-4" : "w-8 p-2"}
            bg-white rounded-2xl
            h-full overflow-hidden
            border border-gray-200
            sticky left-0 z-10
            transition-all duration-300 flex flex-col
          `}
				>
					{/* always-visible toggle handle */}
					<div
						className={`flex items-center mb-2 mt-2 /${
							isSidebarOpen ? "justify-end" : "justify-center"
						}`}
					>
						<button
							onClick={() => setIsSidebarOpen((open) => !open)}
							className={`px-3 py-1 mt-1 font-bold rounded ${
								isSidebarOpen
									? "hover:bg-gray-300"
									: "hover:bg-blue-600"
							}  ${
								isSidebarOpen
									? "bg-gray-200"
									: "bg-blue-500 text-white"
							}`}
						>
							{isSidebarOpen ? "<" : ">"}
						</button>

						<h3 className="font-semibold ml-2">
							Project :{" "}
							{(() => {
								const name =
									localStorage.getItem("projectName") || "";
								return name.endsWith("-")
									? name.slice(0, -1)
									: name;
							})()}
						</h3>
					</div>

					{/* only show searchtree when open */}
					{isSidebarOpen && (
						<>
							<input
								type="text"
								className="w-full mb-2 px-2 py-1 border rounded"
								placeholder="Search files..."
								value={sidebarSearch}
								onChange={(e) =>
									setSidebarSearch(e.target.value)
								}
							/>
							<TidyTree
								data={filteredTreeData}
								onNodeClick={handleNodeClick}
							/>
						</>
					)}
				</div>

				{/* Scrollable Content Area */}
				{viewMode === "coverage" ? (
					<div className="flex-1 p-4 h-full overflow-auto">
						<CoverageDashboardPanel projectName={projectName} />
					</div>
				) : (
					<div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto transition-all duration-300">
						<div className="flex gap-4 p-4 h-full">
							{/* Column 1 */}
							<div className="w-1/3 flex flex-col gap-4 h-full">
								{viewMode === "stats" ? (
									<>
										<ChartContainer
											title="File-Level Contributions"
											onExpand={() =>
												openModal(
													"File-Level Contributions",
													<PieChart
														data={fileChartData}
													/>
													,
													"pie"
												)
											}
										>
											<PieChart data={fileChartData} />
										</ChartContainer>

										<ChartContainer
											title="Overall Contributions"
											onExpand={() =>
												openModal(
													"Overall Contributions",
													<CircularPacking
														data={chartData}
													/>,
													"circ"
												)
											}
										>
											<CircularPacking data={chartData} />
										</ChartContainer>
									</>
								) : (
									<div className="bg-white rounded-2xl p-4 border border-gray-200 flex-1">
										<FunctionTable
											functions={
												filepath.endsWith(".go")
													? functions
													: []
											}
											onFunctionClick={
												handleFunctionClick
											}
											selectedFunction={selectedFunction}
										/>
									</div>
								)}
							</div>

							{/* Column 2 */}
							<div className="w-1/3 flex flex-col gap-4 h-full">
								{viewMode !== "stats" ? (
									<>
										<ChartContainer title={"Function Tree Flow"}
											childrenHeight="h-full"
											onExpand={()=> openModal(
												"Function Tree Flow",
												GetCodeFlowTree(),
												"codeflow"
											)}>
												{codeFlowTree === null ? (
													<div className="flex items-center justify-center h-full">
														<p className="text-gray-500">
															Select a function to
															view its flow
														</p>
													</div>
												) : (
													<CodeFlowTree
														data={codeFlowTree}
														onNodeClick={
															handleCodeFlowNodeClicked
														}
													/>
												)}
										</ChartContainer>
									</>

		
								) : (
									<>
										<ChartContainer
											title={`Lint issues in ${
												getRelativePath(filepath) ||
												"Repo"
											}`}
											onExpand={() =>
												openModal(
													`Lint issues in ${
														getRelativePath(
															filepath
														) || "Repo"
													}`,
													<LintIssuesByLinter
														data={lintIssues}
														filterPath={getRelativePath(
															filepath
														)}
														useBarChart={false}
													/>,
													"lint"
												)
											}
										>
											<LintIssuesByLinter
												data={lintIssues}
												filterPath={getRelativePath(
													filepath
												)}
												useBarChart={false}
											/>
										</ChartContainer>

										<ChartContainer
											title="Lint Issues by Linter"
											onExpand={() =>
												openModal(
													"Lint Issues by Linter",
													<LintIssuesByLinter
														data={lintIssues}
														useBarChart={true}
													/>,
													"lint"
												)
											}
										>
											<LintIssuesByLinter
												data={lintIssues}
											/>
										</ChartContainer>
									</>
								)}
							</div>

							{/* Column 3 */}
							<div className="w-1/3 flex flex-col gap-4 h-full">
								{viewMode !== "stats" ? (
									<div className="bg-white rounded-2xl p-4 border border-gray-200 flex-1 overflow-auto">
										<h2 className="text-lg font-semibold mb-2">
											Function Description
										</h2>
										{/* Optional content here */}
										<LintingCodeViewer
											fileContent={fileContent1}
											lintErrors={getLintErrorsForFile(
												lintIssues,
												filepath
											)}
											focusLine={focusedLine}
										/>
									</div>
								) : (
									<div className="bg-white rounded-2xl p-4 border border-gray-200 flex-1 overflow-auto flex flex-col">
										<div className="flex items-center justify-between mb-4">
											<h2 className="text-lg font-semibold">
												File Viewer
											</h2>

											{/* Beautiful toggle switch */}
											<label className="inline-flex items-center cursor-pointer">
												<input
													type="checkbox"
													checked={lintingEnabled}
													onChange={toggleLinting}
													className="sr-only peer"
												/>
												<div
													className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer 
                                      peer-checked:bg-blue-600 transition-colors duration-200
                                      relative after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                                      after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-transform
                                      peer-checked:after:translate-x-full"
												></div>
												<span className="ml-3 text-sm font-medium text-gray-700">
													{lintingEnabled
														? "Linting On"
														: "Linting Off"}
												</span>
											</label>
										</div>

										<div className="flex-1 overflow-auto">
											<LintingCodeViewer
												fileContent={fileContent1}
												lintErrors={getLintErrorsForFile(
													lintIssues,
													filepath
												)}
												lintingEnabled={lintingEnabled}
											/>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			<Modal
				isOpen={modalState.isOpen}
				onClose={closeModal}
				title={modalState.title}
			>
				<div className="w-full h-full">
					{modalState.type === "pie" ?  (
						<PieChart data={fileChartData}
					/>
					)
					: modalState.type === "circ" ? <CircularPacking data={chartData}/> 
					: modalState.type === "lint" ? modalState.content 
					: modalState.type === "codeflow" ? GetCodeFlowTree()
					: modalState.content}
				</div>
			</Modal>
		</>
	);
};

export default Dashboard;
