document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("userId")) {
        window.location.href = "/register.html";
        return;
    }

    const btn = document.querySelector(".new_expense");
    const list = document.querySelector(".main");

    if (btn && list) {
        attachAddExpense(btn, list);
        loadExpenses();
    }
});

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function normalizeDate(value) {
    if (!value) return "";
    const text = String(value);
    return text.includes("T") ? text.split("T")[0] : text.slice(0, 10);
}

/* ---------------- CATEGORY ---------------- */

async function loadCategories(selectId = "") {
    const userId = localStorage.getItem("userId");
    const dropdown = document.getElementById("category");
    if (!dropdown) return;

    try {
        const res = await fetch(`/categories?user_id=${encodeURIComponent(userId)}`);
        const data = await res.json();

        // Optimized: Build string first, then inject once
        let options = `<option value="">Select category</option>`;
        options += data.map(cat => {
            const selected = String(cat.id) === String(selectId) ? "selected" : "";
            return `<option value="${escapeHtml(cat.id)}" ${selected}>${escapeHtml(cat.name)}</option>`;
        }).join('');

        options += `<option value="new">+ Add New Category</option>`;
        dropdown.innerHTML = options;
    } catch (err) { console.error("Category load failed", err); }
}

function handleCategoryChange() {
    const box = document.getElementById("newCategoryBox");
    if (box) box.style.display = document.getElementById("category").value === "new" ? "block" : "none";
}

async function addCategory() {
    const input = document.getElementById("newCategoryName");
    const name = input.value.trim();
    const user_id = localStorage.getItem("userId");

    if (!name) return alert("Enter category name");

    const res = await fetch("/add-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, user_id })
    });

    if (res.ok) {
        const result = await res.json();
        input.value = "";
        document.getElementById("newCategoryBox").style.display = "none";
        await loadCategories(result.id ? String(result.id) : "");
    } else {
        alert("Error adding category");
    }
}

/* ---------------- ADD EXPENSE ---------------- */

function attachAddExpense(btn, list) {
    btn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (document.querySelector(".form-card")) return;

        // CRITICAL: Added 'modal-form' class to trigger the CSS blur
        list.insertAdjacentHTML("beforeend", `
            <div class="form-card modal-form">
                <h3>Add Expense</h3>
                <form id="expenseForm">
                    <input type="number" id="amount" placeholder="Amount" min="1" required>
                    <select id="category" onchange="handleCategoryChange()"></select>
                    <div id="newCategoryBox" style="display:none; margin-bottom:10px;">
                        <input type="text" id="newCategoryName" placeholder="New category name">
                        <button type="button" onclick="addCategory()" style="width:100%; margin-top:5px;">Add Category</button>
                    </div>
                    <input type="date" id="date" required>
                    <input type="text" id="description" placeholder="Description">
                    <select id="payment">
                        <option value="cash">Cash</option>
                        <option value="online">Online</option>
                    </select>
                    <div class="form-actions" style="display:flex; gap:10px; margin-top:10px;">
                        <button type="submit" style="flex:1">Add</button>
                        <button type="button" onclick="this.closest('.form-card').remove()" style="flex:1; background:transparent; border:1px solid var(--border);">Cancel</button>
                    </div>
                </form>
            </div>
        `);

        await loadCategories();

        document.getElementById("expenseForm").addEventListener("submit", async (ev) => {
            ev.preventDefault();
            const data = {
                amount: document.getElementById("amount").value,
                category_id: document.getElementById("category").value,
                date: document.getElementById("date").value,
                description: document.getElementById("description").value,
                payment_method: document.getElementById("payment").value,
                user_id: localStorage.getItem("userId")
            };

            if (data.category_id === "new" || !data.category_id) return alert("Select a valid category");

            const res = await fetch("/add-expense", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                document.querySelector(".form-card").remove();
                loadExpenses();
            } else {
                alert("Failed to add expense");
            }
        });
    });
}

/* ---------------- LOAD & RENDER ---------------- */

async function loadExpenses() {
    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/expenses?user_id=${encodeURIComponent(userId)}`);
        const data = await res.json();
        renderTable(data);
    } catch (err) { console.error("Load expenses failed", err); }
}

function renderTable(data) {
    const table = document.getElementById("expenseTable");
    if (!table) return;

    if (!data || data.length === 0) {
        table.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px;'>No Expenses Found</td></tr>";
        return;
    }

    // Optimized: Build table rows in memory first
    table.innerHTML = data.map(exp => {
        const date = normalizeDate(exp.date);
        return `
            <tr id="row-${exp.id}"
                data-amount="${escapeHtml(exp.amount)}"
                data-category-id="${escapeHtml(exp.category_id ?? "")}"
                data-date="${escapeHtml(date)}"
                data-description="${escapeHtml(exp.description ?? "")}"
                data-payment-method="${escapeHtml(exp.payment_method ?? "cash")}">
                <td>${escapeHtml(exp.amount)}</td>
                <td>${escapeHtml(exp.category_name || "Uncategorized")}</td>
                <td>${escapeHtml(date)}</td>
                <td>${escapeHtml(exp.description ?? "")}</td>
                <td>${escapeHtml(exp.payment_method ?? "cash")}</td>
                <td>
                    <button type="button" onclick="editExpense(${exp.id})">Edit</button>
                    <button type="button" onclick="deleteExpense(${exp.id})" style="background:var(--danger)">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

/* ---------------- EDIT / SAVE / DELETE ---------------- */

async function editExpense(id) {
    const row = document.getElementById(`row-${id}`);
    if (!row) return;
    const exp = row.dataset;

    const userId = localStorage.getItem("userId");
    const res = await fetch(`/categories?user_id=${encodeURIComponent(userId)}`);
    const categories = await res.json();

    let options = categories.map(cat => {
        const selected = String(cat.id) === String(exp.categoryId) ? "selected" : "";
        return `<option value="${escapeHtml(cat.id)}" ${selected}>${escapeHtml(cat.name)}</option>`;
    }).join('');

    row.innerHTML = `
        <td><input type="number" id="amount-${id}" value="${escapeHtml(exp.amount)}"></td>
        <td><select id="category-${id}">${options}</select></td>
        <td><input type="date" id="date-${id}" value="${escapeHtml(exp.date)}"></td>
        <td><input type="text" id="desc-${id}" value="${escapeHtml(exp.description)}"></td>
        <td>
            <select id="payment-${id}">
                <option value="cash" ${exp.paymentMethod === "cash" ? "selected" : ""}>Cash</option>
                <option value="online" ${exp.paymentMethod === "online" ? "selected" : ""}>Online</option>
            </select>
        </td>
        <td class="form-actions">
            <button type="button" onclick="saveExpense(${id})">Save</button>
            <button type="button" onclick="loadExpenses()" style="background:transparent; border:1px solid var(--border);">Cancel</button>
        </td>
    `;
}

async function saveExpense(id) {
    const data = {
        amount: document.getElementById(`amount-${id}`).value,
        category_id: document.getElementById(`category-${id}`).value,
        date: document.getElementById(`date-${id}`).value,
        description: document.getElementById(`desc-${id}`).value,
        payment_method: document.getElementById(`payment-${id}`).value
    };

    const res = await fetch(`/update-expense/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (res.ok) loadExpenses();
    else alert("Update failed");
}

async function deleteExpense(id) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/delete-expense/${id}`, { method: "DELETE" });
    if (res.ok) loadExpenses();
}

/* ---------------- FILTER ---------------- */

async function applyFilters() {
    const params = new URLSearchParams({
        user_id: localStorage.getItem("userId"),
        category: document.getElementById("filterCategory").value.trim(),
        start: document.getElementById("startDate").value,
        end: document.getElementById("endDate").value,
        sort: document.getElementById("sortOption").value
    });

    const res = await fetch(`/expenses?${params.toString()}`);
    const data = await res.json();
    renderTable(data);
}

function resetFilters() {
    ["filterCategory", "startDate", "endDate", "sortOption"].forEach(id => document.getElementById(id).value = "");
    loadExpenses();
}

// __________________________ LOGOUT ________________________

function logout() {
    localStorage.removeItem("userId");
    window.location.replace("/register.html");
}

window.onpageshow = function (event) {
    if (event.persisted) {
        window.location.reload();
    }
};