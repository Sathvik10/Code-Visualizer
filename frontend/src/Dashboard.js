import React, { useEffect, useState } from "react";
import PieChart from "./PieChart";
import { useNavigate } from "react-router-dom";
import Split from "react-split";
import "./DashboardPage.css";

const Dashboard = () => {
  const [chartData, setChartData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8080/api/v1/gitstats/test-user")
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
  }, [navigate]);

  return (
	<Split
	className="dashboard-container"
	direction="horizontal"
	sizes={[33.33, 33.33, 33.33]}
	minSize={100}
	gutterSize={6}
  >
	<div className="dashboard-section">Component 1</div>

    <div className="dashboard-section">
      <h2 style={{ textAlign: "center" }}>Dashboard</h2>
      <h3 style={{ textAlign: "center", marginTop: "20px" }}>Contributor Commit Distribution</h3>
      <PieChart data={chartData} />
    </div>

      <div className="dashboard-section">Component 3</div>
    </Split>
  );
};

export default Dashboard;
