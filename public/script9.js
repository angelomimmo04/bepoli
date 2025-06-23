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
    feed.innerHTML = '';

    posts.forEach(post => {
      const clone = template.content.cloneNode(true);

      // === Dati autore ===
      const nomeUtente = post.userId?.nome || "Nome mancante";
      const usernameUtente = post.userId?.username || "username";
      const userId = post.userId?._id;

      const nomeSpan = clone.querySelector('.post-username');
const wrapper = document.createElement('div');
wrapper.style.display = 'flex';
wrapper.style.alignItems = 'center';
wrapper.style.gap = '8px';

// ⬇️ Immagine profilo autore
const profileImg = document.createElement('img');
profileImg.src = `/api/user-photo/${userId}`;
profileImg.alt = 'Foto profilo';
profileImg.style.width = '32px';
profileImg.style.height = '32px';
profileImg.style.borderRadius = '50%';
profileImg.style.objectFit = 'cover';
profileImg.onerror = () => { profileImg.src = 'fotoprofilo.png'; };

// ⬇️ Nome cliccabile
const linkProfilo = document.createElement('a');
linkProfilo.textContent = nomeUtente;
linkProfilo.href = `profile.html?id=${userId}`;
linkProfilo.style.color = 'blue';
linkProfilo.style.textDecoration = 'none';

wrapper.appendChild(profileImg);
wrapper.appendChild(linkProfilo);
nomeSpan.replaceWith(wrapper);

      
nomeSpan.replaceWith(linkProfilo);


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
            const res = await fetch(`/api/posts/${post._id}/comments`, { credentials: 'include' });
            const allComments = await res.json();
            allComments.forEach(c => {
              const li = document.createElement('li');
              const u = c.userId;
              const autore = u?.nome || "Utente";
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
            const autore = u?.nome || "Utente";
            const data = new Date(updated.newComment.createdAt).toLocaleString('it-IT');
            li.textContent = `${autore}: ${updated.newComment.text} – ${data}`;
            commentsList.appendChild(li);
          }
        } catch (err) {
          console.error('Errore commento:', err);
        }
      });

      feed.appendChild(clone);
    });

  } catch (err) {
    console.error('Errore nel caricamento post:', err);
  }
}

// === MODALE PROFILO ===
function apriProfiloModal(userId) {
  const iframe = document.getElementById('profileIframe');
  iframe.src = `profile.html?id=${userId}`;
  document.getElementById('profileModal').style.display = 'block';
}

window.addEventListener('DOMContentLoaded', () => {
  caricaPost();

  const closeBtn = document.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('profileModal').style.display = 'none';
    });
  }

  // Chiudi modale cliccando fuori
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('profileModal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});

