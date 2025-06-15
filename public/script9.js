const samplePosts = [
    ];

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

    const feed = document.getElementById('feed');
    const template = document.getElementById('post-template');
    feed.innerHTML = ''; // svuota il contenitore

    posts.forEach(post => {
      const clone = template.content.cloneNode(true);

      clone.querySelector('.post-username').textContent = post.userId;
      clone.querySelector('.post-date').textContent = new Date(post.createdAt).toLocaleString('it-IT');
      clone.querySelector('.post-desc-text').textContent = post.desc;
      clone.querySelector('.like-count').textContent = post.likes;
      clone.querySelector('.comment-count').textContent = post.comments;

      const imageEl = clone.querySelector('.post-image');
      if (post.imageUrl) {
        imageEl.src = post.imageUrl;
      } else {
        imageEl.style.display = 'none';
      }

      feed.appendChild(clone);
    });
  } catch (err) {
    console.error('Errore nel caricamento post:', err);
  }
}

window.addEventListener('DOMContentLoaded', caricaPost);


    window.addEventListener("DOMContentLoaded", () => {
      loadSamplePosts();
    });
