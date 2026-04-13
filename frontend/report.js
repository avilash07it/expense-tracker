document.addEventListener("DOMContentLoaded", () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        window.location.href = "/register.html";
        return;
    }
    loadReport(userId);
});

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function logout() {
    localStorage.removeItem("userId");
    window.location.replace("/register.html");
}

async function loadReport(userId) {
    try {
        const res = await fetch(`/summary?user_id=${encodeURIComponent(userId)}`);
        const data = await res.json();

        const total = parseFloat(data.total || 0);
        const container = document.getElementById('categoryLeaderboard');
        
        // 1. Update Stat Cards
        document.getElementById('totalMonthDisplay').innerText = `₹${total.toLocaleString('en-IN')}`;
        
        // Calculate Top Category from the data
        const topCat = data.byCategory && data.byCategory.length > 0 
            ? data.byCategory[0].category_name 
            : "-";
        document.getElementById('topCategoryDisplay').innerText = topCat;

        // Calculate Daily Average
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const dailyAvg = total / daysInMonth;
        document.getElementById('dailyAvgDisplay').innerText = `₹${dailyAvg.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

        // 2. Clear and Fill Leaderboard
        container.innerHTML = ''; 

        if (!data.byCategory || data.byCategory.length === 0) {
            container.innerHTML = '<p style="color:var(--text-dim); text-align:center; padding:20px;">No expenses recorded yet.</p>';
            return;
        }

        // 3. Build the rows using a template string join (better performance)
        container.innerHTML = data.byCategory.map(item => {
            const catAmount = parseFloat(item.total);
            const percentage = total > 0 ? ((catAmount / total) * 100).toFixed(1) : 0;
            
            return `
                <div class="leaderboard-row">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>${escapeHtml(item.category_name)}</span>
                        <span style="font-weight:bold">₹${catAmount.toLocaleString('en-IN')} (${percentage}%)</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Error loading report:", e);
        document.getElementById('categoryLeaderboard').innerHTML = '<p style="color:var(--danger)">Failed to load data.</p>';
    }
}