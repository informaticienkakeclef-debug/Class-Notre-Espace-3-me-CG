// ========== CONFIG ==========
const CODE_PROFESSEUR = 'PROF2026'; // Code secret pour s'inscrire comme professeur

// ========== HELPERS ==========
function load(key, defaultVal = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || defaultVal;
  } catch {
    return defaultVal;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem('currentUser'));
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) sessionStorage.setItem('currentUser', JSON.stringify(user));
  else sessionStorage.removeItem('currentUser');
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return 'h' + Math.abs(h).toString(36);
}

function normalizeTel(tel) {
  return (tel || '').replace(/\s+/g, '').replace(/[-.]/g, '');
}

function getUserById(id) {
  return load('users', []).find(u => u.id === id);
}

function isProf(user) {
  return user && user.role === 'professeur';
}

// ========== AUTH ==========
const authScreen = document.getElementById('authScreen');
const app = document.getElementById('app');
const formLogin = document.getElementById('formLogin');
const formRegister = document.getElementById('formRegister');
const formForgot = document.getElementById('formForgot');
const loginError = document.getElementById('loginError');
const regError = document.getElementById('regError');
const forgotError = document.getElementById('forgotError');
const forgotSuccess = document.getElementById('forgotSuccess');

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    formLogin.classList.add('hidden');
    formRegister.classList.add('hidden');
    formForgot.classList.add('hidden');
    forgotSuccess.classList.add('hidden');
    loginError.textContent = '';
    regError.textContent = '';
    forgotError.textContent = '';

    if (tab.dataset.tab === 'login') formLogin.classList.remove('hidden');
    else if (tab.dataset.tab === 'register') formRegister.classList.remove('hidden');
    else formForgot.classList.remove('hidden');
  });
});

// --- Inscription ---
formRegister.addEventListener('submit', (e) => {
  e.preventDefault();
  const nom = document.getElementById('regNom').value.trim();
  const prenom = document.getElementById('regPrenom').value.trim();
  const tel = document.getElementById('regTel').value.trim();
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const codeProf = document.getElementById('regCodeProf').value.trim();

  if (nom.length < 2) {
    regError.textContent = 'Le nom doit faire au moins 2 caractères.';
    return;
  }
  if (prenom.length < 2) {
    regError.textContent = 'Le prénom doit faire au moins 2 caractères.';
    return;
  }
  if (normalizeTel(tel).length < 8) {
    regError.textContent = 'Entre un numéro de téléphone valide.';
    return;
  }
  if (pass.length < 4) {
    regError.textContent = 'Le mot de passe doit faire au moins 4 caractères.';
    return;
  }
  if (pass !== pass2) {
    regError.textContent = 'Les mots de passe ne correspondent pas.';
    return;
  }

  const users = load('users', []);
  // Unique par prénom (insensible à la casse) pour simplifier la connexion
  if (users.some(u => u.prenom.toLowerCase() === prenom.toLowerCase())) {
    regError.textContent = 'Ce prénom est déjà utilisé. Choisis un autre ou connecte-toi.';
    return;
  }

  let role = 'eleve';
  if (codeProf && codeProf.toUpperCase() === CODE_PROFESSEUR) {
    role = 'professeur';
  } else if (codeProf) {
    regError.textContent = 'Code professeur incorrect. Laisse vide si tu es élève.';
    return;
  }

  const user = {
    id: uid(),
    nom,
    prenom,
    tel: normalizeTel(tel),
    passHash: simpleHash(pass),
    role,
    photoProfil: null,
    created: new Date().toISOString()
  };
  users.push(user);
  save('users', users);

  setCurrentUser({
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    role: user.role,
    photoProfil: null
  });
  enterApp();
});

// --- Connexion ---
formLogin.addEventListener('submit', (e) => {
  e.preventDefault();
  const prenom = document.getElementById('loginPseudo').value.trim();
  const pass = document.getElementById('loginPass').value;

  const users = load('users', []);
  const user = users.find(u => u.prenom.toLowerCase() === prenom.toLowerCase());

  if (!user || user.passHash !== simpleHash(pass)) {
    loginError.textContent = 'Prénom ou mot de passe incorrect.';
    return;
  }

  setCurrentUser({
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    role: user.role || 'eleve',
    photoProfil: user.photoProfil || null
  });
  enterApp();
});

// --- Mot de passe oublié ---
formForgot.addEventListener('submit', (e) => {
  e.preventDefault();
  forgotSuccess.classList.add('hidden');
  const prenom = document.getElementById('forgotPrenom').value.trim();
  const tel = normalizeTel(document.getElementById('forgotTel').value);
  const pass = document.getElementById('forgotPass').value;
  const pass2 = document.getElementById('forgotPass2').value;

  if (pass.length < 4) {
    forgotError.textContent = 'Le mot de passe doit faire au moins 4 caractères.';
    return;
  }
  if (pass !== pass2) {
    forgotError.textContent = 'Les mots de passe ne correspondent pas.';
    return;
  }

  const users = load('users', []);
  const idx = users.findIndex(u =>
    u.prenom.toLowerCase() === prenom.toLowerCase() &&
    normalizeTel(u.tel) === tel
  );

  if (idx === -1) {
    forgotError.textContent = 'Aucun compte trouvé avec ce prénom et ce numéro.';
    return;
  }

  users[idx].passHash = simpleHash(pass);
  save('users', users);
  forgotError.textContent = '';
  forgotSuccess.classList.remove('hidden');
  formForgot.reset();
});

function enterApp() {
  const user = getCurrentUser();
  if (!user) return;

  // Refresh from storage (photo may have changed)
  const full = getUserById(user.id);
  if (full) {
    user.photoProfil = full.photoProfil || null;
    user.role = full.role || 'eleve';
    user.nom = full.nom;
    user.prenom = full.prenom;
    setCurrentUser(user);
  }

  authScreen.classList.add('hidden');
  app.classList.remove('hidden');

  const roleLabel = isProf(user) ? ' 🎓 Professeur' : '';
  document.getElementById('userBadge').textContent = '👤 ' + user.prenom + roleLabel;
  document.getElementById('welcomeName').textContent = user.prenom + ' !';
  document.getElementById('welcomeRole').textContent = isProf(user)
    ? 'Tu es connecté en tant que professeur.'
    : '';
  document.getElementById('contactNom').value = user.prenom;

  renderAll();
}

document.getElementById('btnLogout').addEventListener('click', () => {
  if (!confirm('Te déconnecter ?')) return;
  setCurrentUser(null);
  app.classList.add('hidden');
  authScreen.classList.remove('hidden');
  formLogin.reset();
  formRegister.reset();
  formForgot.reset();
  loginError.textContent = '';
  regError.textContent = '';
  forgotError.textContent = '';
  forgotSuccess.classList.add('hidden');
});

(function initAuth() {
  if (getCurrentUser()) enterApp();
})();

// ========== NAVIGATION ==========
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');

navToggle.addEventListener('click', () => nav.classList.toggle('open'));

document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-page]');
  if (!link) return;
  e.preventDefault();
  const pageId = link.dataset.page;
  if (!pageId) return;

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');

  nav.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pageId === 'profil') renderProfil();
});

// ========== STATS ==========
function updateStats() {
  const el = id => document.getElementById(id);
  if (el('statDevoirs')) el('statDevoirs').textContent = load('devoirs').length;
  if (el('statNotes')) el('statNotes').textContent = load('notes').length;
  if (el('statMessages')) el('statMessages').textContent = load('messages').length;
  if (el('statPhotos')) el('statPhotos').textContent = load('photos').length;
}

// ========== DEVOIRS ==========
const listeDevoirs = document.getElementById('listeDevoirs');
const formDevoir = document.getElementById('formDevoir');

document.getElementById('btnAddDevoir').addEventListener('click', () => {
  formDevoir.classList.remove('hidden');
  document.getElementById('devoirTitre').focus();
});

document.getElementById('cancelDevoir').addEventListener('click', () => {
  formDevoir.classList.add('hidden');
  clearDevoirForm();
});

function clearDevoirForm() {
  document.getElementById('devoirTitre').value = '';
  document.getElementById('devoirDesc').value = '';
  document.getElementById('devoirDate').value = '';
  document.getElementById('devoirMatiere').value = '';
}

document.getElementById('saveDevoir').addEventListener('click', () => {
  const titre = document.getElementById('devoirTitre').value.trim();
  const desc = document.getElementById('devoirDesc').value.trim();
  const date = document.getElementById('devoirDate').value;
  const matiere = document.getElementById('devoirMatiere').value.trim();
  const user = getCurrentUser();

  if (!titre) {
    alert('Merci d\'écrire un titre pour le devoir.');
    return;
  }

  const devoirs = load('devoirs');
  devoirs.unshift({
    id: uid(),
    titre, desc, date, matiere,
    authorId: user.id,
    author: user.prenom,
    created: new Date().toISOString()
  });
  save('devoirs', devoirs);
  renderDevoirs();
  updateStats();
  formDevoir.classList.add('hidden');
  clearDevoirForm();
});

function renderDevoirs() {
  const devoirs = load('devoirs');
  const user = getCurrentUser();
  if (devoirs.length === 0) {
    listeDevoirs.innerHTML = '<div class="empty"><p>Aucun devoir pour le moment.</p><p style="margin-top:0.5rem;font-size:0.9rem;">Clique sur « + Ajouter un devoir ».</p></div>';
    return;
  }

  listeDevoirs.innerHTML = devoirs.map(d => {
    const canDelete = user && (d.authorId === user.id || isProf(user));
    return `
    <div class="card">
      <div class="card-header">
        <div>
          ${d.matiere ? '<span class="badge">' + escapeHtml(d.matiere) + '</span>' : ''}
          <div class="card-title" style="margin-top:0.3rem;">${escapeHtml(d.titre)}</div>
        </div>
      </div>
      ${d.date ? '<div class="card-meta">📅 À rendre le ' + formatDate(d.date) + '</div>' : ''}
      ${d.author ? '<div class="card-meta">👤 Ajouté par ' + escapeHtml(d.author) + '</div>' : ''}
      ${d.desc ? '<div class="card-desc">' + escapeHtml(d.desc) + '</div>' : ''}
      <div class="card-actions">
        <button class="btn btn-download" onclick="downloadDevoir('${d.id}')">⬇️ Télécharger</button>
        ${canDelete ? '<button class="btn btn-danger" onclick="deleteDevoir(\'' + d.id + '\')">Supprimer</button>' : ''}
      </div>
    </div>`;
  }).join('');
}

window.downloadDevoir = function(id) {
  const d = load('devoirs').find(x => x.id === id);
  if (!d) return;
  let content = 'DEVOIR - ' + d.titre + '\n========================\n\n';
  if (d.matiere) content += 'Matière : ' + d.matiere + '\n';
  if (d.date) content += 'Date limite : ' + formatDate(d.date) + '\n';
  if (d.author) content += 'Ajouté par : ' + d.author + '\n';
  content += '\n' + (d.desc || '(pas de description)') + '\n\n---\nSite de la classe';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'devoir_' + d.titre.replace(/[^a-z0-9]/gi, '_').slice(0, 30) + '.txt';
  a.click();
};

window.deleteDevoir = function(id) {
  const d = load('devoirs').find(x => x.id === id);
  const user = getCurrentUser();
  if (!d || !user) return;
  if (d.authorId !== user.id && !isProf(user)) {
    alert('Tu ne peux supprimer que tes propres devoirs.');
    return;
  }
  if (!confirm('Supprimer ce devoir ?')) return;
  save('devoirs', load('devoirs').filter(x => x.id !== id));
  renderDevoirs();
  updateStats();
};

// ========== NOTES ==========
const listeNotes = document.getElementById('listeNotes');
const formNote = document.getElementById('formNote');

document.getElementById('btnAddNote').addEventListener('click', () => {
  formNote.classList.remove('hidden');
  document.getElementById('noteMatiere').focus();
});

document.getElementById('cancelNote').addEventListener('click', () => {
  formNote.classList.add('hidden');
  clearNoteForm();
});

function clearNoteForm() {
  document.getElementById('noteMatiere').value = '';
  document.getElementById('noteTitre').value = '';
  document.getElementById('noteValeur').value = '';
  document.getElementById('noteMax').value = '20';
  document.getElementById('noteDate').value = '';
}

document.getElementById('saveNote').addEventListener('click', () => {
  const matiere = document.getElementById('noteMatiere').value.trim();
  const titre = document.getElementById('noteTitre').value.trim();
  const valeur = parseFloat(document.getElementById('noteValeur').value);
  const max = parseFloat(document.getElementById('noteMax').value) || 20;
  const date = document.getElementById('noteDate').value;
  const user = getCurrentUser();

  if (!matiere || isNaN(valeur)) {
    alert('Merci de remplir la matière et la note.');
    return;
  }

  const notes = load('notes');
  notes.unshift({
    id: uid(),
    matiere, titre, valeur, max, date,
    authorId: user.id,
    author: user.prenom,
    created: new Date().toISOString()
  });
  save('notes', notes);
  renderNotes();
  updateStats();
  formNote.classList.add('hidden');
  clearNoteForm();
});

function renderNotes() {
  const notes = load('notes');
  const user = getCurrentUser();
  if (notes.length === 0) {
    listeNotes.innerHTML = '<div class="empty"><p>Aucune note enregistrée.</p></div>';
    return;
  }

  listeNotes.innerHTML = notes.map(n => {
    const percent = Math.round((n.valeur / n.max) * 100);
    let color = 'var(--primary)';
    if (percent >= 80) color = 'var(--success)';
    else if (percent < 50) color = 'var(--danger)';
    const canDelete = user && (n.authorId === user.id || isProf(user));

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <span class="badge">${escapeHtml(n.matiere)}</span>
            ${n.titre ? '<div class="card-title" style="margin-top:0.3rem;">' + escapeHtml(n.titre) + '</div>' : ''}
            ${n.author ? '<div class="card-meta">👤 ' + escapeHtml(n.author) + '</div>' : ''}
          </div>
          <div class="note-value" style="color:${color}">${n.valeur}<span style="font-size:0.9rem;font-weight:600;color:var(--text-light)"> / ${n.max}</span></div>
        </div>
        ${n.date ? '<div class="card-meta">📅 ' + formatDate(n.date) + '</div>' : ''}
        <div class="card-actions">
          ${canDelete ? '<button class="btn btn-danger" onclick="deleteNote(\'' + n.id + '\')">Supprimer</button>' : ''}
        </div>
      </div>`;
  }).join('');
}

window.deleteNote = function(id) {
  const n = load('notes').find(x => x.id === id);
  const user = getCurrentUser();
  if (!n || !user) return;
  if (n.authorId !== user.id && !isProf(user)) {
    alert('Tu ne peux supprimer que tes propres notes.');
    return;
  }
  if (!confirm('Supprimer cette note ?')) return;
  save('notes', load('notes').filter(x => x.id !== id));
  renderNotes();
  updateStats();
};

// ========== DISCUSSION ==========
const messagesEl = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
window._editingMessages = {};

function renderMessages() {
  const messages = load('messages');
  const user = getCurrentUser();
  const editingMap = window._editingMessages || {};

  if (messages.length === 0) {
    messagesEl.innerHTML = '<div class="empty" style="box-shadow:none;background:transparent;">Aucun message. Sois le premier ! 😊</div>';
    return;
  }

  messagesEl.innerHTML = messages.map(m => {
    const isMine = user && m.authorId === user.id;
    const canMod = isMine || isProf(user);
    const editing = editingMap[m.id];
    const authorUser = getUserById(m.authorId);
    const avatar = authorUser && authorUser.photoProfil
      ? '<img src="' + authorUser.photoProfil + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px;">'
      : '';

    if (editing && isMine) {
      return `
        <div class="message ${isMine ? 'mine' : ''}" data-id="${m.id}">
          <div class="author">${avatar}${escapeHtml(m.pseudo)}</div>
          <input class="message-edit-input" id="edit-${m.id}" value="${escapeHtml(m.text)}">
          <div class="message-actions">
            <button class="btn btn-primary" style="padding:0.3rem 0.7rem;font-size:0.8rem;" onclick="saveEditMessage('${m.id}')">Enregistrer</button>
            <button class="btn btn-secondary" style="padding:0.3rem 0.7rem;font-size:0.8rem;" onclick="cancelEditMessage('${m.id}')">Annuler</button>
          </div>
        </div>`;
    }

    return `
      <div class="message ${isMine ? 'mine' : ''}" data-id="${m.id}">
        <div class="author">${avatar}${escapeHtml(m.pseudo)}${m.role === 'professeur' ? ' <span class="role-badge prof">Prof</span>' : ''}</div>
        <div>${escapeHtml(m.text)}</div>
        <div class="time">${new Date(m.time).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}${m.edited ? ' (modifié)' : ''}</div>
        ${canMod ? `
          <div class="message-actions">
            ${isMine ? '<button class="btn btn-edit" onclick="startEditMessage(\'' + m.id + '\')">✏️ Modifier</button>' : ''}
            <button class="btn btn-danger" onclick="deleteMessage('${m.id}')">🗑️ Supprimer</button>
          </div>` : ''}
      </div>`;
  }).join('');

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

window.startEditMessage = function(id) {
  window._editingMessages[id] = true;
  renderMessages();
  setTimeout(() => document.getElementById('edit-' + id)?.focus(), 50);
};

window.saveEditMessage = function(id) {
  const input = document.getElementById('edit-' + id);
  if (!input) return;
  const newText = input.value.trim();
  if (!newText) {
    alert('Le message ne peut pas être vide.');
    return;
  }
  const messages = load('messages');
  const m = messages.find(x => x.id === id);
  if (!m) return;
  const user = getCurrentUser();
  if (!user || m.authorId !== user.id) {
    alert('Tu ne peux modifier que tes propres messages.');
    return;
  }
  m.text = newText;
  m.edited = true;
  save('messages', messages);
  delete window._editingMessages[id];
  renderMessages();
};

window.cancelEditMessage = function(id) {
  delete window._editingMessages[id];
  renderMessages();
};

window.deleteMessage = function(id) {
  const messages = load('messages');
  const m = messages.find(x => x.id === id);
  if (!m) return;
  const user = getCurrentUser();
  if (!user) return;
  if (m.authorId !== user.id && !isProf(user)) {
    alert('Tu ne peux supprimer que tes propres messages.');
    return;
  }
  if (!confirm('Supprimer ce message ?')) return;
  save('messages', messages.filter(x => x.id !== id));
  delete window._editingMessages[id];
  renderMessages();
  updateStats();
};

document.getElementById('sendMessage').addEventListener('click', sendMsg);
messageInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });

function sendMsg() {
  const user = getCurrentUser();
  if (!user) return;
  const text = messageInput.value.trim();
  if (!text) return;

  const messages = load('messages');
  messages.push({
    id: uid(),
    authorId: user.id,
    pseudo: user.prenom,
    role: user.role || 'eleve',
    text,
    time: new Date().toISOString()
  });
  if (messages.length > 150) messages.shift();
  save('messages', messages);
  messageInput.value = '';
  renderMessages();
  updateStats();
}

// ========== ÉLÈVES ==========
function renderEleves() {
  const users = load('users', []);
  const photos = load('photos');
  const list = document.getElementById('elevesList');

  if (users.length === 0) {
    list.innerHTML = '<div class="empty"><p>Aucun élève inscrit pour le moment.</p></div>';
    return;
  }

  // Professeurs d'abord, puis élèves par prénom
  const sorted = [...users].sort((a, b) => {
    if ((a.role === 'professeur') !== (b.role === 'professeur')) {
      return a.role === 'professeur' ? -1 : 1;
    }
    return a.prenom.localeCompare(b.prenom, 'fr');
  });

  list.innerHTML = sorted.map(u => {
    const userPhotos = photos.filter(p => p.authorId === u.id);
    const avatar = u.photoProfil
      ? '<img src="' + u.photoProfil + '" alt="">'
      : (userPhotos[0] ? '<img src="' + userPhotos[0].data + '" alt="">' : '👤');
    const roleBadge = u.role === 'professeur'
      ? '<span class="role-badge prof">Prof</span>'
      : '';
    return `
      <div class="eleve-card" onclick="openEleveProfile('${u.id}')">
        <div class="avatar">${avatar}</div>
        <h3>${escapeHtml(u.prenom)} ${escapeHtml(u.nom || '')} ${roleBadge}</h3>
        <p>${userPhotos.length} photo${userPhotos.length !== 1 ? 's' : ''}</p>
      </div>`;
  }).join('');
}

window.openEleveProfile = function(userId) {
  const user = getUserById(userId);
  if (!user) return;

  const photos = load('photos').filter(p => p.authorId === userId);
  const current = getCurrentUser();

  document.getElementById('eleveName').textContent =
    user.prenom + ' ' + (user.nom || '') +
    (user.role === 'professeur' ? ' (Professeur)' : '');

  document.getElementById('eleveMeta').textContent =
    (photos.length ? photos.length + ' photo' + (photos.length > 1 ? 's' : '') : 'Aucune photo') +
    (current && current.id === userId ? ' • C\'est toi !' : '');

  const avatarEl = document.getElementById('eleveAvatar');
  if (user.photoProfil) {
    avatarEl.innerHTML = '<img src="' + user.photoProfil + '" alt="" style="cursor:zoom-in;">';
    avatarEl.querySelector('img').onclick = () => openLightbox(user.photoProfil);
  } else if (photos[0]) {
    avatarEl.innerHTML = '<img src="' + photos[0].data + '" alt="" style="cursor:zoom-in;">';
    avatarEl.querySelector('img').onclick = () => openLightbox(photos[0].data);
  } else {
    avatarEl.innerHTML = '👤';
  }

  const photosEl = document.getElementById('elevePhotos');
  if (photos.length === 0) {
    photosEl.innerHTML = '<p style="color:var(--text-light);font-size:0.9rem;">Pas encore de photo.</p>';
  } else {
    photosEl.innerHTML = photos.map(p => `
      <div class="photo-item"><img src="${p.data}" alt="" loading="lazy" class="photo-clickable" style="cursor:zoom-in;"></div>
    `).join('');
    photosEl.querySelectorAll('img').forEach(img => {
      img.addEventListener('click', () => openLightbox(img.src));
    });
  }

  document.getElementById('eleveModal').classList.remove('hidden');
};

document.getElementById('closeEleveModal').addEventListener('click', () => {
  document.getElementById('eleveModal').classList.add('hidden');
});
document.getElementById('eleveModal').addEventListener('click', (e) => {
  if (e.target.id === 'eleveModal') document.getElementById('eleveModal').classList.add('hidden');
});

// ========== PROFIL (photo de profil) ==========
function renderProfil() {
  const user = getCurrentUser();
  if (!user) return;
  const full = getUserById(user.id) || user;

  const avatarEl = document.getElementById('profilAvatar');
  if (full.photoProfil) {
    avatarEl.innerHTML = '<img src="' + full.photoProfil + '" alt="" style="cursor:zoom-in;">';
    avatarEl.querySelector('img').addEventListener('click', () => openLightbox(full.photoProfil));
  } else {
    avatarEl.innerHTML = '👤';
  }

  const roleText = full.role === 'professeur'
    ? '<span class="role-badge prof">Professeur</span>'
    : '<span class="role-badge">Élève</span>';

  document.getElementById('profilInfo').innerHTML = `
    <p><strong>Prénom</strong> ${escapeHtml(full.prenom)}</p>
    <p><strong>Nom</strong> ${escapeHtml(full.nom || '—')}</p>
    <p><strong>Téléphone</strong> ${escapeHtml(full.tel || '—')}</p>
    <p><strong>Rôle</strong> ${roleText}</p>
  `;

  // Ensure view mode
  document.getElementById('profilView')?.classList.remove('hidden');
  document.getElementById('profilEdit')?.classList.add('hidden');
}

// --- Modifier profil ---
document.getElementById('btnEditProfil')?.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user) return;
  const full = getUserById(user.id) || user;
  document.getElementById('editNom').value = full.nom || '';
  document.getElementById('editPrenom').value = full.prenom || '';
  document.getElementById('editTel').value = full.tel || '';
  document.getElementById('editCodeProf').value = '';
  document.getElementById('editProfilError').textContent = '';
  document.getElementById('profilView').classList.add('hidden');
  document.getElementById('profilEdit').classList.remove('hidden');
});

document.getElementById('cancelEditProfil')?.addEventListener('click', () => {
  document.getElementById('profilEdit').classList.add('hidden');
  document.getElementById('profilView').classList.remove('hidden');
});

document.getElementById('saveProfil')?.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user) return;
  const nom = document.getElementById('editNom').value.trim();
  const prenom = document.getElementById('editPrenom').value.trim();
  const tel = document.getElementById('editTel').value.trim();
  const codeProf = document.getElementById('editCodeProf').value.trim();
  const err = document.getElementById('editProfilError');

  if (nom.length < 2) { err.textContent = 'Le nom doit faire au moins 2 caractères.'; return; }
  if (prenom.length < 2) { err.textContent = 'Le prénom doit faire au moins 2 caractères.'; return; }
  if (normalizeTel(tel).length < 8) { err.textContent = 'Numéro de téléphone invalide.'; return; }

  const users = load('users', []);
  // Check prenom unique (except self)
  if (users.some(u => u.id !== user.id && u.prenom.toLowerCase() === prenom.toLowerCase())) {
    err.textContent = 'Ce prénom est déjà utilisé par un autre compte.';
    return;
  }

  const idx = users.findIndex(u => u.id === user.id);
  if (idx === -1) return;

  users[idx].nom = nom;
  users[idx].prenom = prenom;
  users[idx].tel = normalizeTel(tel);

  // Role change
  if (codeProf) {
    if (codeProf.toUpperCase() === CODE_PROFESSEUR) {
      users[idx].role = 'professeur';
    } else {
      err.textContent = 'Code professeur incorrect.';
      return;
    }
  }
  // If was prof and leaves code empty, keep current role (don't auto-demote)

  save('users', users);

  const updated = {
    id: user.id,
    nom: users[idx].nom,
    prenom: users[idx].prenom,
    role: users[idx].role,
    photoProfil: users[idx].photoProfil || null
  };
  setCurrentUser(updated);

  // Update header
  const roleLabel = isProf(updated) ? ' 🎓 Professeur' : '';
  document.getElementById('userBadge').textContent = '👤 ' + updated.prenom + roleLabel;
  document.getElementById('welcomeName').textContent = updated.prenom + ' !';
  document.getElementById('welcomeRole').textContent = isProf(updated)
    ? 'Tu es connecté en tant que professeur.'
    : '';
  document.getElementById('contactNom').value = updated.prenom;

  renderProfil();
  renderEleves();
  renderMessages();
  alert('Compte mis à jour !');
});

// --- Supprimer compte ---
document.getElementById('btnDeleteAccount')?.addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user) return;

  if (!confirm('Es-tu sûr de vouloir supprimer ton compte ?\\n\\nCette action est définitive. Tes messages et photos resteront mais ne seront plus liés à un compte actif.')) return;
  if (!confirm('Dernière confirmation : supprimer définitivement ton compte ?')) return;

  // Remove user
  let users = load('users', []);
  users = users.filter(u => u.id !== user.id);
  save('users', users);

  // Logout
  setCurrentUser(null);
  app.classList.add('hidden');
  authScreen.classList.remove('hidden');
  formLogin.reset();
  formRegister.reset();
  formForgot.reset();
  loginError.textContent = '';
  regError.textContent = '';
  forgotError.textContent = '';
  forgotSuccess.classList.add('hidden');

  alert('Ton compte a été supprimé. À bientôt !');
});

document.getElementById('profilPhotoInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Choisis une image.');
    return;
  }
  if (file.size > 1.5 * 1024 * 1024) {
    alert('Image trop lourde (max 1,5 Mo).');
    return;
  }

  const user = getCurrentUser();
  if (!user) return;

  const base64 = await fileToBase64(file);
  const users = load('users', []);
  const idx = users.findIndex(u => u.id === user.id);
  if (idx === -1) return;

  users[idx].photoProfil = base64;
  save('users', users);

  user.photoProfil = base64;
  setCurrentUser(user);

  renderProfil();
  renderEleves();
  renderMessages();
  e.target.value = '';
});

// ========== LIGHTBOX ==========
window.openLightbox = function(src) {
  if (!src) return;
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  img.src = src;
  lb.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.getElementById('lightboxImg').src = '';
  document.body.style.overflow = '';
}

document.getElementById('lightboxClose')?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeLightbox();
});
document.getElementById('lightbox')?.addEventListener('click', (e) => {
  if (e.target.id === 'lightbox' || e.target.id === 'lightboxClose') closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// ========== PHOTOS ==========
const photoInput = document.getElementById('photoInput');
const gallery = document.getElementById('gallery');

photoInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  const user = getCurrentUser();
  if (!user) return;

  const photos = load('photos');
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    if (file.size > 2 * 1024 * 1024) {
      alert('La photo "' + file.name + '" est trop lourde (max 2 Mo).');
      continue;
    }
    const base64 = await fileToBase64(file);
    photos.unshift({
      id: uid(),
      data: base64,
      name: file.name,
      authorId: user.id,
      author: user.prenom,
      date: new Date().toISOString()
    });
  }
  while (photos.length > 30) photos.pop();
  save('photos', photos);
  renderPhotos();
  renderEleves();
  updateStats();
  photoInput.value = '';
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderPhotos() {
  const photos = load('photos');
  const user = getCurrentUser();
  if (photos.length === 0) {
    gallery.innerHTML = '<div class="empty" style="grid-column:1/-1;"><p>Aucune photo pour le moment.</p></div>';
    return;
  }

  gallery.innerHTML = photos.map(p => {
    const canDelete = user && (p.authorId === user.id || isProf(user));
    // Escape for onclick - use data attribute approach via event delegation instead
    return `
    <div class="photo-item" data-src="${p.id}">
      <img src="${p.data}" alt="" loading="lazy" data-full="${p.id}" class="photo-clickable">
      <div class="photo-owner">${escapeHtml(p.author || '?')}</div>
      ${canDelete ? '<button class="delete-photo" data-delete="' + p.id + '" title="Supprimer">×</button>' : ''}
    </div>`;
  }).join('');

  // Event delegation for click & delete
  gallery.querySelectorAll('.photo-clickable').forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(img.src);
    });
  });
  gallery.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePhoto(btn.getAttribute('data-delete'));
    });
  });
}

window.deletePhoto = function(id) {
  const photos = load('photos');
  const p = photos.find(x => x.id === id);
  const user = getCurrentUser();
  if (!p || !user) return;
  if (p.authorId !== user.id && !isProf(user)) {
    alert('Tu ne peux supprimer que tes propres photos.');
    return;
  }
  if (!confirm('Supprimer cette photo ?')) return;
  save('photos', photos.filter(x => x.id !== id));
  renderPhotos();
  renderEleves();
  updateStats();
};

// ========== CONTACT ==========
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const nom = document.getElementById('contactNom').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const message = document.getElementById('contactMessage').value.trim();

  const contacts = load('contacts');
  contacts.push({ nom, email, message, time: new Date().toISOString() });
  save('contacts', contacts);

  document.getElementById('contactSuccess').style.display = 'block';
  e.target.reset();
  const user = getCurrentUser();
  if (user) document.getElementById('contactNom').value = user.prenom;
  setTimeout(() => {
    document.getElementById('contactSuccess').style.display = 'none';
  }, 4000);
});

// ========== RENDER ALL ==========
function renderAll() {
  renderDevoirs();
  renderNotes();
  renderMessages();
  renderEleves();
  renderPhotos();
  updateStats();
  renderProfil();
}
