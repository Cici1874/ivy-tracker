// ==================== CONFIG ====================
// 部署 Apps Script 后把 URL 填在这里
const API_URL = 'https://script.google.com/macros/s/AKfycbzPY2QFmokHdYRdriEmRwAWDWX7JP3wYFjQEoO1zeiRu0z0rJASNJh9fPEYq-TyEAGx/exec';

// ==================== DATA ====================
let records = {};

const PHIL_QUOTES = [
  "姨姨，太阳都晒到我尾巴尖了你还在制造碳排放。我作为一个4kg的生物都比你节能。",
  "据我观测，姨姨的被窝已形成独立的引力场。建议NASA来研究一下。",
  "姨姨你知道吗，我每天5点就醒了。当然我醒了是为了巡视领地，不是为了等你起来喂我。",
  "你的出门时间和我的午睡时间高度重合。这在统计学上叫什么来着？pathetic。",
  "姨姨，赖床的ROI是负的。你多睡一小时的边际效用约等于零，但我饿了一小时的opportunity cost是无限大。",
  "听说人类需要闹钟才能醒。进化论看来在某些物种身上确实走了弯路。",
  "姨姨你的作息schedule比我妈妈的桌面还乱。而那个桌面已经是混沌理论的实物教具了。",
  "我不是在监督你。我只是在收集数据。至于这些数据恰好能让你社会性死亡，那是数据的问题不是我的。",
  "连续三天中午前出门就有泡面吃？姨姨你的激励阈值也太低了吧。不过考虑到你的baseline，这个KPI设得很合理。",
  "姨姨醒了吗？我问这个不是因为关心你，是因为你的呼噜声影响了我对窗外鸟类的声学监测。",
  "根据我的观察，姨姨出门的速度和室温成反比。Perth冬天你怕是要冬眠了。",
  "妈妈说要记录你的出门时间。放心，我会如实汇报。毕竟data integrity是我的bottom line。",
  "你的赖床行为已经连续触发我的stop-loss机制三次了。再这样下去我要对你的作息做空。",
  "姨姨你每天的出门过程像一个failed IPO——预期很高，表现很差，散户（我）损失惨重。",
  "我计算了一下，你赖床消耗的时间足够我把整个客厅巡逻四遍。这就是efficiency gap。",
  "早上好姨姨。'早上'是一个相对概念，对你来说可能是下午两点。",
  "姨姨，你的被窝不是safe haven。该面对的total return还是要面对的。起来吧。",
  "我注意到你设了七个闹钟但只对最后一个有反应。这种sunk cost你自己不心疼吗。",
  "作为这个家的首席风控官，我必须指出：你的作息波动率已经超出合理区间了。",
  "姨姨你赖床的样子像一只搁浅的鲸鱼。我说这个没有任何贬义。鲸鱼至少还在呼吸。",
];

const MOODS = [
  { emoji: "😊", label: "开心" },
  { emoji: "😐", label: "一般" },
  { emoji: "😴", label: "困" },
  { emoji: "😤", label: "烦" },
  { emoji: "🥲", label: "emo" },
  { emoji: "🔥", label: "有力气" },
];



// ==================== INIT ====================
let selectedMood = '';
let isToday = true;

window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('bannerImg').src = FAMILY_IMG;
  document.getElementById('philAvatar').src = PHIL_IMG;

  // Daily quote
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  document.getElementById('philQuote').textContent = PHIL_QUOTES[seed % PHIL_QUOTES.length];

  // Mood buttons
  const moodRow = document.getElementById('moodRow');
  MOODS.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'mood-btn';
    btn.innerHTML = `<span>${m.emoji}</span><span style="font-size:11px">${m.label}</span>`;
    btn.onclick = () => {
      selectedMood = selectedMood === m.emoji ? '' : m.emoji;
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      if (selectedMood) btn.classList.add('active');
    };
    moodRow.appendChild(btn);
  });

  // Form validation
  document.getElementById('formTime').addEventListener('input', updateSubmitBtn);
  document.getElementById('formDate').addEventListener('input', updateSubmitBtn);

  // Load data
  await loadData();
});

function updateSubmitBtn() {
  const hasTime = document.getElementById('formTime').value;
  const hasDate = document.getElementById('formDate').value;
  const btn = document.getElementById('submitBtn');
  if (hasTime && hasDate) {
    btn.classList.remove('disabled');
    btn.classList.add('enabled');
    btn.disabled = false;
  } else {
    btn.classList.add('disabled');
    btn.classList.remove('enabled');
    btn.disabled = true;
  }
}

// ==================== API ====================

async function apiRequest(params) {
  const url = API_URL + '?' + new URLSearchParams(params).toString();
  const resp = await fetch(url, { redirect: 'follow' });
  return await resp.json();
}

async function loadData() {
  try {
    const data = await apiRequest({ action: 'read' });
    records = {};
    if (data && data.records) {
      data.records.forEach(r => {
        records[r.date] = {
          time: r.time,
          beforeNoon: r.beforeNoon === true || r.beforeNoon === 'TRUE',
          mood: r.mood || '',
          note: r.note || '',
          timestamp: r.timestamp || 0
        };
      });
    }
    localStorage.setItem('ivy-records', JSON.stringify(records));
  } catch (e) {
    console.error('Load failed:', e);
    const local = localStorage.getItem('ivy-records');
    if (local) records = JSON.parse(local);
  }
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  render();
}

async function saveRecord(date, data) {
  records[date] = data;
  localStorage.setItem('ivy-records', JSON.stringify(records));
  render();

  try {
    await apiRequest({
      action: 'add',
      date: date,
      time: data.time || '',
      beforeNoon: data.beforeNoon || false,
      mood: data.mood || '',
      note: data.note || '',
      timestamp: data.timestamp || Date.now()
    });
  } catch (e) {
    console.error('Sync failed:', e);
  }
}

// ==================== REWARDS ====================
function calculateRewards() {
  const sorted = Object.entries(records)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, r]) => ({ date, ...r }));

  let streak = 0, totalThreeStreaks = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].beforeNoon) {
      streak++;
      if (streak % 3 === 0) totalThreeStreaks++;
    } else {
      streak = 0;
    }
  }
  const currentStreak = streak % 3;

  let noodlesRedeemed = 0, luWeiRedeemed = 0;
  sorted.forEach(r => {
    if (r.noodleRedeemed) noodlesRedeemed += r.noodleRedeemed;
    if (r.luWeiRedeemed) luWeiRedeemed += r.luWeiRedeemed;
  });

  const noodlesAvailable = Math.max(0, totalThreeStreaks - noodlesRedeemed - luWeiRedeemed * 2);
  return { currentStreak, totalThreeStreaks, noodlesAvailable, luWeiRedeemed };
}

// ==================== RENDER ====================
function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function render() {
  const rewards = calculateRewards();
  const today = getToday();
  const todayRec = records[today];

  // Streak boxes
  for (let i = 0; i < 3; i++) {
    const el = document.getElementById('s' + i);
    if (i < rewards.currentStreak) {
      el.className = 'streak-box streak-filled';
      el.textContent = '⭐';
    } else {
      el.className = 'streak-box streak-empty';
      el.textContent = '☆';
    }
  }
  document.getElementById('sReward').className = 'streak-box ' + (rewards.currentStreak >= 3 ? 'streak-reward-active' : 'streak-reward');

  // Rewards numbers
  document.getElementById('noodlesAvail').textContent = rewards.noodlesAvailable;
  document.getElementById('totalStreaks').textContent = rewards.totalThreeStreaks;
  document.getElementById('luWeiCount').textContent = rewards.luWeiRedeemed;

  // Redeem button
  const redeemBtn = document.getElementById('redeemBtn');
  if (rewards.noodlesAvailable > 0) {
    redeemBtn.classList.remove('hidden');
  } else {
    redeemBtn.classList.add('hidden');
  }

  // Today section
  if (todayRec) {
    document.getElementById('todayDone').classList.remove('hidden');
    document.getElementById('todayBtn').classList.add('hidden');
    document.getElementById('todayTime').textContent = todayRec.time;
    const badge = document.getElementById('todayBadge');
    badge.textContent = todayRec.beforeNoon ? '中午前出门 ⭐' : '中午后出门';
    badge.className = 'badge ' + (todayRec.beforeNoon ? 'badge-pass' : 'badge-fail');
    const moodInfo = MOODS.find(m => m.emoji === todayRec.mood);
    document.getElementById('todayMood').textContent = moodInfo ? `心情: ${moodInfo.emoji} ${moodInfo.label}` : '';
    document.getElementById('todayNote').textContent = todayRec.note ? `"${todayRec.note}"` : '';
  } else {
    document.getElementById('todayDone').classList.add('hidden');
    document.getElementById('todayBtn').classList.remove('hidden');
  }

  // Recent records (home tab, last 5)
  const sortedDates = Object.keys(records).sort((a, b) => b.localeCompare(a));
  const recentList = document.getElementById('recentList');
  recentList.innerHTML = '<div class="section-header">最近记录</div>';
  sortedDates.slice(0, 5).forEach(date => {
    const r = records[date];
    const moodStr = r.mood || '';
    recentList.innerHTML += `
      <div class="record-row">
        <div><span class="record-date">${formatDate(date)}</span>${moodStr ? ' <span>' + moodStr + '</span>' : ''}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="record-time">${r.time}</span>
          <span class="record-badge" style="color:${r.beforeNoon ? '#4CAF50' : '#FF6B6B'};background:${r.beforeNoon ? '#E8F5E9' : '#FFEBEE'}">${r.beforeNoon ? '✓' : '✗'}</span>
        </div>
      </div>`;
  });

  // History tab
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = `<div class="section-header">全部记录 (${sortedDates.length})</div>`;
  if (sortedDates.length === 0) {
    historyList.innerHTML += '<div style="padding:30px 16px;text-align:center;color:#B0C4D8;font-size:14px">还没有记录哦，快去打卡吧 ☁️</div>';
  } else {
    sortedDates.forEach(date => {
      const r = records[date];
      historyList.innerHTML += `
        <div class="record-row">
          <div>
            <div class="record-date">${formatDate(date)}</div>
            ${r.note ? '<div style="font-size:11px;color:#B0C4D8;margin-top:2px">"' + r.note + '"</div>' : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${r.mood ? '<span style="font-size:16px">' + r.mood + '</span>' : ''}
            <span style="font-size:15px;font-weight:700;color:#3A5A7C">${r.time}</span>
            <span class="record-badge" style="color:${r.beforeNoon ? '#4CAF50' : '#FF6B6B'};background:${r.beforeNoon ? '#E8F5E9' : '#FFEBEE'}">${r.beforeNoon ? '✓' : '✗'}</span>
          </div>
        </div>`;
    });
    // Stats
    const total = sortedDates.length;
    const passCount = sortedDates.filter(d => records[d].beforeNoon).length;
    const rate = Math.round(passCount / total * 100);
    historyList.innerHTML += `
      <div class="stats-bar">
        <div class="stat-item"><div class="stat-num" style="color:#5A9BC7">${total}</div><div class="stat-label">总记录</div></div>
        <div class="stat-item"><div class="stat-num" style="color:#4CAF50">${passCount}</div><div class="stat-label">中午前</div></div>
        <div class="stat-item"><div class="stat-num" style="color:${rate >= 50 ? '#4CAF50' : '#FF6B6B'}">${rate}%</div><div class="stat-label">达标率</div></div>
      </div>`;
  }
}

// ==================== UI ACTIONS ====================
function switchTab(tab) {
  document.getElementById('tabHome').className = 'tab-btn ' + (tab === 'home' ? 'tab-active' : 'tab-inactive');
  document.getElementById('tabHistory').className = 'tab-btn ' + (tab === 'history' ? 'tab-active' : 'tab-inactive');
  document.getElementById('homeTab').classList.toggle('hidden', tab !== 'home');
  document.getElementById('historyTab').classList.toggle('hidden', tab !== 'history');
}

function showForm(today) {
  isToday = today;
  document.getElementById('formDate').value = today ? getToday() : '';
  document.getElementById('formTime').value = '';
  document.getElementById('formNote').value = '';
  selectedMood = '';
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
  updateSubmitBtn();
  document.getElementById('formModal').classList.add('show');
}
function hideForm() { document.getElementById('formModal').classList.remove('show'); }

function showRedeem() {
  const r = calculateRewards();
  document.getElementById('redeemInfo').textContent = '当前可用泡面券: ' + r.noodlesAvailable;
  const nb = document.getElementById('redeemNoodleBtn');
  const lb = document.getElementById('redeemLuWeiBtn');
  nb.className = 'redeem-btn ' + (r.noodlesAvailable >= 1 ? 'enabled' : 'disabled');
  lb.className = 'redeem-btn ' + (r.noodlesAvailable >= 2 ? 'enabled' : 'disabled');
  nb.disabled = r.noodlesAvailable < 1;
  lb.disabled = r.noodlesAvailable < 2;
  document.getElementById('redeemModal').classList.add('show');
}
function hideRedeem() { document.getElementById('redeemModal').classList.remove('show'); }

async function submitRecord() {
  const date = document.getElementById('formDate').value;
  const time = document.getElementById('formTime').value;
  if (!date || !time) return;

  const hour = parseInt(time.split(':')[0]);
  const min = parseInt(time.split(':')[1]);
  const beforeNoon = hour < 12 || (hour === 12 && min === 0);

  const oldRewards = calculateRewards();

  const data = { time, beforeNoon, mood: selectedMood, note: document.getElementById('formNote').value, timestamp: Date.now() };
  await saveRecord(date, data);

  const newRewards = calculateRewards();
  if (newRewards.totalThreeStreaks > oldRewards.totalThreeStreaks) {
    showCelebration('🍜', '三连胜达成！获得满汉全席泡面 x1！');
  }

  hideForm();
}

async function redeem(type) {
  const r = calculateRewards();
  if (type === 'noodle' && r.noodlesAvailable < 1) return;
  if (type === 'luwei' && r.noodlesAvailable < 2) return;

  const today = getToday();
  const rec = records[today] || {};
  if (type === 'noodle') {
    rec.noodleRedeemed = (rec.noodleRedeemed || 0) + 1;
    showCelebration('🍜✨', '满汉全席泡面已兑换！');
  } else {
    rec.luWeiRedeemed = (rec.luWeiRedeemed || 0) + 1;
    showCelebration('🫕✨', '卤味已兑换！好好享受！');
  }
  await saveRecord(today, rec);
  hideRedeem();
}

function showCelebration(emoji, text) {
  document.getElementById('celebEmoji').textContent = emoji;
  document.getElementById('celebText').textContent = text;
  document.getElementById('celebration').classList.add('show');
  setTimeout(() => document.getElementById('celebration').classList.remove('show'), 2500);
}
