import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Board({ user }) {
  const [posts, setPosts] = useState([]);

  const fetchPosts = async () => {
    try {
      const res = await axios.get("http://localhost:3001/api/posts");
      setPosts(res.data);
    } catch (err) {
      alert("Error fetching posts");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/api/posts/${id}`);
      fetchPosts();
    } catch (err) {
      alert(err.response.data.error);
    }
  };

  useEffect(() => {
    fetchPosts();
    const listener = () => fetchPosts();
    window.addEventListener("postAdded", listener);
    return () => window.removeEventListener("postAdded", listener);
  }, []);

  return (
    <div>
      <h2>Message Board</h2>
      {posts.map(post => (
        <div key={post.id} style={{ border: "1px solid gray", padding: "5px", margin: "5px 0" }}>
          <a href={post.url} target="_blank" rel="noopener noreferrer">{post.url}</a>
          <p>Posted by: {post.username} on {new Date(post.created_at).toLocaleString()}</p>
          {(user.is_admin || user.id === post.user_id) && (
            <button onClick={() => handleDelete(post.id)}>Delete</button>
          )}
        </div>
      ))}
    </div>
  );
}
