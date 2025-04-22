import React from "react";
import ErrorMessage from "./ErrorMessage";
import { Link } from "react-router-dom";

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
		<div className="w-full flex items-center justify-between">
			{/* Left side - Name */}
			<Link
				to="/"
				className="text-4xl font-bold whitespace-nowrap hover:opacity-80 transition"
			>
				Code Visualizer
			</Link>

			<div className="mr-16">
				<form
					className="flex items-center gap-2 mb-4"
					onSubmit={(e) => e.preventDefault()}
				>
					<input
						className="px-4 py-2 text-base rounded-lg border border-gray-400 w-64"
						type="text"
						placeholder="Repo URL"
						value={repoURL}
						onChange={(e) => setRepoURL(e.target.value)}
					/>

					<input
						className="px-4 py-2 text-base rounded-lg border border-gray-400 w-32"
						type="text"
						placeholder="Folder"
						value={folderName}
						onChange={(e) => setFolderName(e.target.value)}
					/>

					<button
						onClick={handleClone}
						disabled={isButtonDisabled}
						className={`ml-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-base transition ${
							isButtonDisabled
								? "opacity-50 cursor-not-allowed"
								: ""
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
