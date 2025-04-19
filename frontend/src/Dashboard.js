import React, { useEffect, useState } from "react";
import PieChart from "./PieChart";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import TidyTree from "./TidyTree";
import CircularPacking from "./CirclePack";
import Navbar from "./components/NavBar";
import LintIssuesByLinter from "./LintIssueTracker";
import LintingCodeViewer from "./LintingCodeViewer";
import FunctionTable from "./FunctionTable";


const Dashboard = () => {
  const [chartData, setChartData] = useState([]);
  const [treeStructureData, setTreeStructureData] = useState([]);
  const [fileChartData, setFileChartData] = useState([]);
  const [fileContent1, setFileContent] = useState("Please select a file to view");

  const [repoURL, setRepoURL] = useState("");
  const [folderName, setFolderName] = useState("");
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [lintIssues, setLintIssues] = useState([]);

  // for the functions api
  const [functions, setFunctions] = useState([]);
  // for the codeflow api
  const [selectedFunction, setSelectedFunction] = useState(null);


  const projectName = localStorage.getItem("projectName");
  const [filepath, setFilepath] = useState(
    localStorage.getItem("filepath") || ""
  );
  const apipath = localStorage.getItem("apipath");

  const navigate = useNavigate();

  useEffect(()=>{
    if (filepath.endsWith(".go")){
      fetch(`http://localhost:8080/api/v1/filecontent/${projectName}?filepath=${apipath}`)
      .then(res => res.json())
      .then(res => {
        setFileContent(res.response)
      }).catch((err) => {
        console.error("Error fetching stats:", err);
        navigate("/");
      })
    }else{
      setFileContent("Please select a file to view")
    }
  }, [filepath])

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
              measure : '%',

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
            aggregated[key] = { name: c.name, email: c.email, count: 0 };
            aggregated[key] = {
              name: c.name,
              email: c.email,
              count: 0,
              measure : '%',
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
    .then(res => res.json())
    .then(res => {
      setLintIssues(res.response)
    }).catch((err) => {
      console.error("Error fetching file-level contributions:", err);
    });

  },[navigate, filepath, projectName]);

  // Fetch function list when a Go file is selected
  useEffect(() => {
    if (filepath.endsWith(".go")) {
      fetch(`http://localhost:8080/api/v1/functions/${projectName}?filepath=${apipath}`)
        .then(res => res.json())
        .then(data => {
          setFunctions(data.response || []);
        })
        .catch(err => {
          console.error("Error fetching functions:", err);
        });
    } else {
      setFunctions([]);
    }
  }, [filepath, projectName, apipath]);

  const handleNodeClick = (clickedPath) => {
    const basePath = localStorage.getItem("filepath") || "";
    const combinedPath = basePath.endsWith("/")
      ? basePath + clickedPath
      : basePath + "/" + clickedPath;

    localStorage.setItem("apipath", combinedPath);
    setFilepath(combinedPath);
  };

  const handleFunctionClick = (functionName) => {
    localStorage.setItem("functionname", functionName);
    setSelectedFunction(functionName);
    console.log("Function clicked:", functionName);
  };

  const getLintErrorsForFile = (lintIssues, filepath) => {
    const lintErrors = []
    if (!filepath.endsWith(".go")){
      return lintErrors
    }

    if (!(Array.isArray(lintIssues) && lintIssues.length > 0)){
      return lintErrors
    }

    const relativePath = getRelativePath(filepath)
    lintIssues.forEach(li => {
      if (li.Pos.Filename == relativePath){
        lintErrors.push(
          {
            line : li.Pos.Line,
            message : li.FromLinter + " : " + li.Text
          }
        )
      }
    })
    return lintErrors
  }

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
    if (filepath == basePath)
      return null

    const relativePath = filepath.startsWith(basePath)
      ? filepath.slice(basePath.length).replace(/^\\+|^\/+/, "")
      : filepath;
    return relativePath    
  };


  return (
    <>
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
      <div className="w-full flex h-screen overflow-x-auto">
        <div className="flex h-full flex-grow">

          {/* Fixed Tree Column */}
          <div className="w-[600px] bg-white rounded-2xl p-4 h-full overflow-hidden border border-gray-200 sticky left-0 z-10">
            <TidyTree data={treeStructureData} onNodeClick={handleNodeClick} />
          </div>
        </div>

        <div className="flex h-full flex-grow overflow-auto">
          {/* Scrollable Content */}
          <div className="flex gap-4 h-full w-[1800px]">

            {/* Column 1 */}
            <div className="w-[450px] flex flex-col gap-4 h-[1200px]">
              <div className="bg-white rounded-2xl p-4 border border-gray-200 h-1/2">
                <FunctionTable 
                  functions={filepath.endsWith(".go") ? functions : []}
                  onFunctionClick={handleFunctionClick}
                  selectedFunction={selectedFunction}
                />
              </div>
              
              <div className="flex flex-col gap-4 bg-white rounded-2xl p-4 h-1/4 overflow-hidden border border-gray-200">
                <CircularPacking data={chartData} title={"Overall Contributions"} />
              </div>

              <div className="flex flex-col gap-4 bg-white rounded-2xl p-4 h-1/4 overflow-hidden border border-gray-200">
                <PieChart data={fileChartData} title={"File-Level Contributions"} />
              </div>

            </div>

            {/* Column 2 */}
            <div className="w-[450px] flex flex-col gap-4 h-[1200px]">

              <div className="bg-white rounded-2xl p-4 border border-gray-200 h-1/2">
                {/* <FunctionTable 
                  functions={filepath.endsWith(".go") ? functions : []}
                  onFunctionClick={handleFunctionClick}
                  selectedFunction={selectedFunction}
                /> */}
                <h2 className="text-lg font-semibold">Function Tree Flow</h2>
              </div>

              <div className="bg-white rounded-2xl p-4 h-1/4 overflow-hidden border border-gray-200">
                <LintIssuesByLinter data={lintIssues} title={'Lint Issues by Linter'} />
              </div>

              <div className="bg-white rounded-2xl p-4 h-1/4 overflow-hidden border border-gray-200">
                <LintIssuesByLinter 
                  data={lintIssues} 
                  title={`Lint issues in ${getRelativePath(filepath) ? getRelativePath(filepath) : "Repo"}`} 
                  filterPath={getRelativePath(filepath)} 
                  useBarChart={false} 
                />
              </div>
            </div>

            {/* Column 3 */}
            <div className="w-[450px] flex flex-col gap-4 h-[1200px]">
              <div className="bg-white rounded-2xl p-4 h-1/2 overflow-auto border border-gray-200">
                <h2 className="text-lg font-semibold mb-2">Function Description</h2>
                {/* <LintingCodeViewer fileContent={fileContent1} lintErrors={getLintErrorsForFile(lintIssues, filepath)} /> */}
              </div>

              <div className="bg-white rounded-2xl p-4 h-1/2 overflow-auto border border-gray-200">
                <h2 className="text-lg font-semibold mb-2">File Viewer</h2>
                <LintingCodeViewer fileContent={fileContent1} lintErrors={getLintErrorsForFile(lintIssues, filepath)} />
              </div>
              
            </div>

            {/* Column 3: Linting Code Viewer
            <div className="w-[600px] flex flex-col gap-4 h-full">
              <div className="bg-white rounded-2xl p-4 h-full overflow-auto border border-gray-200">
                <h2 className="text-lg font-semibold mb-2">File Viewer</h2>
                <LintingCodeViewer fileContent={fileContent1} lintErrors={getLintErrorsForFile(lintIssues, filepath)} />
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
