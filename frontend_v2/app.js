const API = "http://127.0.0.1:5001";

let current = null;

/* HERO */
fetch(`${API}/api/overview`)
.then(r=>r.json())
.then(d=>{

document.getElementById("header").innerText = d.pet_name;
// document.getElementById("health").innerText = d.health;
document.getElementById("intake").innerText = `${d.total_intake}`;;
document.getElementById("mealCount").innerText = d.total_events;
document.getElementById("safeRate").innerText = d.health;


let score = d.health === "Healthy" ? 92 : 70;
document.getElementById("healthScore").innerText = score;

document.querySelector(".progress-ring").style.strokeDashoffset =
314 - (314 * score / 100);

});

/* RECORDS */
fetch(`${API}/api/records`)
.then(r=>r.json())
.then(d=>{
renderMeals(d.records || []);
});

// function renderMeals(records){

// const c = document.getElementById("recentMeals");

// c.innerHTML = records.slice(0,8).map(r=>{

// let cls="low";
// if(r.risk==="Medium") cls="mid";
// if(r.risk==="High") cls="high";

// return `
// <div class="meal">
// <div>
// <b>${r.item}</b><br>
// <small>${new Date(r.time).toLocaleString()}</small>
// </div>

// <div class="badge ${cls}">
// ${r.risk || "Low"}
// </div>
// </div>
// `;
// }).join("");

// }

function formatDate(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const inputDate = new Date(date);
    const compareDate = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
    
    if (compareDate.getTime() === today.getTime()) {
        return "Today";
    } else if (compareDate.getTime() === yesterday.getTime()) {
        return "Yesterday";
    } else {
        return inputDate.toLocaleDateString();
    }
}

function renderMeals(records){

const c = document.getElementById("recentMeals");

c.innerHTML = records.slice(0,8).map((r, index)=>{

let cls="low";
if(r.risk==="Medium") cls="mid";
if(r.risk==="High") cls="high";

let formattedTime = new Date(r.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

return `
<div class="meal" onclick="openVideo(${index})" data-index="${index}">
<div>
<b>${r.item}</b><br>
<small>${formattedTime}, ${formatDate(r.time)}</small>
</div>

<div class="badge ${cls}">
${r.risk || "Low"}
</div>
</div>
`;
}).join("");

// store globally for click access
window.__MEALS = records;

}

/* INSIGHT */
document.getElementById("insightText").innerText =
"Milo is stable. No risky consumption detected.";

/* CHART */
/* CHART */
fetch(`${API}/api/summary`)
.then(r=>r.json())
.then(d=>{

new Chart(document.getElementById("barChart"),{
type:"bar",
data:{
labels:Object.keys(d.foods),
datasets:[{
label: "Intake (g)",  // ← ADD THIS LINE
data:Object.values(d.foods),
backgroundColor:"#7c5cff"
}]
}
});

});

function openVideo(index){

const meal = window.__MEALS[index];
if(!meal || !meal.video) return;

const modal = document.getElementById("videoModal");
const video = document.getElementById("videoPlayer");

let url = meal.video;

let filename = url.split('/').pop();

// backend handling (same as yours)

if(!url.startsWith("http")){
    url = `${API}/video/${encodeURIComponent(filename)}`;
}

video.src = url;
modal.classList.remove("hidden");

video.play();
}

function closeVideo(){

const modal = document.getElementById("videoModal");
const video = document.getElementById("videoPlayer");

video.pause();
video.src = "";

modal.classList.add("hidden");

}

document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape"){
        closeVideo();
    }
});

/* TIMELINE - Main function */
// function setMode(mode, btn) {
//     if (currentBtn) currentBtn.classList.remove("active");
//     btn.classList.add("active");
//     currentBtn = btn;

//     fetch(`${API}/api/timeline?mode=${mode}`)
//     .then(r => r.json())
//     .then(data => {
//         const el = document.getElementById("timeline");
//         el.innerHTML = "";
        
//         // Set grid columns based on mode
//         let gridCols = 6;
//         if (mode === "day") gridCols = 12;
//         else if (mode === "week") gridCols = 7;
//         else if (mode === "month") gridCols = 7;
//         else gridCols = 6;
        
//         el.style.display = "grid";
//         el.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
//         el.style.gap = "8px";

//         const values = Object.values(data.data);
//         const max = Math.max(...values, 1);

//         Object.entries(data.data).forEach(([label, value]) => {
//             const cell = document.createElement("div");
//             cell.className = "cell";
//             cell.style.background = `rgba(124,92,255,${0.1 + (value/max) * 0.8})`;
//             cell.style.padding = "12px";
//             cell.style.textAlign = "center";
//             cell.style.borderRadius = "8px";
//             cell.style.fontSize = "12px";
//             cell.style.fontWeight = "bold";
//             cell.innerText = label;
//             cell.title = `Intake: ${value} units`;
//             el.appendChild(cell);
//         });
//     })
//     .catch(err => console.error("Timeline error:", err));
// }

// Load initial timeline with day mode
function loadTimeline() {
    fetch(`${API}/api/timeline?mode=day`)
    .then(r => r.json())
    .then(data => {
        const el = document.getElementById("timeline");
        el.innerHTML = "";
        
        // Create all 24 hours
        const allHours = [];
        for (let i = 0; i < 24; i++) {
            const hour = String(i).padStart(2, '0') + ":00";
            allHours.push({
                label: hour,
                value: data.data[hour] || 0
            });
        }
        
        el.style.display = "grid";
        el.style.gridTemplateColumns = "repeat(6, 1fr)";
        el.style.gap = "8px";
        
        const valuesWithData = allHours.filter(h => h.value > 0).map(h => h.value);
        const max = valuesWithData.length > 0 ? Math.max(...valuesWithData) : 1;
        
        allHours.forEach(hour => {
            const cell = document.createElement("div");
            cell.className = "cell";
            
            if (hour.value > 0) {
                const intensity = 0.2 + (hour.value / max) * 0.7;
                cell.style.background = `rgba(124, 92, 255, ${intensity})`;
                cell.style.cursor = "pointer";
                cell.title = `Intake: ${hour.value} units`;
            } else {
                cell.style.background = "rgba(255, 255, 255, 0.03)";
                cell.style.opacity = "0.5";
                cell.title = "No data";
            }
            
            cell.innerText = hour.label;
            el.appendChild(cell);
        });
    })
    .catch(err => console.error("Timeline load error:", err));
}

loadTimeline()

// Make sure this is NOT inside any other function
window.setMode = function(mode, btn) {
    // Remove active class from all buttons
    document.querySelectorAll('.timeline-btn').forEach(b => {
        b.classList.remove('active');
    });
    
    // Add active class to clicked button
    btn.classList.add('active');

    fetch(`${API}/api/timeline?mode=${mode}`)
    .then(r => r.json())
    .then(data => {
        const el = document.getElementById("timeline");
        el.innerHTML = "";
        
        // Create full structure based on mode
        let allItems = [];
        let gridCols = 6;
        console.log(data)
        
        if (mode === "day") {
            gridCols = 6; // 12 columns, will show 24 hours (2 rows of 12)
            // Create all 24 hours (00:00 to 23:00)
            for (let i = 0; i < 24; i++) {
                const hour = String(i).padStart(2, '0') + ":00";
                allItems.push({
                    label: hour,
                    value: data.data[hour] || 0
                });
            }
        }
        else if (mode === "week") {
            gridCols = 6;
            // All 7 days of the week
            const days = ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"];
            days.forEach(day => {
                allItems.push({
                    label: day,
                    value: data.data[day] || 0
                });
            });
            console.log(days)
        }
        else if (mode === "month") {
            gridCols = 6;
            for (let i = 1; i <= 31; i++) {
                // For display: "1", "2", "3"... "10", "11" (no leading zero)
                const displayDay = String(i);
                
                // For lookup key: "01", "02"... "10", "11" (pad only single digits)
                const lookupKey = i < 10 ? '0' + String(i) : String(i);
                
                allItems.push({
                    label: displayDay,           // Shows "1", "2", "10", "11"
                    value: data.data[lookupKey] || 0  // Looks up "01", "02", "10", "11"
                });
            }
        }
        else if (mode === "year") {
            gridCols = 6; // 6 columns (2 rows of 6 months)
            // All 12 months
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const months_int = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
            
            months.forEach((month, i) => {  // Fixed: parameters are (value, index)
                const yearMonthKey = '2026-' + months_int[i];
                allItems.push({
                    label: month,
                    value: data.data[yearMonthKey] || 0
                });
            });
        }
        
        // Set grid layout
        el.style.display = "grid";
        el.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
        el.style.gap = "8px";
        
        // Find max value for color scaling (only among cells with data)
        const valuesWithData = allItems.filter(item => item.value > 0).map(item => item.value);
        const max = valuesWithData.length > 0 ? Math.max(...valuesWithData) : 1;
        
        // Render all cells
        allItems.forEach(item => {
            const cell = document.createElement("div");
            cell.className = "cell";
            
            // Style based on whether there's data
            console.log(item.value)
            if (item.value > 0) {
                // Has data - show with intensity and make it interactive
                const intensity = 0.2 + (item.value / max) * 0.7;
                cell.style.background = `rgba(124, 92, 255, ${intensity})`;
                cell.style.cursor = "pointer";
                cell.style.opacity = "1";
                cell.style.fontWeight = "100";
                cell.title = `Intake: ${item.value} units`;
            } else {
                // No data - show as empty/transparent
                cell.style.background = "rgba(255, 255, 255, 0.03)";
                cell.style.cursor = "default";
                cell.style.opacity = "0.5";
                cell.style.fontWeight = "100";
                cell.title = "No data";
            }
            
            cell.innerText = item.label;
            el.appendChild(cell);
        });
    })
    .catch(err => console.error("Timeline error:", err));
};
// Remove the old setMode and loadTimeline functions to avoid conflicts
// Keep only one timeline initialization

let quizData = null;

fetch(`${API}/personality_test.json`)
.then(r => r.json())
.then(data => {
    quizData = data;
    renderQuiz(data.questions);
});

function renderQuiz(questions){
    const el = document.getElementById("quiz");
    if (!el) return;

    el.innerHTML = questions.map((q, i) => {
        return `
        <div class="question-block">
            <b>${q.question}</b>

            ${q.options.map(opt => `
                <label>
                    <input type="radio" name="q${i}" value="${opt}">
                    ${opt}
                </label>
            `).join("")}
        </div>
        `;
    }).join("") + `
        <button class="quiz-submit" onclick="submitPersonality()">
            Analyze Personality 🧠
        </button>
    `;
}
async function submitPersonality(){

const answers = {};

quizData.questions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    answers[q.question] = selected ? selected.value : null;
});

document.getElementById("personalityResult").innerHTML =
"Analyzing personality... 🧠";

const res = await fetch(`${API}/api/personality/analyze`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ answers })
});

const data = await res.json();

document.getElementById("personalityResult").innerHTML = `
    <h3>✨ ${data.mbti_type}: ${data.personality_name}</h3>
    <p>${data.description}</p>
    <p><strong>Strengths:</strong> ${data.strengths.join(', ')}</p>
    <p><strong>Quirks:</strong> ${data.quirks.join(', ')}</p>
    <small>Confidence: ${(data.confidence * 100).toFixed(1)}%</small>
`;
}