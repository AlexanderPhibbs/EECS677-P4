import React, { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Board from "./components/Board";
import PostForm from "./components/PostForm";
import axios from "axios";

axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    axios.post("http://localhost:3001/api/logout").then(() => setUser(null));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Article Share Board</h1>
      {!user ? (
        <div>
          <Login setUser={setUser} />
          <Register />
        </div>
      ) : (
        <div>
          <p>Welcome, {user.username}! {user.is_admin ? "(Admin)" : ""}</p>
          <button onClick={handleLogout}>Logout</button>
          <PostForm user={user} />
          <Board user={user} />
        </div>
      )}
    </div>
  );
}

export default App;
