import React, { useEffect, useState } from "react";
import PieChart from "./PieChart";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import TidyTree from "./TidyTree";

const Dashboard = () => {
  const [chartData, setChartData] = useState([]);
  const [treeStructureData, setTreeStructureData] = useState([]);
  const navigate = useNavigate();
  const [fileChartData, setFileChartData] = useState([]);
  const projectName = localStorage.getItem("projectName");
  const filepath = localStorage.getItem("filepath");

  useEffect(() => {
    fetch(`http://localhost:8080/api/v1/gitstats/${projectName}`)
      .then((res) => res.json())
      .then((json) => {
        const contributors = json.response.contributors;

        // Combine contributors with same name/email
        const aggregated = {};
        contributors.forEach((c) => {
          const key = `${c.name}|${c.email}`;
          if (!aggregated[key]) {
            aggregated[key] = {
              name: c.name,
              email: c.email,
              count: 0,
            };
          }
          aggregated[key].count += c.commitCount;
        });

        const data = Object.values(aggregated);
        console.log("Aggregated data:", data);
        setChartData(data);
      })
      .catch((err) => {
        console.error("Error fetching stats:", err);
        navigate("/");
      });
  }, [navigate, projectName]);

  useEffect(() => {
    fetch(`http://localhost:8080/api/v1/treestructure/${projectName}`)
      .then((res) => res.json())
      .then((json) => {
		const buildTree = (node) => {
			return {
			  name: node.name || "root",
			  children: (node.children || [])
				.filter(child => child.isDir || child.name) // optional filtering
				.map(buildTree)
			};
		  };
	
		  const treeData = buildTree(json.response);
		  setTreeStructureData(treeData);
      })
      .catch((err) => {
        console.error("Error fetching:", err);
        navigate("/");
      });
  }, [navigate, projectName]);


    useEffect(() => {
      fetch(`http://localhost:8080/api/v1/filestats/${projectName}?filepath=${filepath}`)
      .then((res) => res.json())
      .then((json) => {
        const contributors = json.response;
  
        // Aggregate by name + email
        const aggregated = {};
        contributors.forEach((c) => {
          const key = `${c.name}|${c.email}`;
          if (!aggregated[key]) {
            aggregated[key] = {
              name: c.name,
              email: c.email,
              count: 0,
            };
          }
          aggregated[key].count += c.commitCount;
        });
  
        const data = Object.values(aggregated);
        console.log("Aggregated data:", data);

        setFileChartData(data);
      })
      .catch((err) => {
        console.error("Error fetching file-level contributions:", err);
      });
  }, [projectName, filepath]);

  // return (
  //   <div>

  //   <h2 style={{ textAlign: "center" }}>Dashboard</h2>
    
  //   <Split
  //     className="dashboard-container"
  //     direction="horizontal"
  //     sizes={[33.33, 33.33, 33.33]}
  //     minSize={100}
  //     gutterSize={3}
  //   >
  //     <div className="dashboard-section" >
  //       <TidyTree data={treeStructureData}/>
  //     </div>
  //     <div className="dashboard-section">
  //       <PieChart data={chartData} title={"Contributor Commit Distribution"}/>
  //     </div>
  //     <div className="dashboard-section">Component 3</div>
  //   </Split>
  //   </div>
  // );
  return (
    <div className="flex h-screen p-4 gap-4 items-center justify-center">
      {/* Left Column - Tree View */}
      {/* <div className="bg-gray-100 rounded-2xl shadow p-4 overflow-auto"> */}
        <h2 className="text-xl font-semibold mb-2">Tree View</h2>
        {/* Placeholder for Tree Diagram */}
          <TidyTree data={treeStructureData}/>
      {/* </div> */}

    </div>
  );
};

export default Dashboard;
