const FunctionTable = ({ functions = [], onFunctionClick, selectedFunction }) => {
    return (
        <div className="w-full flex flex-col h-full"> {/* Adjust height if needed */}
        <h2 className="text-lg font-semibold mb-2">File Functions</h2>
  
        <div className="overflow-auto flex-1 border border-gray-200 rounded-2xl">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left border border-gray-200">Function Name</th>
              </tr>
            </thead>
            <tbody>
              {functions.length === 0 ? (
                <tr>
                  <td className="px-4 py-2 border border-gray-200 text-gray-400 italic">
                    Please select a file to explore ...
                  </td>
                </tr>
              ) : (
                functions.map((funcName, index) => (
                  <tr
                    key={index}
                    onClick={() => onFunctionClick(funcName)}
                    className={`cursor-pointer ${
                      selectedFunction === funcName ? 'bg-blue-100 font-medium' : 'hover:bg-blue-50'
                    }`}
                  >
                    <td className="px-4 py-2 border border-gray-200">{funcName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

export default FunctionTable;