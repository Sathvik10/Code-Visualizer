import { useState } from "react";
import ErrorMessage from "./components/ErrorMessage";

import "./App.css";

function App() {
  const [projectPath, setProjectPath] = useState("Select project folder...");
  const [serverAvailable, setServerAvailable] = useState();
  const [errorMessage, setErrorMessage] = useState("");
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const handleFolderSelect = async (event) => {
    setProjectPath(event.target.value);
  };

  const onclick = async (event) => {
    event.preventDefault();

    setIsButtonDisabled(true);
    setTimeout(() => {
      setIsButtonDisabled(false);
    }, 3000);

    if (projectPath === "Select project folder...") {
      setErrorMessage("Select Project Folder");
      return;
    }

    if (serverAvailable === false) {
      setErrorMessage("Server is not available. Please try later...");
      return;
    }

    try {
      const res = await fetch(`http://localhost:8080/api/v1/hello/test-user`, {
        method: "GET",
      });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      setServerAvailable(true);
    } catch (error) {
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        setServerAvailable(false);
        setErrorMessage("Server is not available. Please try later...");
      } else {
        alert(`Error: ${error.message}`);
      }
    }

    try {
      const res = await fetch(
        `http://localhost:8080/api/v1/file/test-user?filepath=${projectPath}`,
        {
          method: "GET",
        }
      );
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.response === "Success") {
        console.log(data);
      }
    } catch (error) {
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        setErrorMessage("Failed to parse project files");
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div id="main">
      <h1>Code Visualizer</h1>
      <form>
        <input
          className="input"
          type="text"
          onChange={handleFolderSelect}
          placeholder={`GO Project : ${projectPath}`}
        ></input>
        <button onClick={onclick} disabled={isButtonDisabled}>
          GO
        </button>
      </form>

      {/* Conditionally render the ErrorMessage component if there is an error */}
      {errorMessage && (
        <ErrorMessage
          message={errorMessage}
          onClose={() => setErrorMessage("")}
        />
      )}
    </div>
  );
}

export default App;
