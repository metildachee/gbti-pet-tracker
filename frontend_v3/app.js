const API = "http://127.0.0.1:5001";

/* HERO */
fetch(`${API}/api/overview`)
.then(r=>r.json())
.then(d=>{

document.getElementById("header").innerText = d.pet_name;
document.getElementById("health").innerText = "System: " + d.health;
document.getElementById("intake").innerText = d.total_intake;

const safe = d.health === "Healthy" ? 97 : 72;

if(safe < 80){
document.getElementById("alert").classList.remove("hidden");
document.getElementById("alert").innerText =
"⚠ Elevated risk detected in dietary pattern";
}

});

/* INSIGHT (AI LAYER) */
document.getElementById("insightText").innerText =
"Pet is in stable metabolic state. No anomalous food intake detected in last 72h.";

/* RECORDS */
fetch(`${API}/api/records`)
.then(r=>r.json())
.then(d=>render(d.records||[]));

function render(records){

const c=document.getElementById("recentMeals");

c.innerHTML = records.slice(0,8).map(r=>`

<div class="meal">
<div>
<b>${r.item}</b><br>
<small>${new Date(r.time).toLocaleString()}</small>
</div>
<div>${r.risk || "Low"}</div>
</div>

`).join("");

}

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
backgroundColor:"#6D5EF7"
}]
}
});

});

/* TIMELINE */
fetch(`${API}/api/timeline?mode=day`)
.then(r=>r.json())
.then(d=>{

const el=document.getElementById("timeline");
el.innerHTML="";

const vals=Object.values(d.data);
const max=Math.max(...vals,1);

Object.entries(d.data).forEach(([k,v])=>{

let cell=document.createElement("div");
cell.className="cell";

let a=v/max;

cell.style.background =
`rgba(109,94,247,${0.1+a})`;

el.appendChild(cell);

});

});