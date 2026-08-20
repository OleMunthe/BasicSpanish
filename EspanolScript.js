
// Korte lydeffekter uten eksterne lydfiler.
// Web Audio starter først etter brukerinteraksjon, som passer fint for quiz-knappene.
function playQuizSound(type) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!window.quizAudioCtx) window.quizAudioCtx = new AudioCtx();
  const ctx = window.quizAudioCtx;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;

  function tone(freq, start, duration, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  if (type === "correct") {
    tone(660, now, 0.12, 0.10);
    tone(880, now + 0.11, 0.18, 0.11);
  } else if (type === "wrong") {
    tone(220, now, 0.18, 0.09);
    tone(165, now + 0.12, 0.24, 0.08);
  }
}

function showPointPopup() {
  const popup = document.getElementById("pointPopup");
  popup.classList.remove("show");
  void popup.offsetWidth;
  popup.classList.add("show");
}

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")                        // fjerner aksenter
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?¿¡]/g, "")               // fjerner tegnsetting
    .replace(/\s+/g, " ")                   // rydder opp dobbel mellomrom
    .trim();
}

function stripPunctuation(str) {
  return str
    .toLowerCase()
    .replace(/[.,!?¿¡]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}



let mode = null;


let L = [];
let index = 0;
let total = 0;
let riktig = 0;
let feil = 0;
let waitForNext = false;
let awaitingCorrectWrite = false;

const answerInput = document.getElementById("answer");

answerInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    e.preventDefault();

    const responderBtn = document.getElementById("responderBtn");
    const nextBtn = document.getElementById("nextBtn");

    // Hvis Continue er synlig → Enter = Continue
    if (nextBtn.style.display === "block") {
      nextQuestion();
    }

    // Hvis Responder er synlig → Enter = Responder
    else if (responderBtn.style.display === "block") {
      checkAnswer();
    }
  }
});

function shuffle(array) {
  const a = [...array]; // kopierer arrayet, så originalen ikke endres
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


function setMode(m) {
  mode = m;

  document.getElementById("modeSelect").style.display = "none";
  document.getElementById("modeTitle").style.display = "none";
  document.getElementById("levels").style.display = "block";
  document.getElementById("ad-banner").style.display = "none";
}



function updateProgress() {
    const done = startTotal - L.length;
    const percent = (done / startTotal) * 100;
    document.getElementById("progressBar").style.width = percent + "%";
}


let startTotal = 0;

function startGame(n) {
    
startTotal = n;
    riktig = 0;
    feil = 0;

     L = shuffle(allWords).slice(0, n);

    updateStats();

    document.getElementById("progressBar").style.width = "0%";

    /*UTVIDELSE*/
    document.getElementById("ad-banner").style.display = "none";
    document.getElementById("intro").style.display = "none";
    document.getElementById("theory").style.display = "none";

  document.getElementById("levels").style.display = "none";
  document.getElementById("question").style.display = "block";
  document.getElementById("feedback").innerText = "";

  if (mode === "write") {
    answerInput.style.display = "block";
    document.getElementById("responderBtn").style.display = "block";
    
    
  } else {
    document.getElementById("mcOptions").style.display = "block";
  }

  nextQuestion();
}

function nextQuestion() {
    
if (waitForNext) {
    L.splice(index, 1);
    updateProgress();
    answerInput.value = "";
    waitForNext = false;
  }

  document.getElementById("feedback").innerText = "";
  document.getElementById("nextBtn").style.display = "none";

  
if (mode === "write") {
  document.getElementById("responderBtn").style.display = "block";
} else {
  document.getElementById("responderBtn").style.display = "none";
}

  
  awaitingCorrectWrite = false;

 
    if (L.length === 0) {
     const percent = Math.round((riktig / (riktig + feil)) * 100);

     document.getElementById("question").innerText = "🏁 ¡Terminado!";
     document.getElementById("final").innerText =
    `Resultado final: ${percent} %`;

    document.getElementById("progressBar").style.width = "100%";
    return;
    }


  index = Math.floor(Math.random() * L.length);
  

document.getElementById("question").innerHTML = `
  <div class="q-line">¿Qué significa?</div>
  <div class="q-word"><strong>"${L[index][0]}"</strong></div>
`;



  if (mode === "mc") {
    setupMC();
  } else {
    answerInput.value = "";
    answerInput.focus();
  }
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,                       // sletting
        dp[i][j - 1] + 1,                       // innsetting
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // bytte
      );
    }
  }
  return dp[m][n];
}


function setupMC() {
  let correct = L[index][1];
  let options = [correct];

  while (options.length < 4) {
    let r = allWords[Math.floor(Math.random() * allWords.length)][1];
    if (!options.includes(r)) options.push(r);
  }

  options = shuffle(options);
  options.forEach((o,i) => {
    let btn = document.getElementById("opt"+i);
    btn.innerText = o;
    btn.className = "";
    btn.disabled = false;
  });
}

function checkMC(i) {
  let btn = document.getElementById("opt"+i);
  let correct = L[index][1];

  document.querySelectorAll("#mcOptions button").forEach(b => b.disabled = true);

  if (btn.innerText === correct) {
    btn.classList.add("correct");
    riktig++;
    playQuizSound("correct");
    showPointPopup();
    L.splice(index, 1); // fjernes bare ved riktig
    updateProgress();
  } else {
    btn.classList.add("wrong");
    feil++;
    playQuizSound("wrong");
    document.querySelectorAll("#mcOptions button")
      .forEach(b => {
        if (b.innerText === correct) b.classList.add("correct");
      });
  }
    updateStats();

  
document.getElementById("nextBtn").style.display = "block";
document.getElementById("responderBtn").style.display = "none";

}



function checkAnswer() {
  const feedback = document.getElementById("feedback");
  answerInput.classList.remove("correct", "wrong");
  document.getElementById("nextBtn").style.display = "none";
  waitForNext = false;

  const userRaw = answerInput.value.trim();
  const correctRaw = L[index][1];

  const userNorm = normalize(userRaw);
  const correctNorm = normalize(correctRaw);
  const distance = levenshtein(userNorm, correctNorm);

  // ✅ 1. Perfekt riktig → auto videre
if (stripPunctuation(userRaw) === stripPunctuation(correctRaw)) {
  riktig++;
  answerInput.classList.add("correct");

  feedback.innerHTML = `✅ <strong>Correct!</strong>`;
  feedback.style.color = "#2ecc71";
  playQuizSound("correct");

  document.getElementById("responderBtn").style.display = "none";

  // ✅ Vis tydelig +1 point
  showPointPopup();

  updateStats();
  updateProgress();

  setTimeout(() => {
    feedback.innerText = "";
    answerInput.value = "";
    L.splice(index, 1);
    updateProgress();
    nextQuestion();
  }, 1000);

  return;
}


  // ⚠️ 2. Nesten riktig (aksent / case)
  if (userNorm === correctNorm) {
    riktig++;
    document.getElementById("responderBtn").style.display = "none";
    waitForNext = true;
    answerInput.classList.add("correct");
    feedback.innerHTML =
      `⚠️ Almost correct! 🧐 <br><small>You made a mistake with the accent: <strong>${correctRaw}</strong></small>`;
  }

  // ⚠️ 3. Nesten riktig (én stavefeil)
  else if (distance === 1) {
    riktig++;
    document.getElementById("responderBtn").style.display = "none";
    waitForNext = true;
    answerInput.classList.add("correct");
    feedback.innerHTML =
      `⚠️ Almost correct! 🧐<br><small>Minor spelling mistake. Correct answer: <strong>${correctRaw}</strong></small>`;
  }

  // ❌ 4. Feil
  else {
    feil++;
    answerInput.classList.add("wrong");
    playQuizSound("wrong");
    feedback.innerHTML =
      `❌ Incorrect. ✍️Write the correct answer: <strong>${correctRaw}</strong>`;
    feedback.style.color = "red";
    updateStats();
    return;
  }

  // Felles for nesten-riktig
  updateStats();
  updateProgress();
  document.getElementById("nextBtn").style.display = "block";
}


function updateStats() {
    const remaining = startTotal - riktig;
    document.getElementById("stats").innerText =
        `✅Aciertos: ${riktig} | ❌Errores: ${feil} | Restantes: ${remaining}`;
}