let currentQuestion = 0;

function askForName() {
  const app = document.getElementById('app');
  const saved = localStorage.getItem('quiz_user_name');
  const count = parseInt(localStorage.getItem('participation_count')||'0',10);
  if (saved) return showQuestion();
  app.innerHTML = `
    <div class="fade-in">
      <h1 class="text-4xl font-bold mb-4">People's Truth</h1>
      <p class="text-sm text-gray-500 mb-4">Total participants: ${count}</p>
      <h2 class="text-2xl font-bold mb-4">What’s your name?</h2>
      <input id="nameInput" placeholder="Enter your name" class="w-full px-4 py-2 mb-4 border rounded">
      <button onclick="startQuiz()" class="px-6 py-2 bg-blue-600 text-white rounded">Start Quiz</button>
    </div>
  `;
}

function startQuiz() {
  const name = document.getElementById('nameInput').value.trim();
  if (!name) { alert('Please enter your name.'); return; }
  localStorage.setItem('quiz_user_name', name);
  showQuestion();
}

function showQuestion() {
  // Increment reach counter for stall analysis
  const reachKey = `reach_q${currentQuestion+1}`;
  let reachCount = parseInt(localStorage.getItem(reachKey) || "0", 10);
  localStorage.setItem(reachKey, reachCount + 1);

  const app = document.getElementById('app');
  const total = questions.length;
  if (currentQuestion>=total) return showFinalResults();
  const q = questions[currentQuestion];
  const prev = localStorage.getItem('vote_'+q.id);
  const pct = Math.round((currentQuestion/total)*100);
  app.innerHTML = `
    <div class="fade-in">
      <h1 class="text-3xl font-bold mb-2">People's Truth</h1>
      <div class="w-full bg-gray-200 h-1 mb-4"><div class="bg-blue-500 h-1" style="width:${pct}%"></div></div>
      <h2 class="text-xl font-semibold mb-6">${q.question}</h2>
      <div class="flex gap-4 justify-center">
        <button onclick="vote('${q.id}','A')" class="flex-1 py-4 ${prev==='A'?'bg-green-100':'bg-white'} text-gray-800 border rounded hover:bg-gray-100">${q.optionA} ${prev==='A'?'✅':''}</button>
        <button onclick="vote('${q.id}','B')" class="flex-1 py-4 ${prev==='B'?'bg-green-100':'bg-white'} text-gray-800 border rounded hover:bg-gray-100">${q.optionB} ${prev==='B'?'✅':''}</button>
      </div>
      ${currentQuestion>0?'<button onclick="prevQuestion()" class="mt-6 px-4 py-2 bg-gray-300 rounded">Back</button>':''}
    </div>
  `;
}

function vote(id,opt) {
  localStorage.setItem('vote_'+id,opt);
  const sk='stats_'+id;
  const st=JSON.parse(localStorage.getItem(sk)||'{"A":0,"B":0}');
  st[opt]++; localStorage.setItem(sk,JSON.stringify(st));
  currentQuestion++; showQuestion();
}

function prevQuestion() { if(currentQuestion>0){currentQuestion--; showQuestion();} }

function shannonEntropy(p) {return(p===0||p===1)?0:-(p*Math.log2(p)+(1-p)*Math.log2(1-p));}

function showFinalResults() {
  const app = document.getElementById('app');
  const name = localStorage.getItem('quiz_user_name')||'';
  let cnt = parseInt(localStorage.getItem('participation_count')||'0',10);
  if(!localStorage.getItem('quiz_inc')){cnt++;localStorage.setItem('participation_count',cnt);localStorage.setItem('quiz_inc','1');}
  app.innerHTML = `
    <div class="fade-in">
      <h1 class="text-3xl font-bold mb-2">People's Truth</h1>
      <h2 class="text-2xl mb-4">${name}, your journey ends here.</h2>
      <div class="flex gap-4 justify-center mb-4">
        <button onclick="showAnalytics()" class="px-4 py-2 bg-teal-600 text-white rounded">🧮 View Analytics</button>
        <button onclick="restart()" class="px-4 py-2 bg-blue-500 text-white rounded">Restart</button>
      </div>
    </div>
  `;
}

function showAnalytics() {
  // Compute drop-off rates to find stall point
  const drops = [];
  for(let i = 1; i < questions.length; i++) {
    const r1 = parseInt(localStorage.getItem(`reach_q${i}`) || "0", 10);
    const r2 = parseInt(localStorage.getItem(`reach_q${i+1}`) || "0", 10);
    if (r1 > 0) {
      drops.push({ question: questions[i-1].question, dropRate: ((r1 - r2)/r1*100).toFixed(1) });
    }
  }
  const worst = drops.sort((a,b) => b.dropRate - a.dropRate)[0] || {question: 'N/A', dropRate: 0};

  const app = document.getElementById('app');
  const statsArr = questions.map(q=>{const s=JSON.parse(localStorage.getItem('stats_'+q.id)||'{"A":0,"B":0}');const tot=s.A+s.B;const p=tot? s.A/tot:0;return{question:q.question,agreePct:Math.round(p*100),disagreePct:100-Math.round(p*100),entropy:shannonEntropy(p),st:s};});
  const mostAgreed=statsArr.reduce((a,b)=>b.agreePct>a.agreePct?b:a);
  const mostDivided=statsArr.reduce((a,b)=>b.entropy>a.entropy?b:a);
  const balanced=statsArr.filter(o=>o.st.A===o.st.B&&o.st.A+o.st.B>0).map(o=>o.question);
  app.innerHTML = `
    <div class="fade-in p-4">
      <h1 class="text-3xl font-bold mb-4">Analytics 🧮</h1>
      <div class="mb-6"><h3 class="font-semibold">Most Agreed:</h3><p>${mostAgreed.question} (${mostAgreed.agreePct}%)</p></div>
      <div class="mb-6"><h3 class="font-semibold">Most Divided:</h3><p>${mostDivided.question} (${mostDivided.entropy.toFixed(2)} bits)</p></div>
      <div class="mb-6"><h3 class="font-semibold">Perfectly Balanced:</h3><p>${balanced.length?balanced.join('; '):'None'}</p></div>
      <div class="mb-6">
  <h3 class="font-semibold">Biggest Stall Point:</h3>
  <p>${worst.question} — ${worst.dropRate}% drop-off from previous question</p>
</div>
<canvas id="agreeChart" width="400" height="200"></canvas>
      <canvas id="entropyChart" width="400" height="200" class="mt-6"></canvas>
      <div class="mt-6 flex gap-2 justify-center">
        <a href="https://twitter.com/intent/tweet?text=Check%20out%20People%27s%20Truth%20analytics!%20" target="_blank" class="px-3 py-2 bg-blue-400 text-white rounded">Twitter</a>
        <a href="https://api.whatsapp.com/send?text=Check%20out%20People%27s%20Truth%20analytics!%20" target="_blank" class="px-3 py-2 bg-green-500 text-white rounded">WhatsApp</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=" target="_blank" class="px-3 py-2 bg-blue-800 text-white rounded">Facebook</a>
        <button onclick="copyLink()" class="px-3 py-2 bg-gray-300 text-black rounded">Copy Link</button>
      </div>
      <div class="mt-6 p-4 border-2 border-purple-600 bg-purple-50 rounded-lg fade-in">
        <h3 class="text-xl font-semibold mb-3 text-purple-700">💡 Suggest a New Question</h3>
        <textarea id="suggestionInput" class="w-full h-24 border border-purple-400 rounded p-2 mb-3" placeholder="What question would you like to see?"></textarea>
        <button id="suggestBtn" class="px-4 py-2 bg-purple-600 text-white rounded-lg shadow">Submit Suggestion</button>
      </div>
      <button onclick="restart()" class="mt-6 px-4 py-2 bg-blue-500 text-white rounded">Back to Quiz</button>
    </div>
  `;
  const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/chart.js';s.onload=()=>{
    const sortedAgree=statsArr.sort((a,b)=>b.agreePct-a.agreePct).slice(0,5);
    new Chart(document.getElementById('agreeChart').getContext('2d'),{type:'bar',data:{labels:sortedAgree.map(o=>o.question),datasets:[{label:'% Agree',data:sortedAgree.map(o=>o.agreePct)}]},options:{indexAxis:'y',scales:{x:{beginAtZero:true,max:100}}}});
    const sortedDiv=statsArr.sort((a,b)=>b.entropy-a.entropy).slice(0,5);
    new Chart(document.getElementById('entropyChart').getContext('2d'),{type:'bar',data:{labels:sortedDiv.map(o=>o.question),datasets:[{label:'Entropy (bits)',data:sortedDiv.map(o=>o.entropy.toFixed(2))}]} ,options:{indexAxis:'y'}});
  };document.body.appendChild(s);
  document.getElementById('suggestBtn').onclick=()=>{const val=document.getElementById('suggestionInput').value.trim();if(!val)return alert('Please enter a suggestion.');const arr=JSON.parse(localStorage.getItem('suggestions')||'[]');arr.push(val);localStorage.setItem('suggestions',JSON.stringify(arr));alert('Thanks for your suggestion!');document.getElementById('suggestionInput').value='';};
}

function copyLink(){navigator.clipboard.writeText(window.location.href);}
function restart(){localStorage.removeItem('quiz_inc');currentQuestion=0;askForName();}
function resetAllVotes(){localStorage.clear();location.reload();}
document.addEventListener('DOMContentLoaded',askForName);