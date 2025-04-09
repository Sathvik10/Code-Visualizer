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
  // const filepath = localStorage.getItem("filepath");
  const [filepath, setFilepath] = useState(
    localStorage.getItem("filepath") || ""
  );
  const apipath = localStorage.getItem("apipath");

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
          aggregated[key].count += c.totalContributionPercentage;
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
            path: node.path || "",
            children: (node.children || [])
              .filter((child) => child.isDir || child.name) // optional filtering
              .map(buildTree),
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
    fetch(
      `http://localhost:8080/api/v1/filestats/${projectName}?filepath=${apipath}`
    )
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
          aggregated[key].count += c.totalContributionPercentage;
        });

        const data = Object.values(aggregated);
        console.log("Aggregated data:", data);

        setFileChartData(data);
      })
      .catch((err) => {
        console.error("Error fetching file-level contributions:", err);
      });
  }, [projectName, filepath, apipath]);

  const handleNodeClick = (clickedPath) => {
    const basePath = localStorage.getItem("filepath") || "";
    // Make sure there's a `/` between them
    const combinedPath = basePath.endsWith("/")
      ? basePath + clickedPath
      : basePath + "/" + clickedPath;

    localStorage.setItem("apipath", combinedPath);
    setFilepath(combinedPath);
  };

  return (
    <div className="flex gap-4 h-screen">
      <div className="w-3/5 bg-white rounded-2xl p-4 h-full overflow-hidden border border-gray-200">
        <TidyTree data={treeStructureData} onNodeClick={handleNodeClick} />
      </div>

      <div className="w-2/5 flex flex-col gap-4 h-full">
        <div className="bg-white rounded-2xl p-4 h-1/2 overflow-hidden border border-gray-200">
          <PieChart data={fileChartData} title={"File-Level Contributions"} />
        </div>
        <div className="bg-white rounded-2xl  p-4 h-1/2 overflow-hidden border border-gray-200">
          <PieChart data={chartData} title={"Overall Contributions"} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
