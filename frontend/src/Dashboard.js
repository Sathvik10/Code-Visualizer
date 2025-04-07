import React, { useEffect, useState } from "react";
import PieChart from "./PieChart";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import TidyTree from "./TidyTree";

const Dashboard = () => {
  const [chartData, setChartData] = useState([]);
  const [treeStructureData, setTreeStructureData] = useState([]);
  const navigate = useNavigate();
  const projectName = localStorage.getItem("projectName");

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
    <div className="grid grid-cols-3 h-screen p-4 gap-4">
      {/* Left Column - Tree View */}
      <div className="bg-gray-100 rounded-2xl shadow p-4 overflow-auto">
        <h2 className="text-xl font-semibold mb-2">Tree View</h2>
        {/* Placeholder for Tree Diagram */}
        <div className="h-full border border-dashed rounded p-2 flex items-center justify-center">
          <TidyTree data={treeStructureData}/>
        </div>
      </div>

      {/* Middle Column - Graphs */}
      <div className="bg-gray-100 rounded-2xl shadow p-4 overflow-auto">
        <h2 className="text-xl font-semibold mb-2">Graphs</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex justify-center items-center h-[350px] border border-dashed rounded">
            <div className="w-full h-full">
              <PieChart data={chartData} />
            </div>
          </div>
          <div className="flex justify-center items-center h-32 border border-dashed rounded">
            <span className="text-gray-400">[Lint Issue Pie]</span>
          </div>
          <div className="flex justify-center items-center h-32 border border-dashed rounded">
            <span className="text-gray-400">[Code Coverage Pie]</span>
          </div>
        </div>
      </div>

      {/* Right Column - Table + Bar Graph */}
      <div className="bg-gray-100 rounded-2xl shadow p-4 overflow-auto flex flex-col">
        <h2 className="text-xl font-semibold mb-2">Function/Class Table</h2>
        <table className="w-full text-sm border mb-4">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 text-left">Function Name</th>
              <th className="p-2 text-left">Class Name</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50 cursor-pointer">
              <td className="p-2">fn1</td>
              <td className="p-2">Class1</td>
            </tr>
            <tr className="hover:bg-gray-50 cursor-pointer">
              <td className="p-2">fn2</td>
              <td className="p-2">Class2</td>
            </tr>
            <tr className="hover:bg-gray-50 cursor-pointer">
              <td className="p-2">fn3</td>
              <td className="p-2">Class3</td>
            </tr>
          </tbody>
        </table>
        <div className="flex-grow flex items-center justify-center border border-dashed rounded">
          <span className="text-gray-400">[# of Calls Bar Chart]</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
