const API = "http://127.0.0.1:5001";

let current = null;

/* HERO */
fetch(`${API}/api/overview`)
.then(r=>r.json())
.then(d=>{

document.getElementById("header").innerText = d.pet_name;
document.getElementById("health").innerText = d.health;
document.getElementById("intake").innerText = d.total_intake;

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

function renderMeals(records){

const c = document.getElementById("recentMeals");

c.innerHTML = records.slice(0,8).map(r=>{

let cls="low";
if(r.risk==="Medium") cls="mid";
if(r.risk==="High") cls="high";

return `
<div class="meal">
<div>
<b>${r.item}</b><br>
<small>${new Date(r.time).toLocaleString()}</small>
</div>

<div class="badge ${cls}">
${r.risk || "Low"}
</div>
</div>
`;
}).join("");

}

/* INSIGHT */
document.getElementById("insightText").innerText =
"Luna is stable. No risky consumption detected.";

/* CHART */
fetch(`${API}/api/summary`)
.then(r=>r.json())
.then(d=>{

new Chart(document.getElementById("barChart"),{
type:"bar",
data:{
labels:Object.keys(d.foods),
datasets:[{
data:Object.values(d.foods),
backgroundColor:"#7c5cff"
}]
}
});

});

/* TIMELINE */
function loadTimeline(){

fetch(`${API}/api/timeline?mode=day`)
.then(r=>r.json())
.then(d=>{

const el=document.getElementById("timeline");
el.innerHTML="";

const vals=Object.values(d.data);
const max=Math.max(...vals,1);

Object.entries(d.data).forEach(([k,v])=>{

const cell=document.createElement("div");
cell.className="cell";

let a=v/max;

cell.style.background=
`rgba(124,92,255,${0.1+a})`;

el.appendChild(cell);

});

});

}

loadTimeline();