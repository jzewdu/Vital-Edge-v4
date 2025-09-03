// --- Local Data ---
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let meals = JSON.parse(localStorage.getItem("meals")) || [];
let calorieGoal = localStorage.getItem("calorieGoal") || 2500;
let proteinGoal = localStorage.getItem("proteinGoal") || 150;

// Reset at midnight
function resetAtMidnight() {
  let lastReset = localStorage.getItem("lastReset");
  let today = new Date().toDateString();
  if (lastReset !== today) {
    tasks = []; meals = [];
    localStorage.setItem("tasks", JSON.stringify(tasks));
    localStorage.setItem("meals", JSON.stringify(meals));
    localStorage.setItem("lastReset", today);
  }
}
resetAtMidnight();

// --- Tasks ---
function renderTasks() {
  let list = document.getElementById("taskList");
  let fullList = document.getElementById("taskListFull");
  list.innerHTML = ""; fullList.innerHTML = "";
  tasks.forEach((t, i) => {
    let li = document.createElement("li"); li.textContent = t;
    li.onclick = () => { tasks.splice(i,1); saveTasks(); };
    list.appendChild(li);
    let li2 = document.createElement("li"); li2.textContent = t;
    li2.onclick = () => { tasks.splice(i,1); saveTasks(); };
    fullList.appendChild(li2);
  });
}
function addTask() {
  let input = document.getElementById("taskInput");
  if(input.value.trim()!==""){ tasks.push(input.value.trim()); input.value=""; saveTasks(); }
}
function saveTasks(){ localStorage.setItem("tasks", JSON.stringify(tasks)); renderTasks(); }

// --- Meals ---
function renderMeals(){
  let list=document.getElementById("mealList"); list.innerHTML="";
  meals.forEach(m=>{ let li=document.createElement("li");
    li.textContent=`${m.cal} cal, ${m.pro}g protein`; list.appendChild(li); });
  updateCharts();
}
function addMeal(){ let cal=document.getElementById("mealCalories").value;
  let pro=document.getElementById("mealProtein").value;
  if(cal&&pro){ meals.push({cal:parseInt(cal),pro:parseInt(pro)});
    localStorage.setItem("meals",JSON.stringify(meals)); renderMeals(); }}

// --- Rings ---
function animateRing(ctx, value, goal, color){
  let percent=Math.min(value/goal,1); let current=0;
  function animate(){ ctx.clearRect(0,0,200,200);
    ctx.lineWidth=15;
    ctx.strokeStyle="#eee";
    ctx.beginPath(); ctx.arc(100,100,80,0,2*Math.PI); ctx.stroke();
    ctx.strokeStyle=color;
    ctx.beginPath();
    ctx.arc(100,100,80,-Math.PI/2,(2*Math.PI*current)-Math.PI/2); ctx.stroke();
    if(current<percent){ current+=0.02; requestAnimationFrame(animate); } }
  animate();
}
function updateCharts(){
  let totalCal=meals.reduce((a,b)=>a+b.cal,0);
  let totalPro=meals.reduce((a,b)=>a+b.pro,0);
  animateRing(document.getElementById("calorieChart").getContext("2d"), totalCal, calorieGoal, "#4e54c8");
  animateRing(document.getElementById("proteinChart").getContext("2d"), totalPro, proteinGoal, "#8f94fb");
  document.getElementById("calorieText").textContent=`${totalCal} / ${calorieGoal} cal`;
  document.getElementById("proteinText").textContent=`${totalPro} / ${proteinGoal} g protein`;
}
function saveSettings(){ calorieGoal=document.getElementById("calorieGoal").value;
  proteinGoal=document.getElementById("proteinGoal").value;
  localStorage.setItem("calorieGoal",calorieGoal);
  localStorage.setItem("proteinGoal",proteinGoal);
  updateCharts(); switchTab("home"); }

// --- Bottom Nav ---
document.querySelectorAll(".navbar button").forEach(btn=>{
  btn.addEventListener("click",()=>{ switchTab(btn.getAttribute("data-tab")); });
});
function switchTab(tab){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById(tab).classList.add("active");
  document.querySelectorAll(".navbar button").forEach(b=>b.classList.remove("active"));
  let btn=document.querySelector(`.navbar button[data-tab="${tab}"]`);
  if(btn) btn.classList.add("active");
}

// --- Scanner ---
const scanBtn=document.getElementById("scanBtn");
const fileInput=document.getElementById("foodImage");
const preview=document.getElementById("preview");
const progress=document.getElementById("scanProgress");
const results=document.getElementById("scanResults");
const labelsDiv=document.getElementById("labels");
const estimate=document.getElementById("estimate");
const confidenceFill=document.getElementById("confidenceFill");
const addToCalories=document.getElementById("addToCalories");

fileInput?.addEventListener("change",()=>{
  let file=fileInput.files[0];
  if(file){ let reader=new FileReader();
    reader.onload=e=>{ preview.src=e.target.result; preview.classList.remove("hidden"); };
    reader.readAsDataURL(file); }
});

scanBtn?.addEventListener("click",async()=>{
  let file=fileInput.files[0];
  if(!file) return alert("Please upload a meal photo!");
  progress.classList.remove("hidden"); results.classList.add("hidden");
  const formData=new FormData(); formData.append("file",file);
  try{
    let res=await fetch("https://your-vercel-app.vercel.app/api/scan",{method:"POST",body:formData});
    let data=await res.json();
    progress.classList.add("hidden"); results.classList.remove("hidden");
    if(data.error){ estimate.textContent="Error: "+data.error; return; }
    let top=data[0];
    labelsDiv.innerHTML=`Top guess: <b>${top.label}</b> (${(top.score*100).toFixed(1)}%)`;
    confidenceFill.style.width=`${Math.round(top.score*100)}%`;

    // Estimate calories
    let portion=document.getElementById("portion").value||100;
    let cal=FOOD_CALORIES_PER_100G[top.label]||200;
    let pro=FOOD_PROTEIN_PER_100G[top.label]||10;
    cal=Math.round(cal*portion/100);
    pro=Math.round(pro*portion/100);
    estimate.textContent=`≈ ${cal} cal, ${pro}g protein`;

    addToCalories.onclick=()=>{
      meals.push({cal,pro});
      localStorage.setItem("meals",JSON.stringify(meals));
      renderMeals(); updateCharts(); switchTab("home");
    };
  }catch(e){ progress.classList.add("hidden"); alert("Scanner failed: "+e.message); }
});

// Food DB
const FOOD_CALORIES_PER_100G = { "pizza":266,"hamburger":250,"cheeseburger":303,"french fries":312,"egg":155,"omelette":154,"scrambled eggs":148,"bacon":541,"apple":52,"banana":89,"orange":47,"salmon":208,"steak":271,"grilled chicken":165,"chicken wings":254,"rice":130,"pasta":160,"sandwich":230,"tacos":226,"burrito":215,"donut":452,"muffin":377,"cake":350 };
const FOOD_PROTEIN_PER_100G = { "pizza":11,"hamburger":17,"cheeseburger":18,"french fries":3.5,"egg":13,"omelette":12,"scrambled eggs":13,"bacon":37,"apple":0.3,"banana":1.1,"orange":0.9,"salmon":20,"steak":26,"grilled chicken":31,"chicken wings":24,"rice":2.7,"pasta":5,"sandwich":10,"tacos":10,"burrito":9,"donut":4,"muffin":5,"cake":6 };

// Init
renderTasks(); renderMeals(); updateCharts();
