import React from 'react';

function Post({ post }) {
    return (
        <article className="post-card">
            <header className="post-header">
                <div className="post-user-info">
                    <span className="post-username">{post.username}</span>
                </div>
                <p className="post-location">{post.location}</p>
                <time className="post-date" dateTime={post.date}>{post.date}</time>
            </header>

            <div className="post-image-container">
                <img className="post-image" src={post.image} alt="Immagine del post" />
            </div>

            <div className="post-actions">
                <button className="like-button">❤ <span className="like-count">{post.likes}</span></button>
                <button className="comment-toggle-button">💬 <span className="comment-count">{post.comments.length}</span></button>
            </div>

            <div className="post-description">
                <p className="post-desc-text">{post.description}</p>
            </div>

            <div className="comment-section hidden">
                <ul className="comments-list">
                    {post.comments.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
                <form className="comment-form">
                    <input type="text" className="comment-input" placeholder="Scrivi un commento..." maxLength="200" />
                    <button type="submit" className="comment-submit">Invia</button>
                </form>
            </div>
        </article>
    );
}

export default Post;
