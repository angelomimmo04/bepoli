import React from 'react';

function CreatePostForm() {
    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Post pubblicato!");
    };

    return (
        <section className="create-post-section">
            <form id="createPostForm" onSubmit={handleSubmit}>
        <textarea
            id="postDescInput"
            name="desc"
            placeholder="Scrivi una didascalia..."
            maxLength="500"
            rows="3"
        ></textarea>
                <div className="file-input-wrapper">
                    <input type="file" id="postImageInput" name="image" accept="image/*" capture="environment" />
                </div>
                <p className="camera-hint">
                    ⚠️ Senza posizione puoi vedere i post, ma non pubblicarli
                </p>
                <button type="submit" className="post-submit-button">Pubblica</button>
            </form>
            <div id="createPostError" className="error-message hidden"></div>
        </section>
    );
}

export default CreatePostForm;
