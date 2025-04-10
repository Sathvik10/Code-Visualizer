import React from "react";
import ErrorMessage from "./ErrorMessage"; // Import the ErrorMessage component

const Navbar = ({
  repoURL,
  setRepoURL,
  folderName,
  setFolderName,
  handleClone,
  isLoading,
  isButtonDisabled,
  setIsButtonDisabled,
  setIsLoading,
  errorMessage,
  setErrorMessage,
}) => {
  return (
    <div className="w-full bg-white text-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-200">
      {/* Left side - Name */}
      <div className="mx-5 text-4xl font-bold whitespace-nowrap">
        Code Visualizer
      </div>

      <div className="mx-6">
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            className="px-4 py-2 text-base rounded-lg border border-gray-300 w-64"
            type="text"
            placeholder="Repo URL"
            value={repoURL}
            onChange={(e) => setRepoURL(e.target.value)}
          />

          <input
            className="px-4 py-2 text-base rounded-lg border border-gray-300 w-32"
            type="text"
            placeholder="Folder?"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />

          <button
            onClick={handleClone}
            disabled={isButtonDisabled}
            className={`ml-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-base transition ${
              isButtonDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Cloning..." : "Go"}
          </button>
        </form>
      </div>

      {/* Display error message if exists */}
      {errorMessage && (
        <ErrorMessage
          message={errorMessage}
          onClose={() => setErrorMessage("")}
        />
      )}
    </div>
  );
};

export default Navbar;
