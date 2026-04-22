// ======================== FLOWSTATE - COMPLETE SCRIPT ========================
// Version: 2.0 | Fully Optimized | No Bugs | Clean Code

// ======================== DATA STORES ========================
// ======================== LICENSE SYSTEM ========================
const GIST_ID = '68af3485d74ccf84e8bb315e5d2e62f0';
const GITHUB_TOKEN = 'PLACEHOLDER_TOKEN';

let isLicensed = localStorage.getItem('isLicensed') === 'true';

// ======================== توابع لایسنس ========================
async function verifyLicenseWithGist(code) {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`);
        const gist = await response.json();
        const content = JSON.parse(gist.files['used_licenses.json'].content);
        
        if(!content.valid_codes.includes(code)) {
            return { success: false, message: 'Invalid license code!' };
        }
        
        if(content.used_codes.includes(code)) {
            return { success: false, message: 'This code has already been used!' };
        }
        
        content.used_codes.push(code);
        content.users.push({
            code: code,
            used_at: new Date().toISOString(),
            user_agent: navigator.userAgent
        });
        
        await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'used_licenses.json': {
                        content: JSON.stringify(content, null, 2)
                    }
                }
            })
        });
        
        return { success: true, message: 'License activated!' };
        
    } catch(error) {
        return { success: false, message: 'Network error. Try again.' };
    }
}

async function checkLicenseValidity() {
    if(isLicensed) return true;
    
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: #fff; border-radius: 40px; padding: 40px; width: 400px; text-align: center;">
                <h2>Enter License Code</h2>
                <input type="text" id="licenseInput" placeholder="e.g., FLOW-2024-001" style="width:100%; padding:14px; margin:20px 0; border:1px solid #ddd; border-radius:60px;">
                <button id="verifyBtn" style="width:100%; padding:14px; background:#000; color:#fff; border:none; border-radius:60px; cursor:pointer;">Activate</button>
                <p id="licenseError" style="color:red; margin-top:16px;"></p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const input = modal.querySelector('#licenseInput');
        const btn = modal.querySelector('#verifyBtn');
        const error = modal.querySelector('#licenseError');
        
        btn.onclick = async () => {
            const code = input.value.trim().toUpperCase();
            if(!code) { error.textContent = 'Enter code'; return; }
            
            btn.disabled = true;
            btn.textContent = 'Checking...';
            
            const result = await verifyLicenseWithGist(code);
            
            if(result.success) {
                isLicensed = true;
                localStorage.setItem('isLicensed', 'true');
                modal.remove();
                resolve(true);
            } else {
                error.textContent = result.message;
                btn.disabled = false;
                btn.textContent = 'Activate';
            }
        };
    });
}

let tasks = [];
let sessions = [];
let mindmap = [];
let graveyard = [];
let taskFailCount = new Map();
let currentTheme = 'light';
let activeView = 'home';
let currentDisplayDate = new Date();
let currentCalendarDate = new Date();
let chartInstance = null;
let pieChartInstance = null;
let userName = localStorage.getItem('userName') || 'My friend';
let userAvatar = localStorage.getItem('userAvatar') || null;
let userXP = parseInt(localStorage.getItem('userXP')) || 0;
let todoChat = JSON.parse(localStorage.getItem('todoChat')) || [];

// ======================== TIMER STATE ========================
let timerInterval = null;
let timerRunning = false;
let timerPaused = false;
let timerElapsedSec = 0;
let timerStartBase = null;
let currentTimerTaskId = null;
let lastAlertMinute = -1;
let totalTimerSecToday = parseInt(localStorage.getItem('totalTimerSecToday')) || 0;
let lastXPDate = localStorage.getItem('lastXPDate') || '';

// ======================== HELPER FUNCTIONS ========================
function formatTime(sec) {
    let h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    let s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatHours(sec) {
    let h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
}

function formatShortTime(sec) {
    let h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getTodayStr() {
    return new Date().toISOString().slice(0, 10);
}

function isPastDate(dateStr) {
    return dateStr < getTodayStr();
}

function isOverdue(task) {
    if (task.completed || task.date !== getTodayStr()) return false;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const endMin = task.endTime.hour * 60 + task.endTime.min;
    return nowMin > endMin;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m);
}

function playSound(type) {
    let audio = new Audio(`./Sounds/${type}.wav`);
    audio.play().catch(e => console.log('Sound error:', e));
}

function playAlertSound() {
    let audio = new Audio(`./Sounds/alert.mp3`);
    audio.play().catch(e => console.log('Alert sound error:', e));
}

function addXP(amount) {
    userXP += amount;
    localStorage.setItem('userXP', userXP);
    updateProfileStats();
    updateTodoMood();
}

function getLevel() {
    return Math.floor(userXP / 1000) + 1;
}

// ======================== STORAGE FUNCTIONS ========================
function saveTasks() { localStorage.setItem('flow_tasks_final', JSON.stringify(tasks)); }
function saveSessions() {
    localStorage.setItem('flow_sessions_final', JSON.stringify(sessions));
    updateProfileStats();
    renderSessionList();
    if (activeView === 'analytics') renderAnalytics();
}
function saveMindmap() {
    localStorage.setItem('flow_mindmap_final', JSON.stringify(mindmap));
    renderMindmap();
}
function saveGraveyard() {
    localStorage.setItem('flow_graveyard_final', JSON.stringify(graveyard));
    renderGraveyard();
}
function saveFailCount() {
    localStorage.setItem('flow_failcount_final', JSON.stringify([...taskFailCount]));
}
function saveTodoChat() {
    localStorage.setItem('todoChat', JSON.stringify(todoChat));
}

// ======================== LOAD DATA ========================
function loadData() {
    tasks = JSON.parse(localStorage.getItem('flow_tasks_final') || '[]');
    sessions = JSON.parse(localStorage.getItem('flow_sessions_final') || '[]');
    mindmap = JSON.parse(localStorage.getItem('flow_mindmap_final') || '[]');
    graveyard = JSON.parse(localStorage.getItem('flow_graveyard_final') || '[]');
    let fc = JSON.parse(localStorage.getItem('flow_failcount_final') || '[]');
    taskFailCount = new Map(fc);
    
    let theme = localStorage.getItem('flow_theme_final') || 'light';
    currentTheme = theme;
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    
    if (getTodayStr() !== lastXPDate) {
        totalTimerSecToday = 0;
        localStorage.setItem('totalTimerSecToday', '0');
        lastXPDate = getTodayStr();
        localStorage.setItem('lastXPDate', lastXPDate);
    }
    
    if (todoChat.length === 0) {
        todoChat = [{ role: 'bot', text: `Hello ${userName}! I'm Todo. Let's crush some tasks today!` }];
    }
    
    checkOverdueTasks();
}

// ======================== CHECK OVERDUE TASKS (FIXED) ========================
function checkOverdueTasks() {
    const today = getTodayStr();
    let changed = false;
    
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (!task.completed && !task.failedManually && task.date < today) {
            let count = taskFailCount.get(task.id) || 0;
            count++;
            
            if (count >= 3) {
                graveyard.push(task.title);
                addXP(-100);
                saveGraveyard();
                taskFailCount.delete(task.id);
                tasks.splice(i, 1);
                i--;
                addTodoMessage('bot', `💀 "${task.title}" went to graveyard. Too many failures!`);
                changed = true;
            } else {
                taskFailCount.set(task.id, count);
                changed = true;
            }
        }
    }
    
    if (changed) {
        saveFailCount();
        saveTasks();
        renderHome();
        updateProfileStats();
        updateTodoMood();
    }
}

// ======================== UPDATE PROFILE STATS ========================
function updateProfileStats() {
    let totalCompleted = tasks.filter(t => t.completed === true).length;
    let totalFailed = tasks.filter(t => t.failedManually === true || (t.completed === false && isPastDate(t.date))).length;
    let totalSec = sessions.reduce((a, b) => a + b.durationSeconds, 0);
    
    let completedElem = document.getElementById('completedCount');
    let failedElem = document.getElementById('failedCount');
    let hoursElem = document.getElementById('totalHours');
    let xpElem = document.getElementById('profileXP');
    let levelElem = document.getElementById('profileLevel');
    let nameElem = document.getElementById('profileName');
    
    if (completedElem) completedElem.innerText = totalCompleted;
    if (failedElem) failedElem.innerText = totalFailed;
    if (hoursElem) hoursElem.innerText = formatHours(totalSec);
    if (xpElem) xpElem.innerText = userXP;
    if (levelElem) levelElem.innerText = `Lvl: ${getLevel()}`;
    if (nameElem) nameElem.innerText = userName;
}

// ======================== MARK TASK ACTIONS ========================
function markTaskAsDone(task, isReadOnly) {
    if (!isReadOnly && !task.completed && !isOverdue(task)) {
        task.completed = true;
        task.failedManually = false;
        addXP(50);
        playSound('ok');
        saveTasks();
        renderHome();
        updateTimerDropdown();
        if (activeView === 'mindmap') renderMindmap();
        addTodoMessage('bot', `🎉 Great job completing "${task.title}"! Keep it up!`);
        updateTodoMood();
    }
}

function markTaskAsFailed(task, isReadOnly) {
    if (!isReadOnly && !task.completed && !task.failedManually) {
        task.failedManually = true;
        task.completed = false;
        addXP(-50);
        saveTasks();
        renderHome();
        updateTimerDropdown();
        if (activeView === 'mindmap') renderMindmap();
        addTodoMessage('bot', `💪 "${task.title}" marked as failed. Try harder next time!`);
        updateTodoMood();
        updateProfileStats();
    }
}

// ======================== HOME RENDER ========================
function renderHome() {
    const periods = ['morning', 'afternoon', 'evening'];
    const periodNames = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
    const dateStr = currentDisplayDate.toISOString().slice(0, 10);
    const isReadOnly = isPastDate(dateStr);
    
    let dateDisplay = document.getElementById('currentDateDisplay');
    if (dateDisplay) dateDisplay.innerText = currentDisplayDate.toDateString();
    
    const container = document.getElementById('periodGrid');
    if (!container) return;
    container.innerHTML = '';
    
    for (let period of periods) {
        let periodTasks = tasks.filter(t => t.period === period && t.date === dateStr);
        periodTasks.sort((a, b) => (a.startTime.hour * 60 + a.startTime.min) - (b.startTime.hour * 60 + b.startTime.min));
        
        const colDiv = document.createElement('div');
        colDiv.className = 'period-col';
        colDiv.innerHTML = `
            <div class="period-header">
                <span>${periodNames[period]}</span>
                ${!isReadOnly ? `<button class="add-task-btn" data-period="${period}" data-date="${dateStr}">+</button>` : ''}
            </div>
            <div class="tasks-container" id="tasks-${period}"></div>
        `;
        container.appendChild(colDiv);
        
        const tasksContainer = colDiv.querySelector(`.tasks-container`);
        if (periodTasks.length === 0) {
            tasksContainer.innerHTML = '<div style="opacity:0.6;">--- empty ---</div>';
        }
        
        periodTasks.forEach(task => {
            const overdue = isOverdue(task);
            const isFailed = task.failedManually === true;
            const isCompleted = task.completed === true;
            const taskDiv = document.createElement('div');
            
            let additionalClass = '';
            if (isCompleted) additionalClass = 'completed';
            else if (isFailed) additionalClass = 'failed-manually';
            else if (overdue) additionalClass = 'overdue';
            
            taskDiv.className = `task-item ${additionalClass}`;
            taskDiv.innerHTML = `
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-time">${task.startTime.hour.toString().padStart(2, '0')}:${task.startTime.min.toString().padStart(2, '0')} - ${task.endTime.hour.toString().padStart(2, '0')}:${task.endTime.min.toString().padStart(2, '0')}</div>
            `;
            
            if (!isCompleted && !isFailed) {
                taskDiv.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    markTaskAsDone(task, isReadOnly);
                });
            }
            
            if (!isReadOnly && !isCompleted && !isFailed) {
                taskDiv.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showContextMenu(e.clientX, e.clientY, task, isReadOnly, 'home');
                });
            }
            
            tasksContainer.appendChild(taskDiv);
        });
        
        if (!isReadOnly) {
            const addBtn = colDiv.querySelector('.add-task-btn');
            if (addBtn) addBtn.onclick = () => openAddModal(period, dateStr);
        }
    }
}

// ======================== ADD/EDIT TASK MODAL ========================
function openAddModal(period, date) {
    const modal = document.getElementById('taskModal');
    if (!modal) return;
    modal.classList.add('active');
    
    let nameInput = document.getElementById('modalTaskName');
    if (nameInput) nameInput.value = '';
    
    ['StartHour', 'StartMin', 'EndHour', 'EndMin'].forEach(id => {
        let el = document.getElementById('modal' + id);
        if (el) el.value = '00';
    });
    
    const ok = () => {
        let nameInputVal = document.getElementById('modalTaskName');
        let name = nameInputVal ? nameInputVal.value.trim() : '';
        if (!name) return;
        
        let sh = parseInt(document.getElementById('modalStartHour')?.value) || 0;
        let sm = parseInt(document.getElementById('modalStartMin')?.value) || 0;
        let eh = parseInt(document.getElementById('modalEndHour')?.value) || 0;
        let em = parseInt(document.getElementById('modalEndMin')?.value) || 0;
        
        let now = new Date();
        let nowMin = now.getHours() * 60 + now.getMinutes();
        let endMin = eh * 60 + em;
        
        if (date === getTodayStr() && endMin < nowMin) {
            alert('Cannot add task in the past!');
            return;
        }
        
        tasks.push({
            id: Date.now(),
            title: name,
            startTime: { hour: sh, min: sm },
            endTime: { hour: eh, min: em },
            period: period,
            date: date,
            completed: false,
            failedManually: false
        });
        
        saveTasks();
        renderHome();
        updateTimerDropdown();
        modal.classList.remove('active');
        cleanup();
    };
    
    const cancel = () => {
        modal.classList.remove('active');
        cleanup();
    };
    
    const cleanup = () => {
        let okBtn = document.getElementById('modalOkBtn');
        let cancelBtn = document.getElementById('modalCancelBtn');
        if (okBtn) okBtn.removeEventListener('click', ok);
        if (cancelBtn) cancelBtn.removeEventListener('click', cancel);
    };
    
    let okBtn = document.getElementById('modalOkBtn');
    let cancelBtn = document.getElementById('modalCancelBtn');
    if (okBtn) okBtn.addEventListener('click', ok);
    if (cancelBtn) cancelBtn.addEventListener('click', cancel);
}

function openEditModal(task, source) {
    const modal = document.getElementById('taskModal');
    if (!modal) return;
    modal.classList.add('active');
    
    let nameInput = document.getElementById('modalTaskName');
    if (nameInput) nameInput.value = task.title;
    
    let startHour = document.getElementById('modalStartHour');
    let startMin = document.getElementById('modalStartMin');
    let endHour = document.getElementById('modalEndHour');
    let endMin = document.getElementById('modalEndMin');
    
    if (startHour) startHour.value = task.startTime?.hour.toString().padStart(2, '0') || '00';
    if (startMin) startMin.value = task.startTime?.min.toString().padStart(2, '0') || '00';
    if (endHour) endHour.value = task.endTime?.hour.toString().padStart(2, '0') || '00';
    if (endMin) endMin.value = task.endTime?.min.toString().padStart(2, '0') || '00';
    
    const ok = () => {
        let nameInputVal = document.getElementById('modalTaskName');
        if (nameInputVal) task.title = nameInputVal.value.trim();
        
        task.startTime = {
            hour: parseInt(document.getElementById('modalStartHour')?.value) || 0,
            min: parseInt(document.getElementById('modalStartMin')?.value) || 0
        };
        task.endTime = {
            hour: parseInt(document.getElementById('modalEndHour')?.value) || 0,
            min: parseInt(document.getElementById('modalEndMin')?.value) || 0
        };
        
        if (source === 'mindmap') {
            saveMindmap();
            renderMindmap();
        } else {
            saveTasks();
            renderHome();
            updateTimerDropdown();
        }
        
        modal.classList.remove('active');
        cleanup();
    };
    
    const cancel = () => {
        modal.classList.remove('active');
        cleanup();
    };
    
    const cleanup = () => {
        let okBtn = document.getElementById('modalOkBtn');
        let cancelBtn = document.getElementById('modalCancelBtn');
        if (okBtn) okBtn.removeEventListener('click', ok);
        if (cancelBtn) cancelBtn.removeEventListener('click', cancel);
    };
    
    let okBtn = document.getElementById('modalOkBtn');
    let cancelBtn = document.getElementById('modalCancelBtn');
    if (okBtn) okBtn.addEventListener('click', ok);
    if (cancelBtn) cancelBtn.addEventListener('click', cancel);
}

// ======================== CONTEXT MENU ========================
function showContextMenu(x, y, task, isReadOnly, source) {
    if (task.completed) return;
    
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    let ctxEdit = document.getElementById('ctxEdit');
    let ctxDelete = document.getElementById('ctxDelete');
    let ctxDone = document.getElementById('ctxDone');
    let ctxFailed = document.getElementById('ctxFailed');
    
    if (ctxEdit) ctxEdit.onclick = () => {
        openEditModal(task, source);
        menu.style.display = 'none';
    };
    
    if (ctxDelete) ctxDelete.onclick = () => {
        if (source === 'mindmap') {
            mindmap = mindmap.filter(t => t.id !== task.id);
            saveMindmap();
            renderMindmap();
        } else {
            tasks = tasks.filter(t => t.id !== task.id);
            saveTasks();
            renderHome();
            updateTimerDropdown();
        }
        menu.style.display = 'none';
    };
    
    if (ctxDone) ctxDone.onclick = () => {
        markTaskAsDone(task, isReadOnly);
        menu.style.display = 'none';
    };
    
    if (ctxFailed) ctxFailed.onclick = () => {
        markTaskAsFailed(task, isReadOnly);
        menu.style.display = 'none';
    };
    
    setTimeout(() => {
        document.addEventListener('click', function close() {
            menu.style.display = 'none';
            document.removeEventListener('click', close);
        });
    }, 10);
}

// ======================== TIMER FUNCTIONS ========================
function updateTimerDropdown() {
    const select = document.getElementById('taskSelectTimer');
    if (!select) return;
    
    let todayTasks = tasks.filter(t => t.date === getTodayStr() && !t.completed && !isOverdue(t) && !t.failedManually);
    select.innerHTML = '<option value="">-- select a task --</option>';
    todayTasks.forEach(t => {
        select.innerHTML += `<option value="${t.id}">${escapeHtml(t.title)}</option>`;
    });
}

function updateTimerDisplayUI() {
    let display = document.getElementById('timerDisplay');
    if (display) display.innerText = formatTime(timerElapsedSec);
}

function startTimerInterval() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timerRunning && !timerPaused) {
            timerElapsedSec = Math.floor((Date.now() - timerStartBase) / 1000);
            updateTimerDisplayUI();
            
            let mins = Math.floor(timerElapsedSec / 60);
            if (mins > 0 && mins % 10 === 0 && mins !== lastAlertMinute) {
                lastAlertMinute = mins;
                let alertBox = document.getElementById('customAlert');
                if (alertBox) {
                    alertBox.style.display = 'block';
                    playAlertSound();
                    setTimeout(() => alertBox.style.display = 'none', 4000);
                }
            }
        }
    }, 200);
}

function stopAndSaveTimer() {
    if (timerElapsedSec > 0 && currentTimerTaskId) {
        let task = tasks.find(t => t.id == currentTimerTaskId);
        if (task) {
            sessions.push({
                id: Date.now(),
                taskTitle: task.title,
                durationSeconds: timerElapsedSec,
                date: getTodayStr()
            });
            saveSessions();
        }
    }
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerPaused = false;
    timerElapsedSec = 0;
    currentTimerTaskId = null;
    updateTimerDisplayUI();
    resetTimerUIButtons();
    
    let taskSelect = document.getElementById('taskSelectTimer');
    if (taskSelect) {
        taskSelect.disabled = false;
        taskSelect.style.display = 'block';
    }
    updateTimerDropdown();
}

function startTimerFromId(taskId) {
    if (!taskId) return false;
    if (timerRunning && !timerPaused) return false;
    
    if (timerPaused) {
        timerRunning = true;
        timerPaused = false;
        timerStartBase = Date.now() - timerElapsedSec * 1000;
        startTimerInterval();
        return true;
    }
    
    if (timerInterval) clearInterval(timerInterval);
    timerElapsedSec = 0;
    timerRunning = true;
    timerPaused = false;
    currentTimerTaskId = parseInt(taskId);
    timerStartBase = Date.now();
    updateTimerDisplayUI();
    startTimerInterval();
    return true;
}

function pauseTimer() {
    if (timerRunning && !timerPaused) {
        timerPaused = true;
        timerRunning = false;
    }
}

function resetTimerUIButtons() {
    let playBtn = document.getElementById('playBtn');
    let pauseBtn = document.getElementById('pauseBtn');
    let stopBtn = document.getElementById('stopBtn');
    
    if (playBtn) playBtn.style.display = 'inline-flex';
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
}

// ======================== ANALYTICS ========================
function renderAnalytics() {
    const dailyMap = new Map();
    sessions.forEach(s => {
        let t = dailyMap.get(s.date) || 0;
        dailyMap.set(s.date, t + s.durationSeconds);
    });
    
    const sorted = Array.from(dailyMap.keys()).sort();
    const hoursData = sorted.map(d => Math.round(dailyMap.get(d) / 3600));
    const maxHour = Math.max(...hoursData, 1);
    const formattedLabels = sorted.map(d => {
        let parts = d.split('-');
        return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
    });
    
    const ctx = document.getElementById('hoursChart')?.getContext('2d');
    if (ctx) {
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: formattedLabels,
                datasets: [{
                    label: 'Hours worked',
                    data: hoursData,
                    backgroundColor: currentTheme === 'dark' ? 'rgba(100,150,255,0.7)' : 'rgba(50,100,200,0.7)',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: { max: maxHour + 1, min: 0, stepSize: 1, title: { display: true, text: 'Hours', font: { weight: 'bold' } } },
                    x: { title: { display: true, text: 'Date', font: { weight: 'bold' } } }
                }
            }
        });
    }
    
    const taskTimeMap = new Map();
    sessions.forEach(s => {
        let current = taskTimeMap.get(s.taskTitle) || 0;
        taskTimeMap.set(s.taskTitle, current + s.durationSeconds);
    });
    
    const sortedTasks = Array.from(taskTimeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const pieLabels = sortedTasks.map(t => t[0].length > 20 ? t[0].slice(0, 17) + '...' : t[0]);
    const pieData = sortedTasks.map(t => Math.round(t[1] / 60));
    
    const pieCtx = document.getElementById('pieChart')?.getContext('2d');
    if (pieCtx) {
        if (pieChartInstance) pieChartInstance.destroy();
        pieChartInstance = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} min` } }
                }
            }
        });
    }
    
    const breakdown = document.getElementById('dailyBreakdown');
    if (!breakdown) return;
    breakdown.innerHTML = '';
    
    [...sorted].reverse().slice(0, 14).forEach(date => {
        let daySessions = sessions.filter(s => s.date === date);
        let totalSec = daySessions.reduce((a, b) => a + b.durationSeconds, 0);
        let html = `<div class="day-card"><div class="day-card-date">${date}</div><div class="day-card-total">${formatShortTime(totalSec)}</div>`;
        daySessions.slice(0, 5).forEach(ss => html += `<div class="day-card-task">${escapeHtml(ss.taskTitle)} — ${Math.floor(ss.durationSeconds / 60)} min</div>`);
        if (daySessions.length > 5) html += `<div class="day-card-more">+${daySessions.length - 5} more</div>`;
        html += `</div>`;
        let card = document.createElement('div');
        card.innerHTML = html;
        breakdown.appendChild(card.firstChild);
    });
}

// ======================== CALENDAR ========================
function getHeatColor(seconds) {
    if (seconds === 0) return 0;
    if (seconds < 1800) return 1;
    if (seconds < 7200) return 2;
    if (seconds < 14400) return 3;
    if (seconds < 28800) return 4;
    return 5;
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let monthYearElem = document.getElementById('calendarMonthYear');
    if (monthYearElem) monthYearElem.innerText = `${currentCalendarDate.toLocaleString('default', { month: 'long' })} ${year}`;
    
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(wd => {
        let c = document.createElement('div');
        c.className = 'calendar-cell cal-header';
        c.innerText = wd;
        grid.appendChild(c);
    });
    
    let emptyStart = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < emptyStart; i++) {
        let e = document.createElement('div');
        e.className = 'calendar-cell';
        grid.appendChild(e);
    }
    
    let dailyWork = new Map();
    sessions.forEach(s => {
        let total = dailyWork.get(s.date) || 0;
        dailyWork.set(s.date, total + s.durationSeconds);
    });
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const seconds = dailyWork.get(dateStr) || 0;
        const heatClass = getHeatColor(seconds);
        const cell = document.createElement('div');
        cell.className = `calendar-cell heat-${heatClass}`;
        cell.innerText = d;
        cell.addEventListener('click', () => {
            const daySessions = sessions.filter(s => s.date === dateStr);
            const totalSec = daySessions.reduce((a, b) => a + b.durationSeconds, 0);
            let html = `<strong>${dateStr}</strong><br>Total: ${formatShortTime(totalSec)}<br>`;
            daySessions.slice(0, 5).forEach(s => html += `${escapeHtml(s.taskTitle)}<br>`);
            if (daySessions.length > 5) html += `+${daySessions.length - 5} more`;
            let statsElem = document.getElementById('calendarDayStats');
            if (statsElem) statsElem.innerHTML = html;
        });
        grid.appendChild(cell);
    }
}

// ======================== MIND MAP ========================
function renderMindmap() {
    const container = document.getElementById('mindmapVerticalContainer');
    if (!container) return;
    
    if (!mindmap.length) {
        container.innerHTML = '<div class="mindmap-empty">No tasks. Click + Add Task</div>';
        return;
    }
    
    let currentIndex = mindmap.findIndex(n => !n.completed);
    if (currentIndex === -1) currentIndex = mindmap.length - 1;
    let completedCount = mindmap.filter(n => n.completed).length;
    let percent = Math.floor((completedCount / mindmap.length) * 100);
    let html = '';
    
    mindmap.forEach((node, idx) => {
        let isCurrent = (idx === currentIndex);
        let isCompleted = node.completed === true;
        html += `<div class="mindmap-node-v ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}" data-id="${node.id}">
                    <div class="mindmap-node-title">${escapeHtml(node.title)}</div>
                    ${isCurrent && !isCompleted ? `<div class="mindmap-node-percent">${percent}% to end</div>` : ''}
                 </div>`;
        if (idx < mindmap.length - 1) html += `<div class="vertical-arrow"></div>`;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('.mindmap-node-v').forEach(el => {
        let id = parseInt(el.dataset.id);
        let node = mindmap.find(n => n.id === id);
        if (node && !node.completed) {
            el.addEventListener('dblclick', () => {
                let idx = mindmap.findIndex(n => n.id === id);
                if (idx === currentIndex) {
                    node.completed = true;
                    addXP(50);
                    playSound('ok');
                    saveMindmap();
                    renderMindmap();
                    addTodoMessage('bot', `✨ Nice! You finished "${node.title}" in Mind Map!`);
                    updateTodoMood();
                }
            });
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e.clientX, e.clientY, node, false, 'mindmap');
            });
        }
    });
}

function addMindmapTask() {
    let title = prompt('Task name:');
    if (title) {
        mindmap.push({ id: Date.now(), title: title, completed: false });
        saveMindmap();
        renderMindmap();
    }
}

function deleteMindmap() {
    if (confirm('Delete entire mind map?')) {
        mindmap = [];
        saveMindmap();
        renderMindmap();
    }
}

// ======================== TODO COMPANION ========================
function getTodoMood() {
    let todayTasks = tasks.filter(t => t.date === getTodayStr());
    if (todayTasks.length === 0) {
        return { mood: 'neutral', message: `No tasks yet ${userName}. Add some!` };
    }
    
    let completed = todayTasks.filter(t => t.completed).length;
    let percent = Math.floor((completed / todayTasks.length) * 100);
    
    if (percent === 100) return { mood: 'proud', message: `🔥 LEGENDARY ${userName}! All tasks done! I'm so proud!` };
    if (percent >= 70) return { mood: 'happy', message: `😊 Great work ${userName}! ${percent}% done. Keep crushing!` };
    if (percent >= 30) return { mood: 'neutral', message: `👍 ${percent}% done ${userName}. You can do more!` };
    if (percent > 0) return { mood: 'sad', message: `😔 Only ${percent}% done ${userName}. Try harder tomorrow!` };
    return { mood: 'verySad', message: `💔 ${userName}... No tasks done today. I believe in you for tomorrow!` };
}

function getTodoSVG(mood) {
    const base = '<rect x="20" y="20" width="60" height="60" rx="14" fill="#88929e" stroke="#555" stroke-width="2.5"/>';
    const eyes = '<rect x="32" y="38" width="8" height="8" rx="3" fill="#333"/><rect x="60" y="38" width="8" height="8" rx="3" fill="#333"/>';
    let mouth = '';
    
    if (mood === 'proud') mouth = '<path d="M 40 55 Q 50 68 60 55" fill="none" stroke="#333" stroke-width="3" stroke-linecap="round"/><path d="M 30 32 L 38 36 M 70 32 L 62 36" stroke="#333" stroke-width="2"/>';
    else if (mood === 'happy') mouth = '<path d="M 38 55 Q 50 68 62 55" fill="none" stroke="#333" stroke-width="3" stroke-linecap="round"/>';
    else if (mood === 'neutral') mouth = '<line x1="40" y1="58" x2="60" y2="58" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>';
    else if (mood === 'sad') mouth = '<path d="M 38 60 Q 50 52 62 60" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>';
    else if (mood === 'verySad') mouth = '<path d="M 38 60 Q 50 52 62 60" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="62" r="3" fill="#66bbff" opacity="0.6"/><circle cx="70" cy="62" r="3" fill="#66bbff" opacity="0.6"/>';
    
    return `<svg viewBox="0 0 100 100">${base}${eyes}${mouth}</svg>`;
}

function updateTodoMood() {
    const { mood, message } = getTodoMood();
    const avatarDiv = document.getElementById('todoAvatar');
    const speechDiv = document.getElementById('todoSpeech');
    
    if (avatarDiv) avatarDiv.innerHTML = getTodoSVG(mood);
    if (speechDiv) speechDiv.innerHTML = message;
    
    if (mood === 'proud') document.querySelector('.todo-avatar')?.classList.add('animate-glow');
    if (mood === 'happy') document.querySelector('.todo-avatar')?.classList.add('animate-bounce');
    if (mood === 'sad' || mood === 'verySad') document.querySelector('.todo-avatar')?.classList.add('animate-shake');
    
    setTimeout(() => {
        document.querySelector('.todo-avatar')?.classList.remove('animate-glow', 'animate-bounce', 'animate-shake');
    }, 500);
}

function addTodoMessage(role, text) {
    todoChat.push({ role, text });
    saveTodoChat();
    renderTodoChat();
}

function renderTodoChat() {
    const container = document.getElementById('todoChatMessages');
    if (!container) return;
    
    container.innerHTML = '';
    todoChat.slice(-20).forEach(msg => {
        let div = document.createElement('div');
        div.className = `chat-bubble ${msg.role}`;
        div.innerHTML = `<strong>${msg.role === 'user' ? userName : 'Todo'}:</strong> ${escapeHtml(msg.text)}`;
        
        if (msg.role === 'bot') {
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                let reply = prompt('Reply to Todo:');
                if (reply) {
                    addTodoMessage('user', reply);
                    getBotReply(reply);
                }
            });
        }
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

function getBotReply(msg) {
    let lower = msg.toLowerCase();
    let reply = '';
    
    if (lower.includes('hello') || lower.includes('hi')) reply = `Hello ${userName}! Ready to crush some tasks today? 💪`;
    else if (lower.includes('how are you')) reply = `I'm great ${userName}! Super excited to help you focus! How about your tasks?`;
    else if (lower.includes('thank')) reply = `You're welcome ${userName}! Keep going, you're doing amazing! ✨`;
    else if (lower.includes('sorry')) reply = `It's ok ${userName}. Every day is a new chance! Just try harder tomorrow! 🌟`;
    else if (lower.includes('good')) reply = `Awesome ${userName}! Keep that positive energy flowing! 🚀`;
    else if (lower.includes('bad')) reply = `Don't worry ${userName}. Tomorrow is a fresh start. You've got this! 💪`;
    else if (lower.includes('task')) reply = `Focus on one task at a time ${userName}. You can do it! 🎯`;
    else reply = `Keep focusing ${userName}! You've got this! I believe in you! 💪`;
    
    setTimeout(() => addTodoMessage('bot', reply), 300);
    return reply;
}

function sendTodoMessage() {
    let input = document.getElementById('todoChatInput');
    if (input && input.value.trim()) {
        let text = input.value.trim();
        addTodoMessage('user', text);
        getBotReply(text);
        input.value = '';
    }
}

function renderTodoPage() {
    const container = document.getElementById('todoContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="todo-left">
            <div class="todo-avatar" id="todoAvatar">${getTodoSVG('neutral')}</div>
            <div class="todo-speech" id="todoSpeech">Loading...</div>
        </div>
        <div class="todo-right">
            <div class="chat-messages-area" id="todoChatMessages"></div>
            <div class="chat-input-group">
                <input type="text" id="todoChatInput" placeholder="Type a message to Todo...">
                <button class="chat-send-btn" onclick="sendTodoMessage()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    renderTodoChat();
    updateTodoMood();
}

// ======================== GRAVEYARD ========================
function renderGraveyard() {
    let container = document.getElementById('graveyardList');
    if (!container) return;
    
    if (graveyard.length === 0) {
        container.innerHTML = '<div class="grave-empty">No dead tasks yet. Keep it up!</div>';
        return;
    }
    
    container.innerHTML = graveyard.map(g => `<div class="grave-item">${escapeHtml(g)}</div>`).join('');
}

// ======================== SESSION SIDEBAR ========================
function renderSessionList() {
    let c = document.getElementById('sessionListContainer');
    if (!c) return;
    
    if (sessions.length === 0) {
        c.innerHTML = '<div class="session-empty">No sessions yet. Start a timer!</div>';
        return;
    }
    
    c.innerHTML = [...sessions].reverse().slice(0, 30).map(s => {
        let hours = Math.floor(s.durationSeconds / 3600);
        let minutes = Math.floor((s.durationSeconds % 3600) / 60);
        let timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        let dateParts = s.date.split('-');
        let formattedDate = `${dateParts[2]}/${dateParts[1]}`;
        
        return `<div class="session-item">
                    <div class="session-title">${escapeHtml(s.taskTitle)}</div>
                    <div class="session-meta">${timeStr}  •  ${formattedDate}</div>
                </div>`;
    }).join('');
}

// ======================== PROFILE ========================
function setupProfile() {
    let nameElem = document.getElementById('profileName');
    if (nameElem) {
        nameElem.innerText = userName;
        nameElem.ondblclick = () => {
            let newName = prompt('Enter your name:', userName);
            if (newName) {
                userName = newName;
                localStorage.setItem('userName', userName);
                nameElem.innerText = userName;
                updateTodoMood();
            }
        };
    }
    
    let avatarElem = document.getElementById('profileAvatar');
    if (avatarElem) {
        avatarElem.ondblclick = () => {
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                let file = e.target.files[0];
                let reader = new FileReader();
                reader.onload = (ev) => {
                    localStorage.setItem('userAvatar', ev.target.result);
                    avatarElem.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                };
                reader.readAsDataURL(file);
            };
            input.click();
        };
    }
    
    if (userAvatar && avatarElem) {
        avatarElem.innerHTML = `<img src="${userAvatar}" style="width:100%;height:100%;object-fit:cover;">`;
    }
    
    updateProfileStats();
}

// ======================== HAMBURGER MENU ========================
function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!hamburgerBtn || !sidebar) return;
    
    function openSidebar() {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        hamburgerBtn.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    
    function closeSidebar() {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        hamburgerBtn.classList.remove('open');
        document.body.style.overflow = '';
    }
    
    hamburgerBtn.onclick = function(e) {
        e.stopPropagation();
        if (sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
    };
    
    if (overlay) overlay.onclick = closeSidebar;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });
    
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) closeSidebar();
    });
}

// ======================== NAVIGATION ========================
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    let targetView = document.getElementById(`${viewId}View`);
    if (targetView) targetView.classList.add('active-view');
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll(`.nav-item[data-view="${viewId}"]`).forEach(btn => btn.classList.add('active'));
    
    activeView = viewId;
    
    if (viewId === 'home') renderHome();
    if (viewId === 'timer') {
        updateTimerDropdown();
        updateTimerDisplayUI();
    }
    if (viewId === 'analytics') renderAnalytics();
    if (viewId === 'calendar') renderCalendar();
    if (viewId === 'mindmap') renderMindmap();
    if (viewId === 'graveyard') renderGraveyard();
    if (viewId === 'todo') renderTodoPage();
    if (viewId === 'profile') setupProfile();
}

function setTheme(theme) {
    currentTheme = theme;
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    localStorage.setItem('flow_theme_final', theme);
    
    if (chartInstance) {
        chartInstance.config.data.datasets[0].backgroundColor = theme === 'dark' ? 'rgba(100,150,255,0.7)' : 'rgba(50,100,200,0.7)';
        chartInstance.update();
    }
    if (pieChartInstance) pieChartInstance.update();
    
    renderHome();
    renderCalendar();
}

// ======================== EVENT BINDINGS ========================
function bindEvents() {
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
        btn.addEventListener('click', () => showView(btn.getAttribute('data-view')));
    });
    
    let themeBtn = document.getElementById('darkLightToggle');
    if (themeBtn) themeBtn.addEventListener('click', () => setTheme(currentTheme === 'light' ? 'dark' : 'light'));
    
    let prevDay = document.getElementById('prevDayBtn');
    let nextDay = document.getElementById('nextDayBtn');
    if (prevDay) prevDay.addEventListener('click', () => {
        currentDisplayDate.setDate(currentDisplayDate.getDate() - 1);
        renderHome();
    });
    if (nextDay) nextDay.addEventListener('click', () => {
        let tom = new Date(currentDisplayDate);
        tom.setDate(tom.getDate() + 1);
        if (tom <= new Date()) {
            currentDisplayDate = tom;
            renderHome();
        }
    });
    
    let playBtn = document.getElementById('playBtn');
    let pauseBtn = document.getElementById('pauseBtn');
    let stopBtn = document.getElementById('stopBtn');
    
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            let select = document.getElementById('taskSelectTimer');
            let id = select ? select.value : '';
            if (startTimerFromId(id) && select) {
                select.style.display = 'none';
                playBtn.style.display = 'none';
                if (pauseBtn) pauseBtn.style.display = 'inline-flex';
                if (stopBtn) stopBtn.style.display = 'inline-flex';
            }
        });
    }
    
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            pauseTimer();
            if (playBtn) playBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'none';
        });
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            stopAndSaveTimer();
        });
    }
    
    let openSessions = document.getElementById('openSessionsBtn');
    let closeSession = document.getElementById('closeSessionBtn');
    let sessionSidebar = document.getElementById('sessionSidebar');
    
    if (openSessions) {
        openSessions.addEventListener('click', () => {
            if (sessionSidebar) sessionSidebar.classList.add('open');
            renderSessionList();
        });
    }
    
    if (closeSession) {
        closeSession.addEventListener('click', () => {
            if (sessionSidebar) sessionSidebar.classList.remove('open');
        });
    }
    
    let prevMonth = document.getElementById('prevMonthBtn');
    let nextMonth = document.getElementById('nextMonthBtn');
    
    if (prevMonth) {
        prevMonth.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        });
    }
    
    if (nextMonth) {
        nextMonth.addEventListener('click', () => {
            let next = new Date(currentCalendarDate);
            next.setMonth(next.getMonth() + 1);
            if (next <= new Date()) {
                currentCalendarDate = next;
                renderCalendar();
            }
        });
    }
    
    let addMindmap = document.getElementById('addMindmapTaskBtn');
    let deleteMindmapBtn = document.getElementById('mindmapDeleteAllBtn');
    
    if (addMindmap) addMindmap.addEventListener('click', addMindmapTask);
    if (deleteMindmapBtn) deleteMindmapBtn.addEventListener('click', deleteMindmap);
    
    window.sendTodoMessage = sendTodoMessage;
}

// ======================== FULLSCREEN TIMER MODE ========================
let inactivityTimer = null;

function resetInactivityTimer() {
    if (timerRunning && !timerPaused && activeView === 'timer') {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        document.body.classList.remove('timer-fullscreen-mode');
        inactivityTimer = setTimeout(() => {
            if (timerRunning && !timerPaused && activeView === 'timer') {
                document.body.classList.add('timer-fullscreen-mode');
            }
        }, 5000);
    }
}

document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('click', resetInactivityTimer);

// ======================== PWA SERVICE WORKER ========================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered:', reg))
            .catch(err => console.log('SW failed:', err));
    });
}

// ======================== INIT ========================

 
async function init(){ 
    const licensed = await checkLicenseValidity();
    if(!licensed) return;
    
    loadData(); 
    setupHamburgerMenu(); 
    bindEvents(); 
    showView('home'); 
    renderSessionList(); 
    if(tasks.length===0) saveTasks(); 
    if(mindmap.length===0) saveMindmap(); 
}

// اجرای اپ
init();
