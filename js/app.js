// Wazir Juniors - Main Application Controller

const WazirApp = (() => {
  // Calendar paging state
  let calDate = new Date();
  
  // Current view history state
  let currentView = "";

  // Initialize
  const init = () => {
    // Purge legacy prototype placeholder sample tasks
    WazirStore.clearSampleTasks();

    populateUserSwitcher();
    setupEventListeners();
    updateThemeClass();
    
    // Start background email checker
    WazirEmailService.start();

    // Init routing based on URL hash
    initRouter();
  };

  // Populate user switcher (redundant since using login, but kept to prevent console errors)
  const populateUserSwitcher = () => {
    const selector = document.getElementById('user-role-select');
    if (!selector) return;
    const users = WazirStore.getUsers();
    selector.innerHTML = users.map(user => {
      const label = user.role === 'admin' ? `Senior: ${user.name}` : `Junior: ${user.name} (${user.vertical})`;
      return `<option value="${user.id}">${label}</option>`;
    }).join('');
    selector.value = WazirStore.getCurrentUser().id;
  };

  // Setup Event Listeners
  const setupEventListeners = () => {
    // Hash change routing
    window.addEventListener('hashchange', handleRouting);
    
    // Prevent default dialog closing to animate out if desired, or simple actions
    const dialogs = document.querySelectorAll('dialog');
    dialogs.forEach(dialog => {
      dialog.addEventListener('close', () => {
        dialog.classList.remove('opening');
      });
    });
  };

  // Handle routing based on role and hash
  const initRouter = () => {
    // If not logged in, enforce login page
    if (!WazirStore.isLoggedIn()) {
      window.location.hash = '#/login';
      handleRouting();
      return;
    }

    if (!window.location.hash || window.location.hash === '#/login') {
      const activeRole = WazirStore.getActiveRole();
      if (activeRole === 'admin') {
        window.location.hash = '#/admin-overview';
      } else {
        window.location.hash = '#/dashboard';
      }
    } else {
      handleRouting();
    }
  };

  const handleRouting = () => {
    // Enforce login screen if logged out
    if (!WazirStore.isLoggedIn()) {
      document.getElementById('view-login').style.display = 'flex';
      document.getElementById('app-shell').style.display = 'none';
      populateLoginDropdowns();
      return;
    }

    // Hide Login overlay, show app shell
    document.getElementById('view-login').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';

    const hash = window.location.hash || '#/dashboard';
    const activeRole = WazirStore.getActiveRole();
    let targetView = hash.replace('#/', '');

    // Sanitize views based on active role
    if (activeRole === 'admin') {
      if (!targetView.startsWith('admin-') && targetView !== 'emails' && targetView !== 'settings') {
        targetView = 'admin-overview';
        window.location.hash = '#/admin-overview';
      }
    } else {
      if ((targetView.startsWith('admin-') && targetView !== 'emails' && targetView !== 'settings') || targetView === 'login') {
        targetView = 'dashboard';
        window.location.hash = '#/dashboard';
      }
    }

    currentView = targetView;
    renderView(targetView);
    updateActiveNavItems(targetView);
    updateBadges();
  };

  const updateThemeClass = () => {
    if (!WazirStore.isLoggedIn()) return;
    
    const activeRole = WazirStore.getActiveRole();
    
    // Sync dark toggle switch state
    const darkToggle = document.getElementById('dark-mode-toggle');
    if (darkToggle) {
      darkToggle.checked = WazirStore.getTheme() === 'dark';
    }

    const sheetInput = document.getElementById('settings-google-sheet-url');
    if (sheetInput) {
      sheetInput.value = WazirStore.getGoogleSheetUrl();
    }

    updateUserProfileDisplays();

    if (activeRole === 'admin') {
      document.body.className = 'theme-admin' + (WazirStore.getTheme() === 'dark' ? ' dark-mode' : '');
      document.getElementById('nav-junior-group').style.display = 'none';
      document.getElementById('nav-admin-group').style.display = 'flex';
      
      // Update mobile bottom nav elements
      document.getElementById('mob-nav-dash').style.display = 'none';
      document.getElementById('mob-nav-cal').style.display = 'none';
      document.getElementById('mob-nav-tasks').style.display = 'none';
      document.getElementById('mob-nav-attendance').style.display = 'none';
      document.getElementById('mob-nav-settings').style.display = 'none';
      
      document.getElementById('mob-admin-dash').style.display = 'flex';
      document.getElementById('mob-admin-tasks').style.display = 'flex';
      document.getElementById('mob-admin-requests').style.display = 'flex';
      document.getElementById('mob-admin-attendance').style.display = 'flex';
      document.getElementById('mob-admin-settings').style.display = 'flex';
    } else {
      document.body.className = 'theme-junior' + (WazirStore.getTheme() === 'dark' ? ' dark-mode' : '');
      document.getElementById('nav-junior-group').style.display = 'flex';
      document.getElementById('nav-admin-group').style.display = 'none';

      // Update mobile bottom nav elements
      document.getElementById('mob-nav-dash').style.display = 'flex';
      document.getElementById('mob-nav-cal').style.display = 'flex';
      document.getElementById('mob-nav-tasks').style.display = 'flex';
      document.getElementById('mob-nav-attendance').style.display = 'flex';
      document.getElementById('mob-nav-settings').style.display = 'flex';
      
      document.getElementById('mob-admin-dash').style.display = 'none';
      document.getElementById('mob-admin-tasks').style.display = 'none';
      document.getElementById('mob-admin-requests').style.display = 'none';
      document.getElementById('mob-admin-attendance').style.display = 'none';
      document.getElementById('mob-admin-settings').style.display = 'none';
    }

    // Toggle sidebar reset button (only seniors can reset data)
    const resetBtn = document.getElementById('sidebar-reset-btn');
    if (resetBtn) {
      resetBtn.style.display = activeRole === 'admin' ? 'block' : 'none';
    }
  };

  // Nav items highlight
  const updateActiveNavItems = (viewId) => {
    // Sidebar
    const sidebarItems = document.querySelectorAll('.app-sidebar .nav-item');
    sidebarItems.forEach(item => item.classList.remove('active'));
    
    // Bottom navigation
    const bottomItems = document.querySelectorAll('.app-bottom-nav .bottom-nav-item');
    bottomItems.forEach(item => item.classList.remove('active'));

    // Highlight correct items
    if (viewId === 'dashboard') {
      document.querySelector('.app-sidebar [onclick*="dashboard"]')?.classList.add('active');
      document.getElementById('mob-nav-dash')?.classList.add('active');
    } else if (viewId === 'calendar') {
      document.querySelector('.app-sidebar [onclick*="calendar"]')?.classList.add('active');
      document.getElementById('mob-nav-cal')?.classList.add('active');
    } else if (viewId === 'tasks') {
      document.querySelector('.app-sidebar [onclick*="tasks"]')?.classList.add('active');
      document.getElementById('mob-nav-tasks')?.classList.add('active');
    } else if (viewId === 'attendance') {
      document.querySelector('.app-sidebar [onclick*="attendance"]')?.classList.add('active');
      document.getElementById('mob-nav-attendance')?.classList.add('active');
    } else if (viewId === 'settings') {
      document.querySelector('.app-sidebar [onclick*="settings"]')?.classList.add('active');
      document.getElementById('mob-nav-settings')?.classList.add('active');
      document.getElementById('mob-admin-settings')?.classList.add('active');
    } else if (viewId === 'admin-overview') {
      document.querySelector('.app-sidebar [onclick*="admin-overview"]')?.classList.add('active');
      document.getElementById('mob-admin-dash')?.classList.add('active');
    } else if (viewId === 'admin-tasks') {
      document.querySelector('.app-sidebar [onclick*="admin-tasks"]')?.classList.add('active');
      document.getElementById('mob-admin-tasks')?.classList.add('active');
    } else if (viewId === 'admin-calendar') {
      document.querySelector('.app-sidebar [onclick*="admin-calendar"]')?.classList.add('active');
    } else if (viewId === 'admin-requests') {
      document.querySelector('.app-sidebar [onclick*="admin-requests"]')?.classList.add('active');
      document.getElementById('mob-admin-requests')?.classList.add('active');
    } else if (viewId === 'admin-attendance') {
      document.querySelector('.app-sidebar [onclick*="admin-attendance"]')?.classList.add('active');
      document.getElementById('mob-admin-attendance')?.classList.add('active');
    } else if (viewId === 'admin-progress') {
      document.querySelector('.app-sidebar [onclick*="admin-progress"]')?.classList.add('active');
    }
  };

  // Nav / Header Badges
  const updateBadges = () => {
    const activeUser = WazirStore.getCurrentUser();
    
    // Notifications Count
    const unreadCount = WazirStore.getUnreadNotificationCount(activeUser.id);
    const sidebarBadge = document.getElementById('sidebar-notif-badge');
    const mobBadge = document.getElementById('mob-notif-badge');
    
    if (sidebarBadge) {
      sidebarBadge.textContent = unreadCount;
      sidebarBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
    if (mobBadge) {
      mobBadge.textContent = unreadCount;
      mobBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    // Requests Count (Admin Only)
    if (activeUser.role === 'admin') {
      const pendingCount = WazirStore.getRequests().filter(r => r.status === 'Pending').length;
      const sidebarReqBadge = document.getElementById('sidebar-request-badge');
      const mobReqBadge = document.getElementById('mob-request-badge');
      
      if (sidebarReqBadge) {
        sidebarReqBadge.textContent = pendingCount;
        sidebarReqBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
      }
      if (mobReqBadge) {
        mobReqBadge.textContent = pendingCount;
        mobReqBadge.style.display = pendingCount > 0 ? 'flex' : 'none';
      }
    }
  };

  // Navigate explicitly
  const navigate = (viewId) => {
    window.location.hash = `#/${viewId}`;
  };

  // Toast System
  const showToast = (message, type = "info") => {
    // Disabled popup toast notification cards
    return;
  };

  // Switch Users Trigger
  const switchUser = (userId) => {
    const currentUser = WazirStore.getCurrentUser();
    
    // Check password if switching to Wazir Senior view
    if (userId === 'admin_senior') {
      const password = prompt("Enter Wazir Senior password to access Admin panel:");
      const cleanPwd = (password || '').trim();
      if (cleanPwd.toLowerCase() !== 'stwazir8') {
        showToast("Access Denied: Incorrect password.", "danger");
        // Revert dropdown selection to previous user
        document.getElementById('user-role-select').value = currentUser.id;
        return;
      }
    }

    WazirStore.setCurrentUser(userId);
    updateThemeClass();
    populateUserSwitcher(); // rebuild label focus
    initRouter(); // re-route
    showToast(`Switched workspace to ${WazirStore.getCurrentUser().name}`, "success");
  };

  // View Renders Factory
  const renderView = (viewId) => {
    // Hide all
    const containers = document.querySelectorAll('.view-container');
    containers.forEach(c => c.classList.remove('active'));

    // Display correct canvas
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('active');

    // Run custom builders
    switch(viewId) {
      case 'dashboard':
        renderJuniorDashboard();
        break;
      case 'calendar':
        renderJuniorCalendar();
        break;
      case 'tasks':
        // Reset filters when opening fresh
        document.getElementById('task-search-input').value = "";
        document.getElementById('filter-vertical').value = "all";
        document.getElementById('filter-priority').value = "all";
        document.getElementById('filter-status').value = "all";
        document.getElementById('filter-timeline').value = "all";
        renderJuniorTasks();
        break;
      case 'notifications':
        renderNotificationsPage();
        break;
      case 'admin-overview':
        renderAdminOverview();
        break;
      case 'admin-tasks':
        // Populate filters and reset search
        populateAdminFilters();
        document.getElementById('admin-search-input').value = "";
        document.getElementById('admin-filter-junior').value = "all";
        document.getElementById('admin-filter-vertical').value = "all";
        document.getElementById('admin-filter-priority').value = "all";
        document.getElementById('admin-filter-status').value = "all";
        renderAdminTasks();
        break;
      case 'admin-calendar':
        populateAdminCalendarFilters();
        renderAdminCalendar();
        break;
      case 'admin-requests':
        renderAdminRequests();
        break;
      case 'admin-progress':
        renderAdminProgress();
        break;
      case 'attendance':
        renderJuniorAttendance();
        break;
      case 'admin-attendance':
        renderAdminAttendance();
        break;
      case 'settings':
        // Just triggers settings profiles updates on navigations
        break;
    }
  };

  // ================= VIEW BUILDERS =================

  // JUNIOR DASHBOARD
  const renderJuniorDashboard = () => {
    const tasks = WazirStore.getTasks();
    const requests = WazirStore.getRequests();

    // Update headlines
    document.getElementById('dash-user-name').textContent = "Junior Workspace";
    document.getElementById('dash-user-subtitle').textContent = "Team Portal • Manage collective deadlines";

    // Counts
    const activeTasks = tasks.filter(t => t.status !== 'Completed');
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    const overdueTasks = activeTasks.filter(t => new Date(t.deadline) < new Date());
    const awaitingApproval = requests.filter(r => r.status === 'Pending');

    document.getElementById('junior-stat-active').textContent = activeTasks.length;
    document.getElementById('junior-stat-completed').textContent = completedTasks.length;
    document.getElementById('junior-stat-overdue').textContent = overdueTasks.length;
    document.getElementById('junior-stat-pending').textContent = awaitingApproval.length;

    // Action Items (Today, upcoming 7 days, overdue)
    const urgentOutlet = document.getElementById('dashboard-urgent-tasks');
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const urgentTasks = activeTasks.filter(t => {
      const dl = new Date(t.deadline);
      return dl < sevenDaysLater; // overdue or within 7 days
    }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (urgentTasks.length === 0) {
      urgentOutlet.innerHTML = `
        <div style="grid-column: 1/-1; padding: 24px; text-align: center; color: var(--text-muted);">
          🎉 No urgent actions due in the next 7 days!
        </div>
      `;
    } else {
      urgentOutlet.innerHTML = urgentTasks.map(t => {
        const isOverdue = new Date(t.deadline) < now;
        const dlClass = isOverdue ? 'overdue' : '';
        const dlBadge = isOverdue ? '⚠️ Overdue' : '⌛ Upcoming';
        const hasReq = requests.some(r => r.taskId === t.id && r.status === 'Pending');

        return `
          <div class="task-card ${isOverdue ? 'overdue' : ''}" onclick="WazirApp.openDetailsDialog('${t.id}')">
            <div class="task-card-header">
              <span class="badge badge-vertical-${t.vertical.toLowerCase()}">${t.vertical}</span>
              <span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span>
            </div>
            <div class="task-card-title">${t.name}</div>
            <div class="task-card-desc">${t.description || 'No description provided.'}</div>
            <div class="task-card-meta">
              <div class="meta-row">
                <span class="meta-label">📅 Deadline:</span>
                <span class="meta-value ${dlClass}">${WazirStore.formatFriendlyDate(t.deadline)}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">📊 Status:</span>
                <span class="meta-value">${t.status} ${hasReq ? '<span class="meta-value pending-approval">(Requested Extension)</span>' : ''}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Recent Notifications
    const notificationsOutlet = document.getElementById('dashboard-recent-notifications');
    const notifs = WazirStore.getNotifications(junior.id).slice(0, 3); // limit to 3

    if (notifs.length === 0) {
      notificationsOutlet.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-muted)">No recent alerts.</div>`;
    } else {
      notificationsOutlet.innerHTML = notifs.map(n => `
        <div class="notification-card" style="opacity: ${n.read ? 0.65 : 1};" onclick="WazirApp.markNotifRead('${n.id}')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:0.85rem;">${n.title}</strong>
            <span style="font-size:0.7rem; color:var(--text-muted)">${WazirStore.formatFriendlyDate(n.timestamp)}</span>
          </div>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin:4px 0 0 0;">${n.message}</p>
        </div>
      `).join('');
    }
  };

  // JUNIOR CALENDAR
  const renderJuniorCalendar = () => {
    const tasks = WazirStore.getTasks();
    buildCalendar('calendar-grid-elements', 'calendar-month-year', tasks);
  };

  // ADMIN CALENDAR
  const renderAdminCalendar = () => {
    const juniorFilter = document.getElementById('cal-filter-junior').value;
    const verticalFilter = document.getElementById('cal-filter-vertical').value;
    
    let tasks = WazirStore.getTasks();

    if (juniorFilter !== 'all') {
      tasks = tasks.filter(t => t.juniorId === juniorFilter);
    }
    if (verticalFilter !== 'all') {
      tasks = tasks.filter(t => t.vertical === verticalFilter);
    }

    buildCalendar('admin-calendar-grid-elements', 'admin-calendar-month-year', tasks);
  };

  // Shared Calendar Builder Engine
  const buildCalendar = (gridId, headerId, tasks) => {
    const grid = document.getElementById(gridId);
    const header = document.getElementById(headerId);
    
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    header.textContent = `${months[month]} ${year}`;

    // Clear grid
    grid.innerHTML = "";

    // Weekdays row
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    daysOfWeek.forEach(day => {
      const el = document.createElement('div');
      el.className = 'calendar-weekday';
      el.textContent = day;
      grid.appendChild(el);
    });

    // Paging metrics
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();
    const totalCells = 42; // standard grid layout

    // Render cells
    for (let i = 1; i <= totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';

      let dayNum;
      let targetDate;

      if (i <= firstDayIndex) {
        // Prev Month padding
        cell.classList.add('other-month');
        dayNum = prevLastDay - firstDayIndex + i;
        targetDate = new Date(year, month - 1, dayNum);
      } else if (i > firstDayIndex + lastDay) {
        // Next Month padding
        cell.classList.add('other-month');
        dayNum = i - (firstDayIndex + lastDay);
        targetDate = new Date(year, month + 1, dayNum);
      } else {
        // Current Month active day
        dayNum = i - firstDayIndex;
        targetDate = new Date(year, month, dayNum);
        
        // Check if today
        const today = new Date();
        if (targetDate.getDate() === today.getDate() && targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear()) {
          cell.classList.add('today');
        }
      }

      // Render Day content
      const numLabel = document.createElement('span');
      numLabel.className = 'day-number';
      numLabel.textContent = dayNum;
      cell.appendChild(numLabel);

      // Tasks due on this day (comparing date component only)
      const formattedDateStr = targetDate.toISOString().split('T')[0];
      const dayTasks = tasks.filter(t => t.deadline.split('T')[0] === formattedDateStr);

      if (dayTasks.length > 0) {
        const listDiv = document.createElement('div');
        listDiv.className = 'day-tasks';
        
        dayTasks.slice(0, 3).forEach(task => {
          const item = document.createElement('div');
          item.className = `day-task-indicator ${task.status === 'Completed' ? 'completed' : task.priority.toLowerCase()}`;
          item.textContent = task.name;
          item.title = `${task.name} (${task.priority})`;
          listDiv.appendChild(item);
        });

        if (dayTasks.length > 3) {
          const more = document.createElement('div');
          more.style.fontSize = '0.65rem';
          more.style.fontWeight = '700';
          more.style.textAlign = 'center';
          more.textContent = `+${dayTasks.length - 3} more`;
          listDiv.appendChild(more);
        }

        cell.appendChild(listDiv);

        // Click interaction
        cell.addEventListener('click', () => {
          openCalendarTasksDialog(formattedDateStr, dayTasks);
        });
      } else {
        // Create task on double-click or single tap on empty day
        cell.addEventListener('click', () => {
          // Pre-populate date in dialog
          const targetDateTime = new Date(targetDate);
          targetDateTime.setHours(12, 0, 0, 0); // default noon
          const offset = targetDateTime.getTimezoneOffset();
          const localISO = new Date(targetDateTime.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
          
          WazirApp.openAddTaskDialog(localISO);
        });
      }

      grid.appendChild(cell);
    }
  };

  // Dialog listing tasks for a clicked date
  const openCalendarTasksDialog = (dateString, tasks) => {
    // If only 1 task, open details instantly!
    if (tasks.length === 1) {
      WazirApp.openDetailsDialog(tasks[0].id);
      return;
    }

    const modalId = 'calendar-day-dialog';
    let dialog = document.getElementById(modalId);
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = modalId;
      document.body.appendChild(dialog);
    }

    dialog.innerHTML = `
      <div class="dialog-header">
        <h3 class="dialog-title">Tasks due on ${WazirStore.formatFriendlyDate(dateString).split(',')[0]}</h3>
        <button class="btn btn-secondary btn-circle btn-sm" onclick="WazirApp.closeDialog('${modalId}')">✕</button>
      </div>
      <div class="dialog-body" style="display:flex; flex-direction:column; gap:12px;">
        ${tasks.map(t => `
          <div class="task-card" onclick="WazirApp.closeDialog('${modalId}'); WazirApp.openDetailsDialog('${t.id}');">
            <div class="task-card-header">
              <span class="badge badge-vertical-${t.vertical.toLowerCase()}">${t.vertical}</span>
              <span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span>
            </div>
            <strong style="font-size:0.95rem; color:var(--text-primary);">${t.name}</strong>
            <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; justify-content:space-between;">
              <span>Status: <strong>${t.status}</strong></span>
              <span>Time: <strong>${WazirStore.formatFriendlyDate(t.deadline).split(',')[1]}</strong></span>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="dialog-footer">
        <button class="btn btn-secondary" onclick="WazirApp.closeDialog('${modalId}')">Close</button>
        <button class="btn btn-primary" onclick="WazirApp.closeDialog('${modalId}'); WazirApp.openAddTaskDialog('${dateString}T12:00');">+ Add Task</button>
      </div>
    `;

    dialog.showModal();
    dialog.classList.add('opening');
  };

  const prevMonth = () => {
    calDate.setMonth(calDate.getMonth() - 1);
    renderJuniorCalendar();
  };

  const nextMonth = () => {
    calDate.setMonth(calDate.getMonth() + 1);
    renderJuniorCalendar();
  };

  const prevMonthAdmin = () => {
    calDate.setMonth(calDate.getMonth() - 1);
    renderAdminCalendar();
  };

  const nextMonthAdmin = () => {
    calDate.setMonth(calDate.getMonth() + 1);
    renderAdminCalendar();
  };

  // JUNIOR TASKS LIST
  const renderJuniorTasks = () => {
    let tasks = WazirStore.getTasks();

    // Apply Filter values
    const query = document.getElementById('task-search-input').value.toLowerCase();
    const vertical = document.getElementById('filter-vertical').value;
    const priority = document.getElementById('filter-priority').value;
    const status = document.getElementById('filter-status').value;
    const timeline = document.getElementById('filter-timeline').value;

    tasks = filterTasksEngine(tasks, query, vertical, priority, status, timeline);

    const tbody = document.getElementById('tasks-table-body');
    const emptyState = document.getElementById('tasks-empty-state');
    
    if (tasks.length === 0) {
      tbody.innerHTML = "";
      emptyState.style.display = "block";
    } else {
      emptyState.style.display = "none";
      tbody.innerHTML = tasks.map(t => {
        const isOverdue = new Date(t.deadline) < new Date() && t.status !== 'Completed';
        const rowClass = isOverdue ? 'overdue-row' : '';
        const requests = WazirStore.getRequests();
        const hasPending = requests.some(r => r.taskId === t.id && r.status === 'Pending');

        return `
          <tr class="${rowClass}" onclick="WazirApp.openDetailsDialog('${t.id}')">
            <td data-label="Task Name">
              <div style="font-weight:700;">${t.name}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">${t.description.substring(0, 60)}${t.description.length > 60 ? '...' : ''}</div>
            </td>
            <td data-label="Vertical"><span class="badge badge-vertical-${t.vertical.toLowerCase()}">${t.vertical}</span></td>
            <td data-label="Priority"><span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span></td>
            <td data-label="Deadline" class="${isOverdue ? 'overdue' : ''}">
              <div>${WazirStore.formatFriendlyDate(t.deadline)}</div>
              ${isOverdue ? '<span style="font-size:0.7rem; font-weight:700; color:var(--color-priority-high);">⚠️ OVERDUE</span>' : ''}
              ${hasPending ? '<span style="font-size:0.7rem; font-weight:700; color:var(--color-status-under-review);">⌛ Change Request Pending</span>' : ''}
            </td>
            <td data-label="Assigned By">${t.assignedBy}</td>
            <td data-label="Status"><span class="badge badge-status-${t.status.replace(/\s+/g, '-').toLowerCase()}">${t.status}</span></td>
          </tr>
        `;
      }).join('');
    }
  };

  // Shared Filter Engine
  const filterTasksEngine = (tasks, query, vertical, priority, status, timeline) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return tasks.filter(t => {
      // Search
      const matchesSearch = t.name.toLowerCase().includes(query) || 
                            t.description.toLowerCase().includes(query) ||
                            (t.notes && t.notes.toLowerCase().includes(query));
      
      // Vertical
      const matchesVertical = vertical === 'all' || t.vertical === vertical;
      
      // Priority
      const matchesPriority = priority === 'all' || t.priority === priority;

      // Status
      const matchesStatus = status === 'all' || t.status === status;

      // Timeline / Due categories
      let matchesTimeline = true;
      if (timeline === 'today') {
        const dl = new Date(t.deadline);
        matchesTimeline = dl >= startOfToday && dl <= endOfToday;
      } else if (timeline === 'week') {
        const dl = new Date(t.deadline);
        matchesTimeline = dl >= now && dl <= sevenDaysLater;
      } else if (timeline === 'overdue') {
        const dl = new Date(t.deadline);
        matchesTimeline = dl < now && t.status !== 'Completed';
      }

      return matchesSearch && matchesVertical && matchesPriority && matchesStatus && matchesTimeline;
    });
  };

  // JUNIOR NOTIFICATIONS PAGE
  const renderNotificationsPage = () => {
    const activeUser = WazirStore.getCurrentUser();
    const notifs = WazirStore.getNotifications(activeUser.id);
    const listOutlet = document.getElementById('notifications-page-list');

    if (notifs.length === 0) {
      listOutlet.innerHTML = `
        <div style="padding:40px; text-align:center; color:var(--text-secondary);">
          📭 Notification history is empty.
        </div>
      `;
    } else {
      listOutlet.innerHTML = notifs.map(n => `
        <div class="notification-card" style="border-left: 4px solid ${n.read ? 'var(--border-color)' : 'var(--color-primary)'}; opacity: ${n.read ? 0.75 : 1}" onclick="WazirApp.markNotifRead('${n.id}')">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <strong style="font-size:0.95rem;">${n.title}</strong>
              <p style="font-size:0.85rem; color:var(--text-secondary); margin:4px 0 0 0;">${n.message}</p>
            </div>
            <span style="font-size:0.75rem; color:var(--text-muted);">${WazirStore.formatFriendlyDate(n.timestamp)}</span>
          </div>
          ${!n.read ? `<button class="btn btn-secondary btn-sm" style="align-self:flex-end; padding:2px 8px; font-size:0.7rem; margin-top:8px;">Mark Read</button>` : ''}
        </div>
      `).join('');
    }
  };

  // ADMIN OVERVIEW
  const renderAdminOverview = () => {
    const tasks = WazirStore.getTasks();
    const requests = WazirStore.getRequests();
    const now = new Date();

    const activeTasks = tasks.filter(t => t.status !== 'Completed');
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    const overdueTasks = activeTasks.filter(t => new Date(t.deadline) < now);
    const pendingRequests = requests.filter(r => r.status === 'Pending');

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dueToday = activeTasks.filter(t => {
      const dl = new Date(t.deadline);
      return dl >= startOfToday && dl <= endOfToday;
    });

    const dueWeek = activeTasks.filter(t => {
      const dl = new Date(t.deadline);
      return dl >= now && dl <= sevenDaysLater;
    });

    document.getElementById('admin-stat-active').textContent = activeTasks.length;
    document.getElementById('admin-stat-completed').textContent = completedTasks.length;
    document.getElementById('admin-stat-overdue').textContent = overdueTasks.length;
    document.getElementById('admin-stat-requests').textContent = pendingRequests.length;
    document.getElementById('admin-stat-due-today').textContent = dueToday.length;
    document.getElementById('admin-stat-due-week').textContent = dueWeek.length;

    // Attention Needed (Overdue & Pending approvals)
    const attentionOutlet = document.getElementById('admin-attention-tasks');
    
    // Combine pending approvals and overdue tasks
    const attentionItems = [];
    
    pendingRequests.forEach(req => {
      const task = WazirStore.getTask(req.taskId);
      if (task) {
        attentionItems.push({
          type: 'request',
          title: `⚖️ Extension Request: ${task.name}`,
          reqId: req.id,
          desc: `Requested by ${WazirStore.getUser(req.juniorId).name} to ${WazirStore.formatFriendlyDate(req.requestedDeadline)}`,
          date: req.requestedOn
        });
      }
    });

    overdueTasks.forEach(task => {
      attentionItems.push({
        type: 'overdue',
        title: `🚨 Overdue: ${task.name}`,
        taskId: task.id,
        desc: `Assigned to ${WazirStore.getUser(task.juniorId).name}. Due on ${WazirStore.formatFriendlyDate(task.deadline)}`,
        date: task.deadline
      });
    });

    // Sort by date (most critical first)
    attentionItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (attentionItems.length === 0) {
      attentionOutlet.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:24px; color:var(--text-muted);">
          💚 Team is fully on track! No actions pending.
        </div>
      `;
    } else {
      attentionOutlet.innerHTML = attentionItems.map(item => {
        if (item.type === 'request') {
          return `
            <div class="task-card" style="border-left: 4px solid var(--color-status-under-review);" onclick="WazirApp.openReviewDialog('${item.reqId}')">
              <div class="task-card-header">
                <span class="badge badge-status-under-review">Extension Request</span>
                <span style="font-size:0.7rem; color:var(--text-muted);">${WazirStore.formatFriendlyDate(item.date)}</span>
              </div>
              <strong style="font-size:0.95rem; display:block; margin:6px 0;">${item.title}</strong>
              <p style="font-size:0.85rem; color:var(--text-secondary);">${item.desc}</p>
              <button class="btn btn-secondary btn-sm" style="margin-top:10px; width:100%;">Review Request</button>
            </div>
          `;
        } else {
          return `
            <div class="task-card overdue" onclick="WazirApp.openDetailsDialog('${item.taskId}')">
              <div class="task-card-header">
                <span class="badge badge-priority-high">Overdue</span>
                <span style="font-size:0.7rem; color:var(--color-priority-high); font-weight:700;">Milestone Missed</span>
              </div>
              <strong style="font-size:0.95rem; display:block; margin:6px 0;">${item.title}</strong>
              <p style="font-size:0.85rem; color:var(--text-secondary);">${item.desc}</p>
              <button class="btn btn-secondary btn-sm" style="margin-top:10px; width:100%;">Inspect Task</button>
            </div>
          `;
        }
      }).join('');
    }

    // Inactive Tasks Alert (Tasks in Not Started/In Progress that haven't been updated in 3 days)
    const inactiveOutlet = document.getElementById('admin-inactive-tasks-list');
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    const inactiveTasks = activeTasks.filter(t => {
      // Find latest history entry timestamp
      if (t.history.length === 0) return true;
      const latestActionTime = new Date(t.history[t.history.length - 1].date);
      return latestActionTime < threeDaysAgo;
    });

    if (inactiveTasks.length === 0) {
      inactiveOutlet.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-muted);">No inactive tasks. All tasks have active updates.</div>`;
    } else {
      inactiveOutlet.innerHTML = inactiveTasks.map(t => `
        <div class="notification-card" style="border-left: 4px solid var(--color-priority-medium);" onclick="WazirApp.openDetailsDialog('${t.id}')">
          <div style="display:flex; justify-content:space-between;">
            <strong>${t.name}</strong>
            <span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span>
          </div>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin:4px 0;">
            Assigned to ${WazirStore.getUser(t.juniorId).name}. Inactive since ${WazirStore.formatFriendlyDate(t.history[t.history.length - 1].date)}
          </p>
        </div>
      `).join('');
    }
  };

  // Populate filter selectors for Admin tasks list
  const populateAdminFilters = () => {
    const select = document.getElementById('admin-filter-junior');
    if (!select) return;

    const juniors = WazirStore.getUsers().filter(u => u.role === 'junior');
    select.innerHTML = `
      <option value="all">All Juniors</option>
      ${juniors.map(j => `<option value="${j.id}">${j.name}</option>`).join('')}
    `;
  };

  // Populate calendar filters
  const populateAdminCalendarFilters = () => {
    const select = document.getElementById('cal-filter-junior');
    if (!select) return;

    const juniors = WazirStore.getUsers().filter(u => u.role === 'junior');
    select.innerHTML = `
      <option value="all">All Juniors</option>
      ${juniors.map(j => `<option value="${j.id}">${j.name}</option>`).join('')}
    `;
  };

  // ADMIN ALL TASKS BOARD
  const renderAdminTasks = () => {
    let tasks = WazirStore.getTasks();

    const query = document.getElementById('admin-search-input').value.toLowerCase();
    const juniorId = document.getElementById('admin-filter-junior').value;
    const vertical = document.getElementById('admin-filter-vertical').value;
    const priority = document.getElementById('admin-filter-priority').value;
    const status = document.getElementById('admin-filter-status').value;

    // First filter by junior if selected
    if (juniorId !== 'all') {
      tasks = tasks.filter(t => t.juniorId === juniorId);
    }
    
    // Perform standard filtering
    tasks = filterTasksEngine(tasks, query, vertical, priority, status, 'all');

    const tbody = document.getElementById('admin-tasks-table-body');
    const emptyState = document.getElementById('admin-tasks-empty-state');

    if (tasks.length === 0) {
      tbody.innerHTML = "";
      emptyState.style.display = "block";
    } else {
      emptyState.style.display = "none";
      tbody.innerHTML = tasks.map(t => {
        const isOverdue = new Date(t.deadline) < new Date() && t.status !== 'Completed';
        const rowClass = isOverdue ? 'overdue-row' : '';
        const requests = WazirStore.getRequests();
        const hasPending = requests.some(r => r.taskId === t.id && r.status === 'Pending');
        const juniorName = WazirStore.getUser(t.juniorId).name;

        return `
          <tr class="${rowClass}" onclick="WazirApp.openDetailsDialog('${t.id}')">
            <td data-label="Task Name">
              <div style="font-weight:700;">${t.name}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">${t.description.substring(0, 50)}${t.description.length > 50 ? '...' : ''}</div>
            </td>
            <td data-label="Assignee"><strong>${juniorName}</strong></td>
            <td data-label="Vertical"><span class="badge badge-vertical-${t.vertical.toLowerCase()}">${t.vertical}</span></td>
            <td data-label="Priority"><span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span></td>
            <td data-label="Deadline" class="${isOverdue ? 'overdue' : ''}">
              <div>${WazirStore.formatFriendlyDate(t.deadline)}</div>
              ${isOverdue ? '<span style="font-size:0.7rem; font-weight:700; color:var(--color-priority-high);">⚠️ OVERDUE</span>' : ''}
              ${hasPending ? '<span style="font-size:0.7rem; font-weight:700; color:var(--color-status-under-review);">⌛ Extension Requested</span>' : ''}
            </td>
            <td data-label="Status"><span class="badge badge-status-${t.status.replace(/\s+/g, '-').toLowerCase()}">${t.status}</span></td>
          </tr>
        `;
      }).join('');
    }
  };

  // ADMIN DEADLINE REQUESTS APPROVAL PANEL
  const renderAdminRequests = () => {
    const listOutlet = document.getElementById('admin-deadline-requests-list');
    const reqs = WazirStore.getRequests().filter(r => r.status === 'Pending');

    if (reqs.length === 0) {
      listOutlet.innerHTML = `
        <div style="padding:40px; text-align:center; color:var(--text-secondary); background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md);">
          🌟 No pending deadline change requests. Everything is running smoothly!
        </div>
      `;
    } else {
      listOutlet.innerHTML = reqs.map(req => {
        const task = WazirStore.getTask(req.taskId);
        const junior = WazirStore.getUser(req.juniorId);
        
        return `
          <div class="request-card">
            <div class="request-card-header">
              <div class="request-card-user">
                <div class="user-avatar">${junior.avatar}</div>
                <div class="user-info">
                  <span class="user-name">${junior.name}</span>
                  <span class="request-date">Requested On: ${WazirStore.formatFriendlyDate(req.requestedOn)}</span>
                </div>
              </div>
              <span class="badge badge-vertical-${task.vertical.toLowerCase()}">${task.vertical}</span>
            </div>
            
            <div style="font-weight:700; font-size:1.05rem;">Task: ${task.name}</div>
            
            <div class="request-details">
              <div class="request-detail-block">
                <span class="detail-label">Current Deadline</span>
                <span class="detail-value deadline-old">${WazirStore.formatFriendlyDate(req.currentDeadline)}</span>
              </div>
              <div class="request-detail-block">
                <span class="detail-label">Requested Deadline</span>
                <span class="detail-value deadline-new">${WazirStore.formatFriendlyDate(req.requestedDeadline)}</span>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:4px;">
              <span class="detail-label">Reason for extension request:</span>
              <div class="request-reason-box">${req.reason}</div>
            </div>

            <div class="request-actions">
              <button class="btn btn-secondary btn-sm" onclick="WazirApp.openReviewDialog('${req.id}')">Add Feedback & Reject</button>
              <button class="btn btn-danger btn-sm" onclick="WazirApp.quickReviewRequest('${req.id}', 'Rejected')">Reject</button>
              <button class="btn btn-success btn-sm" onclick="WazirApp.quickReviewRequest('${req.id}', 'Approved')">Approve</button>
            </div>
          </div>
        `;
      }).join('');
    }
  };

  // ADMIN PROGRESS AUDITS (BAR CHARTS / WORKLOADS)
  const renderAdminProgress = () => {
    const tasks = WazirStore.getTasks();
    const users = WazirStore.getUsers().filter(u => u.role === 'junior');
    
    // 1. Junior-wise progress
    const juniorListOutlet = document.getElementById('progress-junior-list');
    
    const juniorStats = users.map(j => {
      const jTasks = tasks.filter(t => t.juniorId === j.id);
      const total = jTasks.length;
      const completed = jTasks.filter(t => t.status === 'Completed').length;
      const active = total - completed;
      const overdue = jTasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { name: j.name, vertical: j.vertical, total, completed, active, overdue, pct };
    }).sort((a, b) => b.pct - a.pct); // Highest completion rates first

    juniorListOutlet.innerHTML = juniorStats.map(s => `
      <div class="progress-group">
        <div style="display:flex; justify-content:between; align-items:center; font-weight:700; font-size:0.9rem; margin-bottom:4px;">
          <span>${s.name} (${s.vertical})</span>
          <span style="margin-left:auto;">${s.pct}%</span>
        </div>
        <div class="progress-stats-row">
          <span>Active: ${s.active} | Overdue: ${s.overdue}</span>
          <span>${s.completed}/${s.total} Tasks</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${s.pct}%; background-color: ${s.overdue > 0 ? 'var(--color-priority-high)' : ''}"></div>
        </div>
      </div>
    `).join('');

    // 2. Vertical-wise progress
    const verticalListOutlet = document.getElementById('progress-vertical-list');
    const verticals = ["PR", "Events", "Editorials", "APEX", "ER", "CaseBook", "Other"];

    const verticalStats = verticals.map(v => {
      const vTasks = tasks.filter(t => t.vertical === v);
      const total = vTasks.length;
      const completed = vTasks.filter(t => t.status === 'Completed').length;
      const active = total - completed;
      const overdue = vTasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { vertical: v, total, completed, active, overdue, pct };
    }).sort((a, b) => b.pct - a.pct);

    verticalListOutlet.innerHTML = verticalStats.map(s => `
      <div class="progress-group">
        <div style="display:flex; justify-content:between; align-items:center; font-weight:700; font-size:0.9rem; margin-bottom:4px;">
          <span>${s.vertical} Vertical</span>
          <span style="margin-left:auto;">${s.pct}%</span>
        </div>
        <div class="progress-stats-row">
          <span>Active: ${s.active} | Overdue: ${s.overdue}</span>
          <span>${s.completed}/${s.total} Tasks</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${s.pct}%; background-color: ${s.overdue > 0 ? 'var(--color-priority-high)' : ''}"></div>
        </div>
      </div>
    `).join('');
  };

  // Re-run filters and render current active tasks view
  const applyFilters = () => {
    if (currentView === 'tasks') {
      renderJuniorTasks();
    } else if (currentView === 'admin-tasks') {
      renderAdminTasks();
    }
  };

  // Mark single notification read
  const markNotifRead = (notifId) => {
    WazirStore.markNotificationRead(notifId);
    updateBadges();
    
    // Refresh page if in notifications view
    if (currentView === 'notifications') {
      renderNotificationsPage();
    } else if (currentView === 'dashboard') {
      renderJuniorDashboard();
    }
  };

  // Mark all notifications read
  const markAllNotificationsRead = () => {
    const activeUser = WazirStore.getCurrentUser();
    WazirStore.markAllNotificationsRead(activeUser.id);
    updateBadges();
    showToast("All notifications marked as read", "success");
    
    if (currentView === 'notifications') {
      renderNotificationsPage();
    }
  };

  // ================= DIALOG INTERACTION HANDLERS =================

  const openDialog = (id) => {
    const dialog = document.getElementById(id);
    if (dialog) {
      dialog.showModal();
      dialog.classList.add('opening');
    }
  };

  const closeDialog = (id) => {
    const dialog = document.getElementById(id);
    if (dialog) {
      dialog.close();
      dialog.classList.remove('opening');
    }
  };

  // Add Task dialog opener
  const openAddTaskDialog = (prefilledDate = "") => {
    const activeRole = WazirStore.getActiveRole();
    const activeJuniorId = WazirStore.getSelectedJuniorId();
    const activeJunior = WazirStore.getUser(activeJuniorId);
    const dialog = document.getElementById('task-dialog');
    const form = document.getElementById('task-form');
    
    form.reset();

    // Populate junior dropdown select
    const juniorSelect = document.getElementById('task-form-junior');
    const juniors = WazirStore.getUsers().filter(u => u.role === 'junior');
    
    // Label shift based on role
    const assigneeLabel = document.getElementById('task-form-assignee-label');
    const titleHeader = document.getElementById('task-dialog-title');
    
    titleHeader.textContent = "Add Task";
    assigneeLabel.textContent = "Assignee (Junior)";
    juniorSelect.innerHTML = juniors.map(j => `<option value="${j.id}">${j.name} (${j.vertical})</option>`).join('');
    
    document.getElementById('task-form-senior').value = "Wazir Senior";
    if (activeRole === 'admin') {
      document.getElementById('task-form-senior').readOnly = true;
    } else {
      document.getElementById('task-form-senior').readOnly = false;
    }
    
    // Auto-prefill task vertical to match the first junior in the list
    if (juniors.length > 0) {
      document.getElementById('task-form-vertical').value = juniors[0].vertical;
    }

    // Set minimum date to today
    const dtInput = document.getElementById('task-form-deadline');
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const minISO = new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
    dtInput.min = minISO;

    // Prefill date if passed (e.g. from calendar click)
    if (prefilledDate) {
      dtInput.value = prefilledDate;
    } else {
      // Default to tomorrow 6pm
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      dtInput.value = new Date(tomorrow.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
    }

    openDialog('task-dialog');
  };

  const handleTaskFormJuniorChange = (juniorId) => {
    const junior = WazirStore.getUser(juniorId);
    if (junior) {
      document.getElementById('task-form-vertical').value = junior.vertical;
    }
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();

    const name = document.getElementById('task-form-name').value;
    const description = document.getElementById('task-form-desc').value;
    const vertical = document.getElementById('task-form-vertical').value;
    const priority = document.getElementById('task-form-priority').value;
    const deadline = document.getElementById('task-form-deadline').value;
    const juniorId = document.getElementById('task-form-junior').value;
    const assignedBy = document.getElementById('task-form-senior').value;
    const notes = document.getElementById('task-form-notes').value;

    WazirStore.addTask({
      name,
      description,
      vertical,
      priority,
      deadline,
      juniorId,
      assignedBy,
      notes
    });

    closeDialog('task-dialog');
    showToast("Task logged successfully!", "success");
    
    // Sweep for email triggers immediately
    WazirEmailService.triggerManualSweep();

    // Refresh view
    handleRouting();
  };

  // Inspect Task Details Modal Opener
  let activeDetailsTaskId = null;
  const openDetailsDialog = (taskId) => {
    activeDetailsTaskId = taskId;
    const task = WazirStore.getTask(taskId);
    const activeRole = WazirStore.getActiveRole();
    const activeJuniorId = WazirStore.getSelectedJuniorId();
    if (!task) return;

    document.getElementById('details-task-name').textContent = task.name;
    document.getElementById('details-task-desc').textContent = task.description || "No description provided.";
    document.getElementById('details-task-deadline').textContent = WazirStore.formatFriendlyDate(task.deadline);
    document.getElementById('details-task-senior').textContent = task.assignedBy;
    
    // Status Select box setup
    const statusSelect = document.getElementById('details-status-select');
    statusSelect.value = task.status;

    // Check if Junior vs Admin limits status dropdown
    // Only the assigned junior (or an admin) can update statuses
    if (activeRole === 'junior' && task.juniorId !== activeJuniorId) {
      statusSelect.disabled = true;
    } else {
      statusSelect.disabled = false;
    }

    // Attachments
    const attachWrapper = document.getElementById('details-attachments-wrapper');
    const attachList = document.getElementById('details-attachments');
    if (task.attachments && task.attachments.length > 0) {
      attachWrapper.style.display = "block";
      attachList.innerHTML = task.attachments.map(att => `
        <li style="margin-bottom: 6px;">
          📎 <a href="${att.url}" style="color:var(--color-primary); font-weight:700; text-decoration:none;">${att.name}</a>
        </li>
      `).join('');
    } else {
      attachWrapper.style.display = "none";
    }

    // Secondary Notes
    const notesWrapper = document.getElementById('details-notes-wrapper');
    const notesContent = document.getElementById('details-task-notes');
    if (task.notes) {
      notesWrapper.style.display = "block";
      notesContent.textContent = task.notes;
    } else {
      notesWrapper.style.display = "none";
    }

    // Badges area
    const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'Completed';
    const overdueBadge = document.getElementById('details-deadline-notice');
    overdueBadge.style.display = isOverdue ? 'inline-flex' : 'none';

    const badgesOutlet = document.getElementById('details-badges');
    badgesOutlet.innerHTML = `
      <span class="badge badge-vertical-${task.vertical.toLowerCase()}">${task.vertical}</span>
      <span class="badge badge-priority-${task.priority.toLowerCase()}">${task.priority}</span>
    `;

    // Deadline Change Request Button rules
    const reqBtn = document.getElementById('details-request-dl-btn');
    if (activeUser.role === 'junior' && task.juniorId === activeUser.id && task.status !== 'Completed') {
      reqBtn.style.display = "block";
    } else {
      reqBtn.style.display = "none";
    }

    // Timeline list
    const timelineOutlet = document.getElementById('details-task-history');
    timelineOutlet.innerHTML = task.history.map(h => `
      <div class="history-item">
        <div class="history-meta">
          <span class="history-user">${h.user}</span>
          <span>${WazirStore.formatFriendlyDate(h.date)}</span>
        </div>
        <div class="history-desc">${h.details}</div>
      </div>
    `).join('');

    openDialog('details-dialog');
  };

  const handleDetailsStatusChange = (newStatus) => {
    if (!activeDetailsTaskId) return;
    const activeRole = WazirStore.getActiveRole();
    const userId = activeRole === 'admin' ? 'admin_senior' : WazirStore.getSelectedJuniorId();
    
    WazirStore.updateTaskStatus(activeDetailsTaskId, newStatus, userId);
    showToast(`Status updated to ${newStatus}`, "success");
    
    // Refresh modal details
    openDetailsDialog(activeDetailsTaskId);
    
    // Refresh background boards
    handleRouting();
  };

  // Submit extension request dialog opener
  const triggerDeadlineChangeRequest = () => {
    if (!activeDetailsTaskId) return;
    const task = WazirStore.getTask(activeDetailsTaskId);
    if (!task) return;

    // Check if a request already exists
    const hasPending = WazirStore.getRequests().some(r => r.taskId === task.id && r.status === 'Pending');
    if (hasPending) {
      showToast("An extension request is already pending for this task.", "warning");
      return;
    }

    // Close details
    closeDialog('details-dialog');

    // Populate request dialog
    document.getElementById('request-form-task-id').value = task.id;
    document.getElementById('request-task-name').textContent = task.name;
    document.getElementById('request-task-current-dl').textContent = WazirStore.formatFriendlyDate(task.deadline);
    
    // Prefill date input to current deadline
    const dtInput = document.getElementById('request-form-new-dl');
    const dlDate = new Date(task.deadline);
    const offset = dlDate.getTimezoneOffset();
    dtInput.value = new Date(dlDate.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
    dtInput.min = new Date().toISOString().slice(0, 16);

    document.getElementById('request-form-reason').value = "";

    setTimeout(() => {
      openDialog('request-dialog');
    }, 150);
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();

    const taskId = document.getElementById('request-form-task-id').value;
    const requestedDeadline = document.getElementById('request-form-new-dl').value;
    const reason = document.getElementById('request-form-reason').value;

    try {
      WazirStore.addRequest({
        taskId,
        requestedDeadline,
        reason
      });

      closeDialog('request-dialog');
      showToast("Deadline change request submitted!", "success");
      
      // Refresh views
      handleRouting();
    } catch(err) {
      showToast(err.message, "danger");
    }
  };

  // Admin approval dialog review
  let activeReviewReqId = null;
  const openReviewDialog = (reqId) => {
    activeReviewReqId = reqId;
    const req = WazirStore.getRequest(reqId);
    if (!req) return;

    const task = WazirStore.getTask(req.taskId);
    const junior = WazirStore.getUser(req.juniorId);

    document.getElementById('review-form-req-id').value = req.id;
    document.getElementById('review-req-user').textContent = junior.name;
    document.getElementById('review-req-task').textContent = task.name;
    document.getElementById('review-req-current-dl').textContent = WazirStore.formatFriendlyDate(req.currentDeadline);
    document.getElementById('review-req-new-dl').textContent = WazirStore.formatFriendlyDate(req.requestedDeadline);
    document.getElementById('review-req-reason').textContent = req.reason;
    document.getElementById('review-form-rejection-reason').value = "";

    openDialog('review-dialog');
  };

  const handleReviewSubmit = (e, status) => {
    if (e) e.preventDefault();
    if (!activeReviewReqId) return;

    const rejectionReason = document.getElementById('review-form-rejection-reason').value;

    WazirStore.reviewRequest(activeReviewReqId, status, rejectionReason, 'admin_senior');
    closeDialog('review-dialog');
    showToast(`Request ${status} successfully!`, "success");

    // Sweep for email triggers immediately (if approved, email reminder 1 day before the new date should schedule)
    WazirEmailService.triggerManualSweep();

    handleRouting();
  };

  const handleReviewReject = () => {
    const remarks = document.getElementById('review-form-rejection-reason').value;
    if (!remarks.trim()) {
      showToast("Please provide a rejection reason in the remarks field.", "warning");
      return;
    }
    handleReviewSubmit(null, 'Rejected');
  };

  // Quick Action review without popup
  const quickReviewRequest = (reqId, status) => {
    if (status === 'Rejected') {
      const reason = prompt("Enter rejection reason:");
      if (reason === null) return; // user cancelled prompt
      WazirStore.reviewRequest(reqId, 'Rejected', reason, 'admin_senior');
    } else {
      WazirStore.reviewRequest(reqId, 'Approved', "", 'admin_senior');
    }

    showToast(`Request ${status}!`, "success");
    WazirEmailService.triggerManualSweep();
    handleRouting();
  };

  // ================= SMTP EMAIL SIMULATOR WINDOW =================

  const openEmailConsole = () => {
    const emails = WazirStore.getEmailLogs();
    const listOutlet = document.getElementById('email-simulator-list');
    
    renderEmailList(emails);
    
    // Clear content pane on open
    const contentOutlet = document.getElementById('email-simulator-content');
    contentOutlet.innerHTML = `
      <div class="email-detail-empty">
        <span>📪 Select an email from the inbox list to read it.</span>
      </div>
    `;

    // Make split container styling clean
    document.getElementById('email-split-container').classList.remove('show-detail');

    openDialog('email-dialog');
  };

  const renderEmailList = (emails) => {
    const listOutlet = document.getElementById('email-simulator-list');
    
    if (emails.length === 0) {
      listOutlet.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">Inbox is empty. No automated reminders triggered yet.</div>`;
    } else {
      listOutlet.innerHTML = emails.map(email => `
        <div class="email-list-item" id="email-item-${email.id}" onclick="WazirApp.selectEmail('${email.id}')">
          <div class="email-item-title">To: ${email.to}</div>
          <div class="email-item-subject">${email.subject}</div>
          <div class="email-item-date">${WazirStore.formatFriendlyDate(email.sentAt)}</div>
        </div>
      `).join('');
    }
  };

  const selectEmail = (emailId) => {
    const emails = WazirStore.getEmailLogs();
    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    // Highlight item
    document.querySelectorAll('.email-list-item').forEach(item => item.classList.remove('active'));
    document.getElementById(`email-item-${email.id}`).classList.add('active');

    // Load body
    const contentOutlet = document.getElementById('email-simulator-content');
    contentOutlet.innerHTML = `
      <button class="btn btn-secondary btn-sm mobile-only" style="margin-bottom: 12px; align-self: flex-start;" onclick="WazirApp.toggleEmailList()">◀ Back to Inbox</button>
      <div class="email-detail-header">
        <div class="email-detail-to">To: &lt;${email.to}&gt;</div>
        <div class="email-detail-subject">${email.subject}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Sent: ${WazirStore.formatFriendlyDate(email.sentAt)}</div>
      </div>
      <div class="email-detail-body">
        ${email.body}
      </div>
    `;

    // Toggle view layout on mobile
    document.getElementById('email-split-container').classList.add('show-detail');
  };

  const toggleEmailList = () => {
    document.getElementById('email-split-container').classList.remove('show-detail');
  };

  // ================= NEW WORKSPACE & ATTENDANCE METHODS =================
  
  // Login Controllers
  const populateLoginDropdowns = () => {
    // No-op: Junior dropdown removed from login overlay
  };

  // Removed active junior selection methods

  const updateUserProfileDisplays = () => {
    const user = WazirStore.getCurrentUser();
    if (!user) return;

    const headerAvatar = document.getElementById('header-user-avatar');
    const headerName = document.getElementById('header-user-name');
    if (headerAvatar) headerAvatar.textContent = user.avatar;
    if (headerName) headerName.textContent = user.name;

    const settingsAvatar = document.getElementById('settings-user-avatar');
    const settingsName = document.getElementById('settings-user-name');
    const settingsRole = document.getElementById('settings-user-role');
    const settingsEmail = document.getElementById('settings-user-email');
    const settingsVertical = document.getElementById('settings-user-vertical');

    if (settingsAvatar) settingsAvatar.textContent = user.avatar;
    if (settingsName) settingsName.textContent = user.name;
    if (settingsRole) {
      settingsRole.textContent = user.role === 'admin' ? 'Senior Administrator' : 'Junior Member';
      settingsRole.className = user.role === 'admin' ? 'badge badge-rose' : 'badge';
    }
    if (settingsEmail) settingsEmail.textContent = user.email;
    if (settingsVertical) settingsVertical.textContent = user.vertical;

    // Toggle reset cache button (only seniors can reset data)
    const settingsResetBtn = document.getElementById('settings-reset-btn');
    if (settingsResetBtn) {
      settingsResetBtn.style.display = user.role === 'admin' ? 'block' : 'none';
    }

    // Toggle workspace switcher text
    const switchBtn = document.getElementById('settings-switch-role-btn');
    if (switchBtn) {
      if (user.role === 'admin') {
        switchBtn.textContent = "Switch to Junior Workspace";
        switchBtn.className = "btn btn-secondary";
      } else {
        switchBtn.textContent = "Switch to Senior Workspace";
        switchBtn.className = "btn btn-primary";
      }
    }
  };

  const handleSettingsRoleSwitch = () => {
    const currentRole = WazirStore.getActiveRole();
    if (currentRole === 'junior') {
      const password = prompt("Enter Senior password to switch workspace:");
      const cleanPwd = (password || '').trim();
      if (cleanPwd.toLowerCase() === 'stwazir8') {
        WazirStore.logIn('admin');
        window.location.hash = '#/admin-overview';
        updateThemeClass();
        handleRouting();
      } else if (password !== null) {
        alert("Incorrect password. Access denied.");
      }
    } else {
      const juniorId = WazirStore.getSelectedJuniorId() || 'junior_animesh';
      WazirStore.logIn('junior', juniorId);
      window.location.hash = '#/dashboard';
      updateThemeClass();
      handleRouting();
    }
  };

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    const role = document.getElementById('login-role-select').value;
    
    if (role === 'admin') {
      const passwordInput = document.getElementById('login-password-input');
      const password = passwordInput ? passwordInput.value : '';
      const cleanPwd = (password || '').trim();
      if (cleanPwd.toLowerCase() === 'stwazir8') {
        if (passwordInput) passwordInput.value = '';
        WazirStore.logIn('admin');
        window.location.hash = '#/admin-overview';
      } else {
        alert("Incorrect password. Access denied.");
      }
    } else {
      const juniorId = WazirStore.getSelectedJuniorId() || 'junior_animesh';
      WazirStore.logIn('junior', juniorId);
      showToast(`Logged in to Junior Workspace.`, "success");
      window.location.hash = '#/dashboard';
    }
  };

  const toggleLoginFields = (role) => {
    const passwordGroup = document.getElementById('login-password-group');
    if (role === 'admin') {
      if (passwordGroup) passwordGroup.style.display = 'block';
    } else {
      if (passwordGroup) passwordGroup.style.display = 'none';
    }
  };

  const handleLogout = () => {
    WazirStore.logOut();
    showToast("Logged out successfully.", "info");
    window.location.hash = '#/login';
  };

  const toggleThemeMode = (isDark) => {
    WazirStore.setTheme(isDark ? 'dark' : 'light');
    showToast(`Theme updated to ${isDark ? 'Dark' : 'Light'} Mode.`, "success");
  };

  // Removed changeActiveJunior method

  // Local Timezone-Safe Date Formatter (Prevents UTC date shifts near midnight)
  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Junior Attendance Controllers
  let juniorAttDate = getLocalDateStr();

  const populateDateSelect = (elementId, selectedValue) => {
    const select = document.getElementById(elementId);
    if (!select) return;
    
    select.innerHTML = '';
    
    // Generate dates: 14 days ago to today
    const dates = [];
    const now = new Date();
    
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = getLocalDateStr(d);
      
      let label = "";
      if (i === 0) label = "Today";
      else if (i === 1) label = "Yesterday";
      else {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        label = `${d.getDate()} ${months[d.getMonth()]}`;
      }
      
      dates.push({ value: dateStr, label: `${label} (${d.getFullYear()})` });
    }
    
    select.innerHTML = dates.map(d => `<option value="${d.value}">${d.label}</option>`).join('');
    select.value = selectedValue;
  };

  const renderJuniorAttendance = () => {
    populateDateSelect('junior-attendance-date-select', juniorAttDate);

    const juniors = WazirStore.getJuniors();
    const logs = WazirStore.getAttendanceLogs(juniorAttDate);

    const tbody = document.getElementById('junior-attendance-table-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    juniors.forEach(j => {
      const log = logs.find(l => l.juniorId === j.id);
      const logStatus = log ? log.status : 'Absent (Unmarked)';
      const badgeClass = logStatus === 'Present' ? 'badge-success' : logStatus === 'Late' ? 'badge-warning' : 'badge-danger';
      let checkInLabel = '—';
      if (log && log.checkInTime) {
        const formatted = WazirStore.formatFriendlyDate(log.checkInTime);
        const parts = formatted.split(',');
        checkInLabel = parts.length > 1 ? parts[1].trim() : formatted;
      }
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:28px; height:28px; border-radius:50%; background-color:var(--primary-color); color:#fff; font-weight:700; font-size:0.75rem; display:flex; align-items:center; justify-content:center;">${j.avatar}</div>
            <strong style="color:var(--text-primary);">${j.name}</strong>
          </div>
        </td>
        <td><span class="badge">${j.vertical}</span></td>
        <td>${juniorAttDate}</td>
        <td><span class="badge ${badgeClass}">${logStatus}</span></td>
        <td>${checkInLabel}</td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 4px; justify-content: flex-end;">
            <button class="btn ${logStatus === 'Present' ? 'btn-success' : 'btn-secondary'} btn-sm" style="font-size:0.7rem; padding: 4px 8px;" onclick="WazirApp.markAttendanceFromJuniorView('${j.id}', 'Present')">Present</button>
            <button class="btn ${logStatus === 'Late' ? 'btn-warning' : 'btn-secondary'} btn-sm" style="font-size:0.7rem; padding: 4px 8px;" onclick="WazirApp.markAttendanceFromJuniorView('${j.id}', 'Late')">Late</button>
            <button class="btn ${logStatus === 'Absent' ? 'btn-danger' : 'btn-secondary'} btn-sm" style="font-size:0.7rem; padding: 4px 8px;" onclick="WazirApp.markAttendanceFromJuniorView('${j.id}', 'Absent')">Absent</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };

  const changeJuniorAttendanceDate = (value) => {
    juniorAttDate = value;
    renderJuniorAttendance();
  };

  const markAttendanceFromJuniorView = async (juniorId, status) => {
    const checkInTime = status === 'Absent' ? null : new Date().toISOString();
    try {
      await WazirStore.markAttendance(juniorId, juniorAttDate, status, checkInTime);
      showToast(`Marked ${WazirStore.getUser(juniorId).name} as ${status}`, "success");
      renderJuniorAttendance();
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  // Admin Attendance Controllers
  let adminAttDate = getLocalDateStr();

  // Admin Attendance Controllers
  let adminAttCalMonth = new Date().getMonth();
  let adminAttCalYear = new Date().getFullYear();
  let activeEditAttendanceDate = "";

  const renderAdminAttendance = () => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const titleEl = document.getElementById('admin-attendance-month-year');
    if (titleEl) {
      titleEl.textContent = `${monthNames[adminAttCalMonth]} ${adminAttCalYear}`;
    }

    const grid = document.getElementById('admin-attendance-calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Weekdays row
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    daysOfWeek.forEach(day => {
      const el = document.createElement('div');
      el.className = 'calendar-weekday';
      el.textContent = day;
      grid.appendChild(el);
    });

    // Paging metrics
    const firstDayIndex = new Date(adminAttCalYear, adminAttCalMonth, 1).getDay();
    const lastDay = new Date(adminAttCalYear, adminAttCalMonth + 1, 0).getDate();
    const prevLastDay = new Date(adminAttCalYear, adminAttCalMonth, 0).getDate();
    const totalCells = 42; // standard grid layout

    const juniors = WazirStore.getJuniors();

    // Render 42 cells
    for (let i = 1; i <= totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';

      let dayNum;
      let targetDate;
      let isOtherMonth = false;

      if (i <= firstDayIndex) {
        cell.classList.add('other-month');
        dayNum = prevLastDay - firstDayIndex + i;
        targetDate = new Date(adminAttCalYear, adminAttCalMonth - 1, dayNum);
        isOtherMonth = true;
      } else if (i > firstDayIndex + lastDay) {
        cell.classList.add('other-month');
        dayNum = i - (firstDayIndex + lastDay);
        targetDate = new Date(adminAttCalYear, adminAttCalMonth + 1, dayNum);
        isOtherMonth = true;
      } else {
        dayNum = i - firstDayIndex;
        targetDate = new Date(adminAttCalYear, adminAttCalMonth, dayNum);
      }

      const isSunday = targetDate.getDay() === 0;
      const dateStr = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`;

      // Check if targetDate is in the future relative to the client local time
      const today = new Date();
      today.setHours(0,0,0,0);
      const cellDate = new Date(targetDate);
      cellDate.setHours(0,0,0,0);
      const isFuture = cellDate > today;

      let cellHTML = `<div class="day-number" style="font-weight:700; font-size:0.85rem; margin-bottom:4px;">${dayNum}</div>`;
      
      // Override flex styles to stack items top-to-bottom cleanly
      cell.style.justifyContent = 'flex-start';
      cell.style.gap = '2px';

      if (isSunday) {
        cell.style.pointerEvents = 'none';
        cell.style.opacity = '0.35';
        cell.style.background = 'transparent';
        cell.style.borderStyle = 'dashed';
        cellHTML += `<div style="font-size:0.65rem; color:var(--text-muted); font-weight:700; margin-top:2px;">SUNDAY</div>`;
      } else if (isFuture) {
        cell.style.opacity = '0.35';
        cell.style.pointerEvents = 'none';
        // Future date: hide attendance stats
      } else {
        // Attendance logs for this date
        const logs = WazirStore.getAttendanceLogs(dateStr);
        let presentCount = 0;
        const absentees = [];

        juniors.forEach(j => {
          const log = logs.find(l => l.juniorId === j.id);
          if (log && (log.status === 'Present' || log.status === 'Late')) {
            presentCount++;
          } else {
            absentees.push(j.name);
          }
        });

        // Show present count as a green pill tile
        cellHTML += `
          <span class="badge badge-success att-present-badge" style="font-size:0.65rem; font-weight:700; padding: 2px 6px; margin-top:2px; display:inline-flex; border: none; align-self:flex-start; text-transform:none;">
            ${presentCount} Present
          </span>
        `;

        // Show absentees as red pill tiles
        if (absentees.length > 0) {
          const absenteeTiles = absentees.map(name => 
            `<span class="badge badge-danger" style="font-size:0.55rem; padding: 1px 4px; font-weight:600; border: none; white-space:nowrap; text-transform:none;">${name}</span>`
          ).join('');
          
          cellHTML += `
            <div class="att-absentee-list" style="display:flex; flex-wrap:wrap; gap:3px; margin-top:4px;">
              ${absenteeTiles}
            </div>
            <div class="att-mobile-absent-summary" style="display:none; margin-top:2px;">
              <span class="badge badge-danger" style="font-size:0.55rem; padding: 1px 4px; border:none; text-transform:none;">🔴 ${absentees.length}</span>
            </div>
          `;
        } else {
          cellHTML += `
            <div class="att-absentee-list" style="display:flex; flex-wrap:wrap; gap:3px; margin-top:4px;">
              <span class="badge badge-neutral" style="font-size:0.55rem; padding: 1px 4px; border: none; text-transform:none;">🎉 Full Team</span>
            </div>
          `;
        }

        if (!isOtherMonth) {
          cell.onclick = () => WazirApp.openEditAttendanceDialog(dateStr);
        } else {
          cell.style.opacity = '0.5';
          cell.style.pointerEvents = 'none';
        }
      }

      cell.innerHTML = cellHTML;
      grid.appendChild(cell);
    }
  };

  const changeAdminAttendanceMonth = (offset) => {
    adminAttCalMonth += offset;
    if (adminAttCalMonth < 0) {
      adminAttCalMonth = 11;
      adminAttCalYear--;
    } else if (adminAttCalMonth > 11) {
      adminAttCalMonth = 0;
      adminAttCalYear++;
    }
    renderAdminAttendance();
  };

  const openEditAttendanceDialog = (dateStr) => {
    activeEditAttendanceDate = dateStr;
    const dateLabel = WazirStore.formatFriendlyDate(dateStr + "T00:00:00").split(',')[0];
    document.getElementById('edit-attendance-dialog-date').textContent = dateLabel;

    renderEditAttendanceDialogTable();
    openDialog('admin-attendance-edit-dialog');
  };

  const renderEditAttendanceDialogTable = () => {
    const juniors = WazirStore.getJuniors();
    const logs = WazirStore.getAttendanceLogs(activeEditAttendanceDate);
    const tbody = document.getElementById('edit-attendance-dialog-table-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    juniors.forEach(j => {
      const log = logs.find(l => l.juniorId === j.id);
      const logStatus = log ? log.status : 'Absent (Unmarked)';
      const badgeClass = logStatus === 'Present' ? 'badge-success' : logStatus === 'Late' ? 'badge-warning' : 'badge-danger';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:24px; height:24px; border-radius:50%; background-color:var(--primary-color); color:#fff; font-weight:700; font-size:0.7rem; display:flex; align-items:center; justify-content:center;">${j.avatar}</div>
            <strong style="color:var(--text-primary); font-size:0.85rem;">${j.name}</strong>
          </div>
        </td>
        <td><span class="badge" style="font-size:0.75rem; padding: 2px 6px;">${j.vertical}</span></td>
        <td><span class="badge ${badgeClass}" style="font-size:0.75rem; padding: 2px 6px;">${logStatus}</span></td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 4px; justify-content: flex-end;">
            <button class="btn ${logStatus === 'Present' ? 'btn-success' : 'btn-secondary'} btn-sm" style="font-size:0.7rem; padding: 4px 8px;" onclick="WazirApp.markAttendanceFromEditDialog('${j.id}', 'Present')">Present</button>
            <button class="btn ${logStatus === 'Late' ? 'btn-warning' : 'btn-secondary'} btn-sm" style="font-size:0.7rem; padding: 4px 8px;" onclick="WazirApp.markAttendanceFromEditDialog('${j.id}', 'Late')">Late</button>
            <button class="btn ${logStatus === 'Absent' ? 'btn-danger' : 'btn-secondary'} btn-sm" style="font-size:0.7rem; padding: 4px 8px;" onclick="WazirApp.markAttendanceFromEditDialog('${j.id}', 'Absent')">Absent</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };

  const markAttendanceFromEditDialog = async (juniorId, status) => {
    const checkInTime = status === 'Absent' ? null : new Date().toISOString();
    try {
      await WazirStore.markAttendance(juniorId, activeEditAttendanceDate, status, checkInTime);
      showToast(`Marked ${WazirStore.getUser(juniorId).name} as ${status}`, "success");
      renderEditAttendanceDialogTable();
      renderAdminAttendance();
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  const copySupabaseSetupSQL = () => {
    const sql = `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;\n\nALTER TABLE users DISABLE ROW LEVEL SECURITY;\nALTER TABLE tasks DISABLE ROW LEVEL SECURITY;\nALTER TABLE requests DISABLE ROW LEVEL SECURITY;\nALTER TABLE notifications DISABLE ROW LEVEL SECURITY;\nALTER TABLE email_logs DISABLE ROW LEVEL SECURITY;\nALTER TABLE attendance DISABLE ROW LEVEL SECURITY;\n\nDROP POLICY IF EXISTS "allow_anon_attendance" ON attendance;\nCREATE POLICY "allow_anon_attendance" ON attendance FOR ALL TO anon USING (true) WITH CHECK (true);`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sql).then(() => {
        alert("SQL Setup Command Copied to Clipboard!\n\nNext Step:\n1. Open your Supabase Dashboard -> SQL Editor\n2. Paste this SQL\n3. Click 'Run'\n\nThis grants 100% unrestricted cross-device sync across all phones & laptops!");
      }).catch(() => {
        prompt("Copy this SQL command and run it in your Supabase SQL Editor:", sql);
      });
    } else {
      prompt("Copy this SQL command and run it in your Supabase SQL Editor:", sql);
    }
  };

  const bulkMarkAttendance = async (status) => {
    if (!activeEditAttendanceDate) return;
    try {
      await WazirStore.markBulkAttendance(activeEditAttendanceDate, status);
      renderEditAttendanceDialogTable();
      renderAdminAttendance();
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  const bulkMarkAttendanceFromPage = async (status) => {
    const targetDate = juniorAttDate || getLocalDateStr();
    try {
      await WazirStore.markBulkAttendance(targetDate, status);
      renderJuniorAttendance();
      renderAdminAttendance();
    } catch (err) {
      alert("Error marking bulk attendance: " + err.message);
    }
  };

  const saveGoogleSheetConfig = () => {
    const input = document.getElementById('settings-google-sheet-url');
    if (input) {
      const url = input.value.trim();
      WazirStore.setGoogleSheetUrl(url);
      alert(url ? "Google Sheet URL saved successfully! Live sheet sync activated." : "Google Sheet URL cleared.");
    }
  };

  const copyGoogleAppsScriptCode = () => {
    const code = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};
  var sheets = ["attendance", "tasks", "requests"];
  
  sheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      if (name === "attendance") sheet.appendRow(["id", "juniorId", "date", "status", "checkInTime"]);
      if (name === "tasks") sheet.appendRow(["id", "name", "description", "vertical", "priority", "deadline", "assignedBy", "juniorId", "status", "createdAt"]);
      if (name === "requests") sheet.appendRow(["id", "taskId", "juniorId", "currentDeadline", "requestedDeadline", "reason", "requestedOn", "status"]);
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = [];
    
    for (var i = 1; i < data.length; i++) {
      var rowObj = {};
      for (var j = 0; j < headers.length; j++) {
        rowObj[headers[j]] = data[i][j];
      }
      rows.push(rowObj);
    }
    result[name] = rows;
  });
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  
  if (action === "saveAttendance") {
    var sheet = ss.getSheetByName("attendance") || ss.insertSheet("attendance");
    var logs = body.logs || [];
    sheet.clear();
    sheet.appendRow(["id", "juniorId", "date", "status", "checkInTime"]);
    logs.forEach(function(l) {
      sheet.appendRow([l.id, l.juniorId, l.date, l.status, l.checkInTime || ""]);
    });
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "error" })).setMimeType(ContentService.MimeType.JSON);
}`;

    navigator.clipboard.writeText(code).then(() => {
      alert("Google Apps Script code copied to clipboard! Paste it into Google Sheet -> Extensions -> Apps Script -> Deploy as Web App (Anyone).");
    }).catch(err => {
      alert("Apps Script Code:\n\n" + code);
    });
  };

  return {
    init,
    navigate,
    showToast,
    copySupabaseSetupSQL,
    saveGoogleSheetConfig,
    copyGoogleAppsScriptCode,
    bulkMarkAttendance,
    bulkMarkAttendanceFromPage,
    switchUser,
    applyFilters,
    markNotifRead,
    markAllNotificationsRead,
    
    // Login and active session utilities
    handleLoginSubmit,
    toggleLoginFields,
    handleLogout,
    toggleThemeMode,
    handleSettingsRoleSwitch,
    
    // Attendance actions
    renderJuniorAttendance,
    changeJuniorAttendanceDate,
    markAttendanceFromJuniorView,
    renderAdminAttendance,
    changeAdminAttendanceMonth,
    openEditAttendanceDialog,
    markAttendanceFromEditDialog,
    
    // Dialog actions
    openDialog,
    closeDialog,
    openAddTaskDialog,
    handleTaskFormJuniorChange,
    handleTaskSubmit,
    openDetailsDialog,
    handleDetailsStatusChange,
    triggerDeadlineChangeRequest,
    handleRequestSubmit,
    openReviewDialog,
    handleReviewSubmit,
    handleReviewReject,
    quickReviewRequest,

    // Calendar
    prevMonth,
    nextMonth,
    prevMonthAdmin,
    nextMonthAdmin,
    renderAdminCalendar,

    // Email
    openEmailConsole,
    selectEmail,
    toggleEmailList,
    
    // Voice Input Speech-To-Text
    startVoiceInput,

    // Refresh active views (for realtime syncing)
    refreshCurrentView: handleRouting
  };
})();

// Voice input handling using Web Speech API
let activeRecognition = null;
function startVoiceInput(inputId, btnEl) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    WazirApp.showToast("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.", "warning");
    return;
  }

  const input = document.getElementById(inputId);
  if (!input) return;

  // Toggle if already recording
  if (activeRecognition) {
    activeRecognition.stop();
    if (btnEl.classList.contains('recording')) {
      btnEl.classList.remove('recording');
      btnEl.textContent = '🎙️';
      activeRecognition = null;
      return;
    }
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    activeRecognition = recognition;
    btnEl.classList.add('recording');
    btnEl.textContent = '🔴';
    WazirApp.showToast("Listening... Speak now.", "info");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript) {
      if (input.tagName === 'TEXTAREA' || input.type === 'text') {
        // If it's a search field, overwrite it, otherwise append.
        if (inputId.includes('search')) {
          input.value = transcript;
        } else {
          input.value = input.value ? (input.value.trim() + " " + transcript) : transcript;
        }
        // Force input event so search filters and validation listeners are fired
        input.dispatchEvent(new Event('input'));
      }
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
    if (event.error === 'not-allowed') {
      WazirApp.showToast("Microphone permission denied. Please allow microphone access in your browser.", "danger");
    } else {
      WazirApp.showToast(`Speech recognition error: ${event.error}`, "warning");
    }
    btnEl.classList.remove('recording');
    btnEl.textContent = '🎙️';
    activeRecognition = null;
  };

  recognition.onend = () => {
    btnEl.classList.remove('recording');
    btnEl.textContent = '🎙️';
    activeRecognition = null;
  };

  recognition.start();
}


// Start Application on Load
window.addEventListener('DOMContentLoaded', async () => {
  // Pull database data from Supabase before initializing UI rendering
  await WazirStore.initSupabase();

  // If Supabase failed to initialize and load tables, notify user
  if (!WazirStore.isUsingSupabase()) {
    WazirApp.showToast("Database not initialized on Supabase. Running in Offline Mock mode. Please run the SQL schema.", "warning");
  }

  WazirApp.init();
});
