import Stream from "./components/Stream";
import Login from "./components/Login";
import {useState} from "react";


const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  return (
      <div>
        {isAuthenticated ? <Stream /> : <Login onLogin={handleLogin} />}
      </div>
  );
};

export default App;
