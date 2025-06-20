document.getElementById('createPostForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const data = await res.json();
    if (res.ok) {
      form.reset();
      caricaPost(); // aggiorna il feed
    } else {
      alert(data.message || 'Errore nella creazione del post');
    }
  } catch (err) {
    alert('Errore di rete');
  }
});

async function caricaPost() {
  try {
    const res = await fetch('/api/posts', { credentials: 'include' });
    const posts = await res.json();
    console.log(posts);

    const feed = document.getElementById('feed');
    const template = document.getElementById('post-template');
    feed.innerHTML = ''; // svuota il contenitore

    posts.forEach(post => {
      const clone = template.content.cloneNode(true);

      // Dati utente
      const nomeUtente = post.userId?.nome || "Nome mancante";
      const usernameUtente = post.userId?.username || "username";

      const userLink = clone.querySelector('.post-username');
      userLink.textContent = `${nomeUtente}`;
      userLink.style.cursor = 'pointer';
      userLink.addEventListener('click', () => apriProfiloModal(post.userId._id));

      clone.querySelector('.post-date').textContent = new Date(post.createdAt).toLocaleString('it-IT');
      clone.querySelector('.post-desc-text').textContent = post.desc;
      clone.querySelector('.like-count').textContent = post.likes;
      clone.querySelector('.comment-count').textContent = post.comments;

      const imageEl = clone.querySelector('.post-image');
      if (post.imageUrl) imageEl.src = post.imageUrl;
      else imageEl.style.display = 'none';

      // === Like ===
      const likeButton = clone.querySelector('.like-button');
      const likeCount = clone.querySelector(".like-count");
      likeButton.addEventListener('click', async () => {
        try {
          const res = await fetch(`/api/posts/${post._id}/like`, {
            method: 'POST',
            credentials: 'include'
          });
          if (res.ok) {
            const updated = await res.json();
            likeCount.textContent = updated.likes;
          }
        } catch (err) {
          console.error('Errore like:', err);
        }
      });

      // === Commenti ===
          // === Commenti ===
      const commentToggleBtn = clone.querySelector('.comment-toggle-button');
      const commentSection = clone.querySelector('.comment-section');
      const commentsList = clone.querySelector('.comments-list');
      const commentForm = clone.querySelector('.comment-form');
      const commentInput = clone.querySelector('.comment-input');
      const commentCountEl = clone.querySelector('.comment-count');

      commentToggleBtn.addEventListener('click', async () => {
        commentSection.classList.toggle('hidden');

        if (!commentSection.classList.contains('hidden') && commentsList.children.length === 0) {
          try {
            const res = await fetch(`/api/posts/${post._id}/comments`, {
              credentials: 'include'
            });
            const allComments = await res.json();

            allComments.forEach(c => {
              const li = document.createElement('li');
              const u = c.userId;
              const autore = u?.nome ? `${u.nome} (@${u.username})` : "Utente";
              const data = new Date(c.createdAt).toLocaleString('it-IT');
              li.textContent = `${autore}: ${c.text} – ${data}`;
              commentsList.appendChild(li);
            });
          } catch (err) {
            console.error('Errore nel caricamento commenti:', err);
          }
        }
      });

      commentForm.addEventListener('submit', async e => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (!text) return;

        try {
          const res = await fetch(`/api/posts/${post._id}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ text })
          });
          const updated = await res.json();
          commentInput.value = '';
          commentCountEl.textContent = updated.comments;

          if (updated.newComment) {
            const li = document.createElement('li');
            const u = updated.newComment.userId;
            const autore = u?.nome ? `${u.nome} (@${u.username})` : "Utente";
            const data = new Date(updated.newComment.createdAt).toLocaleString('it-IT');
            li.textContent = `${autore}: ${updated.newComment.text} – ${data}`;
            commentsList.appendChild(li);
          }
        } catch (err) {
          console.error('Errore commento:', err);
        }
      });

      feed.appendChild(clone);
    }); // ✅ questa chiude posts.forEach

  } catch (err) {
    console.error('Errore nel caricamento post:', err);
  }
}

window.addEventListener('DOMContentLoaded', caricaPost);
