import React, { useState } from "react";
import axios from "axios";

export default function PostForm({ user }) {
  const [url, setUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:3001/api/posts", { url });
      setUrl("");
      window.dispatchEvent(new Event("postAdded")); // trigger Board refresh
    } catch (err) {
      alert(err.response.data.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Post an Article</h2>
      <input placeholder="Article URL" value={url} onChange={e => setUrl(e.target.value)} />
      <button type="submit">Post</button>
    </form>
  );
}
