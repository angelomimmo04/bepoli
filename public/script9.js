document.getElementById('createPostForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  const locationText = document.getElementById("location").textContent;
  const zone = window.currentZoneName;

  if (!zone || zone === "Fuori dalle aree conosciute") {
    alert("⚠ Attiva la localizzazione e attendi il rilevamento prima di pubblicare.");
    return;
  }

  console.log("🌍 Zona rilevata prima del post:", window.currentZoneName);
formData.append("location", window.currentZoneName || "Posizione sconosciuta");
  

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const data = await res.json();
    if (res.ok) {
      form.reset();
      caricaPost(1);
    } else {
      alert(data.message || 'Errore nella creazione del post');
    }
  } catch (err) {
    alert('Errore di rete');
  }
});


let currentPage = 1;
const pageSize = 10;
let loading = false;
let finished = false;

let currentLocationFilter = "Fuori dalle aree conosciute"; // default se posizione non attiva


async function caricaPost(page = 1) {
  if (loading || finished) return;
  loading = true;
  document.getElementById('loader').classList.remove('hidden');

  try {
    const location = encodeURIComponent(currentLocationFilter || "Fuori dalle aree conosciute");
    const res = await fetch(`/api/posts?page=${page}&pageSize=${pageSize}&location=${location}`, { credentials: 'include' });

    if (!res.ok) throw new Error("Errore fetch");

    const posts = await res.json();

    if (posts.length < pageSize) {
      finished = true;
      document.getElementById('loadMore').style.display = 'none';  // Nascondi bottone se non ci sono altri post
    } else {
      finished = false;
      document.getElementById('loadMore').style.display = '';      // Mostra bottone
    }

    const feed = document.getElementById('feed');
    const template = document.getElementById('post-template');

    // Se è la prima pagina, pulisci, altrimenti appendi
    if (page === 1) feed.innerHTML = '';

    posts.forEach(post => {
      console.log("📦 Post ricevuto:", post);
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

      // Immagine profilo autore
      const profileImg = document.createElement('img');
      profileImg.src = `/api/user-photo/${userId}`;
      profileImg.alt = 'Foto profilo';
      profileImg.style.width = '32px';
      profileImg.style.height = '32px';
      profileImg.style.borderRadius = '50%';
      profileImg.style.objectFit = 'cover';
      profileImg.onerror = () => { profileImg.src = 'fotoprofilo.png'; };

      // Nome cliccabile
      const linkProfilo = document.createElement('a');
      linkProfilo.textContent = nomeUtente;
      linkProfilo.href = `profile.html?id=${userId}`;
      linkProfilo.style.color = 'blue';
      linkProfilo.style.textDecoration = 'none';

      wrapper.appendChild(profileImg);
      wrapper.appendChild(linkProfilo);
      const posizioneP = document.createElement('p');

      const locationEl = clone.querySelector('.post-location');
      
if (locationEl) {
  locationEl.textContent = `Luogo: ${post.location || "Posizione sconosciuta"}`;
}
      

      nomeSpan.replaceWith(wrapper);

      // Data post
      clone.querySelector('.post-date').textContent = new Date(post.createdAt).toLocaleString('it-IT');
      clone.querySelector('.post-desc-text').textContent = post.desc;
      clone.querySelector('.like-count').textContent = post.likes;
      clone.querySelector('.comment-count').textContent = post.comments;

      const imageEl = clone.querySelector('.post-image');
      if (post.imageUrl) {
        imageEl.src = post.imageUrl;
        imageEl.style.display = '';
      } else {
        imageEl.style.display = 'none';
      }

      // Like
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

      // Commenti
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
              const userPhotoUrl = `/api/user-photo/${u?._id}`;
              li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <img src="${userPhotoUrl}" alt="Foto profilo" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" onerror="this.src='fotoprofilo.png'">
                  <div>
                    <strong>${autore}</strong>: ${c.text}<br>
                    <span class="comment-date">${data}</span>
                  </div>
                </div>
              `;
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
            const userPhotoUrl = `/api/user-photo/${u?._id}`;
            li.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${userPhotoUrl}" alt="Foto profilo" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" onerror="this.src='fotoprofilo.png'">
                <div>
                  <strong>${autore}</strong>: ${updated.newComment.text}<br>
                  <span class="comment-date">${data}</span>
                </div>
              </div>
            `;
            commentsList.appendChild(li);
          }
        } catch (err) {
          console.error('Errore commento:', err);
        }
      });

      feed.appendChild(clone);
    });

    currentPage = page; // aggiorna pagina corrente

  } catch (err) {
    console.error('Errore nel caricamento post:', err);
    
  } finally {
    loading = false;
    document.getElementById('loader').classList.add('hidden');
  }
}

// Bottone carica altri
document.getElementById('loadMore').addEventListener('click', () => {
  if (!loading && !finished) {
    caricaPost(currentPage + 1, currentLocationFilter);
  }
});

// Carica prima pagina all’avvio
// Carica prima pagina con filtro default (posizione sconosciuta)
caricaPost(1);

// Quando l’utente attiva la posizione
function onUserLocationActivated(zoneName) {
  currentLocationFilter = zoneName || "Fuori dalle aree conosciute";
  finished = false;
  currentPage = 1;
  caricaPost(1, currentLocationFilter);
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
//profilo//
  
  document.getElementById('goToProfile').addEventListener('click', (e) => {
  e.preventDefault();
  if (typeof loggedUserId !== 'undefined') {
    window.location.href = `profile.html?id=${loggedUserId}`;
  } else {
    alert("ID utente non disponibile.");
  }
});



  // Chiudi modale cliccando fuori
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('profileModal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});

