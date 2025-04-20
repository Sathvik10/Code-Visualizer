import { useState } from "react";
import ErrorMessage from "./components/ErrorMessage";
import { useNavigate } from "react-router-dom";
import "./App.css";

function App() {
  const [repoURL, setRepoURL] = useState("");
  const [folderName, setFolderName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleClone = async (event) => {
    event.preventDefault();
    setIsButtonDisabled(true);
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("http://code-visualizer-3067797be701.herokuapp.com/api/v1/clone", {
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
        throw new Error(`Clone request failed with status ${res.status}`);
      }

      const data = await res.json();

      if (data.response === "Success") {
        console.log("Cloned:", data);
        localStorage.setItem("projectName", data.name);
        localStorage.setItem("filepath", data.filepath);
        localStorage.setItem("apipath", data.filepath);
        localStorage.setItem("functionname", "");
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

  return (
    <div id="main">
      <h1>Code Visualizer</h1>
      <form>
        <input
          className="input"
          type="text"
          placeholder="Repository URL"
          value={repoURL}
          onChange={(e) => setRepoURL(e.target.value)}
        />
        <input
          className="input"
          type="text"
          placeholder="Folder Name"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
        />
        <button
          id="home-button"
          onClick={handleClone}
          disabled={isButtonDisabled}
        >
          {isLoading ? "Cloning..." : "Clone & Go"}
        </button>
      </form>

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
