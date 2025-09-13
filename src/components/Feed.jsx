import React, { useState, useEffect } from "react";

function Feed({ locationFilter }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        setPosts([]);
        setCurrentPage(1);
        setFinished(false);
        fetchPosts(1, locationFilter);
    }, [locationFilter]);

    const fetchPosts = async (page, filter) => {
        if (finished) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/posts?page=${page}&location=${encodeURIComponent(filter)}`, {
                credentials: "include"
            });
            const data = await res.json();
            if (data.length === 0) {
                setFinished(true);
            } else {
                setPosts(prev => page === 1 ? data : [...prev, ...data]);
                setCurrentPage(page);
            }
        } catch (err) {
            console.error("Errore caricamento post:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => fetchPosts(currentPage + 1, locationFilter);

    return (
        <div>
            {posts.map(post => (
                <div key={post._id} className="post">
                    <h4>{post.userId.nome} (@{post.userId.username})</h4>
                    <p>{post.desc}</p>
                    {post.imageUrl && <img src={post.imageUrl} alt="Post" style={{ maxWidth: "300px" }} />}
                    <small>{post.location} - {new Date(post.createdAt).toLocaleString()}</small>
                </div>
            ))}
            {loading && <p>Caricamento...</p>}
            {!finished && !loading && <button onClick={loadMore}>Carica altri</button>}
            {finished && <p>Non ci sono altri post.</p>}
        </div>
    );
}

export default Feed;
