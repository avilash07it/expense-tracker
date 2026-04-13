/* ---------------- LOGIN ---------------- */

async function login() {
    const userEl = document.getElementById("login_username");
    const passEl = document.getElementById("login_password");
    const username = userEl.value.trim();
    const password = passEl.value.trim();

    if (!username || !password) {
        alert("Enter username and password");
        return;
    }

    try {
        const res = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const contentType = res.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            const user = await res.json();
            if (user && user.id) {
                localStorage.setItem("userId", user.id);
                window.location.href = "/index.html"; // Directing specifically to index
            } else {
                alert("Invalid login details.");
            }
        } else {
            const text = await res.text();
            alert(text || "Login failed");
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("Unable to connect to server.");
    }
}

/* ---------------- REGISTER ---------------- */

async function register() {
    const username = document.getElementById("register_username").value.trim();
    const password = document.getElementById("register_password").value.trim();

    if (!username || !password) {
        alert("Please provide both a username and password.");
        return;
    }

    try {
        const res = await fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const text = await res.text();

        if (res.ok) {
            alert("Registration successful! You can now login.");
            // Clear register fields for a clean look
            document.getElementById("register_username").value = "";
            document.getElementById("register_password").value = "";
        } else {
            alert(text || "Registration failed");
        }
    } catch (err) {
        console.error("Register Error:", err);
        alert("Server error during registration.");
    }
}

/* ---------------- UX IMPROVEMENTS ---------------- */

// Allow pressing "Enter" to submit login
document.getElementById("login_password").addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
});

// Allow pressing "Enter" to submit registration
document.getElementById("register_password").addEventListener("keypress", (e) => {
    if (e.key === "Enter") register();
});