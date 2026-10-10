
const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d");

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.querySelector(".nav-links");

const roleOptions = document.querySelectorAll(".role-option");
const loginForm = document.getElementById("loginForm");
const registrationForm = document.getElementById("registrationForm");

const loginMessage = document.getElementById("loginMessage");
const registrationMessage =
    document.getElementById("registrationMessage");

let selectedRole = "student";
let stars = [];
let canvasWidth = 0;
let canvasHeight = 0;
let animationFrame = null;

const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;


// ----------------------------------
// 1. MOBILE NAVIGATION
// ----------------------------------

menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.textContent = isOpen ? "âœ•" : "â˜°";
});

navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = "â˜°";
    });
});


// ----------------------------------
// 2. SELECT LOGIN ROLE
// ----------------------------------

roleOptions.forEach(button => {
    button.addEventListener("click", () => {
        selectedRole = button.dataset.role;

        roleOptions.forEach(option => {
            option.classList.toggle(
                "active",
                option === button
            );
        });

        loginMessage.textContent =
            `${button.textContent.trim()} login selected.`;
    });
});


// ----------------------------------
// 3. DEMO LOGIN FORM VALIDATION
// ----------------------------------


loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (selectedRole !== "student") {
        loginMessage.textContent =
            "Teacher and Principal login will be connected in a later step.";
        return;
    }

    const emailInput = loginForm.querySelector('input[type="email"]');
    const passwordInput = loginForm.querySelector('input[type="password"]');

    if (!emailInput || !passwordInput) {
        loginMessage.textContent =
            "Login form email/password fields could not be found.";
        return;
    }

    loginMessage.textContent = "Logging in...";

    try {
        const response = await fetch(
            "http://localhost:5000/api/students/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            loginMessage.textContent =
                data.message || "Login failed. Please try again.";
            return;
        }

               sessionStorage.setItem("jhStudentToken", data.token);

               updateStudentSession(data.student.full_name);

                showStudentDashboard(data.student);

     loginMessage.textContent =
    `Welcome, ${data.student.full_name}! Login successful.`;

loginForm.reset();

studentDashboard.scrollIntoView({
    behavior: "smooth",
    block: "start"
});
    } catch (error) {
        console.error("Login request failed:", error);
        loginMessage.textContent =
            "Cannot connect to the server. Please check that the backend is running.";
    }
});



// ----------------------------------
// STUDENT SESSION AND LOGOUT
// ----------------------------------

const studentSession = document.getElementById("studentSession");
const studentWelcome = document.getElementById("studentWelcome");
const logoutButton = document.getElementById("logoutButton");

function updateStudentSession(name = "") {
    const token = sessionStorage.getItem("jhStudentToken");

    if (token) {
        studentSession.hidden = false;
        studentWelcome.textContent = `Logged in as ${name || "Student"}`;
    } else {
        studentSession.hidden = true;
        studentWelcome.textContent = "";
    }
}

// Verify the saved token with the backend.
async function verifyStudentSession() {
    const token = sessionStorage.getItem("jhStudentToken");

    if (!token) {
    updateStudentSession();
    studentDashboard.classList.add("hidden");
    return;
}

    try {
        const response = await fetch(
            "http://localhost:5000/api/students/me",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

if (!response.ok || !data.success) {
    sessionStorage.removeItem("jhStudentToken");

    updateStudentSession();
    studentDashboard.classList.add("hidden");

    loginMessage.textContent =
        "Your session has expired. Please log in again.";

    return;
}

updateStudentSession(data.student.full_name);

showStudentDashboard(data.student);

    } catch (error) {
        console.error("Session verification failed:", error);

        loginMessage.textContent =
            "Unable to verify your session. Please check the backend server.";
    }
}


// ----------------------------------
// STUDENT DASHBOARD ELEMENTS
// ----------------------------------

const studentDashboard = document.getElementById("studentDashboard");

const dashboardStudentName =
    document.getElementById("dashboardStudentName");

const dashboardStudentEmail =
    document.getElementById("dashboardStudentEmail");

const dashboardStudentRoll =
    document.getElementById("dashboardStudentRoll");

const dashboardStudentSemester =
    document.getElementById("dashboardStudentSemester");

const dashboardMessage =
    document.getElementById("dashboardMessage");

const dashboardLogoutButton =
    document.getElementById("dashboardLogoutButton");

// ----------------------------------
// STUDENT LOGOUT
// ----------------------------------

function logoutStudent() {
    sessionStorage.removeItem("jhStudentToken");

    updateStudentSession();

    studentDashboard.classList.add("hidden");

    dashboardMessage.textContent = "";

    dashboardStudentName.textContent = "";
    dashboardStudentEmail.textContent = "";
    dashboardStudentRoll.textContent = "";
    dashboardStudentSemester.textContent = "";

    loginMessage.textContent =
        "You have been logged out successfully.";
}

logoutButton.addEventListener("click", logoutStudent);

dashboardLogoutButton.addEventListener("click", logoutStudent);

// Verify the session when the page loads.
verifyStudentSession();


// ----------------------------------
// DISPLAY STUDENT DASHBOARD
// ----------------------------------

function showStudentDashboard(student) {
    if (!student || !studentDashboard) {
        return;
    }

    dashboardStudentName.textContent =
        student.full_name || "Not available";

    dashboardStudentEmail.textContent =
        student.email || "Not available";

    dashboardStudentRoll.textContent =
        student.roll_number || "Not available";

    dashboardStudentSemester.textContent =
        student.semester
            ? `${student.semester} Semester`
            : "Not available";

    studentDashboard.classList.remove("hidden");

    dashboardMessage.textContent =
        "Your student information loaded successfully.";
}


// ----------------------------------
// 4. DEMO REGISTRATION FORM
// ----------------------------------


registrationForm.addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("studentName").value.trim();
    const email = document.getElementById("studentEmail").value.trim();
    const gender = document.getElementById("studentGender").value;
    const semester = document.getElementById("studentSemester").value;
    const roll = document.getElementById("studentRoll").value.trim();
    const password = document.getElementById("studentPassword").value;

    if (
        name.length < 2 ||
        !email ||
        !gender ||
        !semester ||
        !roll ||
        password.length < 8
    ) {
        registrationMessage.textContent =
            "Please complete all fields correctly. Password must be at least 8 characters.";
        return;
    }

    registrationMessage.textContent = "Registering student...";

    try {
        const response = await fetch(
            "http://localhost:5000/api/students/register",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    full_name: name,
                    email,
                    password,
                    gender,
                    semester: Number(semester),
                    roll_number: roll
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            registrationMessage.textContent =
                data.message || "Registration failed. Please try again.";
            return;
        }

        registrationMessage.textContent =
            `Registration successful! Welcome, ${data.student.full_name}.`;

        await loadStudentsFromDatabase();

        activeSemester = String(data.student.semester);

        semesterTabs.forEach(tab => {
            tab.classList.toggle(
                "active",
                tab.dataset.semester === activeSemester
            );
        });

        renderStudentDirectory();
        registrationForm.reset();

        document.getElementById("directory").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    } catch (error) {
        console.error("Registration request failed:", error);
        registrationMessage.textContent =
            "Cannot connect to the server. Please check that the backend is running.";
    }
});

// ----------------------------------
// 5. ANIMATED STARS
// ----------------------------------

function resizeCanvas() {
    const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2
    );

    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = canvasWidth * pixelRatio;
    canvas.height = canvasHeight * pixelRatio;

    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
    );

    stars = Array.from(
        {
            length: Math.min(
                150,
                Math.floor(canvasWidth / 8)
            )
        },
        () => ({
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            radius: Math.random() * 1.4 + 0.3,
            alpha: Math.random() * 0.65 + 0.2,
            speed: Math.random() * 0.25 + 0.05
        })
    );

    drawStars();
}

function drawStars() {
    ctx.clearRect(
        0,
        0,
        canvasWidth,
        canvasHeight
    );

    stars.forEach(star => {
        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            `rgba(232, 199, 121, ${star.alpha})`;

        ctx.fill();

        if (!reducedMotion) {
            star.y -= star.speed;

            if (star.y < 0) {
                star.y = canvasHeight;
                star.x = Math.random() * canvasWidth;
            }
        }
    });

    if (!reducedMotion) {
        animationFrame = requestAnimationFrame(drawStars);
    }
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

window.addEventListener("beforeunload", () => {
    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
    }
});


/* ========================================
   STUDENT DIRECTORY - FRONTEND DEMO
======================================== */

const semesterTabs = document.querySelectorAll(".semester-tab");
const studentGrid = document.getElementById("studentGrid");
const semesterTitle = document.getElementById("semesterTitle");
const studentCount = document.getElementById("studentCount");

let activeSemester = "1";

// Temporary in-memory data.
// Real accounts will come from the database later.
const demoStudents = [];

function renderStudentDirectory() {
    const students = demoStudents.filter(
        student => student.semester === activeSemester
    );

    const semesterNames = {
        "1": "1st",
        "2": "2nd",
        "3": "3rd",
        "4": "4th"
    };

    semesterTitle.textContent =
        `${semesterNames[activeSemester]} Semester Students`;

    studentCount.textContent =
        `${students.length} registered student${students.length === 1 ? "" : "s"}`;

    studentGrid.replaceChildren();

    if (students.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-directory";

        const symbol = document.createElement("span");
        symbol.textContent = "âœ§";

        const heading = document.createElement("h3");
        heading.textContent = "Your community starts here.";

        const message = document.createElement("p");
        message.textContent =
            "No students registered in this semester yet.";

        empty.append(symbol, heading, message);
        studentGrid.appendChild(empty);
        return;
    }

    students.forEach(student => {
        const card = document.createElement("article");
        card.className = "student-card";

        const avatar = document.createElement("div");
        avatar.className = "student-avatar";
        avatar.textContent =
            student.gender === "Female" ? "â™€" :
            student.gender === "Male" ? "â™‚" : "âœ§";

        const info = document.createElement("div");
        info.className = "student-info";

        const name = document.createElement("h4");
        name.textContent = student.name;

        const roll = document.createElement("p");
        roll.textContent = `Roll No.: ${student.roll}`;

        const badge = document.createElement("span");
        badge.className = "student-badge";
        badge.textContent =
            `${semesterNames[student.semester]} Semester`;

        info.append(name, roll, badge);
        card.append(avatar, info);
        studentGrid.appendChild(card);
    });
}

async function loadStudentsFromDatabase() {
    try {
        const response = await fetch("http://localhost:5000/api/students/directory");
        const data = await response.json();

        if (!response.ok || !data.success || !Array.isArray(data.students)) {
            throw new Error(data.message || "Could not load students.");
        }

        demoStudents.splice(
            0,
            demoStudents.length,
            ...data.students.map(student => ({
                id: student.id,
                name: student.full_name,
                gender: student.gender || "",
                semester: String(student.semester),
                roll: student.roll_number || ""
            }))
        );

        renderStudentDirectory();
    } catch (error) {
        console.error("Student directory loading failed:", error);
        studentCount.textContent = "Unable to load students";
        studentGrid.replaceChildren();

        const message = document.createElement("p");
        message.className = "empty-directory";
        message.textContent =
            "Could not load the student directory. Please check that the backend server is running.";

        studentGrid.appendChild(message);
    }
}
semesterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        activeSemester = tab.dataset.semester;

        semesterTabs.forEach(button => {
            button.classList.toggle("active", button === tab);
        });

        renderStudentDirectory();
    });
});



/* ========================================
   EVENT DATE / TIME / VENUE PREVIEW
======================================== */

const eventSettingsForm =
    document.getElementById("eventSettingsForm");

const eventSettingsMessage =
    document.getElementById("eventSettingsMessage");

const eventDateInput = document.getElementById("eventDateInput");
const eventTimeInput = document.getElementById("eventTimeInput");
const eventVenueInput = document.getElementById("eventVenueInput");
const eventAnnouncementInput =
    document.getElementById("eventAnnouncementInput");

const eventDateDisplay = document.getElementById("eventDateDisplay");
const eventTimeDisplay = document.getElementById("eventTimeDisplay");
const eventVenueDisplay = document.getElementById("eventVenueDisplay");

const countdown = document.getElementById("countdown");

let countdownInterval = null;

function stopCountdown() {
    if (countdownInterval !== null) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    countdown.classList.add("hidden");
}

function startEventCountdown(date, time) {
    stopCountdown();

    const eventDate = new Date(`${date}T${time}`);

    if (Number.isNaN(eventDate.getTime())) {
        return;
    }

    function updateCountdown() {
        const remaining = eventDate.getTime() - Date.now();

        if (remaining <= 0) {
            stopCountdown();
            eventSettingsMessage.textContent =
                "The event start time has arrived or passed.";
            return;
        }

        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining % 86400000) / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        document.getElementById("days").textContent =
            String(days).padStart(2, "0");

        document.getElementById("hours").textContent =
            String(hours).padStart(2, "0");

        document.getElementById("minutes").textContent =
            String(minutes).padStart(2, "0");

        document.getElementById("seconds").textContent =
            String(seconds).padStart(2, "0");

        countdown.classList.remove("hidden");
    }

    updateCountdown();

    if (countdownInterval === null && eventDate.getTime() > Date.now()) {
        countdownInterval = setInterval(updateCountdown, 1000);
    }
}

eventSettingsForm.addEventListener("submit", event => {
    event.preventDefault();

    const date = eventDateInput.value;
    const time = eventTimeInput.value;
    const venue = eventVenueInput.value.trim();
    const announcement = eventAnnouncementInput.value.trim();

    if (!date || !time || !venue) {
        eventSettingsMessage.textContent =
            "Please enter the date, time and venue.";
        return;
    }

    const selectedDate = new Date(`${date}T${time}`);

    if (
        Number.isNaN(selectedDate.getTime()) ||
        selectedDate.getTime() <= Date.now()
    ) {
        eventSettingsMessage.textContent =
            "Please choose a future date and time.";
        return;
    }

    eventDateDisplay.textContent =
        selectedDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    eventTimeDisplay.textContent =
        selectedDate.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit"
        });

    eventVenueDisplay.textContent = venue;

    startEventCountdown(date, time);

    eventSettingsMessage.textContent = announcement
        ? `Event preview updated. Announcement: ${announcement}`
        : "Event preview updated successfully.";

    document.getElementById("event").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});

loadStudentsFromDatabase();
