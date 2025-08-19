class SoloRPG {
  constructor(){
    this.state = {
      level:1, exp:0, health:100, rank:"E",
      stats:{ strength:1, stamina:1, speed:1, agility:1, intelligence:1, sense:1 },
      tasks:[], log:[], badges:[], history:[], plan:[]
    };
    this.answers = {};
    this.chart = null;
    this.load();
    this.bind();
    this.updateUI();
    this.reminderLoop();
  }

  // ====== Bind UI ======
  bind(){
    const $ = (id)=>document.getElementById(id);

    // core
    $("fightBtn").onclick = ()=>{ this.fight(); this.saveNow(); };
    $("restBtn").onclick = ()=>{ this.rest(); this.saveNow(); };
    $("addTaskBtn").onclick = ()=>this.addTask();
    $("startAssessBtn").onclick = ()=>this.renderAssess();
    $("applyPlanBtn").onclick = ()=>this.applyPlanToTasks();

    // persistence
    $("saveBtn").onclick = ()=>this.saveNow(true);
    $("loadBtn").onclick = ()=>{ this.load(); this.updateUI(); this.flashMsg("تم التحميل"); };
    $("exportBtn").onclick = ()=>this.export();
    $("importBtn").onclick = ()=>$("importFile").click();
    $("importFile").addEventListener("change", (e)=>this.import(e));
    $("resetBtn").onclick = ()=>{ if(confirm("هل تريد إعادة الضبط؟")){ localStorage.removeItem("solo_rpg_health_v1"); this.state = {level:1, exp:0, health:100, rank:"E", stats:{strength:1, stamina:1, speed:1, agility:1, intelligence:1, sense:1}, tasks:[], log:[], badges:[], history:[], plan:[]}; this.updateUI(); this.saveNow(); } };

    // popup
    document.getElementById("popupClose").onclick = ()=>this.hidePopup();
  }

  // ====== Save/Load ======
  saveNow(show=false){
    localStorage.setItem("solo_rpg_health_v1", JSON.stringify(this.state));
    if(show) this.flashMsg("تم الحفظ ✅");
  }
  load(){
    const raw = localStorage.getItem("solo_rpg_health_v1");
    if(raw){ try{ this.state = JSON.parse(raw);}catch{} }
  }
  export(){
    const blob=new Blob([JSON.stringify(this.state,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="solo_rpg_save.json";
    a.click();
  }
  import(e){
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{ try{ this.state=JSON.parse(r.result); this.updateUI(); this.saveNow(true); }catch{ alert("ملف غير صالح"); } };
    r.readAsText(f);
  }

  // ====== Helpers ======
  pushLog(msg){
    this.state.log.unshift(`${new Date().toLocaleString()} — ${msg}`);
    if(this.state.log.length>80) this.state.log.pop();
  }
  flashMsg(text){ const el=document.getElementById("msg"); el.textContent=text; setTimeout(()=>el.textContent="",2300); }
  setBar(el, value, max){ el.style.width = Math.max(0, Math.min(1, value/max))*100 + "%"; }

  rankFromLevel(lv){
    if(lv>=20) return "S";
    if(lv>=15) return "A";
    if(lv>=10) return "B";
    if(lv>=5)  return "C";
    return "E";
  }

  // ====== Core systems ======
  fight(){
    const p = Math.random();
    if(p>0.55){
      const xp = 10 + Math.floor(Math.random()*6);
      this.state.exp += xp; this.pushLog(`فوز في قتال +${xp} XP`);
      this.award("المحارب المبتدئ");
    }else{
      const dmg = 8 + Math.floor(Math.random()*8);
      this.state.health = Math.max(0, this.state.health - dmg);
      this.pushLog(`خسارة في قتال -${dmg} HP`);
    }
    this.checkLevel();
    this.updateUI();
  }

  rest(){
    const heal = 15;
    this.state.health = Math.min(100, this.state.health + heal);
    this.state.exp += 2;
    this.pushLog(`استراحة +${heal} HP, +2 XP`);
    this.checkLevel();
    this.updateUI();
  }

  checkLevel(){
    while(this.state.exp>=100){ this.state.exp-=100; this.state.level++; this.pushLog("Level Up! → "+this.state.level); }
    const newRank = this.rankFromLevel(this.state.level);
    if(newRank!==this.state.rank){ this.state.rank=newRank; this.award(`ترقية إلى ${newRank}`); }
  }

  award(name){
    if(!this.state.badges.includes(name)){
      this.state.badges.push(name);
    }
  }

  // ====== Tasks ======
  addTask(){
    const text = document.getElementById("taskText").value.trim();
    const mins = parseInt(document.getElementById("taskMins").value)||30;
    if(!text) return;
    const deadline = Date.now() + mins*60*1000;
    this.state.tasks.push({ id:Date.now(), text, deadline, done:false });
    document.getElementById("taskText").value="";
    this.updateUI();
    this.saveNow();
  }
  toggleTask(id){
    const t = this.state.tasks.find(x=>x.id===id); if(!t) return;
    if(!t.done){
      t.done=true;
      this.state.exp += 6;
      this.pushLog(`إنهاء مهمة: ${t.text} (+6 XP)`);
      this.checkLevel();
    }else{
      t.done=false;
    }
    this.updateUI();
    this.saveNow();
  }
  removeTask(id){
    this.state.tasks = this.state.tasks.filter(x=>x.id!==id);
    this.updateUI();
    this.saveNow();
  }
  taskPenaltySweep(){
    const now = Date.now();
    this.state.tasks.forEach(t=>{
      if(!t.done && now>t.deadline){
        t.done=true; // يغلق تلقائياً
        this.state.health = Math.max(0, this.state.health - 5);
        this.pushLog(`انتهى وقت مهمة "${t.text}" (-5 HP)`);
      }
    });
  }

  // ====== Assessment ======
  assessQuestions(){
    return [
      {k:"strength", q:"كم مرة ضغط متتالية؟", type:"num", min:0, max:60},
      {k:"stamina", q:"كم دقيقة تجري أو تمشي بسرعة بدون توقف؟", type:"num", min:0, max:60},
      {k:"speed", q:"زمن جري 30م (بالثواني — الأقل أفضل)", type:"num", min:3, max:12},
      {k:"agility", q:"هل تقدر تغير اتجاهك بسرعة؟ (1-5)", type:"scale"},
      {k:"intelligence", q:"معرفتك بأساسيات التغذية والتمارين؟ (1-5)", type:"scale"},
      {k:"sense", q:"متابعة إشارات جسمك (تعب/ألم)؟ (1-5)", type:"scale"},
      {k:"flex", q:"هل تلمس أصابع قدمك وأنت واقف مستقيم؟ (1-5)", type:"scale"},
      {k:"balance", q:"كم ثانية توقف على رجل واحدة؟", type:"num", min:0, max:60},
      {k:"core", q:"كم مرة Sit-ups متتالية؟", type:"num", min:0, max:80}
    ];
  }

  renderAssess(){
    this.answers = {};
    const area = document.getElementById("assessArea");
    area.innerHTML = "";
    this.assessQuestions().forEach(q=>{
      const wrap = document.createElement("div");
      wrap.className = "q";
      let input = null;
      if(q.type==="scale"){
        input = document.createElement("select");
        [1,2,3,4,5].forEach(v=>{ const op=document.createElement("option"); op.value=v; op.textContent=v; input.appendChild(op); });
      }else{
        input = document.createElement("input"); input.type="number";
        if(q.min!=null) input.min=q.min;
        if(q.max!=null) input.max=q.max;
        input.placeholder = "أدخل قيمة رقمية";
      }
      input.onchange=(e)=>{ this.answers[q.k] = Number(e.target.value); };
      const label = document.createElement("label"); label.textContent = q.q;
      wrap.appendChild(label); wrap.appendChild(input);
      area.appendChild(wrap);
    });
    // button to compute
    const btn = document.createElement("button");
    btn.className="btn"; btn.textContent="احسب النتيجة";
    btn.onclick = ()=>this.submitAssess();
    area.appendChild(btn);
  }

  submitAssess(){
    // Map raw answers -> normalized 1..5
    const norm = (k,v)=>{
      if(v==null || Number.isNaN(v)) return 1;
      switch(k){
        case "strength": return v>=40?5: v>=25?4: v>=15?3: v>=5?2:1;
        case "stamina":  return v>=40?5: v>=25?4: v>=15?3: v>=5?2:1;
        case "speed":    return v<=4.5?5: v<=5.5?4: v<=7?3: v<=9?2:1; // أقل أفضل
        case "agility":
        case "intelligence":
        case "sense":
        case "flex":     return Math.max(1, Math.min(5, v|0));
        case "balance":  return v>=40?5: v>=25?4: v>=15?3: v>=8?2:1;
        case "core":     return v>=50?5: v>=35?4: v>=20?3: v>=10?2:1;
      }
      return 1;
    };
    const scores = {};
    for(const [k,val] of Object.entries(this.answers)){
      scores[k]=norm(k,val);
    }
    const values = Object.values(scores);
    const score = values.length? Math.round(values.reduce((a,b)=>a+b,0)/values.length):1;
    let grade="ضعيف"; if(score>=4) grade="ممتاز"; else if(score>=3) grade="جيد"; else if(score>=2) grade="مقبول";

    // update state + history
    this.state.history.unshift({ date:new Date().toLocaleString(), score, grade });
    if(this.state.history.length>50) this.state.history.pop();

    // compute recommended plan
    this.state.plan = this.makePlan(scores);
    this.updateUI();
    this.saveNow(true);
  }

  makePlan(s){
    // Build Arabic plan lines based on weaknesses
    const lines = [];
    const add = (txt)=>lines.push("• "+txt);

    // Strength
    if((s.strength||1)<=2)      add("قوة: ضغط 3×5 + قرفصاء 3×10 + مطاط مقاومة خفيف");
    else if(s.strength===3)     add("قوة: ضغط 3×10 + قرفصاء 3×15 + سحب مطاط");
    else if((s.strength||5)>=4) add("قوة: ضغط 4×15 + قرفصاء 4×20 + أوزان حرة");

    // Stamina
    if((s.stamina||1)<=2)       add("تحمل: مشي سريع 10 دقائق + قفز حبل 2×30 ثانية");
    else if(s.stamina===3)      add("تحمل: جري خفيف 15 دقيقة + قفز حبل 3×1 دقيقة");
    else if((s.stamina||5)>=4)  add("تحمل: جري 25 دقيقة + HIIT (20 ثانية × 8)");

    // Flexibility
    if((s.flex||1)<=2)          add("مرونة: إطالات hamstring + يوغا (قط/بقرة) 10 دقائق");
    else if(s.flex===3)         add("مرونة: إطالات + يوغا 10 دقائق");
    else if((s.flex||5)>=4)     add("مرونة: يوغا 20 دقيقة + إطالات متقدمة");

    // Agility / Speed
    if((s.agility||1)<=2 || (s.speed||1)<=2) add("رشاقة/سرعة: قفز جانبي 3×10 + خطوات سريعة");
    else if(s.agility===3 || s.speed===3)    add("رشاقة/سرعة: Ladder drills 3×20ث + Jump Squats");
    else if((s.agility||5)>=4 || (s.speed||5)>=4) add("رشاقة/سرعة: Sprint 6×20م + قفزات متعددة");

    // Balance
    if((s.balance||1)<=2)       add("توازن: وقوف على رجل 3×10ث");
    else if(s.balance===3)      add("توازن: وقوف 20ث + Lunges بطيئة");
    else if((s.balance||5)>=4)  add("توازن: وقوف بعيون مغمضة 30ث + كرة اتزان");

    // Core
    if((s.core||1)<=2)          add("Core: بلانك أمامي 3×15ث + تمارين بطن بسيطة");
    else if(s.core===3)         add("Core: بلانك 3×30ث + Russian Twists");
    else if((s.core||5)>=4)     add("Core: بلانك 1 دقيقة + رفع أرجل 3×15");

    return lines;
  }

  applyPlanToTasks(){
    if(!this.state.plan.length){ this.flashMsg("لا توجد خطة بعد"); return; }
    const now = Date.now();
    this.state.plan.forEach((line,i)=>{
      this.state.tasks.push({ id:now+i, text:line, deadline:now + (45+i*5)*60*1000, done:false });
    });
    this.pushLog("تمت إضافة الخطة للمهام");
    this.updateUI(); this.saveNow(true);
  }

  // ====== Reminders ======
  reminderLoop(){
    // simple internal reminders every ~3 minutes (randomized a little)
    const tick = ()=>{
      const msgs = ["اشرب ماء 💧","انهض وتمدد قليلًا 🧘‍♂️","امشِ 1 دقيقة 🚶"];
      const m = msgs[Math.floor(Math.random()*msgs.length)];
      this.showPopup(m);
      setTimeout(tick, 1000*120 + Math.random()*30000);
    };
    setTimeout(tick, 1000*60);
  }
  showPopup(text){
    const pop=document.getElementById("popup");
    document.getElementById("popupText").textContent=text;
    pop.classList.remove("hidden");
  }
  hidePopup(){ document.getElementById("popup").classList.add("hidden"); }

  // ====== UI Update ======
  updateUI(){
    // penalties for expired tasks
    this.taskPenaltySweep();

    // bars & stats
    const $ = (id)=>document.getElementById(id);
    $("level").textContent = this.state.level;
    $("rank").textContent = this.state.rank;
    this.setBar($("healthBar"), this.state.health, 100);
    $("healthText").textContent = `${this.state.health} / 100`;
    this.setBar($("expBar"), this.state.exp, 100);
    $("expText").textContent = `${this.state.exp} / 100`;

    const s = this.state.stats;
    ["strength","stamina","speed","agility","intelligence","sense"].forEach(k=>{ $(k).textContent = s[k]; });

    // avatar depends on health
    const av = document.getElementById("avatar");
    const h = this.state.health;
    av.style.background = h>=70
      ? "conic-gradient(from 0deg, #8ce4d2, #79b3ff)"
      : h>=40
      ? "conic-gradient(from 0deg, #ffd27a, #79b3ff)"
      : "conic-gradient(from 0deg, #ff8e8e, #ffd27a)";

    // badges
    const bag = document.getElementById("badges"); bag.innerHTML="";
    this.state.badges.forEach(name=>{
      const b=document.createElement("span"); b.className="badge"; b.textContent=name; bag.appendChild(b);
    });

    // log
    document.getElementById("log").textContent = this.state.log.slice(0,8).join("\n");

    // tasks
    const ul = document.getElementById("tasksList"); ul.innerHTML="";
    const now = Date.now();
    this.state.tasks.forEach(t=>{
      const li = document.createElement("li"); li.className="task";
      const left = document.createElement("div"); left.className="row";
      const chk = document.createElement("input"); chk.type="checkbox"; chk.checked=t.done;
      chk.onchange=()=>this.toggleTask(t.id);
      const txt = document.createElement("span"); txt.textContent = t.text; if(t.done) txt.className="done";
      left.appendChild(chk); left.appendChild(txt);

      const right = document.createElement("div"); right.className="row";
      const mins = Math.max(0, Math.ceil((t.deadline-now)/60000));
      const meta = document.createElement("span"); meta.className="meta"; meta.textContent = t.done? "منتهية": `متبقي ${mins} دقيقة`;
      const del = document.createElement("button"); del.className="btn ghost"; del.textContent="حذف"; del.onclick=()=>this.removeTask(t.id);
      right.appendChild(meta); right.appendChild(del);

      li.appendChild(left); li.appendChild(right);
      ul.appendChild(li);
    });

    // history
    const hb = document.getElementById("historyBody"); hb.innerHTML="";
    this.state.history.forEach(h=>{
      const tr=document.createElement("tr");
      tr.innerHTML = `<td>${h.date}</td><td lang="en">${h.score}</td><td>${h.grade}</td>`;
      hb.appendChild(tr);
    });

    // assess result & plan
    const r = document.getElementById("assessResult");
    if(this.state.history.length){
      r.classList.remove("hidden");
      const last = this.state.history[0];
      document.getElementById("assessScore").textContent = last.score;
      document.getElementById("assessGrade").textContent = last.grade;
      document.getElementById("planText").innerHTML = this.state.plan.map(l=>`<div>• ${l}</div>`).join("");
      document.getElementById("quickPlan").innerHTML = this.state.plan.map(l=>`<div>• ${l}</div>`).join("");
    }else{
      r.classList.add("hidden");
    }

    this.renderChart();
  }

  // ====== Chart ======
  renderChart(){
    const el = document.getElementById("progressChart");
    const labels = this.state.history.slice(0,10).map(h=>h.date).reverse();
    const data = this.state.history.slice(0,10).map(h=>h.score).reverse();
    if(!this.chart){
      this.chart = new Chart(el, {
        type:"line",
        data:{ labels, datasets:[{ label:"Score", data }] },
        options:{ responsive:true, scales:{ y:{ min:1, max:5, ticks:{ stepSize:1 } } } }
      });
    }else{
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.update();
    }
  }
}

window.app = new SoloRPG();
