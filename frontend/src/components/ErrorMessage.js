import React, { useEffect } from "react";
import "./ErrorMessage.css";

const ErrorMessage = ({ message, onClose }) => {
  useEffect(() => {
    // Automatically close the error message after 5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    // Clean up the timer if the component is unmounted or message is cleared
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null; // Don't render anything if there's no message

  return <div className="error-message">{message}</div>;
};

export default ErrorMessage;
