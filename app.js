const STORAGE_KEY = "mini_social_v2";
let state = {
  users: [],
  currentUser: null,
  posts: [],
  theme: "light",
};

function init() {
  loadState();
  applyTheme();

  const path = window.location.pathname;
  const page = path.split("/").pop();

  if (page === "index.html" || page === "") {
    if (state.currentUser) window.location.href = "feed.html";
    else initLogin();
  } else if (page === "signup.html") {
    if (state.currentUser) window.location.href = "feed.html";
    else initSignup();
  } else if (page === "feed.html") {
    if (!state.currentUser) window.location.href = "index.html";
    else initFeed();
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    state = JSON.parse(raw);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
}

// --- Auth Logic ---
function initLogin() {
  const form = document.getElementById("login-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-pass").value.trim();

    const user = state.users.find(
      (u) => u.email === email && u.password === pass
    );

    if (user) {
      state.currentUser = { email: user.email, name: user.name };
      saveState();
      window.location.href = "feed.html";
    } else {
      alert("Invalid email or password");
    }
  });
}

function initSignup() {
  const form = document.getElementById("signup-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const pass = document.getElementById("signup-pass").value.trim();

    if (state.users.find((u) => u.email === email)) {
      alert("Email already registered");
      return;
    }

    state.users.push({ name, email, password: pass });
    saveState();
    alert("Account created! Please log in.");
    window.location.href = "index.html";
  });
}

function initFeed() {
  document.getElementById("current-user-name").textContent =
    state.currentUser.name;

  document.getElementById("signout-btn").addEventListener("click", () => {
    state.currentUser = null;
    saveState();
    window.location.href = "index.html";
  });

  document.getElementById("theme-toggle").addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    applyTheme();
    saveState();
  });

  document.getElementById("post-btn").addEventListener("click", createPost);

  document.getElementById("search-input").addEventListener("input", renderFeed);
  document.getElementById("sort-select").addEventListener("change", renderFeed);
  renderFeed();
}

function createPost() {
  const text = document.getElementById("post-text").value.trim();
  const imgUrl = document.getElementById("post-image-url").value.trim();

  if (!text && !imgUrl) {
    alert("Please write something or add an image.");
    return;
  }

  const newPost = {
    id: Date.now().toString(),
    authorName: state.currentUser.name,
    authorEmail: state.currentUser.email,
    content: text,
    image: imgUrl,
    likes: [],
    createdAt: Date.now(),
  };

  state.posts.unshift(newPost);
  saveState();

  document.getElementById("post-text").value = "";
  document.getElementById("post-image-url").value = "";
  renderFeed();
}

function renderFeed() {
  const feedEl = document.getElementById("feed");
  feedEl.innerHTML = "";

  const searchQuery = document
    .getElementById("search-input")
    .value.toLowerCase();
  const sortMode = document.getElementById("sort-select").value;

  let filteredPosts = state.posts.filter(
    (p) =>
      p.content.toLowerCase().includes(searchQuery) ||
      p.authorName.toLowerCase().includes(searchQuery)
  );

  if (sortMode === "latest") {
    filteredPosts.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sortMode === "oldest") {
    filteredPosts.sort((a, b) => a.createdAt - b.createdAt);
  } else if (sortMode === "likes") {
    filteredPosts.sort((a, b) => b.likes.length - a.likes.length);
  }

  if (filteredPosts.length === 0) {
    feedEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted)">No posts found.</div>`;
    return;
  }

  filteredPosts.forEach((post) => {
    const isLiked = post.likes.includes(state.currentUser.email);
    const isAuthor = post.authorEmail === state.currentUser.email;

    const card = document.createElement("div");
    card.className = "post-card";

    let imageHtml = "";
    if (post.image) {
      imageHtml = `<img src="${post.image}" class="post-image" onerror="this.style.display='none'">`;
    }

    let deleteBtn = "";
    if (isAuthor) {
      deleteBtn = `<button class="delete-btn" onclick="deletePost('${post.id}')"><i class="fa-solid fa-trash"></i></button>`;
    }

    card.innerHTML = `
  <div class="post-header">
    <div class="post-author-info">
      <div class="avatar">${post.authorName[0].toUpperCase()}</div>
      <div>
        <div class="author-name">${post.authorName}</div>
        <div class="post-time">${timeAgo(post.createdAt)}</div>
      </div>
    </div>
    ${deleteBtn || ""}
  </div>

  <div class="post-content">
    ${post.content}
  </div>

  ${imageHtml || ""}

  <div class="post-actions">
    <button class="action-btn ${isLiked ? "liked" : ""}" onclick="toggleLike('${
      post.id
    }')">
      <i class="${isLiked ? "fa-solid" : "fa-regular"} fa-heart"></i> ${
      post.likes.length
    } Like${post.likes.length !== 1 ? "s" : ""}
    </button>
    <button class="action-btn" onclick="toggleCommentBox('${post.id}')">
      <i class="fa-regular fa-comment"></i> Comment
    </button>
  </div>

  <div class="comment-section hidden" id="comment-section-${post.id}">
    <input type="text" class="comment-input" placeholder="Write a comment..." />
    <button class="comment-btn" onclick="addComment('${post.id}')">Post</button>
    <div class="comment-list" id="comment-list-${post.id}"></div>
  </div>
`;

    // Toggle the comment input box visibility
    function toggleCommentBox(postId) {
      const commentSection = document.getElementById(
        `comment-section-${postId}`
      );
      commentSection.classList.toggle("hidden");
    }

    // Add a comment to a post
    function addComment(postId) {
      const input = document.querySelector(
        `#comment-section-${postId} .comment-input`
      );
      const commentList = document.getElementById(`comment-list-${postId}`);
      const commentText = input.value.trim();

      if (!commentText) {
        alert("Enter a comment!");
        return;
      }

      // Add comment to the list
      const comment = document.createElement("div");
      comment.classList.add("comment");
      comment.innerHTML = `<span class="who">You:</span> ${commentText}`;
      commentList.appendChild(comment);

      // Clear input
      input.value = "";
    }

    feedEl.appendChild(card);
  });
}

window.toggleLike = function (postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;

  const userEmail = state.currentUser.email;
  const idx = post.likes.indexOf(userEmail);

  if (idx === -1) {
    post.likes.push(userEmail);
  } else {
    post.likes.splice(idx, 1);
  }

  saveState();
  renderFeed();
};

window.deletePost = function (postId) {
  if (confirm("Are you sure you want to delete this post?")) {
    state.posts = state.posts.filter((p) => p.id !== postId);
    saveState();
    renderFeed();
  }
};

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

document.addEventListener("DOMContentLoaded", init);
