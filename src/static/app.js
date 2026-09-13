document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const teacherStatus = document.getElementById("teacher-status");
  const closeModalButton = document.getElementById("close-modal");

  let teacherUsername = "";
  let teacherPassword = "";

  function setTeacherUi(isLoggedIn) {
    const loginLabel = isLoggedIn ? `Logged in as ${teacherUsername}` : "Teacher Login";
    loginButton.textContent = loginLabel;
    loginButton.classList.toggle("hidden", isLoggedIn);
    logoutButton.classList.toggle("hidden", !isLoggedIn);

    const formInputs = signupForm.querySelectorAll("input, select, button[type='submit']");
    formInputs.forEach((input) => {
      input.disabled = !isLoggedIn;
    });

    teacherStatus.textContent = isLoggedIn
      ? `Teacher access enabled for ${teacherUsername}.`
      : "Login as a teacher to register or remove students.";
  }

  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message ${type}`;
    element.classList.remove("hidden");
  }

  function hideMessage(element) {
    element.classList.add("hidden");
  }

  function fetchAuthHeaders() {
    if (!teacherUsername || !teacherPassword) {
      return {};
    }

    return {
      "X-Teacher-Username": teacherUsername,
      "X-Teacher-Password": teacherPassword,
    };
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${teacherUsername ? '<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>' : ""}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!teacherUsername || !teacherPassword) {
      showMessage(messageDiv, "Teacher login required to remove a student.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: fetchAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
      }

      setTimeout(() => hideMessage(messageDiv), 5000);
    } catch (error) {
      showMessage(messageDiv, "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!teacherUsername || !teacherPassword) {
      showMessage(messageDiv, "Teacher login required to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: fetchAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
      }

      setTimeout(() => hideMessage(messageDiv), 5000);
    } catch (error) {
      showMessage(messageDiv, "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginButton.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    loginModal.setAttribute("aria-hidden", "false");
  });

  closeModalButton.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginModal.setAttribute("aria-hidden", "true");
  });

  logoutButton.addEventListener("click", () => {
    teacherUsername = "";
    teacherPassword = "";
    setTeacherUi(false);
    signupForm.reset();
    hideMessage(messageDiv);
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        teacherUsername = username;
        teacherPassword = password;
        setTeacherUi(true);
        loginForm.reset();
        loginModal.classList.add("hidden");
        hideMessage(loginMessage);
        showMessage(messageDiv, `Logged in as ${username}.`, "success");
        setTimeout(() => hideMessage(messageDiv), 5000);
      } else {
        showMessage(loginMessage, result.detail || "Invalid credentials", "error");
      }
    } catch (error) {
      showMessage(loginMessage, "Login failed. Please try again.", "error");
      console.error("Login error:", error);
    }
  });

  setTeacherUi(false);
  fetchActivities();
});
