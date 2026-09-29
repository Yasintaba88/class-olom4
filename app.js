/* علوم‌یار | منطق کامل و آفلاین برنامه */
(() => {
  "use strict";

  const STORAGE_KEY = "oloom4_smart_class_v3";
  const TEACHER_AUTH_KEY = "oloom4_teacher_session";
  const PDF_FILE = "chaharom-olom-tajrobi-1404.pdf";
  const DEFAULT_LABS = [
    {title:"جداسازی شن و آب",icon:"🧪",text:"با روش صاف کردن یک مخلوط را جدا کن.",materials:["آب","شن","صافی","لیوان"],steps:["شن را داخل آب بریزید","مخلوط را هم بزنید","مخلوط را از صافی عبور دهید"],result:"شن روی صافی می‌ماند و آب عبور می‌کند.",note:"ذرات جامد نامحلول می‌توانند با صاف کردن از مایع جدا شوند.",xp:20},
    {title:"مدار روشن",icon:"💡",text:"مسیر بسته جریان برق را بررسی کن.",materials:["باتری","سیم","لامپ کوچک"],steps:["وسایل را آماده کنید","دو سر سیم را به باتری وصل کنید","سیم‌ها را به دو سر لامپ وصل کنید"],result:"با کامل شدن مسیر، لامپ روشن می‌شود.",note:"در مدار ساده، مسیر جریان باید بسته باشد.",xp:25},
    {title:"کاوشگر آهن‌ربا",icon:"🧲",text:"ببین کدام وسایل جذب آهن‌ربا می‌شوند.",materials:["آهن‌ربا","گیره فلزی","مداد","پاک‌کن"],steps:["وسایل را روی میز بگذارید","آهن‌ربا را به هر وسیله نزدیک کنید","نتیجه هر وسیله را ثبت کنید"],result:"گیره فلزی جذب می‌شود؛ مداد و پاک‌کن معمولی جذب نمی‌شوند.",note:"آهن‌ربا برخی مواد مانند آهن و فولاد را جذب می‌کند.",xp:20}
  ];
  const TEACHER_PASSWORD = "19121912";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const defaultStudent = (id, index) => ({
    id, name: "", avatar: avatars[index % avatars.length], xp: 0, level: 1,
    lessons: [], correct: 0, wrong: 0, quizzes: 0, labs: 0, medals: []
  });

  const freshState = () => ({
    students: Array.from({ length: 29 }, (_, i) => defaultStudent(i + 1, i)),
    active: null, page: "home", quiz: null, customQuestions: []
  });

  let state = loadState();
  let toastTimer = null;
  let toastTimers = [];
  let modalCloseHandler = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      return normalizeState(JSON.parse(raw));
    } catch (_) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      return freshState();
    }
  }

  function normalizeState(raw) {
    const base = freshState();
    if (!raw || typeof raw !== "object") return base;

    if (Array.isArray(raw.students)) {
      base.students = raw.students.slice(0, 29).map((s, i) => {
        const d = defaultStudent(i + 1, i);
        const n = s && typeof s === "object" ? s : {};
        return {
          ...d,
          ...n,
          id: i + 1,
          name: typeof n.name === "string" ? n.name.trim() : "",
          avatar: typeof n.avatar === "string" && n.avatar ? n.avatar : d.avatar,
          xp: finiteNonNegative(n.xp),
          level: Math.max(1, Math.floor(finiteNonNegative(n.level) || 1)),
          lessons: Array.isArray(n.lessons) ? n.lessons.filter(Number.isInteger) : [],
          correct: finiteNonNegative(n.correct),
          wrong: finiteNonNegative(n.wrong),
          quizzes: finiteNonNegative(n.quizzes),
          labs: finiteNonNegative(n.labs),
          medals: Array.isArray(n.medals) ? n.medals.filter(x => typeof x === "string") : []
        };
      });
      while (base.students.length < 29) {
        base.students.push(defaultStudent(base.students.length + 1, base.students.length));
      }
    }
    base.active = Number.isInteger(raw.active) && raw.active >= 1 && raw.active <= 29 &&
      base.students[raw.active - 1]?.name ? raw.active : null;
    base.page = typeof raw.page === "string" ? raw.page : "home";
    base.quiz = null;
    base.customQuestions = normalizeQuestions(raw.customQuestions);
    return base;
  }

  function finiteNonNegative(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function normalizeQuestions(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeQuestion).filter(Boolean);
  }

  function normalizeQuestion(item) {
    let q = item;
    if (Array.isArray(item)) {
      q = { q: item[0], options: item[1], answer: item[2] };
    }
    if (!q || typeof q !== "object") return null;
    const text = typeof q.q === "string" ? q.q.trim() : "";
    const options = Array.isArray(q.options) ? q.options.map(x => String(x ?? "").trim()) : [];
    const answer = Number(q.answer);
    if (!text || options.length !== 4 || options.some(x => !x) ||
        !Number.isInteger(answer) || answer < 0 || answer > 3) return null;
    return { q: text, options, answer };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      toast("ذخیره‌سازی آفلاین در دسترس نیست.", "error");
    }
    updateMini();
  }

  function activeStudent() {
    if (!Number.isInteger(state.active)) return null;
    const s = state.students[state.active - 1];
    return s && s.name ? s : null;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[ch]));
  }

  function toast(message, type = "success") {
    const box = $("#toast");
    if (!box) return;
    const labels = { success:"✓", error:"!", warning:"⚠", info:"i" };
    box.innerHTML = `<span class="toast-icon">${labels[type] || "✓"}</span><span>${escapeHTML(message)}</span>`;
    box.className = `show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.className = ""; }, 2800);
  }

  function updateMini() {
    const mini = $("#mini");
    if (!mini) return;
    const s = activeStudent();
    mini.innerHTML = s
      ? `<b>${escapeHTML(s.avatar)} ${escapeHTML(s.name)}</b><br><small>سطح ${s.level} · ${s.xp} XP</small>`
      : `<b>👤 مهمان</b><br><small>دانش‌آموز فعال انتخاب نشده</small>`;
  }

  function addXP(amount, medal) {
    const s = activeStudent();
    if (!s) { toast("ابتدا یک دانش‌آموز را انتخاب کن.", "warning"); return false; }
    s.xp += amount;
    s.level = Math.floor(s.xp / 150) + 1;
    if (medal && !s.medals.includes(medal)) s.medals.push(medal);
    save();
    toast(`${amount} امتیاز به دست آمد ⭐`);
    return true;
  }

  const pageInfo = {
    home:["داشبورد کلاس","یادگیری، تجربه و کشف"],
    students:["دانش‌آموزان","ثبت‌نام، انتخاب و مدیریت دانش‌آموزان"],
    lessons:["نقشه درس‌ها","۱۳ درس علوم چهارم"],
    book:["کتاب علوم","مطالعه PDF کاملاً آفلاین"],
    quiz:["مرکز آزمون","آزمون دقیقاً ۱۰ سؤالی"],
    labs:["آزمایشگاه","یادگیری با تجربه"],
    anatomy:["آناتومی بدن","اطلس تعاملی اندام‌ها و دستگاه‌های بدن"],
    profile:["پروفایل دانش‌آموز","گزارش پیشرفت دانش‌آموز فعال"],
    awards:["افتخارات","نمایش پیشرفت‌های ثبت‌شده"],
    teacher:["پنل معلم","مدیریت بانک سؤال و گزارش کلاس"],
    backup:["پشتیبان","خروجی و بازیابی اطلاعات کلاس"]
  };

  function go(page) {
    if (!pageInfo[page]) page = "home";
    if (page === "teacher" && !isTeacherAuthenticated()) {
      state.page = "teacher";
      render();
      openTeacherLogin();
      return;
    }
    state.page = page;
    state.quiz = page === "quiz" ? state.quiz : null;
    render();
    if (window.innerWidth <= 700) $("#sidebar")?.classList.remove("open");
  }

  function render() {
    const info = pageInfo[state.page] || pageInfo.home;
    $("#title").textContent = info[0];
    $("#sub").textContent = info[1];
    $("#date").textContent = new Date().toLocaleDateString("fa-IR");
    updateMini();
    $$("nav button[data-page]").forEach(btn => btn.classList.toggle("active", btn.dataset.page === state.page));
    const page = {
      home: pageHome, students: pageStudents, lessons: pageLessons, book: pageBook,
      quiz: pageQuiz, labs: pageLabs, anatomy: pageAnatomy, profile: pageProfile, awards: pageAwards,
      teacher: pageTeacher, backup: pageBackup
    }[state.page] || pageHome;
    $("#view").innerHTML = page();
    bindEvents();
  }

  function pageHome() {
    const s = activeStudent();
    const registered = state.students.filter(x => x.name).length;
    const lessonCount = s?.lessons.length || 0;
    const daily = dailyChallenge();
    const levelProgress = s ? Math.min(100, Math.round((s.xp % 150) / 1.5)) : 0;
    return `
      <div class="hero hero-science">
        <div class="hero-copy">
          <span class="eyebrow">🚀 باشگاه دانشمندهای کوچک</span>
          <h2>${s ? `سلام ${escapeHTML(s.name)}!` : "سلام دانشمند کوچک!"} 👋</h2>
          <p>اینجا فقط درس نمی‌خوانیم؛ کشف می‌کنیم، آزمایش می‌کنیم و مرحله‌به‌مرحله دانشمندتر می‌شویم.</p>
          <div class="actions"><button class="btn" data-go="lessons">شروع یک مأموریت 🚀</button>
          <button class="btn light" data-go="labs">رفتن به آزمایشگاه 🧪</button></div>
        </div>
        <div class="science-orbit" aria-hidden="true"><span>🪐</span><b>🔬</b><i>⭐</i><em>🧪</em></div>
      </div>
      <div class="mission-strip">
        <div><span class="mission-kicker">🎯 مأموریت امروز</span><h2>${escapeHTML(daily.title)}</h2><p>${escapeHTML(daily.text)}</p></div>
        <button class="btn" data-go="${daily.page}">${daily.action}</button>
      </div>
      <div class="stats">
        ${statCard("👩‍🎓", `${registered}/29`, "دانش‌آموز فعال کلاس")}
        ${statCard("⭐", s?.xp || 0, "XP دانش‌آموز فعال")}
        ${statCard("📚", `${lessonCount}/13`, "درس‌های کشف‌شده")}
        ${statCard("🏅", s?.medals.length || 0, "نشان‌های علمی")}
      </div>
      ${s ? `<div class="level-card card"><div class="level-avatar">${escapeHTML(s.avatar)}</div><div class="level-main"><div class="level-row"><b>سطح ${s.level} · ${escapeHTML(s.name)}</b><span>${s.xp} XP</span></div><div class="level-bar"><i style="width:${levelProgress}%"></i></div><small>${150 - (s.xp % 150)} XP تا سطح بعدی</small></div><div class="level-badge">${levelTitle(s.level)}</div></div>` : `<div class="card welcome-note"><b>👤 هنوز دانش‌آموز فعالی انتخاب نشده.</b><span>یک دانش‌آموز انتخاب کن تا XP، مأموریت‌ها و افتخارات شخصی فعال شوند.</span><button class="btn" data-go="students">انتخاب دانش‌آموز</button></div>`}
      <div class="head"><div><h2>🗺️ مسیر ماجراجویی علوم</h2><p class="muted">هر ایستگاه یک تجربه کوتاه و جذاب دارد.</p></div></div>
      <div class="adventure-grid">
        ${quickCard("📚","کشف درس‌ها","هر درس یک داستان، چالش و بازی کوچک دارد.","lessons","کشف کن")}
        ${quickCard("🧪","آزمایشگاه جادویی","وسایل را آماده کن، مراحل را انجام بده و نتیجه را ببین.","labs","آزمایش کن")}
        ${quickCard("🧠","چالش ۱۰ سؤالی","دانشت را در یک مأموریت سریع امتحان کن.","quiz","شروع چالش")}
        ${quickCard("🧍","آناتومی بدن","اندام‌ها و دستگاه‌های اصلی بدن را تعاملی یاد بگیر.","anatomy","ورود به اطلس")}
      </div>
      <div class="fun-banner"><span>🕵️</span><div><b>پرونده علمی امروز</b><p>اگر بتوانی جواب یک سؤال علمی را برای دوستت توضیح بدهی، یک قدم به «دانشمند حرفه‌ای» نزدیک‌تر می‌شوی!</p></div><button class="btn light" data-go="awards">دیدن نشان‌ها 🏆</button></div>`;
  }

  function dailyChallenge() {
    const day = new Date().getDate();
    const challenges = [
      {title:"کارآگاه آهن‌ربا", text:"حدس بزن کدام وسیله جذب آهن‌ربا می‌شود و بعد آن را در آزمایشگاه بررسی کن.", page:"labs", action:"رفتن به آزمایشگاه"},
      {title:"شکارچی انرژی", text:"سه وسیله اطرافت را پیدا کن و بگو انرژی لازم برای کارشان از کجا می‌آید.", page:"lessons", action:"کشف درس"},
      {title:"راز مخلوط‌ها", text:"قبل از آزمایش حدس بزن چگونه می‌شود شن و آب را از هم جدا کرد.", page:"labs", action:"حل مأموریت"},
      {title:"ستاره‌شناس کوچک", text:"یک شکل از ماه در آسمان پیدا کن و حدس بزن فردا شکلش چه تغییری می‌کند.", page:"lessons", action:"کشف درس"}
    ];
    return challenges[day % challenges.length];
  }

  function levelTitle(level) {
    if (level >= 8) return "🏆 استاد علوم";
    if (level >= 5) return "🥇 دانشمند حرفه‌ای";
    if (level >= 3) return "🥈 کاشف علوم";
    return "🥉 دانشمند تازه‌کار";
  }

  function statCard(icon, value, label) {
    return `<div class="stat"><i>${icon}</i><div><b>${escapeHTML(value)}</b><small>${label}</small></div></div>`;
  }
  function quickCard(icon,title,text,page,label) {
    return `<div class="card"><div class="quick-icon">${icon}</div><h3>${title}</h3><p class="muted">${text}</p><button class="btn" data-go="${page}">${label}</button></div>`;
  }

  function pageStudents() {
    return `<div class="head"><div><h2>۲۹ جایگاه کلاس</h2><p class="muted">یک جایگاه را برای ثبت‌نام یا انتخاب دانش‌آموز فعال کنید.</p></div>
      <button class="btn" id="registerFirst">ثبت‌نام سریع</button></div>
      <div class="students">${state.students.map(s => `
        <div class="card student ${state.active === s.id ? "active" : ""}">
          <span class="badge">#${s.id}</span><div class="avatar">${escapeHTML(s.avatar)}</div>
          <h3>${s.name ? escapeHTML(s.name) : "جایگاه خالی"}</h3>
          <small>${s.name ? `سطح ${s.level} · ${s.xp} XP` : "برای ثبت‌نام کلیک کن"}</small>
          <div class="actions center">${s.name
            ? `<button class="btn light selectStudent" data-id="${s.id}">${state.active === s.id ? "✓ فعال" : "انتخاب"}</button>
               <button class="btn danger changeStudent" data-id="${s.id}">تغییر</button>`
            : `<button class="btn registerSlot" data-id="${s.id}">ثبت‌نام</button>`}</div>
        </div>`).join("")}</div>`;
  }

  function pageLessons() {
    const s = activeStudent();
    return `<div class="grid">${lessons.map((l,i) => {
      const lesson = normalizeLesson(l);
      const done = !!s?.lessons.includes(i + 1);
      return `<div class="card lesson"><div class="icon">${escapeHTML(lesson.icon)}</div>
        <span class="muted">درس ${i+1} · صفحه ${lesson.page}</span><h3>${escapeHTML(lesson.title)}</h3>
        <p>${escapeHTML(lesson.text)}</p><div class="bar"><i style="width:${done ? 100 : 0}%"></i></div>
        <div class="actions"><button class="btn lessonOpen" data-id="${i}">جزئیات</button>
        <button class="btn light pdf" data-page="${lesson.page}">مشاهده کتاب</button></div></div>`;
    }).join("")}</div>`;
  }

  function normalizeLesson(l) {
    if (Array.isArray(l)) return { title:String(l[0]||"درس"), icon:String(l[1]||"📘"), page:Number(l[2])||1, text:String(l[3]||"") };
    return {
      title:String(l?.title||"درس"), icon:String(l?.icon||"📘"), page:Number(l?.page)||1,
      text:String(l?.text||""), description:String(l?.description||l?.about||l?.text||""),
      about:String(l?.about||l?.description||l?.text||""), challenge:String(l?.challenge||"یک نمونه از این موضوع را در اطراف خود پیدا کن و برای دوستت توضیح بده."),
      gameQuestion:String(l?.gameQuestion||"کدام گزینه درباره این درس درست است؟"),
      gameOptions:Array.isArray(l?.gameOptions) ? l.gameOptions.map(String).slice(0,4) : [],
      gameAnswer:Number.isInteger(Number(l?.gameAnswer)) ? Number(l.gameAnswer) : 0,
      gameHint:String(l?.gameHint||"دوباره متن درس را با دقت بخوان.")
    };
  }

  function pageBook() {
    return `<div class="card book-card"><div class="book-icon">📖</div><h2>کتاب علوم چهارم</h2>
      <p class="muted">این PDF باید در کنار index.html و با نام دقیق زیر قرار داشته باشد:</p>
      <code>${PDF_FILE}</code>
      <div class="actions"><button class="btn" id="openPdf">باز کردن PDF در تب جدید</button>
      <button class="btn light pdf" data-page="1">نمایش از صفحه ۱</button></div>
      <div class="pdf-frame-wrap"><iframe src="${PDF_FILE}#page=1" title="کتاب علوم چهارم"></iframe></div>
      <p class="hint">در صورت پشتیبانی نکردن مرورگر از نمایش PDF، از دکمه باز کردن در تب جدید استفاده کن.</p></div>`;
  }

  function getQuestionBank() {
    return [...questions, ...state.customQuestions].map(normalizeQuestion).filter(Boolean);
  }

  function pageQuiz() {
    if (state.quiz) {
      const q = state.quiz.questions[state.quiz.index];
      const progress = Math.round(((state.quiz.index + 1) / 10) * 100);
      return `<div class="card quiz">
        <div class="quiz-top"><span>سؤال ${state.quiz.index + 1} از ۱۰</span><b>${progress}%</b></div>
        <div class="progress"><i style="width:${progress}%"></i></div>
        <h2>${escapeHTML(q.q)}</h2>
        <div class="answers">${q.options.map((a,i) => `<button class="answer ${state.quiz.selected === i ? "selected" : ""}" data-answer="${i}">${escapeHTML(a)}</button>`).join("")}</div>
        <div class="actions"><button class="btn" id="nextQuestion">${state.quiz.index === 9 ? "ثبت و پایان آزمون" : "سؤال بعدی"}</button></div>
      </div>`;
    }
    return `<div class="card quiz intro"><div class="quick-icon">🧠</div><h2>آزمون هوشمند ۱۰ سؤالی</h2>
      <p>۱۰ سؤال به‌صورت تصادفی از بانک سؤال انتخاب می‌شود. سؤال‌های افزوده‌شده توسط معلم نیز در بانک قرار می‌گیرند.</p>
      <ul class="check-list"><li>چهار گزینه برای هر سؤال</li><li>فقط یک گزینه قابل انتخاب است</li><li>امتیاز نهایی از ۱۰ محاسبه می‌شود</li></ul>
      <button class="btn" id="startQuiz">شروع آزمون 🚀</button></div>`;
  }

  function pageLabs() {
    const source = Array.isArray(labs) && labs.length ? labs : DEFAULT_LABS;
    return `<div class="labs-page">
      <div class="labs-hero"><div><span class="eyebrow dark-eyebrow">🧪 آزمایشگاه علوم‌یار</span><h2>آزمایش کن، مشاهده کن، نتیجه بگیر</h2>
      <p>هر آزمایش با هدف، وسایل، پیش‌بینی، مراحل، نتیجه، نکات ایمنی و یک سؤال علمی همراه است.</p></div><div class="labs-hero-art">🔬🧪</div></div>
      <div class="lab-quality-strip"><div>🎯 <b>هدف</b><small>قبل از شروع بدان چه چیزی را بررسی می‌کنی.</small></div><div>🔎 <b>مشاهده</b><small>نتیجه را با دقت ثبت کن.</small></div><div>⚠️ <b>ایمنی</b><small>فقط آزمایش‌های آموزشی امن.</small></div><div>🧠 <b>نتیجه‌گیری</b><small>دلیل علمی مشاهده را توضیح بده.</small></div></div>
      <div class="grid labs-grid">${source.map((raw,i) => { const l=normalizeLab(raw); return `<div class="card lab-card upgraded-lab">
        <div class="lab-card-top"><div class="icon">${escapeHTML(l.icon)}</div><span class="lab-tag">${escapeHTML(l.typeLabel)}</span></div>
        <h2>${escapeHTML(l.title)}</h2><p class="muted">${escapeHTML(l.text)}</p>
        <div class="lab-meta"><span>🧰 ${l.materials.length} وسیله</span><span>📋 ${l.steps.length} مرحله</span><span>⭐ ${l.xp} XP</span></div>
        <div class="actions"><button class="btn labOpen" data-id="${i}">شروع آزمایش</button></div></div>`; }).join("")}</div>
    </div>`;
  }

  function normalizeLab(raw) {
    if (Array.isArray(raw)) return {title:String(raw[0]||"آزمایش"),icon:String(raw[1]||"🧪"),text:String(raw[2]||""),xp:finiteNonNegative(raw[3]||20),typeLabel:"آزمایش پایه",type:"general",materials:["وسایل موردنیاز آزمایش"],steps:["وسایل را آماده کنید","آزمایش را طبق توضیحات انجام دهید","نتیجه را مشاهده و ثبت کنید"],result:"نتیجه آزمایش را با مشاهده خود ثبت کنید.",note:"در آزمایش علمی، مشاهده و ثبت نتیجه مهم است.",safety:"دستورهای ایمنی معلم را رعایت کنید.",question:"چه چیزی مشاهده کردی؟",options:["گزینه ۱","گزینه ۲","گزینه ۳","گزینه ۴"],answer:0};
    const labels={filter:"جداسازی مواد",circuit:"برق",magnet:"مغناطیس",evaporation:"تغییر حالت",germination:"گیاهان",air:"هوا",conductor:"الکتریسیته",shadow:"نور",temperature:"دما"};
    const type=String(raw?.type||"general");
    return {title:String(raw?.title||"آزمایش"),icon:String(raw?.icon||"🧪"),text:String(raw?.text||""),xp:finiteNonNegative(raw?.xp||20),type,typeLabel:labels[type]||"آزمایش علمی",
      materials:Array.isArray(raw?.materials)?raw.materials.map(String):["وسایل موردنیاز آزمایش"],steps:Array.isArray(raw?.steps)?raw.steps.map(String):["وسایل را آماده کنید","مراحل آزمایش را انجام دهید","نتیجه را ثبت کنید"],
      result:String(raw?.result||"نتیجه را مشاهده و ثبت کنید."),note:String(raw?.note||"با مشاهده دقیق می‌توان نتیجه علمی گرفت."),safety:String(raw?.safety||"دستورهای ایمنی معلم را رعایت کنید."),
      question:String(raw?.question||"نتیجه درست این آزمایش چیست؟"),options:Array.isArray(raw?.options)&&raw.options.length===4?raw.options.map(String):["گزینه ۱","گزینه ۲","گزینه ۳","گزینه ۴"],answer:Number.isInteger(Number(raw?.answer))?Number(raw.answer):0};
  }

  function pageAnatomy() {
    const systems = Array.isArray(anatomySystems) ? anatomySystems : [];
    const organs = Array.isArray(anatomyOrgans) ? anatomyOrgans : [];
    return `<div class="anatomy-page">
      <div class="anatomy-hero">
        <div><span class="eyebrow dark-eyebrow">🧍 اطلس تعاملی علوم‌یار</span>
          <h2>آناتومی بدن انسان</h2>
          <p>بخش‌های اصلی بدن را انتخاب کن، وظیفه آن‌ها را بخوان و ارتباط دستگاه‌های بدن را بهتر یاد بگیر.</p>
          <div class="anatomy-search"><span>🔎</span><input id="anatomySearch" placeholder="جستجوی عضو؛ مثل قلب، ریه، معده..." autocomplete="off"></div>
        </div><div class="anatomy-hero-art" aria-hidden="true">🧠<span>❤️</span>🫁</div>
      </div>
      <div class="anatomy-layout">
        <div class="card body-map-card">
          <div class="head"><div><h2>🧍 نقشه ساده بدن</h2><p class="muted">روی هر بخش بزن تا اعضای مهم آن ناحیه را ببینی.</p></div></div>
          <div class="body-map"><div class="body-silhouette">
            <div class="body-head">◉</div><div class="body-neck"></div><div class="body-torso"></div>
            <div class="body-arm left"></div><div class="body-arm right"></div><div class="body-leg left"></div><div class="body-leg right"></div>
            <button class="body-hotspot head" data-area="head" title="سر و اندام‌های حسی">🧠</button>
            <button class="body-hotspot chest" data-area="chest" title="قفسه سینه">❤️</button>
            <button class="body-hotspot lungs" data-area="chest" title="ریه‌ها">🫁</button>
            <button class="body-hotspot abdomen" data-area="abdomen" title="شکم">🥣</button>
            <button class="body-hotspot limbs" data-area="limbs" title="استخوان و ماهیچه">🦴</button>
          </div></div>
          <div id="areaResults" class="area-results"><span>یک ناحیه را انتخاب کن.</span></div>
        </div>
        <div class="card anatomy-guide">
          <div class="head"><div><h2>🧩 دستگاه‌های بدن</h2><p class="muted">هر دستگاه از بخش‌هایی تشکیل شده که با هم همکاری می‌کنند.</p></div></div>
          <div class="system-list">${systems.map(s => `<button class="system-card" data-system="${escapeHTML(s.id)}"><span class="system-icon">${escapeHTML(s.icon)}</span><span><b>${escapeHTML(s.title)}</b><small>${escapeHTML(s.summary)}</small></span><strong>›</strong></button>`).join("")}</div>
        </div>
      </div>
      <div class="head anatomy-section-head"><div><h2>🔬 اندام‌های مهم</h2><p class="muted">هر کارت را باز کن تا وظیفه، نکته علمی و ارتباط آن را ببینی.</p></div></div>
      <div class="organ-grid" id="organGrid">${organs.map(o => `<button class="card organ-card" data-organ="${escapeHTML(o.id)}"><span class="organ-icon">${escapeHTML(o.icon)}</span><span class="organ-system">${escapeHTML(o.system)}</span><h3>${escapeHTML(o.name)}</h3><p>${escapeHTML(o.short)}</p><span class="organ-more">مشاهده اطلاعات ←</span></button>`).join("")}</div>
      <div class="card anatomy-fact"><span>💡</span><div><b>نکته مهم:</b><p>بدن یک مجموعه هماهنگ است؛ دستگاه‌های مختلف برای حفظ زندگی با یکدیگر همکاری دارند.</p></div></div>
    </div>`;
  }

  function showAnatomyOrgan(id) {
    const o = (Array.isArray(anatomyOrgans) ? anatomyOrgans : []).find(x => x.id === id);
    if (!o) return;
    openModal(`<div class="modal-title-row"><h2 id="modal-title">${escapeHTML(o.icon)} ${escapeHTML(o.name)}</h2><button class="close-modal" data-close>×</button></div>
      <div class="organ-detail-hero"><div class="organ-detail-icon">${escapeHTML(o.icon)}</div><div><span class="pill">${escapeHTML(o.system)}</span><h3>${escapeHTML(o.short)}</h3></div></div>
      <div class="info-box"><b>📖 وظیفه و توضیح:</b><br>${escapeHTML(o.detail)}</div><div class="science-note"><b>💡 نکته علمی:</b> ${escapeHTML(o.fact)}</div>
      <div class="actions"><button class="btn light" data-close>بستن</button></div>`);
  }

  function showAnatomySystem(id) {
    const s = (Array.isArray(anatomySystems) ? anatomySystems : []).find(x => x.id === id);
    if (!s) return;
    openModal(`<div class="modal-title-row"><h2 id="modal-title">${escapeHTML(s.icon)} ${escapeHTML(s.title)}</h2><button class="close-modal" data-close>×</button></div>
      <p class="lab-intro">${escapeHTML(s.summary)}</p><div class="system-organ-detail">${s.organs.map(name => `<div class="system-organ"><b>${escapeHTML(name)}</b><span>${escapeHTML(s.details?.[name] || "در این دستگاه نقش مهمی دارد.")}</span></div>`).join("")}</div>
      <div class="actions"><button class="btn light" data-close>بستن</button></div>`);
  }

  function filterAnatomy(term) {
    const q = String(term || "").trim().toLowerCase();
    $$(".organ-card").forEach(card => { card.style.display = !q || card.textContent.toLowerCase().includes(q) ? "" : "none"; });
  }

  function pageProfile() {
    const s = activeStudent();
    if (!s) return `<div class="card empty"><div class="empty-icon">👤</div><h2>دانش‌آموز فعالی انتخاب نشده</h2>
      <p>برای مشاهده پروفایل ابتدا یک دانش‌آموز ثبت‌نام یا انتخاب کن.</p><button class="btn" data-go="students">انتخاب دانش‌آموز</button></div>`;
    const best = Number.isInteger(s.bestScore) ? s.bestScore : (s.quizzes ? Math.round((s.correct / (s.correct + s.wrong || 1)) * 10) : 0);
    const last = Number.isInteger(s.lastScore) ? s.lastScore : (s.quizzes ? best : 0);
    return `<div class="profile-grid"><div class="card profile-head"><div class="avatar big">${escapeHTML(s.avatar)}</div>
      <h2>${escapeHTML(s.name)}</h2><p>کلاس چهارم دبستان</p><button class="btn" data-go="students">تغییر دانش‌آموز</button></div>
      <div class="grid profile-stats">${statCard("🏆",best+"/10","بهترین امتیاز")}${statCard("📝",last+"/10","آخرین امتیاز")}
      ${statCard("🧠",s.quizzes,"تعداد آزمون‌ها")}${statCard("⭐",s.xp,"امتیاز XP")}</div></div>`;
  }

  function pageAwards() {
    const s = activeStudent();
    const awardDefs = [
      ["🥉","دانشمند تازه‌کار","رسیدن به سطح 2",!!s && s.level >= 2],
      ["🔬","کاشف آزمایشگاه","انجام 1 آزمایش",!!s && s.labs >= 1],
      ["📚","دوست کتاب","تکمیل 3 درس",!!s && s.lessons.length >= 3],
      ["🧠","ذهن آماده","انجام 3 آزمون",!!s && s.quizzes >= 3],
      ["⭐","ستاره کلاس","کسب 300 XP",!!s && s.xp >= 300],
      ["🏆","استاد علوم","رسیدن به سطح 8",!!s && s.level >= 8],
      ["🧪","دانشمند تجربی","انجام 5 آزمایش",!!s && s.labs >= 5],
      ["🌟","قهرمان یادگیری","تکمیل 13 درس",!!s && s.lessons.length >= 13]
    ];
    const list = state.students.filter(x => x.name).sort((a,b) => b.xp - a.xp);
    return `<div class="card"><div class="head"><div><h2>🏆 ویترین افتخارات</h2><p class="muted">نشان‌ها با تلاش خودت باز می‌شوند؛ هر مرحله یک جشن کوچک است.</p></div><button class="btn light" data-go="profile">پروفایل من</button></div>
      <div class="award-wall">${awardDefs.map(a => `<div class="award-tile ${a[3] ? "" : "locked-award"}"><span class="medal">${a[0]}</span><b>${a[1]}</b><small>${a[3] ? "✓ باز شده" : a[2]}</small></div>`).join("")}</div></div>
      <div class="card" style="margin-top:17px"><h2>🌟 پیشرفت کلاس</h2>${list.length ? `<div class="table-wrap"><table>
      <thead><tr><th>دانش‌آموز</th><th>سطح</th><th>XP</th><th>آزمون</th><th>آزمایش</th></tr></thead><tbody>
      ${list.map(st => `<tr><td>${escapeHTML(st.avatar)} ${escapeHTML(st.name)}</td><td>${st.level}</td><td>${st.xp}</td><td>${st.quizzes}</td><td>${st.labs}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty">هنوز دانش‌آموزی ثبت نشده است.</div>`}</div>`;
  }

  function pageTeacher() {
    if (!isTeacherAuthenticated()) return `<div class="card locked"><div class="empty-icon">🔒</div><h2>پنل معلم قفل است</h2>
      <p>برای مشاهده محتوا باید رمز عبور وارد شود.</p><button class="btn" id="teacherLogin">ورود با رمز</button></div>`;
    const bank = getQuestionBank();
    const custom = state.customQuestions;
    return `<div class="teacher-grid">
      <div class="card"><div class="head"><div><h2>👨‍🏫 مدیریت سؤال</h2><p class="muted">بانک سؤال: ${bank.length} سؤال</p></div><button class="btn danger" id="logoutTeacher">خروج از پنل</button></div>
        <form id="questionForm" novalidate><label>متن سؤال<input id="qText" required maxlength="300" placeholder="متن سؤال را وارد کنید"></label>
        <div class="option-grid">${[0,1,2,3].map(i => `<label>گزینه ${i+1}<input class="qOption" data-index="${i}" required maxlength="180" placeholder="گزینه ${i+1}"></label>`).join("")}</div>
        <label>گزینه صحیح<select id="qAnswer"><option value="0">گزینه ۱</option><option value="1">گزینه ۲</option><option value="2">گزینه ۳</option><option value="3">گزینه ۴</option></select></label>
        <button class="btn" type="submit">➕ ذخیره سؤال</button></form></div>
      <div class="card"><h2>سؤال‌های اضافه‌شده</h2>${custom.length ? custom.map((q,i) => `<div class="custom-q"><b>${i+1}. ${escapeHTML(q.q)}</b>
        <small>پاسخ صحیح: گزینه ${q.answer+1}</small><button class="btn danger deleteQuestion" data-index="${i}">حذف</button></div>`).join("") :
        `<div class="empty">هنوز سؤال سفارشی ثبت نشده است.</div>`}
        ${custom.length ? `<button class="btn danger" id="clearQuestions">پاک کردن همه سؤال‌های سفارشی</button>` : ""}</div>
      <div class="card teacher-tools"><h2>🎓 ابزارهای سریع معلم</h2><p class="muted">برای اداره کلاس بدون نیاز به اینترنت.</p><div class="teacher-tool-grid">
        <button class="btn" id="pickStudent">🎲 انتخاب تصادفی دانش‌آموز</button>
        <button class="btn light" id="teacherRandomQuestion">💡 سؤال تصادفی کلاس</button>
        <button class="btn light" id="classTimer">⏱️ تایمر ۶۰ ثانیه‌ای</button>
      </div></div>
      <div class="card teacher-report"><h2>گزارش کلاس</h2><div class="table-wrap"><table><thead><tr><th>نام</th><th>XP</th><th>درس</th><th>آزمون</th></tr></thead><tbody>
      ${state.students.filter(s=>s.name).map(s => `<tr><td>${escapeHTML(s.name)}</td><td>${s.xp}</td><td>${s.lessons.length}/13</td><td>${s.quizzes}</td></tr>`).join("") || `<tr><td colspan="4">هنوز دانش‌آموزی ثبت نشده است.</td></tr>`}</tbody></table></div></div>
    </div>`;
  }

  function pageBackup() {
    return `<div class="grid"><div class="card"><h2>💾 خروجی پشتیبان</h2><p class="muted">اطلاعات دانش‌آموزان، امتیازها و سؤال‌های سفارشی را ذخیره کن.</p>
      <button class="btn" id="exportBackup">دانلود پشتیبان JSON</button></div><div class="card"><h2>♻️ بازیابی</h2>
      <input type="file" id="importBackup" accept=".json,application/json"><p class="muted">یک فایل پشتیبان معتبر علوم‌یار انتخاب کن.</p></div></div>`;
  }

  function bindEvents() {
    $$("[data-go]").forEach(el => el.addEventListener("click", () => go(el.dataset.go)));
    $$("nav button[data-page]").forEach(el => el.addEventListener("click", () => go(el.dataset.page)));
    const menu = $("#menu");
    if (menu) menu.onclick = () => $("#sidebar")?.classList.toggle("open");
    const reg = $("#registerFirst");
    if (reg) reg.onclick = () => registerStudent(state.students.find(s => !s.name)?.id);
    $$(".registerSlot").forEach(b => b.onclick = () => registerStudent(Number(b.dataset.id)));
    $$(".changeStudent").forEach(b => b.onclick = () => changeStudent(Number(b.dataset.id)));
    $$(".selectStudent").forEach(b => b.onclick = () => selectStudent(Number(b.dataset.id)));
    $$(".lessonOpen").forEach(b => b.onclick = () => showLesson(Number(b.dataset.id)));
    $$(".pdf").forEach(b => b.onclick = () => openPDF(Number(b.dataset.page)));
    const openPdf = $("#openPdf");
    if (openPdf) openPdf.onclick = () => openPDF(1);
    const start = $("#startQuiz");
    if (start) start.onclick = startQuiz;
    $$(".answer").forEach(b => b.onclick = () => selectAnswer(Number(b.dataset.answer)));
    const next = $("#nextQuestion");
    if (next) next.onclick = nextQuestion;
    $$(".labOpen").forEach(b => b.onclick = () => showLab(Number(b.dataset.id)));
    $$(".organ-card").forEach(b => b.onclick = () => showAnatomyOrgan(b.dataset.organ));
    $$(".system-card").forEach(b => b.onclick = () => showAnatomySystem(b.dataset.system));
    $$(".body-hotspot").forEach(b => b.onclick = () => {
      const area=b.dataset.area, names={head:"سر و اندام‌های حسی",chest:"قفسه سینه",abdomen:"شکم",limbs:"استخوان و ماهیچه"};
      const items=(Array.isArray(anatomyOrgans)?anatomyOrgans:[]).filter(o=>o.area===area), target=$("#areaResults");
      if(target) target.innerHTML=`<b>${names[area]||"ناحیه بدن"}</b><div>${items.map(o=>`<button class="mini-organ" data-organ="${escapeHTML(o.id)}">${escapeHTML(o.icon)} ${escapeHTML(o.name)}</button>`).join("")}</div>`;
      $$(".mini-organ",target).forEach(x=>x.onclick=()=>showAnatomyOrgan(x.dataset.organ));
    });
    const anatomySearch=$("#anatomySearch");
    if(anatomySearch) anatomySearch.addEventListener("input",e=>filterAnatomy(e.target.value));
    const teacherLogin = $("#teacherLogin");
    if (teacherLogin) teacherLogin.onclick = openTeacherLogin;
    const logout = $("#logoutTeacher");
    if (logout) logout.onclick = logoutTeacher;
    const form = $("#questionForm");
    if (form) form.onsubmit = addCustomQuestion;
    $("#pickStudent")?.addEventListener("click", teacherPickStudent);
    $("#teacherRandomQuestion")?.addEventListener("click", teacherRandomQuestion);
    $("#classTimer")?.addEventListener("click", classTimer);
    $$(".deleteQuestion").forEach(b => b.onclick = () => deleteCustomQuestion(Number(b.dataset.index)));
    const clear = $("#clearQuestions");
    if (clear) clear.onclick = clearCustomQuestions;
    const exportBtn = $("#exportBackup");
    if (exportBtn) exportBtn.onclick = exportBackup;
    const importBtn = $("#importBackup");
    if (importBtn) importBtn.onchange = importBackup;
    const reset = $("#reset");
    if (reset) reset.onclick = resetClass;
  }

  function registerStudent(id) {
    if (!id) { toast("ظرفیت ۲۹ نفر تکمیل است.", "warning"); return; }
    const name = window.prompt("نام و نام خانوادگی دانش‌آموز:");
    if (name === null) return;
    const clean = name.trim();
    if (!clean) { toast("نام نمی‌تواند خالی باشد.", "error"); return; }
    const s = state.students[id - 1];
    if (!s) return;
    s.name = clean;
    state.active = id;
    save(); render(); toast("ثبت‌نام دانش‌آموز موفق بود.");
  }

  function changeStudent(id) {
    const s = state.students[id - 1];
    if (!s) return;
    const name = window.prompt("نام جدید دانش‌آموز:", s.name);
    if (name === null) return;
    const clean = name.trim();
    if (!clean) { toast("نام نمی‌تواند خالی باشد.", "error"); return; }
    s.name = clean; state.active = id; save(); render(); toast("اطلاعات دانش‌آموز تغییر کرد.");
  }

  function selectStudent(id) {
    if (!state.students[id - 1]?.name) return;
    state.active = id; save(); render(); toast("دانش‌آموز فعال انتخاب شد.");
  }

  function showLesson(index) {
    const l = normalizeLesson(lessons[index]);
    if (!l) return toast("اطلاعات این درس پیدا نشد.", "error");
    const done = activeStudent()?.lessons.includes(index + 1);
    const gameOptions = Array.isArray(l.gameOptions) && l.gameOptions.length === 4
      ? l.gameOptions : ["مشاهده و پرسش", "حدس بدون بررسی", "حفظ کردن", "نادیده گرفتن"];
    const gameAnswer = Number.isInteger(l.gameAnswer) ? l.gameAnswer : 0;

    openModal(`<div class="modal-title-row">
        <h2 id="modal-title">${escapeHTML(l.icon)} درس ${index+1}: ${escapeHTML(l.title)}</h2>
        <button class="close-modal" data-close aria-label="بستن">×</button>
      </div>
      <div class="lesson-detail-hero">
        <div class="lesson-detail-icon">${escapeHTML(l.icon)}</div>
        <div><span class="pill">صفحه ${l.page}</span><h3>امروز چه چیزی یاد می‌گیری؟</h3>
        <p>${escapeHTML(l.about || l.text)}</p></div>
      </div>
      <div class="info-box"><b>📚 درباره درس:</b><br>${escapeHTML(l.description || l.text)}</div>
      <div class="game-box">
        <div class="game-head"><span>🎮 بازی علمی</span><small>یک گزینه را انتخاب کن</small></div>
        <h3>${escapeHTML(l.gameQuestion || "کدام گزینه درست است؟")}</h3>
        <div class="game-options">
          ${gameOptions.map((opt,i)=>`<button class="game-option" data-game-answer="${i}">${escapeHTML(opt)}</button>`).join("")}
        </div>
        <p id="gameFeedback" class="game-feedback" aria-live="polite"></p>
      </div>
      <div class="info-box">🔎 <b>چالش کوچک:</b> ${escapeHTML(l.challenge || "یک نمونه از این موضوع را در اطراف خود پیدا کن و برای دوستت توضیح بده.")}</div>
      <div class="actions">
        <button class="btn" id="completeLesson" ${done ? "disabled" : ""}>${done ? "✓ درس تکمیل شده" : "تکمیل درس و دریافت ۴۰ XP"}</button>
        <button class="btn light" data-close>بستن</button>
      </div>`);

    $$(".game-option", $("#modalbox")).forEach(btn => {
      btn.addEventListener("click", () => {
        const chosen = Number(btn.dataset.gameAnswer);
        const feedback = $("#gameFeedback");
        $$(".game-option", $("#modalbox")).forEach(b => b.classList.remove("correct","wrong"));
        if (chosen === gameAnswer) {
          btn.classList.add("correct");
          if (feedback) feedback.innerHTML = "🎉 آفرین! پاسخ درست است.";
          toast("پاسخ بازی درست بود! ⭐");
        } else {
          btn.classList.add("wrong");
          if (feedback) feedback.innerHTML = `💡 هنوز نه! ${escapeHTML(l.gameHint || "یک بار دیگر متن درس را بخوان.")}`;
          toast("یک بار دیگر فکر کن!", "warning");
        }
      });
    });

    $("#completeLesson")?.addEventListener("click", () => {
      const st = activeStudent();
      if (!st) return toast("ابتدا یک دانش‌آموز را انتخاب کن.", "warning");
      if (!st.lessons.includes(index + 1)) {
        st.lessons.push(index + 1);
        if (addXP(40, "یادگیرنده")) { closeModal(); render(); }
      }
    });
  }

  function openPDF(page = 1) {
    const p = Math.max(1, Number(page) || 1);
    const url = `${PDF_FILE}#page=${p}`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) toast("مرورگر پنجره جدید را مسدود کرده است؛ از بخش کتاب استفاده کن.", "warning");
  }

  function showLab(index) {
    const source=Array.isArray(labs)?labs:[], l=normalizeLab(source[index]);
    if (!l) return toast("این آزمایش پیدا نشد.","error");
    const safeSteps=l.steps.length?l.steps:["وسایل را آماده کنید","آزمایش را انجام دهید","نتیجه را مشاهده کنید"];
    openModal(`<div class="modal-title-row"><h2 id="modal-title">${escapeHTML(l.icon)} ${escapeHTML(l.title)}</h2><button class="close-modal" data-close>×</button></div>
      <div class="lab-detail-top"><span class="pill">${escapeHTML(l.typeLabel)}</span><span class="xp-pill">⭐ ${l.xp} XP</span></div><p class="lab-intro">${escapeHTML(l.text)}</p>
      <div class="lab-two-col"><div class="lab-section"><h3>🎯 هدف آزمایش</h3><div class="info-box">${escapeHTML(l.text)}</div></div><div class="lab-section"><h3>🧰 وسایل موردنیاز</h3><div class="material-list">${l.materials.map(x=>`<span>${escapeHTML(x)}</span>`).join("")}</div></div></div>
      <div class="lab-section prediction-box"><h3>🔮 پیش‌بینی تو</h3><p class="muted">قبل از انجام مراحل حدس بزن چه اتفاقی می‌افتد.</p><textarea id="labPrediction" rows="2" maxlength="500" placeholder="مثلاً: فکر می‌کنم..."></textarea></div>
      <div class="lab-simulator" id="labSimulator"><div class="sim-stage"><div class="sim-emoji">${escapeHTML(l.icon)}</div><div><b>شبیه‌ساز آزمایش</b><small id="simStatus">برای مشاهده روند، اجرای شبیه‌سازی را بزن.</small></div></div><button class="btn" id="runLabSimulation">▶️ اجرای شبیه‌سازی</button></div>
      <div class="lab-section"><div class="lab-progress-head"><h3>🧪 مراحل اجرای آزمایش</h3><span id="labProgress">۰ از ${safeSteps.length} مرحله</span></div><div class="progress lab-progress"><i id="labProgressBar" style="width:0%"></i></div>
      <ol class="lab-steps">${safeSteps.map((step,i)=>`<li><label class="step-item"><input type="checkbox" class="lab-step" data-step="${i}"><span>${escapeHTML(step)}</span></label></li>`).join("")}</ol></div>
      <div class="lab-observation"><h3>📝 ثبت مشاهده</h3><textarea id="labObservation" rows="3" maxlength="700" placeholder="چه چیزی دیدی؟ تغییر را با کلمات خودت بنویس..."></textarea></div>
      <div class="info-box"><b>🔬 نتیجه مورد انتظار:</b><br>${escapeHTML(l.result)}</div><div class="science-note"><b>💡 دلیل علمی:</b> ${escapeHTML(l.note)}</div><div class="safety-box"><b>⚠️ نکات ایمنی:</b><br>${escapeHTML(l.safety)}</div>
      <div class="lab-checkpoint"><div class="game-head"><span>🧠 ایستگاه فهم آزمایش</span><small>پاسخ بده تا آزمایش کامل شود</small></div><h3>${escapeHTML(l.question)}</h3>
      <div class="game-options">${l.options.map((o,i)=>`<button class="game-option lab-answer" data-lab-answer="${i}">${escapeHTML(o)}</button>`).join("")}</div><p id="labQuizFeedback" class="game-feedback"></p></div>
      <div id="labMessage" class="lab-message">ابتدا مراحل را انجام بده و در پایان پاسخ سؤال را انتخاب کن.</div>
      <div class="actions"><button class="btn" id="finishLab" disabled>✓ ثبت آزمایش و دریافت ${l.xp} XP</button><button class="btn light" data-close>بستن</button></div>`);

    const checks=$$(".lab-step",$("#modalbox")),progressText=$("#labProgress"),progressBar=$("#labProgressBar"),finish=$("#finishLab"),message=$("#labMessage"),simButton=$("#runLabSimulation"),simStatus=$("#simStatus");
    let quizCorrect=false;
    simButton?.addEventListener("click",()=>{const stage=$("#labSimulator");stage?.classList.add("running");if(simStatus)simStatus.textContent="در حال شبیه‌سازی... به تغییرات دقت کن.";simButton.disabled=true;setTimeout(()=>{if(simStatus)simStatus.textContent=`نتیجه شبیه‌سازی: ${l.result}`;stage?.classList.add("complete");simButton.disabled=false;simButton.textContent="🔁 اجرای دوباره";},900);});
    const update=()=>{const done=checks.filter(x=>x.checked).length,p=Math.round(done/checks.length*100);if(progressText)progressText.textContent=`${done} از ${checks.length} مرحله`;if(progressBar)progressBar.style.width=`${p}%`;if(finish)finish.disabled=!(done===checks.length&&quizCorrect);if(message)message.textContent=done===checks.length&&quizCorrect?"🎉 عالی! مراحل و سؤال علمی کامل شده‌اند. حالا آزمایش را ثبت کن.":"مراحل را یکی‌یکی انجام بده و در پایان به سؤال پاسخ بده.";};
    checks.forEach(c=>c.addEventListener("change",update));
    $$(".lab-answer",$("#modalbox")).forEach(btn=>btn.addEventListener("click",()=>{const chosen=Number(btn.dataset.labAnswer);$$(".lab-answer",$("#modalbox")).forEach(b=>b.classList.remove("correct","wrong"));const f=$("#labQuizFeedback");if(chosen===l.answer){btn.classList.add("correct");quizCorrect=true;if(f)f.textContent="🎉 درست است! مفهوم اصلی آزمایش را فهمیدی.";}else{btn.classList.add("wrong");quizCorrect=false;if(f)f.textContent="💡 هنوز نه؛ نتیجه و دلیل علمی آزمایش را دوباره بخوان.";}update();}));
    finish?.addEventListener("click",()=>{const st=activeStudent();if(!st)return toast("ابتدا یک دانش‌آموز را انتخاب کن.","warning");st.labs+=1;if(addXP(l.xp,"دانشمند آزمایشگاه")){closeModal();render();}});
  }

  function getQuizQuestions() {
    const bank = getQuestionBank();
    const shuffled = bank.slice().sort(() => Math.random() - 0.5);
    if (shuffled.length < 10) {
      toast("بانک سؤال کمتر از ۱۰ سؤال معتبر دارد.", "error");
      return null;
    }
    return shuffled.slice(0, 10);
  }

  function startQuiz() {
    if (!activeStudent()) return toast("ابتدا یک دانش‌آموز را انتخاب کن.", "warning");
    const selected = getQuizQuestions();
    if (!selected) return;
    state.quiz = { questions:selected, index:0, selected:null, score:0 };
    render();
  }

  function selectAnswer(answer) {
    if (!state.quiz || !Number.isInteger(answer) || answer < 0 || answer > 3) return;
    state.quiz.selected = answer;
    render();
  }

  function nextQuestion() {
    if (!state.quiz) return;
    if (state.quiz.selected === null) return toast("یک گزینه را انتخاب کن.", "warning");
    const q = state.quiz.questions[state.quiz.index];
    if (state.quiz.selected === q.answer) state.quiz.score += 1;
    if (state.quiz.index < 9) {
      state.quiz.index += 1; state.quiz.selected = null; render(); return;
    }
    finishQuiz();
  }

  function finishQuiz() {
    const s = activeStudent();
    if (!s) { state.quiz = null; render(); return; }
    const score = state.quiz.score;
    s.quizzes += 1; s.correct += score; s.wrong += 10 - score; s.lastScore = score;
    if (!s.bestScore || score > s.bestScore) s.bestScore = score;
    const gained = score * 10;
    state.quiz = null;
    addXP(gained, score === 10 ? "دانشمند برتر" : "آزمون‌گر");
    save();
    openModal(`<div class="modal-title-row"><h2 id="modal-title">نتیجه آزمون 🎉</h2><button class="close-modal" data-close aria-label="بستن">×</button></div>
      <div class="result-score">${score}<small>از ۱۰</small></div>
      <p class="center-text">${score === 10 ? "آفرین! هر ۱۰ پاسخ درست بود. 🌟" : "با مرور درس‌ها می‌توانی امتیاز بیشتری بگیری. 💪"}</p>
      <div class="actions center"><button class="btn" id="restartQuiz">آزمون دوباره</button><button class="btn light" data-close>بستن</button></div>`);
    $("#restartQuiz")?.addEventListener("click", () => { closeModal(); startQuiz(); });
  }

  function isTeacherAuthenticated() {
    try { return sessionStorage.getItem(TEACHER_AUTH_KEY) === "1"; } catch (_) { return false; }
  }

  function openTeacherLogin() {
    openModal(`<div class="modal-title-row"><h2 id="modal-title">🔐 ورود به پنل معلم</h2><button class="close-modal" data-close aria-label="بستن">×</button></div>
      <p class="muted">برای ورود رمز عبور پنل معلم را وارد کنید.</p>
      <form id="teacherForm"><label>رمز عبور<input id="teacherPassword" type="password" inputmode="numeric" autocomplete="off" maxlength="32" placeholder="رمز عبور" required></label>
      <div class="actions"><button class="btn" type="submit">ورود</button><button class="btn light" type="button" data-close>انصراف</button></div></form>`);
    $("#teacherForm")?.addEventListener("submit", e => {
      e.preventDefault();
      const password = $("#teacherPassword")?.value ?? "";
      if (password === TEACHER_PASSWORD) {
        try { sessionStorage.setItem(TEACHER_AUTH_KEY, "1"); } catch (_) {}
        closeModal(); state.page = "teacher"; render(); toast("ورود به پنل معلم موفق بود.");
      } else {
        toast("رمز عبور اشتباه است.", "error");
        const input = $("#teacherPassword");
        if (input) { input.value = ""; input.focus(); }
      }
    });
    setTimeout(() => $("#teacherPassword")?.focus(), 50);
  }

  function logoutTeacher() {
    try { sessionStorage.removeItem(TEACHER_AUTH_KEY); } catch (_) {}
    state.page = "home"; render(); toast("از پنل معلم خارج شد.");
  }

  function addCustomQuestion(e) {
    e.preventDefault();
    if (!isTeacherAuthenticated()) return openTeacherLogin();
    const q = $("#qText")?.value.trim();
    const options = $$(".qOption").map(x => x.value.trim());
    const answer = Number($("#qAnswer")?.value);
    const normalized = normalizeQuestion({q, options, answer});
    if (!normalized) return toast("متن سؤال و هر چهار گزینه را کامل وارد کن.", "error");
    state.customQuestions.push(normalized); save(); render(); toast("سؤال با موفقیت اضافه شد.");
  }

  function deleteCustomQuestion(index) {
    if (!isTeacherAuthenticated()) return openTeacherLogin();
    if (!state.customQuestions[index]) return;
    state.customQuestions.splice(index, 1); save(); render(); toast("سؤال حذف شد.");
  }

  function clearCustomQuestions() {
    if (!isTeacherAuthenticated()) return openTeacherLogin();
    if (!state.customQuestions.length) return;
    if (!window.confirm("همه سؤال‌های سفارشی حذف شوند؟")) return;
    state.customQuestions = []; save(); render(); toast("همه سؤال‌های سفارشی پاک شدند.");
  }

  function teacherPickStudent() {
    const list = state.students.filter(s => s.name);
    if (!list.length) return toast("هنوز دانش‌آموزی ثبت نشده است.", "warning");
    const chosen = list[Math.floor(Math.random() * list.length)];
    openModal(`<div class="modal-title-row"><h2 id="modal-title">🎲 انتخاب دانش‌آموز</h2><button class="close-modal" data-close>×</button></div>
      <div class="random-student"><div class="avatar big">${escapeHTML(chosen.avatar)}</div><h2>${escapeHTML(chosen.name)}</h2><p>دانشمند کوچک امروز آماده است! ⭐</p><button class="btn" id="activatePicked">فعال کردن این دانش‌آموز</button></div>`);
    $("#activatePicked")?.addEventListener("click", () => { state.active = chosen.id; save(); closeModal(); render(); toast(`${chosen.name} دانش‌آموز فعال شد.`); });
  }

  function teacherRandomQuestion() {
    const bank = getQuestionBank();
    if (!bank.length) return toast("بانک سؤال خالی است.", "warning");
    const q = bank[Math.floor(Math.random() * bank.length)];
    openModal(`<div class="modal-title-row"><h2 id="modal-title">💡 پرسش سریع کلاس</h2><button class="close-modal" data-close>×</button></div>
      <div class="class-question"><span>سؤال علمی</span><h2>${escapeHTML(q.q)}</h2><div class="class-options">${q.options.map((o,i)=>`<button class="game-option" data-teacher-answer="${i}">${escapeHTML(o)}</button>`).join("")}</div><p id="teacherAnswer" class="game-feedback"></p></div>`);
    $$("[data-teacher-answer]", $("#modalbox")).forEach(btn => btn.addEventListener("click", () => {
      const chosen = Number(btn.dataset.teacherAnswer);
      if (chosen === q.answer) { btn.classList.add("correct"); $("#teacherAnswer").textContent = "🎉 درست است!"; }
      else { btn.classList.add("wrong"); $("#teacherAnswer").textContent = `💡 پاسخ درست: گزینه ${q.answer + 1}`; }
    }));
  }

  function classTimer() {
    let left = 60;
    openModal(`<div class="modal-title-row"><h2 id="modal-title">⏱️ تایمر کلاس</h2><button class="close-modal" data-close>×</button></div><div class="timer-big" id="classTimerValue">01:00</div><p class="center-text">یک دقیقه برای فکر کردن، آزمایش یا پاسخ دادن.</p><div class="actions center"><button class="btn" id="timerRestart">شروع</button></div>`);
    let interval = null;
    const value = $("#classTimerValue");
    const renderTime = () => { if (value) value.textContent = `00:${String(left).padStart(2,"0")}`; };
    $("#timerRestart")?.addEventListener("click", () => {
      if (interval) clearInterval(interval);
      left = 60; renderTime();
      interval = setInterval(() => { left -= 1; renderTime(); if (left <= 0) { clearInterval(interval); interval = null; toast("⏰ زمان تمام شد!"); if (value) value.textContent = "تمام شد! 🎉"; } }, 1000);
    });
  }

  function exportBackup() {
    const payload = { app:"علوم‌یار", version:3, exportedAt:new Date().toISOString(), data:state };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="oloom4-backup.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast("پشتیبان با موفقیت آماده شد.");
  }

  function importBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const source = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
        state = normalizeState(source);
        save(); render(); toast("بازیابی اطلاعات موفق بود.");
      } catch (_) { toast("فایل پشتیبان نامعتبر است.", "error"); }
      e.target.value = "";
    };
    reader.onerror = () => { toast("خواندن فایل ممکن نشد.", "error"); e.target.value = ""; };
    reader.readAsText(file);
  }

  function resetClass() {
    if (!window.confirm("تمام دانش‌آموزان، امتیازها، آزمون‌ها، سؤال‌های سفارشی و اطلاعات ذخیره‌شده پاک شود؟")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TEACHER_AUTH_KEY);
    } catch (_) {}
    state = freshState();
    location.reload();
  }

  function openModal(html) {
    const modal = $("#modal");
    const box = $("#modalbox");
    if (!modal || !box) return;
    box.innerHTML = html;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    $$("[data-close]", box).forEach(el => el.addEventListener("click", closeModal));
    if (modalCloseHandler) document.removeEventListener("keydown", modalCloseHandler);
    modalCloseHandler = e => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", modalCloseHandler);
    setTimeout(() => $("input, button:not([data-close])", box)?.focus(), 30);
  }

  function closeModal() {
    const modal = $("#modal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    if (modalCloseHandler) {
      document.removeEventListener("keydown", modalCloseHandler);
      modalCloseHandler = null;
    }
  }

  function init() {
    const modal = $("#modal");
    if (modal) modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
    const reset = $("#reset");
    if (reset) reset.onclick = resetClass;
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();