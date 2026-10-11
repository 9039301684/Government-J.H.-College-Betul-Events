const configuredApiBase = document.querySelector('meta[name="api-base"]')?.content.trim();
const localApiHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? window.location.hostname
  : "localhost";
const API_BASE = configuredApiBase || (
  window.location.protocol === "file:"
    ? `http://${localApiHost}:5000`
    : window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? `http://${localApiHost}:5000`
      : window.location.origin
);
const AUTH_TOKEN_KEY = "jhCollegeToken";
const LEGACY_AUTH_TOKEN_KEY = "jhStudentToken";
const AUTH_USER_KEY = "jhCollegeUser";

const canvas = document.getElementById("stars");
const ctx = canvas ? canvas.getContext("2d") : null;
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.querySelector(".nav-links");
const roleOptions = document.querySelectorAll(".role-option");
const loginForm = document.getElementById("loginForm");
const registrationForm = document.getElementById("registrationForm");
const loginMessage = document.getElementById("loginMessage");
const registrationMessage = document.getElementById("registrationMessage");
const studentDashboard = document.getElementById("studentDashboard");
const dashboardStudentName = document.getElementById("dashboardStudentName");
const dashboardStudentEmail = document.getElementById("dashboardStudentEmail");
const dashboardStudentRoll = document.getElementById("dashboardStudentRoll");
const dashboardStudentSemester = document.getElementById("dashboardStudentSemester");
const dashboardMessage = document.getElementById("dashboardMessage");
const dashboardLogoutButton = document.getElementById("dashboardLogoutButton");
const studentSession = document.getElementById("studentSession");
const studentWelcome = document.getElementById("studentWelcome");
const logoutButton = document.getElementById("logoutButton");

const eventSettingsForm = document.getElementById("eventSettingsForm");
const adminSettingsSection = document.getElementById("adminSettings");
const adminPortalSection = document.getElementById("adminPortalSection");
const staffAccountManagement = document.getElementById("staffAccountManagement");
const staffAccountList = document.getElementById("staffAccountList");
const staffAccountForm = document.getElementById("staffAccountForm");
const staffAccountName = document.getElementById("staffAccountName");
const staffAccountEmail = document.getElementById("staffAccountEmail");
const staffAccountRole = document.getElementById("staffAccountRole");
const staffAccountPassword = document.getElementById("staffAccountPassword");
const staffAccountMessage = document.getElementById("staffAccountMessage");
const eventSettingsMessage = document.getElementById("eventSettingsMessage");
const eventDateInput = document.getElementById("eventDateInput");
const eventTimeInput = document.getElementById("eventTimeInput");
const eventVenueInput = document.getElementById("eventVenueInput");
const eventAnnouncementInput = document.getElementById("eventAnnouncementInput");
const eventDateDisplay = document.getElementById("eventDateDisplay");
const eventTimeDisplay = document.getElementById("eventTimeDisplay");
const eventVenueDisplay = document.getElementById("eventVenueDisplay");
const countdown = document.getElementById("countdown");

const adminEventForm = document.getElementById("adminEventForm");
const adminEventList = document.getElementById("adminEventList");
const adminEventMessage = document.getElementById("adminEventMessage");
const eventIdField = document.getElementById("eventIdField");
const adminCancelEvent = document.getElementById("adminCancelEvent");
const adminEventTitle = document.getElementById("adminEventTitle");
const adminEventDate = document.getElementById("adminEventDate");
const adminEventTime = document.getElementById("adminEventTime");
const adminEventVenue = document.getElementById("adminEventVenue");
const adminEventCategory = document.getElementById("adminEventCategory");
const adminEventDescription = document.getElementById("adminEventDescription");
const adminEventImage = document.getElementById("adminEventImage");
const adminEventPublished = document.getElementById("adminEventPublished");

const albumForm = document.getElementById("albumForm");
const albumMessage = document.getElementById("albumMessage");
const albumIdField = document.getElementById("albumIdField");
const albumYear = document.getElementById("albumYear");
const albumTitle = document.getElementById("albumTitle");
const albumDescription = document.getElementById("albumDescription");
const albumEventDate = document.getElementById("albumEventDate");
const albumPhotographer = document.getElementById("albumPhotographer");
const albumUploadInput = document.getElementById("albumUploadInput");
const albumDeleteButton = document.getElementById("albumDeleteButton");
const addAnnualPartyPhotosButton = document.getElementById("addAnnualPartyPhotosButton");
const adminAlbumList = document.getElementById("adminAlbumList");
const galleryYearFilter = document.getElementById("galleryYearFilter");
const galleryGrid = document.getElementById("galleryGrid");
const semesterTabs = document.querySelectorAll(".semester-tab");
const studentGrid = document.getElementById("studentGrid");
const semesterTitle = document.getElementById("semesterTitle");
const studentCount = document.getElementById("studentCount");

let selectedRole = "student";
let studentDirectory = [];
let galleryAlbums = [];
let countdownInterval = null;
let activeSemester = "1";
let stars = [];
let canvasWidth = 0;
let canvasHeight = 0;
let animationFrame = null;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function token() { return sessionStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(LEGACY_AUTH_TOKEN_KEY) || ""; }
function user() { try { const raw = sessionStorage.getItem(AUTH_USER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function saveSession(tokenValue, userValue) { sessionStorage.setItem(AUTH_TOKEN_KEY, tokenValue); sessionStorage.setItem(LEGACY_AUTH_TOKEN_KEY, tokenValue); sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(userValue)); }
function clearSession() { sessionStorage.removeItem(AUTH_TOKEN_KEY); sessionStorage.removeItem(LEGACY_AUTH_TOKEN_KEY); sessionStorage.removeItem(AUTH_USER_KEY); }

function updateAdminAccessUI(role = user()?.role) {
  const canManage = ["admin", "principal", "teacher"].includes(role);
  const canManageStaff = ["admin", "principal"].includes(role);
  if (adminSettingsSection) adminSettingsSection.hidden = !canManage;
  if (adminPortalSection) adminPortalSection.hidden = !canManage;
  if (staffAccountManagement) staffAccountManagement.hidden = !canManageStaff;
  if (staffAccountRole) {
    const principalOption = staffAccountRole.querySelector('option[value="principal"]');
    if (principalOption) principalOption.hidden = role !== "admin";
    if (role !== "admin") staffAccountRole.value = "teacher";
  }
  if (!canManageStaff && staffAccountList) staffAccountList.replaceChildren();
}

function updateStudentSession(name = "") {
  const currentToken = token();
  updateAdminAccessUI();
  if (studentSession && studentWelcome) {
    studentSession.hidden = !currentToken;
    studentWelcome.textContent = currentToken ? `Logged in as ${name || "Student"}` : "";
  }
}

function hideStudentDashboard() {
  if (studentDashboard) studentDashboard.classList.add("hidden");
  if (dashboardStudentName) dashboardStudentName.textContent = "";
  if (dashboardStudentEmail) dashboardStudentEmail.textContent = "";
  if (dashboardStudentRoll) dashboardStudentRoll.textContent = "";
  if (dashboardStudentSemester) dashboardStudentSemester.textContent = "";
  if (dashboardMessage) dashboardMessage.textContent = "";
}

function resetEventForm() {
  if (eventIdField) eventIdField.value = "";
  if (adminEventTitle) adminEventTitle.value = "";
  if (adminEventDate) adminEventDate.value = "";
  if (adminEventTime) adminEventTime.value = "";
  if (adminEventVenue) adminEventVenue.value = "";
  if (adminEventCategory) adminEventCategory.value = "";
  if (adminEventDescription) adminEventDescription.value = "";
  if (adminEventImage) adminEventImage.value = "";
  if (adminEventPublished) adminEventPublished.checked = true;
  if (adminEventMessage) adminEventMessage.textContent = "";
}

function resetAlbumForm() {
  if (albumIdField) albumIdField.value = "";
  if (albumYear) albumYear.value = "";
  if (albumTitle) albumTitle.value = "";
  if (albumDescription) albumDescription.value = "";
  if (albumEventDate) albumEventDate.value = "";
  if (albumPhotographer) albumPhotographer.value = "";
  if (albumUploadInput) albumUploadInput.value = "";
  if (albumDeleteButton) albumDeleteButton.classList.add("hidden");
  if (albumMessage) albumMessage.textContent = "";
}

function formatEventDate(value) {
  if (!value) return "Date not announced yet";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatEventTime(value) {
  if (!value) return "Time to be announced";
  const time = new Date(`2000-01-01T${value}`);
  if (Number.isNaN(time.getTime())) return value;
  return time.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

async function requestJson(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const method = options.method || "GET";
  const requestOptions = { ...options, method, headers };
  const authToken = options.authToken || token();

  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (requestOptions.body && !(requestOptions.body instanceof FormData) && typeof requestOptions.body !== "string" && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(requestOptions.body);
  }

  if (requestOptions.body && typeof requestOptions.body === "string" && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  requestOptions.headers = headers;
  const response = await fetch(url, requestOptions);
  const contentType = response.headers.get("content-type") || "";
  let data = {};
  if (contentType.includes("application/json")) data = await response.json();
  else data = { success: false, message: await response.text() || "Request failed." };
  return { response, data };
}

async function loadEventSettings() {
  try {
    const { response, data } = await requestJson(`${API_BASE}/api/events/settings`);
    if (!response.ok || !data.success || !data.event) return;
    const current = data.event;
    if (eventDateDisplay) eventDateDisplay.textContent = formatEventDate(current.party_date);
    if (eventTimeDisplay) eventTimeDisplay.textContent = formatEventTime(current.party_time);
    if (eventVenueDisplay) eventVenueDisplay.textContent = current.venue || "Venue to be announced";
    if (eventDateInput) eventDateInput.value = current.party_date || "";
    if (eventTimeInput) eventTimeInput.value = current.party_time || "";
    if (eventVenueInput) eventVenueInput.value = current.venue || "";
    if (eventAnnouncementInput) eventAnnouncementInput.value = current.announcement || "";
    if (current.party_date && current.party_time) startEventCountdown(current.party_date, current.party_time);
    else stopCountdown();
  } catch (error) { console.error("Event settings failed to load", error); }
}

function stopCountdown() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  if (countdown) countdown.classList.add("hidden");
}

function startEventCountdown(date, time) {
  stopCountdown();
  const target = new Date(`${date}T${time}`);
  if (Number.isNaN(target.getTime())) return;
  const tick = () => {
    const remaining = target.getTime() - Date.now();
    if (remaining <= 0) { stopCountdown(); return; }
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const dayEl = document.getElementById("days");
    const hourEl = document.getElementById("hours");
    const minuteEl = document.getElementById("minutes");
    const secondEl = document.getElementById("seconds");
    if (dayEl) dayEl.textContent = String(days).padStart(2, "0");
    if (hourEl) hourEl.textContent = String(hours).padStart(2, "0");
    if (minuteEl) minuteEl.textContent = String(minutes).padStart(2, "0");
    if (secondEl) secondEl.textContent = String(seconds).padStart(2, "0");
    if (countdown) countdown.classList.remove("hidden");
  };
  tick();
  countdownInterval = setInterval(tick, 1000);
}

async function loadEvents() {
  const publicList = document.getElementById("eventList");
  try {
    const { response, data } = await requestJson(`${API_BASE}/api/events?published=true`);
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to load events");
    const events = Array.isArray(data.events) ? data.events : [];
    if (publicList) {
      publicList.replaceChildren();
      if (!events.length) appendEmptyState(publicList, "No events have been published yet.");
      events.forEach((event) => {
        const card = document.createElement("article");
        card.className = "event-card";
        const header = document.createElement("div");
        header.className = "event-card-header";
        const tag = document.createElement("span");
        tag.className = "event-tag";
        tag.textContent = event.category || "General";
        header.appendChild(tag);
        const title = document.createElement("h3");
        title.textContent = event.title;
        const description = document.createElement("p");
        description.textContent = event.description || "Official college event schedule.";
        const details = document.createElement("ul");
        [["Date:", formatEventDate(event.event_date)], ["Time:", formatEventTime(event.start_time)], ["Venue:", event.venue || ""]].forEach(([label, value]) => {
          const item = document.createElement("li");
          const strong = document.createElement("strong");
          strong.textContent = label;
          item.append(strong, ` ${value}`);
          details.appendChild(item);
        });
        card.append(header, title, description, details);
        publicList.appendChild(card);
      });
    }
    if (adminEventList && token() && ["admin", "principal", "teacher"].includes(user()?.role)) {
      try {
        const { response: adminResponse, data: adminData } = await requestJson(`${API_BASE}/api/events/admin`);
        if (!adminResponse.ok || !adminData.success) throw new Error(adminData.message || "Unable to load managed events");
        renderAdminEventList(Array.isArray(adminData.events) ? adminData.events : []);
      } catch (error) {
        console.error("Unable to load managed events", error);
        adminEventList.replaceChildren();
        appendEmptyState(adminEventList, "Managed events could not be loaded.");
      }
    } else if (adminEventList) {
      adminEventList.replaceChildren();
      appendEmptyState(adminEventList, "Log in as authorized staff to manage events.");
    }
  } catch (error) {
    console.error("Unable to load events", error);
    if (publicList) {
      publicList.replaceChildren();
      appendEmptyState(publicList, "Events could not be loaded.");
    }
    if (adminEventList) {
      adminEventList.replaceChildren();
      appendEmptyState(adminEventList, "Events could not be loaded.");
    }
  }
}

function renderAdminEventList(events) {
  if (!adminEventList) return;
  adminEventList.replaceChildren();
  if (!events.length) appendEmptyState(adminEventList, "No events yet.");
  events.forEach((event) => {
    const card = document.createElement("article");
    card.className = "list-card";
    const content = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = event.title;
    const date = document.createElement("p");
    date.textContent = `${formatEventDate(event.event_date)} • ${formatEventTime(event.start_time)}`;
    const venue = document.createElement("small");
    venue.textContent = `${event.venue || ""}${event.is_published === false ? " • Draft" : ""}`;
    content.append(title, date, venue);
    const actions = document.createElement("div");
    actions.className = "mini-actions";
    [["edit-event", "Edit", "mini-button"], ["delete-event", "Delete", "mini-button danger"]].forEach(([action, label, className]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      button.dataset.action = action;
      button.dataset.id = String(event.id);
      button.textContent = label;
      actions.appendChild(button);
    });
    card.append(content, actions);
    adminEventList.appendChild(card);
  });
}

async function loadStaffAccounts() {
  if (!staffAccountList || !["admin", "principal"].includes(user()?.role)) return;
  staffAccountList.replaceChildren();
  appendEmptyState(staffAccountList, "Loading staff accounts...");
  try {
    const { response, data } = await requestJson(`${API_BASE}/api/users`, { authToken: token() });
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to load staff accounts.");
    staffAccountList.replaceChildren();
    const accounts = Array.isArray(data.users) ? data.users : [];
    if (!accounts.length) appendEmptyState(staffAccountList, "No staff accounts were returned.");
    accounts.forEach((account) => {
      const item = document.createElement("article");
      item.className = "list-item";
      const name = document.createElement("h4");
      name.textContent = account.full_name;
      const details = document.createElement("p");
      details.textContent = `${account.role} · ${account.email}`;
      item.append(name, details);
      staffAccountList.appendChild(item);
    });
  } catch (error) {
    console.error("Unable to load staff accounts", error);
    staffAccountList.replaceChildren();
    appendEmptyState(staffAccountList, error.message || "Staff accounts could not be loaded.");
  }
}

async function submitStaffAccountForm(event) {
  event.preventDefault();
  if (!["admin", "principal"].includes(user()?.role)) {
    if (staffAccountMessage) staffAccountMessage.textContent = "Only an administrator or principal can create staff accounts.";
    return;
  }

  const payload = {
    full_name: staffAccountName?.value.trim(),
    email: staffAccountEmail?.value.trim(),
    role: staffAccountRole?.value,
    password: staffAccountPassword?.value
  };

  if (!payload.full_name || !payload.email || payload.password.length < 8) {
    if (staffAccountMessage) staffAccountMessage.textContent = "Enter a name, valid email, role, and password of at least 8 characters.";
    return;
  }

  try {
    if (staffAccountMessage) staffAccountMessage.textContent = "Creating staff account...";
    const { response, data } = await requestJson(`${API_BASE}/api/users`, {
      method: "POST",
      authToken: token(),
      body: payload
    });
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to create staff account.");
    if (staffAccountMessage) staffAccountMessage.textContent = data.message || "Staff account created.";
    staffAccountForm.reset();
    if (user()?.role !== "admin" && staffAccountRole) staffAccountRole.value = "teacher";
    await loadStaffAccounts();
  } catch (error) {
    console.error("Staff account creation failed", error);
    if (staffAccountMessage) staffAccountMessage.textContent = error.message || "Unable to create staff account.";
  }
}

function appendEmptyState(container, message) {
  const empty = document.createElement("div");
  empty.className = "empty-directory";
  const text = document.createElement("p");
  text.textContent = message;
  empty.appendChild(text);
  container.appendChild(empty);
}

async function loadStudentsFromDatabase() {
  try {
    const response = await fetch(`${API_BASE}/api/students/directory`);
    const data = await response.json();
    if (!response.ok || !data.success || !Array.isArray(data.students)) throw new Error(data.message || "Could not load students");
    studentDirectory = data.students.map((student) => ({ name: student.full_name, semester: String(student.semester) }));
    renderStudentDirectory();
  } catch (error) {
    console.error("Student directory failed", error);
    if (studentCount) studentCount.textContent = "Unable to load students";
    if (studentGrid) {
      studentGrid.replaceChildren();
      const message = document.createElement("p");
      message.className = "empty-directory";
      message.textContent = "Could not load the student directory. Please check that the backend server is running.";
      studentGrid.appendChild(message);
    }
  }
}

function renderStudentDirectory() {
  const filtered = studentDirectory.filter((student) => student.semester === activeSemester);
  const names = { "1": "1st", "2": "2nd", "3": "3rd", "4": "4th" };
  if (semesterTitle) semesterTitle.textContent = `${names[activeSemester] || activeSemester} Semester Students`;
  if (studentCount) studentCount.textContent = `${filtered.length} registered student${filtered.length === 1 ? "" : "s"}`;
  if (!studentGrid) return;
  studentGrid.replaceChildren();
  if (!filtered.length) { const empty = document.createElement("div"); empty.className = "empty-directory"; const span = document.createElement("span"); span.textContent = "✧"; const h3 = document.createElement("h3"); h3.textContent = "Your community starts here."; const p = document.createElement("p"); p.textContent = "No students registered in this semester yet."; empty.append(span, h3, p); studentGrid.appendChild(empty); return; }
  filtered.forEach((student) => {
    const card = document.createElement("article"); card.className = "student-card";
    const avatar = document.createElement("div"); avatar.className = "student-avatar"; avatar.textContent = "✧";
    const info = document.createElement("div"); info.className = "student-info";
    const name = document.createElement("h4"); name.textContent = student.name;
    const badge = document.createElement("span"); badge.className = "student-badge"; badge.textContent = `${names[student.semester] || student.semester} Semester`;
    info.append(name, badge); card.append(avatar, info); studentGrid.appendChild(card);
  });
}

async function loadGalleryAlbums() {
  try {
    const { response, data } = await requestJson(`${API_BASE}/api/gallery/albums`);
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to load albums");
    galleryAlbums = Array.isArray(data.albums) ? data.albums : [];
    if (galleryYearFilter) {
      const current = galleryYearFilter.value || "all";
      const years = [...new Set(galleryAlbums.map((album) => album.year).filter((year) => Number.isFinite(year)))].sort((a, b) => b - a);
      galleryYearFilter.replaceChildren();
      const allYears = document.createElement("option");
      allYears.value = "all";
      allYears.textContent = "All years";
      galleryYearFilter.appendChild(allYears);
      years.forEach((year) => { const option = document.createElement("option"); option.value = String(year); option.textContent = String(year); galleryYearFilter.appendChild(option); });
      galleryYearFilter.value = years.includes(Number(current)) ? String(current) : "all";
    }
    renderGalleryGrid();
    renderAdminAlbumList();
  } catch (error) {
    console.error("Gallery albums failed", error);
    if (galleryGrid) {
      galleryGrid.replaceChildren();
      appendEmptyState(galleryGrid, "The annual party albums could not be loaded.");
    }
    if (adminAlbumList) {
      adminAlbumList.replaceChildren();
      appendEmptyState(adminAlbumList, "Album records could not be loaded.");
    }
  }
}

function renderGalleryGrid() {
  if (!galleryGrid) return;
  const selectedYear = galleryYearFilter ? galleryYearFilter.value : "all";
  const filtered = selectedYear === "all" ? galleryAlbums : galleryAlbums.filter((album) => String(album.year) === String(selectedYear));
  galleryGrid.replaceChildren();
  if (!filtered.length) { appendEmptyState(galleryGrid, "No annual party photos are available for this year."); return; }
  filtered.forEach((album) => {
    const photoList = Array.isArray(album.photos) ? album.photos : [];
    const card = document.createElement("article"); card.className = "gallery-card";
    const content = document.createElement("div");
    content.className = "gallery-copy gallery-card-body";
    const meta = document.createElement("div");
    meta.className = "gallery-meta";
    const year = document.createElement("span");
    year.textContent = String(album.year);
    const photoCount = document.createElement("span");
    photoCount.textContent = `${photoList.length} photo${photoList.length === 1 ? "" : "s"}`;
    meta.append(year, photoCount);
    const title = document.createElement("h3");
    title.textContent = album.title;
    const description = document.createElement("p");
    description.textContent = album.description || "College memories captured in one unforgettable celebration.";
    content.append(meta, title, description);
    const photos = document.createElement("div");
    photos.className = "gallery-photo-grid";
    if (!photoList.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "gallery-placeholder";
      placeholder.textContent = "No photos have been added to this album yet.";
      photos.appendChild(placeholder);
    } else {
      photoList.forEach((photo) => {
        const figure = document.createElement("figure");
        figure.className = "gallery-photo";
        const image = document.createElement("img");
        image.src = photo.image_data;
        image.alt = photo.caption || album.title;
        figure.appendChild(image);
        if (photo.caption) {
          const caption = document.createElement("figcaption");
          caption.textContent = photo.caption;
          figure.appendChild(caption);
        }
        photos.appendChild(figure);
      });
    }
    card.append(content, photos);
    galleryGrid.appendChild(card);
  });
}

function renderAdminAlbumList() {
  if (!adminAlbumList) return;
  adminAlbumList.replaceChildren();
  if (!galleryAlbums.length) { appendEmptyState(adminAlbumList, "No album records found."); return; }
  const currentRole = user()?.role;
  const canManageAlbums = ["admin", "principal", "teacher"].includes(currentRole);
  galleryAlbums.forEach((album) => {
    const card = document.createElement("article"); card.className = "list-card";
    const header = document.createElement("div");
    header.className = "list-card-header";
    const details = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = album.title;
    const metadata = document.createElement("p");
    metadata.textContent = `${album.year} • ${album.photographer || "Photographer not set"}`;
    details.append(title, metadata);
    header.appendChild(details);
    if (canManageAlbums) {
      const actions = document.createElement("div");
      actions.className = "mini-actions";
      [["edit-album", "Edit", "mini-button"], ["delete-album", "Delete", "mini-button danger"]].forEach(([action, label, className]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.dataset.action = action;
        button.dataset.id = String(album.id);
        button.textContent = label;
        actions.appendChild(button);
      });
      header.appendChild(actions);
    }
    const thumbs = document.createElement("div"); thumbs.className = "thumbnail-grid";
    const photos = Array.isArray(album.photos) ? album.photos : [];
    if (!photos.length) { const empty = document.createElement("p"); empty.className = "thumb-empty"; empty.textContent = "No photo uploads yet."; thumbs.appendChild(empty); }
    else photos.forEach((photo) => {
      const wrapper = document.createElement("div");
      wrapper.className = "thumbnail-item";
      const img = document.createElement("img");
      img.src = photo.image_data;
      img.alt = photo.caption || "Annual party photo";
      wrapper.appendChild(img);
      if (user()?.role === "admin") {
        const captionInput = document.createElement("input");
        captionInput.type = "text";
        captionInput.maxLength = 200;
        captionInput.value = photo.caption || "";
        captionInput.setAttribute("aria-label", `Caption for photo ${photo.id}`);
        const saveCaption = document.createElement("button");
        saveCaption.type = "button";
        saveCaption.className = "mini-button";
        saveCaption.textContent = "Save caption";
        saveCaption.dataset.action = "save-photo-caption";
        saveCaption.dataset.albumId = String(album.id);
        saveCaption.dataset.photoId = String(photo.id);
        wrapper.append(captionInput, saveCaption);
      }
      if (canManageAlbums) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "delete-photo";
        btn.textContent = "Remove";
        btn.dataset.action = "delete-photo";
        btn.dataset.albumId = String(album.id);
        btn.dataset.photoId = String(photo.id);
        wrapper.appendChild(btn);
      }
      thumbs.appendChild(wrapper);
    });
    card.append(header, thumbs); adminAlbumList.appendChild(card);
  });
}

async function addPhotosToAlbum(albumId, files) {
  if (!albumId || !files || !files.length) return;
  const authToken = token();
  if (!authToken) throw new Error("Please log in as an authorized member to upload photos.");
  const payload = await Promise.all(Array.from(files).map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ imageData: String(reader.result), caption: file.name.replace(/\.[^/.]+$/, "") || "Annual party photo" });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  })));
  const { response, data } = await requestJson(`${API_BASE}/api/gallery/albums/${albumId}/photos`, { method: "POST", authToken, body: { photos: payload } });
  if (!response.ok || !data.success) throw new Error(data.message || "Unable to upload the selected photos.");
  return data;
}

async function submitAlbumForm(event) {
  event.preventDefault();
  const authToken = token();
  if (!authToken) { if (albumMessage) albumMessage.textContent = "Please log in as an authorized admin, principal or teacher to manage album records."; return; }
  const payload = { year: Number(albumYear.value), title: albumTitle.value.trim(), description: albumDescription.value.trim(), event_date: albumEventDate.value || null, photographer: albumPhotographer.value.trim() || null };
  if (!payload.year || !payload.title) { if (albumMessage) albumMessage.textContent = "Album year and title are required."; return; }
  try {
    let result = null;
    if (albumIdField.value) {
      const { response, data } = await requestJson(`${API_BASE}/api/gallery/albums/${albumIdField.value}`, { method: "PATCH", authToken, body: payload });
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to update the album.");
      result = data;
    } else {
      const { response, data } = await requestJson(`${API_BASE}/api/gallery/albums`, { method: "POST", authToken, body: payload });
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to create the album.");
      result = data;
      if (result.album && result.album.id) albumIdField.value = result.album.id;
    }
    const files = albumUploadInput && albumUploadInput.files ? Array.from(albumUploadInput.files) : [];
    if (files.length) await addPhotosToAlbum(albumIdField.value || result.album?.id, files);
    if (albumMessage) albumMessage.textContent = result.message || "Album saved successfully.";
    resetAlbumForm();
    await loadGalleryAlbums();
  } catch (error) {
    console.error("Album save failed:", error);
    if (albumMessage) albumMessage.textContent = error.message || "Unable to save the album.";
  }
}

async function deleteAlbum(albumId) {
  const authToken = token();
  if (!authToken) { if (albumMessage) albumMessage.textContent = "Authentication is required to delete album records."; return; }
  if (!window.confirm("Delete this annual photo album and all its stored photos?")) return;
  try {
    const { response, data } = await requestJson(`${API_BASE}/api/gallery/albums/${albumId}`, { method: "DELETE", authToken });
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to delete the album.");
    if (albumMessage) albumMessage.textContent = data.message || "Album deleted successfully.";
    resetAlbumForm();
    await loadGalleryAlbums();
  } catch (error) { console.error("Album deletion failed", error); if (albumMessage) albumMessage.textContent = error.message || "Unable to delete the album."; }
}

async function deletePhotoFromAlbum(albumId, photoId) {
  const authToken = token();
  if (!authToken) { if (albumMessage) albumMessage.textContent = "Authentication is required to delete gallery photos."; return; }
  if (!window.confirm("Remove this photo from the album?")) return;
  try {
    const { response, data } = await requestJson(`${API_BASE}/api/gallery/albums/${albumId}/photos/${photoId}`, { method: "DELETE", authToken });
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to remove the photo.");
    if (albumMessage) albumMessage.textContent = data.message || "Photo removed successfully.";
    await loadGalleryAlbums();
  } catch (error) { console.error("Photo deletion failed", error); if (albumMessage) albumMessage.textContent = error.message || "Unable to remove the photo."; }
}

async function updatePhotoCaption(albumId, photoId, caption) {
  const authToken = token();
  if (!authToken) { if (albumMessage) albumMessage.textContent = "Authentication is required to update photo captions."; return; }
  try {
    const { response, data } = await requestJson(`${API_BASE}/api/gallery/albums/${albumId}/photos/${photoId}`, { method: "PATCH", authToken, body: { caption } });
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to update the photo caption.");
    if (albumMessage) albumMessage.textContent = data.message || "Photo caption updated successfully.";
    await loadGalleryAlbums();
  } catch (error) { console.error("Photo caption update failed", error); if (albumMessage) albumMessage.textContent = error.message || "Unable to update the photo caption."; }
}

async function addAnnualPartyPhotos() {
  const authToken = token();
  if (!authToken) { if (albumMessage) albumMessage.textContent = "Please log in as an authorized staff member to add annual party photos."; return; }
  const selectedAlbumId = albumIdField ? albumIdField.value : "";
  const files = albumUploadInput && albumUploadInput.files ? Array.from(albumUploadInput.files) : [];
  if (!selectedAlbumId) { if (albumMessage) albumMessage.textContent = "Select or create an album before uploading photos."; return; }
  if (!files.length) { if (albumMessage) albumMessage.textContent = "Choose one or more images to upload."; return; }
  try {
    const result = await addPhotosToAlbum(selectedAlbumId, files);
    if (albumMessage) albumMessage.textContent = result?.message || "Annual party photos added successfully.";
    if (albumUploadInput) albumUploadInput.value = "";
    await loadGalleryAlbums();
  } catch (error) { console.error("Add annual party photos failed", error); if (albumMessage) albumMessage.textContent = error.message || "Unable to upload the selected photos."; }
}

async function deleteEvent(eventId) {
  const authToken = token();
  if (!authToken) { if (adminEventMessage) adminEventMessage.textContent = "Authentication is required to delete events."; return; }
  if (!window.confirm("Delete this event? This action cannot be undone.")) return;
  try {
    const { response, data } = await requestJson(`${API_BASE}/api/events/${eventId}`, { method: "DELETE", authToken });
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to delete the event.");
    if (adminEventMessage) adminEventMessage.textContent = data.message || "Event deleted successfully.";
    resetEventForm();
    await loadEvents();
  } catch (error) { console.error("Delete event failed", error); if (adminEventMessage) adminEventMessage.textContent = error.message || "Unable to delete the event."; }
}

async function submitAdminEvent(event) {
  event.preventDefault();
  const authToken = token();
  if (!authToken) { if (adminEventMessage) adminEventMessage.textContent = "Please log in as an authorized member to manage events."; return; }
  const payload = { title: adminEventTitle.value.trim(), event_date: adminEventDate.value, start_time: adminEventTime.value || null, venue: adminEventVenue.value.trim(), category: adminEventCategory.value.trim(), description: adminEventDescription.value.trim(), cover_image: adminEventImage.value.trim() || null, is_published: adminEventPublished.checked };
  if (!payload.title || !payload.event_date || !payload.venue) { if (adminEventMessage) adminEventMessage.textContent = "Title, event date and venue are required."; return; }
  const isEditing = Boolean(eventIdField.value);
  const endpoint = isEditing ? `${API_BASE}/api/events/${eventIdField.value}` : `${API_BASE}/api/events`;
  const method = isEditing ? "PATCH" : "POST";
  try {
    const { response, data } = await requestJson(endpoint, { method, authToken, body: payload });
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to save the event.");
    if (adminEventMessage) adminEventMessage.textContent = data.message || "Event saved successfully.";
    resetEventForm();
    await loadEvents();
    await loadEventSettings();
  } catch (error) { console.error("Admin event save failed", error); if (adminEventMessage) adminEventMessage.textContent = error.message || "Unable to save the event."; }
}

async function handleAdminEventListClick(event) {
  const target = event.target.closest("button[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (action === "edit-event") {
    const { response, data } = await requestJson(`${API_BASE}/api/events/admin/${id}`);
    if (response.ok && data.success && data.event) {
      eventIdField.value = data.event.id;
      adminEventTitle.value = data.event.title || "";
      adminEventDate.value = data.event.event_date || "";
      adminEventTime.value = data.event.start_time || "";
      adminEventVenue.value = data.event.venue || "";
      adminEventCategory.value = data.event.category || "";
      adminEventDescription.value = data.event.description || "";
      adminEventImage.value = data.event.cover_image || "";
      adminEventPublished.checked = data.event.is_published !== false;
      if (adminEventMessage) adminEventMessage.textContent = "Editing event. Save changes to update it.";
    }
  }
  if (action === "delete-event") await deleteEvent(id);
}

async function submitEventSettings(event) {
  event.preventDefault();
  const authToken = token();
  if (!authToken) { if (eventSettingsMessage) eventSettingsMessage.textContent = "Please log in as an authorized staff member to update event settings."; return; }
  const payload = { party_date: eventDateInput.value, party_time: eventTimeInput.value, venue: eventVenueInput.value.trim(), announcement: eventAnnouncementInput.value.trim() };
  if (!payload.party_date || !payload.party_time || !payload.venue) { if (eventSettingsMessage) eventSettingsMessage.textContent = "Please enter the event date, time and venue."; return; }
  try {
    const { response, data } = await requestJson(`${API_BASE}/api/events/settings`, { method: "POST", authToken, body: payload });
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to update event settings.");
    if (eventSettingsMessage) eventSettingsMessage.textContent = data.message || "Event settings updated successfully.";
    await loadEventSettings();
    await loadEvents();
  } catch (error) { console.error("Event settings update failed", error); if (eventSettingsMessage) eventSettingsMessage.textContent = error.message || "Unable to save the event settings."; }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;
  if (!email || !password) { if (loginMessage) loginMessage.textContent = "Email and password are required."; return; }
  const isStudent = selectedRole === "student";
  const endpoint = isStudent ? `${API_BASE}/api/students/login` : `${API_BASE}/api/auth/login`;
  const body = isStudent ? { email, password } : { email, password, role: selectedRole };
  try {
    const { response, data } = await requestJson(endpoint, { method: "POST", body });
    if (!response.ok || !data.success) throw new Error(data.message || "Login failed. Please try again.");
    const returnedUser = data.user || data.student;

    if (!returnedUser) {
      throw new Error("The server did not return a valid user profile.");
    }

    const userData = {
      ...returnedUser,
      role: returnedUser.role || (isStudent ? "student" : selectedRole)
    };

    saveSession(data.token, userData);

    updateStudentSession(userData.full_name || userData.name || "");
    if (userData.role === "student") showStudentDashboard(userData);
    if (loginForm) loginForm.reset();
    if (loginMessage) loginMessage.textContent = `Welcome, ${userData.full_name || userData.email}! Login successful.`;
    await verifySession();
  } catch (error) { console.error("Login request failed", error); if (loginMessage) loginMessage.textContent = error.message || "Cannot connect to the server. Please check that the backend is running."; }
}

function showStudentDashboard(student) {
  if (!studentDashboard) return;
  if (dashboardStudentName) dashboardStudentName.textContent = student.full_name || "Not available";
  if (dashboardStudentEmail) dashboardStudentEmail.textContent = student.email || "Not available";
  if (dashboardStudentRoll) dashboardStudentRoll.textContent = student.roll_number || "Not available";
  if (dashboardStudentSemester) dashboardStudentSemester.textContent = student.semester ? `${student.semester} Semester` : "Not available";
  studentDashboard.classList.remove("hidden");
  if (dashboardMessage) dashboardMessage.textContent = "Your student information loaded successfully.";
}

function handleLogout() {
  clearSession();
  updateStudentSession();
  hideStudentDashboard();
  if (loginMessage) loginMessage.textContent = "You have been logged out successfully.";
  loadEvents();
  loadGalleryAlbums();
}

async function verifySession() {
  const authToken = token();
  if (!authToken) { clearSession(); updateAdminAccessUI(null); updateStudentSession(); hideStudentDashboard(); return; }
  const currentUser = user();
  const isStudent = currentUser ? currentUser.role === "student" : false;
  const endpoint = isStudent ? `${API_BASE}/api/students/me` : `${API_BASE}/api/users/me`;
  try {
    const { response, data } = await requestJson(endpoint, { authToken });
    if (!response.ok || !data.success) throw new Error(data.message || "Session expired.");
    const completeUser = {
  ...(data.user || data.student),
  role: (data.user || data.student).role || currentUser?.role
};
saveSession(authToken, completeUser);
updateAdminAccessUI(completeUser.role);
updateStudentSession(completeUser.full_name || completeUser.name || "");
    if (completeUser.role === "student") showStudentDashboard(completeUser);
    if (completeUser.role === "student") await loadStudentsFromDatabase();
    if (["admin", "principal"].includes(completeUser.role)) await loadStaffAccounts();
    await loadEventSettings();
    await loadEvents();
    await loadGalleryAlbums();
  } catch (error) {
    console.error("Session verification failed", error);
    clearSession();
    updateAdminAccessUI(null);
    updateStudentSession();
    hideStudentDashboard();
    if (loginMessage) loginMessage.textContent = "Your session has expired. Please log in again.";
  }
}

function attachUiEvents() {
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => { const open = navLinks.classList.toggle("open"); menuToggle.setAttribute("aria-expanded", String(open)); menuToggle.textContent = open ? "✕" : "☰"; });
    navLinks.querySelectorAll("a").forEach((link) => { link.addEventListener("click", () => { navLinks.classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false"); menuToggle.textContent = "☰"; }); });
  }
  roleOptions.forEach((button) => { button.addEventListener("click", () => { selectedRole = button.dataset.role || "student"; roleOptions.forEach((option) => option.classList.toggle("active", option === button)); if (loginMessage) loginMessage.textContent = `${button.textContent.trim()} login selected.`; }); });
  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (registrationForm) registrationForm.addEventListener("submit", async (event) => { event.preventDefault(); const name = document.getElementById("studentName")?.value.trim(); const email = document.getElementById("studentEmail")?.value.trim(); const gender = document.getElementById("studentGender")?.value; const semester = document.getElementById("studentSemester")?.value; const roll = document.getElementById("studentRoll")?.value.trim(); const password = document.getElementById("studentPassword")?.value; if (!name || !email || !gender || !semester || !roll || !password || password.length < 8) { if (registrationMessage) registrationMessage.textContent = "Please complete all fields correctly. Password must be at least 8 characters."; return; } if (registrationMessage) registrationMessage.textContent = "Registering student..."; try { const { response, data } = await requestJson(`${API_BASE}/api/students/register`, { method: "POST", body: { full_name: name, email, password, gender, semester: Number(semester), roll_number: roll } }); if (!response.ok || !data.success) throw new Error(data.message || "Registration failed."); if (registrationMessage) registrationMessage.textContent = `Registration successful! Welcome, ${data.student.full_name}.`; await loadStudentsFromDatabase(); registrationForm.reset(); document.getElementById("directory")?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (error) { console.error("Registration request failed", error); if (registrationMessage) registrationMessage.textContent = error.message || "Cannot connect to the server. Please check that the backend is running."; } });
  if (eventSettingsForm) eventSettingsForm.addEventListener("submit", submitEventSettings);
  if (adminEventForm) adminEventForm.addEventListener("submit", submitAdminEvent);
  if (adminCancelEvent) adminCancelEvent.addEventListener("click", resetEventForm);
  if (adminEventList) adminEventList.addEventListener("click", handleAdminEventListClick);
  if (staffAccountForm) staffAccountForm.addEventListener("submit", submitStaffAccountForm);
  if (albumForm) albumForm.addEventListener("submit", submitAlbumForm);
  if (albumDeleteButton) albumDeleteButton.addEventListener("click", () => { if (albumIdField.value) deleteAlbum(albumIdField.value); });
  if (addAnnualPartyPhotosButton) addAnnualPartyPhotosButton.addEventListener("click", addAnnualPartyPhotos);
  if (adminAlbumList) adminAlbumList.addEventListener("click", (event) => { const button = event.target.closest("button[data-action]"); if (!button) return; const action = button.dataset.action; if (action === "edit-album") { const album = galleryAlbums.find((entry) => String(entry.id) === String(button.dataset.id)); if (!album) return; if (albumIdField) albumIdField.value = album.id; if (albumYear) albumYear.value = album.year || ""; if (albumTitle) albumTitle.value = album.title || ""; if (albumDescription) albumDescription.value = album.description || ""; if (albumEventDate) albumEventDate.value = album.event_date || ""; if (albumPhotographer) albumPhotographer.value = album.photographer || ""; if (albumDeleteButton) albumDeleteButton.classList.remove("hidden"); if (albumMessage) albumMessage.textContent = "Album loaded for editing."; document.getElementById("adminPortalSection")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  if (action === "delete-album") deleteAlbum(button.dataset.id);
  if (action === "save-photo-caption") { const input = button.parentElement.querySelector("input"); updatePhotoCaption(button.dataset.albumId, button.dataset.photoId, input.value); }
  if (action === "delete-photo") deletePhotoFromAlbum(button.dataset.albumId, button.dataset.photoId); });
  if (galleryYearFilter) galleryYearFilter.addEventListener("change", renderGalleryGrid);
  if (logoutButton) logoutButton.addEventListener("click", handleLogout);
  if (dashboardLogoutButton) dashboardLogoutButton.addEventListener("click", handleLogout);
  semesterTabs.forEach((tab) => { tab.addEventListener("click", () => { activeSemester = tab.dataset.semester || "1"; semesterTabs.forEach((button) => button.classList.toggle("active", button === tab)); renderStudentDirectory(); }); });
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = window.innerWidth; canvasHeight = window.innerHeight;
  canvas.width = canvasWidth * pixelRatio; canvas.height = canvasHeight * pixelRatio; canvas.style.width = `${canvasWidth}px`; canvas.style.height = `${canvasHeight}px`; ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  stars = Array.from({ length: Math.min(150, Math.floor(canvasWidth / 8)) }, () => ({ x: Math.random() * canvasWidth, y: Math.random() * canvasHeight, radius: Math.random() * 1.4 + 0.3, alpha: Math.random() * 0.65 + 0.2, speed: Math.random() * 0.25 + 0.05 }));
  drawStars();
}

function drawStars() {
  if (!canvas || !ctx || !stars.length) return;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  stars.forEach((star) => {
    ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fillStyle = `rgba(232, 199, 121, ${star.alpha})`; ctx.fill();
    if (!reducedMotion) { star.y -= star.speed; if (star.y < 0) { star.y = canvasHeight; star.x = Math.random() * canvasWidth; } }
  });
  if (!reducedMotion) animationFrame = requestAnimationFrame(drawStars);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("beforeunload", () => { if (animationFrame) cancelAnimationFrame(animationFrame); if (countdownInterval) clearInterval(countdownInterval); });

attachUiEvents();
resizeCanvas();
resetAlbumForm();
resetEventForm();
if (studentDashboard) studentDashboard.classList.add("hidden");
loadEventSettings();
loadEvents();
loadStudentsFromDatabase();
loadGalleryAlbums();
verifySession();
