// hooks/useSessionTimeout.js
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const useSessionTimeout = (timeoutCallback, timeoutDuration) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleTimeout = () => {
      timeoutCallback();
      navigate("/");
    };

    const timeoutId = setTimeout(handleTimeout, timeoutDuration);

    return () => clearTimeout(timeoutId);
  }, [timeoutCallback, timeoutDuration, navigate]);
};
