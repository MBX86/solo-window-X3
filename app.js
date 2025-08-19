
const state = {
  level: 1,
  rank: "E",
  health: 100,
  exp: 0,
  history: [],
  tasks: [],
  assessments: [],
};

const ranks = ["E","D","C","B","A","S"];

function update() {
  document.getElementById("level").textContent = state.level;
  document.getElementById("rank").textContent = state.rank;
  document.getElementById("healthBar").value = state.health;
  document.getElementById("expBar").value = state.exp % 100;

  const ctx = document.getElementById("progressChart").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: state.assessments.map((_, i) => i+1),
      datasets: [{ label: 'Score', data: state.assessments, borderColor: '#00ffc8' }]
    }
  });
}

function addTask() {
  const text = document.getElementById("taskText").value;
  if (!text) return;
  state.tasks.push(text);
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";
  state.tasks.forEach((t,i)=>{
    const li = document.createElement("li");
    li.textContent = t;
    list.appendChild(li);
  });
}

function startAssessment() {
  const score = Math.floor(Math.random()*5)+1;
  state.assessments.push(score);
  if (state.assessments.length>20) state.assessments.shift();
  document.getElementById("score").textContent = score;
  document.getElementById("grade").textContent = ["ضعيف","مقبول","جيد","قوي","ممتاز"][score-1];
  document.getElementById("planText").textContent = "خطة تدريب مناسبة حسب الجدول.";
  update();
}

document.getElementById("addTaskBtn").onclick = addTask;
document.getElementById("startAssessBtn").onclick = startAssessment;

// Reminder popup
setInterval(()=>{
  const msgs = ["اشرب ماء 💧","قم واتحرك 🏃","خذ نفس عميق 🌬️"];
  const popup = document.getElementById("reminderPopup");
  popup.textContent = msgs[Math.floor(Math.random()*msgs.length)];
  popup.style.display="block";
  setTimeout(()=>popup.style.display="none",3000);
},20000);

// Particles.js init
particlesJS.load('particles-js', 'particles.json');
update();
