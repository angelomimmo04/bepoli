const samplePosts = [
    ];

    const postTemplate = document.getElementById("post-template");
    const feedContainer = document.getElementById("feed");
    const createPostForm = document.getElementById("createPostForm");
    const postDescInput = document.getElementById("postDescInput");
    const postImageInput = document.getElementById("postImageInput");
    const createPostError = document.getElementById("createPostError");

    function loadSamplePosts() {
      feedContainer.innerHTML = "";
      samplePosts.forEach(post => {
        const postEl = createPostElement(post);
        feedContainer.appendChild(postEl);
      });
    }

    function createPostElement(post) {
      const clone = postTemplate.content.cloneNode(true);
      const postCard = clone.querySelector(".post-card");
      const usernameEl = postCard.querySelector(".post-username");
      const dateEl = postCard.querySelector(".post-date");
      const postImg = postCard.querySelector(".post-image");
      const descEl = postCard.querySelector(".post-desc-text");
      const likeBtn = postCard.querySelector(".like-button");
      const likeCountEl = postCard.querySelector(".like-count");
      const commentToggleBtn = postCard.querySelector(".comment-toggle-button");
      const commentCountEl = postCard.querySelector(".comment-count");
      const commentSection = postCard.querySelector(".comment-section");
      const commentsList = postCard.querySelector(".comments-list");
      const commentForm = postCard.querySelector(".comment-form");
      const commentInput = postCard.querySelector(".comment-input");

      usernameEl.textContent = post.userId;
      const dt = new Date(post.createdAt);
      dateEl.textContent = dt.toLocaleString("it-IT", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
      dateEl.setAttribute("datetime", post.createdAt);

      postImg.src = post.Image;
      postImg.alt = post.desc;

      descEl.textContent = post.desc;

      likeCountEl.textContent = post.likes.length;
      commentCountEl.textContent = post.comments.length;

      likeBtn.addEventListener("click", () => {
        const user = "simulatedUser";
        if (post.likes.includes(user)) {
          post.likes = post.likes.filter(id => id !== user);
        } else {
          post.likes.push(user);
        }
        likeCountEl.textContent = post.likes.length;
      });

      commentToggleBtn.addEventListener("click", () => {
        commentSection.classList.toggle("hidden");
      });

      commentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (!text) return;
        const newComment = { userId: "simulatedUser", text, createdAt: new Date().toISOString() };
        post.comments.push(newComment);
        commentCountEl.textContent = post.comments.length;

        const li = document.createElement("li");
        const authorSpan = document.createElement("span");
        authorSpan.textContent = newComment.userId;
        authorSpan.classList.add("comment-author");
        const textSpan = document.createElement("span");
        textSpan.textContent = newComment.text;
        li.appendChild(authorSpan);
        li.appendChild(textSpan);
        commentsList.prepend(li);
        commentInput.value = "";
      });

      return postCard;
    }

    createPostForm.addEventListener("submit", (e) => {
      e.preventDefault();
      createPostError.classList.add("hidden");
      createPostError.textContent = "";

      const desc = postDescInput.value.trim();
      const file = postImageInput.files[0];

      if (!desc && !file) {
        createPostError.textContent = "Inserisci descrizione o seleziona un'immagine.";
        createPostError.classList.remove("hidden");
        return;
      }

      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const base64Image = event.target.result;
          const newPost = {
            _id: Date.now().toString(),
            userId: "simulatedUser",
            createdAt: new Date().toISOString(),
            desc: desc,
            Image: base64Image,
            likes: [],
            comments: []
          };
          samplePosts.unshift(newPost);
          const newPostEl = createPostElement(newPost);
          feedContainer.prepend(newPostEl);
          postDescInput.value = "";
          postImageInput.value = "";
        };
        reader.readAsDataURL(file);
      } else {
        const newPost = {
          _id: Date.now().toString(),
          userId: "simulatedUser",
          createdAt: new Date().toISOString(),
          desc: desc,
          Image: "",
          likes: [],
          comments: []
        };
        samplePosts.unshift(newPost);
        const newPostEl = createPostElement(newPost);
        feedContainer.prepend(newPostEl);
        postDescInput.value = "";
      }
    });

    window.addEventListener("DOMContentLoaded", () => {
      loadSamplePosts();
    });
