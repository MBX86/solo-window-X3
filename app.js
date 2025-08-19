class SoloRPG {
  constructor(){
    this.state = {
      level:1, exp:0, health:100, rank:"Beginner",
      stats:{ strength:1, stamina:1, speed:1, agility:1, intelligence:1, sense:1 },
      tasks:[], log:[], history:[],
    };
    this.answers = {};
    this.load();
    this.update();
    this.bind();
    setInterval(()=>this.saveNow(),20000); // backup save كل 20 ثانية
  }

  bind(){
    document.getElementById("addTaskBtn").onclick=()=>this.addTask();
    document.getElementById("fightBtn").onclick=()=>{this.fight(); this.saveNow();};
    document.getElementById("restBtn").onclick=()=>{this.rest(); this.saveNow();};
    document.getElementById("assessBtn").onclick=()=>this.startAssess();
    document.getElementById("submitAssessBtn").onclick=()=>this.submitAssess();
    document.getElementById("exportBtn").onclick=()=>this.export();
    document.getElementById("importBtn").onclick=()=>{
      document.getElementById("importFile").click();
    };
    document.getElementById("importFile").addEventListener("change",e=>this.import(e));
  }

  // --- حفظ ---
  autoSave(){
    clearTimeout(this._t);
    this._t=setTimeout(()=>this.saveNow(),1200);
  }
  saveNow(){
    localStorage.setItem("solo_rpg_v1_improved", JSON.stringify(this.state));
  }
  load(){
    const raw = localStorage.getItem("solo_rpg_v1_improved");
    if(raw){
      try{ this.state = JSON.parse(raw); }catch{}
    }
  }

  // --- تحديث واجهة ---
  update(){
    // ... نفس كود التحديث للواجهة ...
    this.autoSave();
  }

  // --- نظام التدريب والقتال ---
  fight(){
    const res = Math.random();
    if(res>0.5){
      this.state.exp+=10; this.pushLog("فزت! +10 XP");
    } else {
      this.state.health-=10; this.pushLog("خسرت! -10 HP");
    }
    this.checkLevel();
    this.update();
  }

  rest(){
    this.state.health=Math.min(100,this.state.health+15);
    this.state.exp+=2; this.pushLog("استراحة: +15 HP, +2 XP");
    this.checkLevel();
    this.update();
  }

  // --- المهام ---
  addTask(){
    const title=document.getElementById("taskTitle").value.trim();
    const mins=parseInt(document.getElementById("taskTime").value)||30;
    if(!title) return;
    this.state.tasks.push({id:Date.now(), title, deadline:Date.now()+mins*60000, done:false, penalty:false});
    document.getElementById("taskTitle").value="";
    document.getElementById("taskTime").value="";
    this.update();
    this.saveNow();
  }

  // --- التقييم ---
  startAssess(){
    document.getElementById("assessArea").innerHTML = "";
    this.answers={};
    const qs=[
      {k:"strength",q:"كم مرة تمارس تمارين المقاومة في الأسبوع؟",o:["أبداً",1,"مرتين",3,">4 مرات",5]},
      {k:"stamina",q:"كم دقيقة تستطيع الجري المتواصل؟",o:["<5",1,"10-20",3,">30",5]},
      {k:"speed",q:"ما مدى سرعتك في الجري لمسافة قصيرة؟",o:["بطيء",1,"متوسط",3,"سريع جداً",5]},
      {k:"agility",q:"هل تستطيع أداء تمارين مرونة بسهولة؟",o:["صعوبة شديدة",1,"متوسط",3,"سهل",5]},
      {k:"intelligence",q:"هل تعرف أساسيات التغذية والتمارين؟",o:["لا",1,"بعض الشيء",3,"نعم جيداً",5]},
      {k:"sense",q:"هل تتابع إشارات جسمك (تعب/ألم) وتتصرف؟",o:["أبداً",1,"أحياناً",3,"دائماً",5]},
    ];
    qs.forEach((q,i)=>{
      const div=document.createElement("div");
      div.innerHTML=`<p>${q.q}</p>`;
      q.o.forEach((o,j)=>{
        if(j%2==0) return;
      });
      const sel=document.createElement("select");
      [1,2,3,4,5].forEach(v=>{
        const op=document.createElement("option");
        op.value=v; op.textContent=v;
        sel.appendChild(op);
      });
      sel.onchange=(e)=>{this.answers[q.k]=parseInt(e.target.value);};
      div.appendChild(sel);
      document.getElementById("assessArea").appendChild(div);
    });
  }

  submitAssess(){
    const total = Object.values(this.answers).reduce((a,b)=>a+b,0);
    const score = Math.round(total / Object.keys(this.answers).length);
    let grade="ضعيف";
    if(score>=4) grade="ممتاز"; else if(score>=3) grade="جيد"; else if(score>=2) grade="مقبول";

    document.getElementById("assessResult").classList.remove("hidden");
    document.getElementById("assessScore").textContent=score;
    document.getElementById("assessGrade").textContent=grade;

    this.state.history.unshift({ date:new Date().toLocaleString(), score, grade });
    if(this.state.history.length>20) this.state.history.pop();
    this.update();
    this.saveNow(); // حفظ فوري بعد التقييم
  }

  // --- لوج ---
  pushLog(msg){
    this.state.log.unshift(msg);
    if(this.state.log.length>50) this.state.log.pop();
  }

  // --- ليفيل ---
  checkLevel(){
    while(this.state.exp>=100){
      this.state.exp-=100; this.state.level++;
      this.pushLog("Level Up! → "+this.state.level);
    }
  }

  // --- استيراد/تصدير ---
  export(){
    const blob=new Blob([JSON.stringify(this.state)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="solo_rpg_save.json";
    a.click();
  }
  import(e){
    const file=e.target.files[0]; if(!file) return;
    const r=new FileReader();
    r.onload=()=>{
      try{ this.state=JSON.parse(r.result); this.update(); this.saveNow(); }catch{}
    };
    r.readAsText(file);
  }
}

window.SoloRPG=new SoloRPG();
