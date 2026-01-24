document.addEventListener("DOMContentLoaded", () => {
  // Application state management
  const state = {
    token: localStorage.getItem("token"), // JWT token for authentication
    currentUser: null, // Currently logged-in user
    users: [], // List of users fetched from the API
    page: 1, // Current page for pagination
    limit: 10, // Number of users per page
    total: 0, // Total number of users
    loading: false, // Loading state for API requests
  };

  // API base URL - update this to match your backend URL
  const API_URL = "/users";

  // DOM Elements
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const editUserForm = document.getElementById("edit-user-form");
  const loginSection = document.getElementById("login-section");
  const registerSection = document.getElementById("register-section");
  const userManagementSection = document.getElementById(
    "user-management-section",
  );
  const editUserSection = document.getElementById("edit-user-section");
  const usersListElement = document.getElementById("users-list");
  const prevPageBtn = document.getElementById("prev-page");
  const nextPageBtn = document.getElementById("next-page");
  const pageInfoElement = document.getElementById("page-info");
  const limitSelect = document.getElementById("limit-select");
  const logoutBtn = document.getElementById("logout-btn");
  const currentUserElement = document.getElementById("current-user");
  const cancelEditBtn = document.getElementById("cancel-edit");
  const uploadForm = document.getElementById("upload-form"); // CSV upload form

  // Initialize the application
  init();

  /**
   * Initializes the application state and sets up event listeners.
   */
  function init() {
    // Check if the user is already logged in
    if (state.token) {
      showUserManagement();
      loadUsers();
      setLoginStatus(true);
    } else {
      showLoginForm();
      setLoginStatus(false);
    }

    // Set up event listeners
    loginForm.addEventListener("submit", handleLogin);
    registerForm.addEventListener("submit", handleRegister);
    editUserForm.addEventListener("submit", handleEditUser);
    prevPageBtn.addEventListener("click", () => changePage(-1));
    nextPageBtn.addEventListener("click", () => changePage(1));
    limitSelect.addEventListener("change", handleLimitChange);
    logoutBtn.addEventListener("click", handleLogout);
    cancelEditBtn.addEventListener("click", cancelEdit);
    uploadForm.addEventListener("submit", handleCSVUpload);
  }

  /**
   * Sets the loading state and updates the UI accordingly.
   * @param {boolean} isLoading - Whether the application is in a loading state.
   */
  function setLoading(isLoading) {
    state.loading = isLoading;
    document.body.classList.toggle("loading", isLoading);

    // Disable buttons during loading to prevent multiple submissions
    const buttons = document.querySelectorAll("button");
    buttons.forEach((btn) => {
      btn.disabled = isLoading;
    });
  }

  /**
   * Makes an API request with the specified endpoint, method, and body.
   * @param {string} endpoint - The API endpoint to call.
   * @param {string} method - The HTTP method (e.g., GET, POST, PUT, DELETE).
   * @param {object|null} body - The request body (if any).
   * @returns {Promise<object>} - The response data from the API.
   */
  async function fetchAPI(endpoint, method = "GET", body = null) {
    const headers = {
      "Content-Type": "application/json",
    };

    // Add authorization header if a token exists
    if (state.token) {
      headers["Authorization"] = `Bearer ${state.token}`;
    }

    const options = {
      method,
      headers,
    };

    // Add body to the request if provided
    if (body) {
      options.body = JSON.stringify(body);
    }

    setLoading(true);
    try {
      const response = await fetch(endpoint, options);

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      // Throw an error if the response is not OK
      if (!response.ok) {
        throw new Error(data.message || `Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);
      showMessage(error.message, "error");
      throw error;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles the login form submission.
   * @param {Event} e - The form submission event.
   */
  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetchAPI(`${API_URL}/login`, "POST", {
        email,
        password,
      });
      localStorage.setItem("token", response.token);
      state.token = response.token;

      showUserManagement();
      loadUsers();
      setLoginStatus(true);
      showMessage("Login successful!", "success");
      loginForm.reset();
    } catch (error) {
      console.error("Login failed:", error);
    }
  }

  /**
   * Handles the registration form submission.
   * @param {Event} e - The form submission event.
   */
  async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const role = document.getElementById("register-role").value;

    try {
      await fetchAPI(API_URL, "POST", { name, email, password, role });
      showMessage("User registered successfully!", "success");
      registerForm.reset();
    } catch (error) {
      console.error("Registration failed:", error);
    }
  }

  /**
   * Handles the edit user form submission.
   * @param {Event} e - The form submission event.
   */
  async function handleEditUser(e) {
    e.preventDefault();
    const userId = document.getElementById("edit-user-id").value;
    const name = document.getElementById("edit-name").value;
    const email = document.getElementById("edit-email").value;

    try {
      await fetchAPI(`${API_URL}/${userId}`, "PUT", { name, email });
      showMessage("User updated successfully!", "success");
      loadUsers();
      cancelEdit();
    } catch (error) {
      console.error("Update failed:", error);
    }
  }

  /**
   * Handles the deletion of a user.
   * @param {string} userId - The ID of the user to delete.
   */
  async function handleDeleteUser(userId) {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await fetchAPI(`${API_URL}/${userId}`, "DELETE");
        showMessage("User deleted successfully!", "success");
        loadUsers();
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  }

  /**
   * Handles user logout.
   */
  function handleLogout() {
    localStorage.removeItem("token");
    state.token = null;
    state.currentUser = null;
    showLoginForm();
    setLoginStatus(false);
    showMessage("Logged out successfully!", "success");
  }

  /**
   * Handles changes to the pagination limit.
   */
  function handleLimitChange() {
    state.limit = parseInt(limitSelect.value);
    state.page = 1;
    loadUsers();
  }

  /**
   * Changes the current page for pagination.
   * @param {number} direction - The direction to change the page (-1 for previous, 1 for next).
   */
  function changePage(direction) {
    const newPage = state.page + direction;
    if (newPage < 1 || newPage > Math.ceil(state.total / state.limit)) return;

    state.page = newPage;
    loadUsers();
  }

  /**
   * Shows the login form and hides other sections.
   */
  function showLoginForm() {
    loginSection.classList.remove("hidden");
    registerSection.classList.remove("hidden");
    userManagementSection.classList.add("hidden");
    editUserSection.classList.add("hidden");
  }

  /**
   * Shows the user management section and hides other sections.
   */
  function showUserManagement() {
    loginSection.classList.add("hidden");
    registerSection.classList.add("hidden");
    userManagementSection.classList.remove("hidden");
    editUserSection.classList.add("hidden");
  }

  /**
   * Updates the UI to reflect the login status.
   * @param {boolean} isLoggedIn - Whether the user is logged in.
   */
  function setLoginStatus(isLoggedIn) {
    if (isLoggedIn) {
      logoutBtn.classList.remove("hidden");
      try {
        const payload = JSON.parse(atob(state.token.split(".")[1]));
        currentUserElement.textContent = `Logged in as: ${payload.role}`;
        state.currentUser = payload;
      } catch (e) {
        currentUserElement.textContent = "Logged in";
      }
    } else {
      logoutBtn.classList.add("hidden");
      currentUserElement.textContent = "Not logged in";
    }
  }

  /**
   * Shows the edit form for a user.
   * @param {object} user - The user object to edit.
   */
  function showEditForm(user) {
    document.getElementById("edit-user-id").value = user.id;
    document.getElementById("edit-name").value = user.name;
    document.getElementById("edit-email").value = user.email;

    editUserSection.classList.remove("hidden");
    window.scrollTo({ top: editUserSection.offsetTop, behavior: "smooth" });
  }

  /**
   * Cancels the edit form and hides it.
   */
  function cancelEdit() {
    editUserSection.classList.add("hidden");
    editUserForm.reset();
  }

  /**
   * Displays a message to the user.
   * @param {string} text - The message text.
   * @param {string} type - The type of message (e.g., 'success', 'error').
   */
  function showMessage(text, type) {
    const messageContainer = document.getElementById("message-container");
    const messageElement = document.createElement("div");
    messageElement.className = `message ${type}`;
    messageElement.textContent = text;

    messageContainer.appendChild(messageElement);

    // Remove the message after 3 seconds
    setTimeout(() => {
      messageElement.remove();
    }, 3000);
  }

  /**
   * Loads users from the API and updates the state.
   */
  async function loadUsers() {
    try {
      const response = await fetchAPI(
        `${API_URL}?page=${state.page}&limit=${state.limit}`,
      );
      state.users = response.users;
      state.total = response.total;

      // Update pagination info
      pageInfoElement.textContent = `Page ${state.page} of ${Math.ceil(state.total / state.limit)}`;

      renderUsers();
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  }

  /**
   * Renders the list of users in the UI.
   */
  function renderUsers() {
    usersListElement.innerHTML = "";

    if (state.users.length === 0) {
      usersListElement.innerHTML =
        '<tr><td colspan="4">No users found</td></tr>';
      return;
    }

    state.users.forEach((user) => {
      const row = document.createElement("tr");

      row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <button class="btn action-btn primary edit-btn" data-id="${user.id}">Edit</button>
                    <button class="btn action-btn danger delete-btn" data-id="${user.id}">Delete</button>
                </td>
            `;

      usersListElement.appendChild(row);
    });

    // Add event listeners to edit and delete buttons
    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const userId = button.getAttribute("data-id");
        const user = state.users.find((u) => u.id == userId);
        if (user) showEditForm(user);
      });
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const userId = button.getAttribute("data-id");
        handleDeleteUser(userId);
      });
    });
  }

  /**
   * Handles the CSV upload form submission.
   * @param {Event} e - The form submission event.
   */
  async function handleCSVUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById("csv-file");
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload CSV");
      }

      const result = await response.json();
      showMessage(result.message, "success");
      loadUsers();
      uploadForm.reset();
    } catch (error) {
      console.error("CSV upload failed:", error);
      showMessage("CSV upload failed", "error");
    }
  }
});
