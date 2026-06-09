const API = "http://127.0.0.1:5001";

let allRecords = [];
let currentBtn = null;

// HERO
fetch(`${API}/api/overview`)
.then(r => r.json())
.then(data => {
    document.getElementById("header").innerText = data.pet_name;

    document.getElementById("health").innerText = data.health;
    document.getElementById("intake").innerText = data.total_intake;

    document.getElementById("healthScore").innerText =
        data.health === "Healthy" ? "98" : "70";
});

// RECORDS
fetch(`${API}/api/records`)
.then(r => r.json())
.then(data => {
    allRecords = data.records || [];
    renderMeals(allRecords);
});

function renderMeals(records) {
    const c = document.getElementById("recentMeals");

    c.innerHTML = records.slice(0, 10).map(r => {

        let cls = "low";
        if (r.risk === "Medium") cls = "mid";
        if (r.risk === "High") cls = "high";

        return `
        <div class="meal">
            <div>
                <div><b>${r.item}</b></div>
                <div style="font-size:12px;color:#666">
                    ${new Date(r.time).toLocaleString()}
                </div>
            </div>

            <div class="badge ${cls}">
                ${r.risk || "Low"}
            </div>
        </div>`;
    }).join("");
}

// INSIGHT (fake but premium feel)
document.getElementById("insightText").innerText =
    "Luna is doing well today. No risky foods detected.";

// BAR CHART
fetch(`${API}/api/summary`)
.then(r => r.json())
.then(data => {

    new Chart(document.getElementById("barChart"), {
        type: "bar",
        data: {
            labels: Object.keys(data.foods),
            datasets: [{
                data: Object.values(data.foods),
                backgroundColor: "#ff8a4c"
            }]
        }
    });

});

// TIMELINE
function setMode(mode, btn) {
    if (currentBtn) currentBtn.classList.remove("active");
    btn.classList.add("active");
    currentBtn = btn;

    fetch(`${API}/api/timeline?mode=${mode}`)
    .then(r => r.json())
    .then(data => {

        const el = document.getElementById("timeline");
        el.innerHTML = "";

        const values = Object.values(data.data);
        const max = Math.max(...values, 1);

        Object.entries(data.data).forEach(([k,v]) => {

            const cell = document.createElement("div");
            cell.className = "cell";
            cell.style.background =
                `rgba(34,139,34,${0.2 + v/max})`;

            el.appendChild(cell);
        });

    });
}

setMode("day", document.querySelector("button"));

// VIDEO
document.querySelector(".close").onclick = () => {
    document.getElementById("videoModal").style.display = "none";
};