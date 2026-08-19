// Wazir Juniors - Supabase Cloud Database Store Manager

const WazirStore = (() => {
  // Supabase Configuration Credentials (supports Vercel Integration env variables & static fallback)
  const supabaseUrl = (typeof window !== 'undefined' && (window.SUPABASE_URL || window.NEXT_PUBLIC_SUPABASE_URL)) || 'https://qctpyulbwjiyvzyhsvfg.supabase.co';
  const supabaseKey = (typeof window !== 'undefined' && (window.SUPABASE_ANON_KEY || window.NEXT_PUBLIC_SUPABASE_ANON_KEY || window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) || 'sb_publishable_Skq8e-reB7Ym6L-dI5Z53Q_1MT0ekyA';
  
  let supabase = null;
  let usingSupabase = false;

  // Local Cached State Arrays
  let users = [];
  let tasks = [];
  let requests = [];
  let notifications = [];
  let emailLogs = [];
  let attendance = [];
  
  // Workspace UI states
  let activeRole = 'junior'; // 'junior' or 'admin'
  let selectedJuniorId = 'junior_animesh'; // Active selected junior in Junior view
  let isLoggedIn = false;
  let themeMode = 'light';

  // Seeding constants for local fallback
  const DEFAULT_ATTENDANCE = [
    { id: 'att_1', juniorId: 'junior_animesh', date: '2026-08-17', status: 'Present', checkInTime: '2026-08-17T09:15:00' },
    { id: 'att_2', juniorId: 'junior_avi', date: '2026-08-17', status: 'Present', checkInTime: '2026-08-17T09:05:00' },
    { id: 'att_3', juniorId: 'junior_nandini', date: '2026-08-17', status: 'Late', checkInTime: '2026-08-17T09:45:00' },
    { id: 'att_4', juniorId: 'junior_ishika', date: '2026-08-17', status: 'Present', checkInTime: '2026-08-17T09:10:00' },
    { id: 'att_5', juniorId: 'junior_akruti', date: '2026-08-17', status: 'Absent', checkInTime: null },
    { id: 'att_6', juniorId: 'junior_vishakha', date: '2026-08-17', status: 'Present', checkInTime: '2026-08-17T09:02:00' },
    { id: 'att_7', juniorId: 'junior_harshvardhan', date: '2026-08-17', status: 'Present', checkInTime: '2026-08-17T09:12:00' },
    { id: 'att_8', juniorId: 'junior_devanshi', date: '2026-08-17', status: 'Late', checkInTime: '2026-08-17T10:15:00' },
    { id: 'att_9', juniorId: 'junior_simarpreet', date: '2026-08-17', status: 'Present', checkInTime: '2026-08-17T09:00:00' },
    { id: 'att_10', juniorId: 'junior_somansha', date: '2026-08-17', status: 'Present', checkInTime: '2026-08-17T09:05:00' },
    { id: 'att_11', juniorId: 'junior_animesh', date: '2026-08-18', status: 'Present', checkInTime: '2026-08-18T08:50:00' },
    { id: 'att_12', juniorId: 'junior_avi', date: '2026-08-18', status: 'Present', checkInTime: '2026-08-18T09:00:00' },
    { id: 'att_13', juniorId: 'junior_nandini', date: '2026-08-18', status: 'Present', checkInTime: '2026-08-18T08:58:00' },
    { id: 'att_14', juniorId: 'junior_vishakha', date: '2026-08-18', status: 'Present', checkInTime: '2026-08-18T09:05:00' }
  ];

  // Initialize Supabase Client & Pull Data
  const initSupabase = async () => {
    try {
      if (typeof window.supabase === 'undefined') {
        throw new Error("Supabase library not loaded from CDN.");
      }

      // Create Supabase Client
      supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
      
      // Load active UI states
      activeRole = localStorage.getItem('wazir_active_role') || 'junior';
      selectedJuniorId = localStorage.getItem('wazir_selected_junior') || 'junior_animesh';
      isLoggedIn = localStorage.getItem('wazir_logged_in') === 'true';
      themeMode = localStorage.getItem('wazir_theme') || 'light';
      
      // Apply theme mode
      if (themeMode === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }

      // Helper to safely load local storage with fallback
      const loadLocal = (key, fallback) => {
        try {
          const val = localStorage.getItem(`wazir_${key}`);
          return val ? JSON.parse(val) : fallback;
        } catch (e) {
          return fallback;
        }
      };

      // Always initialize memory arrays from localStorage persistent state first
      users = loadLocal('users', DEFAULT_USERS);
      tasks = loadLocal('tasks', DEFAULT_TASKS);
      requests = loadLocal('requests', DEFAULT_REQUESTS);
      notifications = loadLocal('notifications', DEFAULT_NOTIFICATIONS);
      emailLogs = loadLocal('email_logs', DEFAULT_EMAIL_LOGS);
      attendance = loadLocal('attendance', DEFAULT_ATTENDANCE);

      // Test query to check if users table exists and fetch from Supabase
      const { data: usersData, error: usersErr } = await supabase.from('users').select('*');
      if (usersErr) throw usersErr;

      usingSupabase = true;

      if (usersData && usersData.length > 0) {
        users = usersData;
      } else {
        await supabase.from('users').upsert(users).catch(e => console.warn("Users auto-seed error:", e.message));
      }

      // Auto-migrate legacy 'Vishaka' spelling from remote Supabase table
      users = users.map(u => {
        if (u.name === 'Vishaka' || u.id === 'junior_vishaka') {
          return { ...u, id: 'junior_vishakha', name: 'Vishakha', email: 'vishakha@wazir.in' };
        }
        return u;
      });

      if (usingSupabase && supabase) {
        await supabase.from('users').upsert({
          id: 'junior_vishakha',
          name: 'Vishakha',
          email: 'vishakha@wazir.in',
          role: 'junior',
          vertical: 'CaseBook',
          avatar: 'VI'
        }).catch(e => {});
        await supabase.from('users').delete().eq('id', 'junior_vishaka').catch(e => {});
      }

      syncLocal('users', users);

      // Fetch remainder tables from Supabase Cloud
      const [tasksRes, reqsRes, notifsRes, emailRes, attRes] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('requests').select('*'),
        supabase.from('notifications').select('*'),
        supabase.from('email_logs').select('*'),
        supabase.from('attendance').select('*')
      ]);

      // Merge Cloud Tasks with Local Tasks (filtering out initial prototype sample tasks)
      const cleanTasks = (taskList) => (taskList || []).filter(t => !['task_1', 'task_2', 'task_3', 'task_4', 'task_5', 'task_6'].includes(t.id));

      if (tasksRes.data) {
        tasks = cleanTasks(tasksRes.data);
        syncLocal('tasks', tasks);
      } else {
        tasks = cleanTasks(tasks);
        syncLocal('tasks', tasks);
      }

      if (reqsRes.data && reqsRes.data.length > 0) {
        requests = reqsRes.data;
        syncLocal('requests', requests);
      }
      if (notifsRes.data && notifsRes.data.length > 0) {
        notifications = notifsRes.data;
        syncLocal('notifications', notifications);
      }
      if (emailRes.data && emailRes.data.length > 0) {
        emailLogs = emailRes.data;
        syncLocal('email_logs', emailLogs);
      }

      // Merge Cloud Attendance with Local Attendance (Cloud data ALWAYS takes 100% precedence over stale local cache!)
      if (attRes.data && attRes.data.length > 0) {
        const mergedAttMap = new Map();
        // 1. Put local cache first
        (attendance || []).forEach(a => mergedAttMap.set(`${a.juniorId}_${a.date}`, a));
        // 2. Overwrite with fresh Supabase Cloud data!
        attRes.data.forEach(a => mergedAttMap.set(`${a.juniorId}_${a.date}`, a));

        attendance = Array.from(mergedAttMap.values());
        syncLocal('attendance', attendance);
      } else if (attendance.length > 0) {
        // If Supabase attendance table is empty, upload initial local attendance records
        await supabase.from('attendance').upsert(attendance).catch(e => console.warn("Attendance auto-seed error:", e.message));
      }

      console.log("Connected to Supabase Cloud. Active records:", tasks.length, "tasks,", attendance.length, "attendance entries.");

      // Setup Realtime subscriptions and 4-second cross-device polling loop
      setupRealtimeSubscriptions();
      startPolling();

    } catch (err) {
      console.warn("Supabase connection failed or tables not initialized. Error:", err.message);
      console.warn("Falling back to local browser storage mock mode.");
      
      usingSupabase = false;
      
      // Fallback: load seed database from mockData.js or localStorage
      const loadLocal = (key, fallback) => {
        const val = localStorage.getItem(`wazir_${key}`);
        return val ? JSON.parse(val) : fallback;
      };
      
      users = loadLocal('users', DEFAULT_USERS);
      tasks = loadLocal('tasks', DEFAULT_TASKS);
      requests = loadLocal('requests', DEFAULT_REQUESTS);
      notifications = loadLocal('notifications', DEFAULT_NOTIFICATIONS);
      emailLogs = loadLocal('email_logs', DEFAULT_EMAIL_LOGS);
      attendance = loadLocal('attendance', DEFAULT_ATTENDANCE);
      
      activeRole = localStorage.getItem('wazir_active_role') || 'junior';
      selectedJuniorId = localStorage.getItem('wazir_selected_junior') || 'junior_animesh';
      isLoggedIn = localStorage.getItem('wazir_logged_in') === 'true';
      themeMode = localStorage.getItem('wazir_theme') || 'light';
      
      // Apply theme mode
      if (themeMode === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }

      // Auto-migrate from old placeholder names if needed
      if (users.some(u => u.id === 'junior_rahil')) {
        users = DEFAULT_USERS;
        tasks = DEFAULT_TASKS;
        requests = DEFAULT_REQUESTS;
        notifications = DEFAULT_NOTIFICATIONS;
        emailLogs = DEFAULT_EMAIL_LOGS;
        attendance = DEFAULT_ATTENDANCE;
        activeRole = 'junior';
        selectedJuniorId = 'junior_animesh';
        
        localStorage.setItem('wazir_users', JSON.stringify(users));
        localStorage.setItem('wazir_tasks', JSON.stringify(tasks));
        localStorage.setItem('wazir_requests', JSON.stringify(requests));
        localStorage.setItem('wazir_notifications', JSON.stringify(notifications));
        localStorage.setItem('wazir_email_logs', JSON.stringify(emailLogs));
        localStorage.setItem('wazir_attendance', JSON.stringify(attendance));
        localStorage.setItem('wazir_active_role', activeRole);
        localStorage.setItem('wazir_selected_junior', selectedJuniorId);
      }
    }
  };

  // Setup Postgres Change Listeners (Real-time syncing)
  const setupRealtimeSubscriptions = () => {
    if (!supabase) return;

    supabase.channel('public:db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const { data } = await supabase.from('tasks').select('*');
        if (data) {
          tasks = data;
          triggerUIRefresh();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, async () => {
        const { data } = await supabase.from('requests').select('*');
        if (data) {
          requests = data;
          triggerUIRefresh();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
        const { data } = await supabase.from('notifications').select('*');
        if (data) {
          notifications = data;
          triggerUIRefresh();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, async () => {
        const { data } = await supabase.from('attendance').select('*');
        if (data) {
          attendance = data;
          triggerUIRefresh();
        }
      })
      .subscribe();
  };

  let isPollingActive = false;
  const startPolling = () => {
    if (isPollingActive) return;
    isPollingActive = true;

    setInterval(async () => {
      if (!supabase) return;

      try {
        // 1. Unconditional Real-Time Sync for Attendance Table
        const { data: latestAtt, error: attErr } = await supabase.from('attendance').select('*');
        if (!attErr && latestAtt && latestAtt.length > 0) {
          const isDifferent = JSON.stringify(latestAtt) !== JSON.stringify(attendance);
          if (isDifferent) {
            console.log("⚡ Real-time Sync: Live attendance update received from Supabase Cloud.");
            attendance = latestAtt;
            syncLocal('attendance', attendance);
            triggerUIRefresh();
          }
        }

        // 2. Unconditional Real-Time Sync for Tasks Table
        const { data: latestTasks, error: taskErr } = await supabase.from('tasks').select('*');
        if (!taskErr && latestTasks) {
          const isDifferent = JSON.stringify(latestTasks) !== JSON.stringify(tasks);
          if (isDifferent) {
            console.log("⚡ Real-time Sync: Live tasks update received from Supabase Cloud.");
            tasks = latestTasks;
            syncLocal('tasks', tasks);
            triggerUIRefresh();
          }
        }

        // 3. Unconditional Real-Time Sync for Requests Table
        const { data: latestReqs, error: reqErr } = await supabase.from('requests').select('*');
        if (!reqErr && latestReqs) {
          const isDifferent = JSON.stringify(latestReqs) !== JSON.stringify(requests);
          if (isDifferent) {
            console.log("⚡ Real-time Sync: Live requests update received from Supabase Cloud.");
            requests = latestReqs;
            syncLocal('requests', requests);
            triggerUIRefresh();
          }
        }
      } catch (err) {
        console.warn("Real-time polling sync warning:", err);
      }
    }, 1500); // 1.5 second continuous sync loop
  };

  // Triggers visual refresh of active view in app.js on database change
  const triggerUIRefresh = () => {
    if (window.WazirApp && typeof window.WazirApp.refreshCurrentView === 'function') {
      window.WazirApp.refreshCurrentView();
    }
  };

  // Sync helper for Local persistent safety net
  const syncLocal = (key, data) => {
    try {
      localStorage.setItem(`wazir_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn("localStorage write error:", e);
    }
  };

  return {
    initSupabase,
    isUsingSupabase() {
      return usingSupabase;
    },
    getSupabaseStatus() {
      return {
        connected: usingSupabase,
        pollingActive: isPollingActive
      };
    },
    async clearSampleTasks() {
      tasks = tasks.filter(t => !['task_1', 'task_2', 'task_3', 'task_4', 'task_5', 'task_6'].includes(t.id));
      requests = requests.filter(r => r.id !== 'req_1');
      notifications = notifications.filter(n => !['notif_1', 'notif_2', 'notif_3'].includes(n.id));
      
      syncLocal('tasks', tasks);
      syncLocal('requests', requests);
      syncLocal('notifications', notifications);

      if (usingSupabase && supabase) {
        await supabase.from('tasks').delete().in('id', ['task_1', 'task_2', 'task_3', 'task_4', 'task_5', 'task_6']).catch(e => {});
        await supabase.from('requests').delete().eq('id', 'req_1').catch(e => {});
      }
      triggerUIRefresh();
    },

    // 2-Workspace Session Managers
    getActiveRole() {
      return activeRole;
    },
    setActiveRole(role) {
      activeRole = role;
      localStorage.setItem('wazir_active_role', role);
    },
    getSelectedJuniorId() {
      return selectedJuniorId;
    },
    setSelectedJuniorId(id) {
      selectedJuniorId = id;
      localStorage.setItem('wazir_selected_junior', id);
      triggerUIRefresh();
    },
    isLoggedIn() {
      return isLoggedIn;
    },
    logIn(role, juniorId) {
      isLoggedIn = true;
      localStorage.setItem('wazir_logged_in', 'true');
      
      activeRole = role;
      localStorage.setItem('wazir_active_role', role);
      
      if (role === 'junior' && juniorId) {
        selectedJuniorId = juniorId;
        localStorage.setItem('wazir_selected_junior', juniorId);
      }
      
      triggerUIRefresh();
    },
    logOut() {
      isLoggedIn = false;
      localStorage.setItem('wazir_logged_in', 'false');
      // clear session caching
      localStorage.removeItem('wazir_current_user');
      triggerUIRefresh();
    },
    getTheme() {
      return themeMode;
    },
    setTheme(theme) {
      themeMode = theme;
      localStorage.setItem('wazir_theme', theme);
      if (theme === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      triggerUIRefresh();
    },

    // Current User Profile Resolution
    getCurrentUser() {
      if (activeRole === 'admin') {
        return {
          id: "admin_senior",
          name: "Wazir Senior",
          email: "senior@wazir.in",
          role: "admin",
          vertical: "Other",
          avatar: "WS"
        };
      } else {
        return {
          id: "junior_workspace",
          name: "Junior",
          email: "junior@wazir.in",
          role: "junior",
          vertical: "Junior Workspace",
          avatar: "JR"
        };
      }
    },
    getUsers() {
      return users.map(u => (u.name === 'Vishaka' || u.id === 'junior_vishaka') ? { ...u, id: 'junior_vishakha', name: 'Vishakha', email: 'vishakha@wazir.in' } : u);
    },
    getJuniors() {
      return this.getUsers().filter(u => u.role === 'junior');
    },
    getUser(id) {
      if (id === 'junior_vishaka' || id === 'junior_vishakha') {
        return { id: 'junior_vishakha', name: 'Vishakha', email: 'vishakha@wazir.in', role: 'junior', vertical: 'CaseBook', avatar: 'VI' };
      }
      return this.getUsers().find(u => u.id === id);
    },

    // Tasks Management
    getTasks() {
      return tasks;
    },
    getTask(id) {
      return tasks.find(t => t.id === id);
    },
    async addTask(taskData) {
      const activeUser = this.getCurrentUser();
      const newTask = {
        id: `task_${Date.now()}`,
        name: taskData.name,
        description: taskData.description || "",
        vertical: taskData.vertical,
        priority: taskData.priority || "Medium",
        deadline: taskData.deadline, 
        assignedBy: activeRole === 'admin' ? activeUser.name : (taskData.assignedBy || "Wazir Senior"),
        juniorId: taskData.juniorId || activeUser.id,
        status: taskData.status || "Not Started",
        attachments: taskData.attachments || [],
        notes: taskData.notes || "",
        createdAt: new Date().toISOString(),
        history: [
          {
            date: new Date().toISOString(),
            type: "create",
            details: `Task created and assigned to ${this.getUser(taskData.juniorId || activeUser.id).name} with deadline ${this.formatFriendlyDate(taskData.deadline)}.`,
            user: activeRole === 'admin' ? activeUser.name : "Wazir Senior"
          }
        ]
      };
      
      // Update Cache
      tasks.unshift(newTask);
      syncLocal('tasks', tasks);

      // Cloud Write
      if (usingSupabase) {
        await supabase.from('tasks').insert([newTask]);
      }

      // Trigger notification for the junior if someone else assigned it
      if (newTask.juniorId !== activeUser.id) {
        await this.addNotification(
          newTask.juniorId,
          "New Task Assigned",
          `You have been assigned: "${newTask.name}".`,
          "task_assigned"
        );
      }
      
      return newTask;
    },
    
    async updateTaskStatus(taskId, status, userId) {
      const task = this.getTask(taskId);
      const user = this.getUser(userId);
      if (!task) return;

      const oldStatus = task.status;
      task.status = status;
      task.history.push({
        date: new Date().toISOString(),
        type: "status_change",
        details: `Status updated from '${oldStatus}' to '${status}'.`,
        user: user ? user.name : "System"
      });

      // Sync
      syncLocal('tasks', tasks);
      if (usingSupabase) {
        await supabase.from('tasks').update({ status, history: task.history }).eq('id', taskId);
      }

      return task;
    },

    // Deadline Requests
    getRequests() {
      return requests;
    },
    getRequest(id) {
      return requests.find(r => r.id === id);
    },
    async addRequest(reqData) {
      const activeUser = this.getCurrentUser();
      const task = this.getTask(reqData.taskId);
      if (!task) return;

      const hasPending = requests.some(r => r.taskId === reqData.taskId && r.status === 'Pending');
      if (hasPending) throw new Error("A deadline extension request is already pending review for this task.");

      const newReq = {
        id: `req_${Date.now()}`,
        taskId: reqData.taskId,
        juniorId: activeUser.id,
        currentDeadline: task.deadline,
        requestedDeadline: reqData.requestedDeadline,
        reason: reqData.reason,
        requestedOn: new Date().toISOString(),
        status: "Pending",
        rejectionReason: ""
      };

      // Cache Update
      requests.unshift(newReq);
      syncLocal('requests', requests);

      task.history.push({
        date: new Date().toISOString(),
        type: "deadline_change_request",
        details: `Requested extension to ${this.formatFriendlyDate(reqData.requestedDeadline)}. Reason: ${reqData.reason}`,
        user: activeUser.name
      });
      syncLocal('tasks', tasks);

      // Cloud Writes
      if (usingSupabase) {
        await Promise.all([
          supabase.from('requests').insert([newReq]),
          supabase.from('tasks').update({ history: task.history }).eq('id', task.id)
        ]);
      }

      // Notify Admins
      const admins = users.filter(u => u.role === 'admin');
      for (const admin of admins) {
        await this.addNotification(
          admin.id,
          "Deadline Extension Requested",
          `${activeUser.name} requested an extension for "${task.name}".`,
          "request_submitted"
        );
      }

      return newReq;
    },

    async reviewRequest(reqId, status, rejectionReason = "", reviewerId) {
      const req = this.getRequest(reqId);
      const reviewer = this.getUser(reviewerId);
      if (!req || req.status !== 'Pending') return;

      const task = this.getTask(req.taskId);
      if (!task) return;

      req.status = status;
      req.rejectionReason = rejectionReason;
      
      const actionTime = new Date().toISOString();

      if (status === 'Approved') {
        const oldDeadline = task.deadline;
        task.deadline = req.requestedDeadline;
        
        task.history.push({
          date: actionTime,
          type: "deadline_change",
          details: `Deadline extension APPROVED from ${this.formatFriendlyDate(oldDeadline)} to ${this.formatFriendlyDate(req.requestedDeadline)}.`,
          user: reviewer ? reviewer.name : "Admin"
        });

        // Notify Junior
        await this.addNotification(
          req.juniorId,
          "Deadline Request Approved",
          `Your request to extend "${task.name}" to ${this.formatFriendlyDate(req.requestedDeadline)} was approved.`,
          "request_approved"
        );
      } else {
        task.history.push({
          date: actionTime,
          type: "deadline_change",
          details: `Deadline extension REJECTED. Reason: ${rejectionReason || "None provided"}`,
          user: reviewer ? reviewer.name : "Admin"
        });

        // Notify Junior
        await this.addNotification(
          req.juniorId,
          "Deadline Request Rejected",
          `Your request to extend "${task.name}" was rejected. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`,
          "request_rejected"
        );
      }

      // Sync
      syncLocal('requests', requests);
      syncLocal('tasks', tasks);

      if (usingSupabase) {
        if (status === 'Approved') {
          await Promise.all([
            supabase.from('requests').update({ status, rejectionReason }).eq('id', reqId),
            supabase.from('tasks').update({ deadline: task.deadline, history: task.history }).eq('id', task.id)
          ]);
        } else {
          await Promise.all([
            supabase.from('requests').update({ status, rejectionReason }).eq('id', reqId),
            supabase.from('tasks').update({ history: task.history }).eq('id', task.id)
          ]);
        }
      }
    },

    // Attendance Methods
    getAttendanceLogs(dateStr) {
      return attendance.filter(a => a.date === dateStr);
    },
    getJuniorAttendanceSummary(juniorId) {
      const logs = attendance.filter(a => a.juniorId === juniorId);
      const present = logs.filter(a => a.status === 'Present').length;
      const late = logs.filter(a => a.status === 'Late').length;
      const absent = logs.filter(a => a.status === 'Absent').length;
      const total = logs.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
      
      return { present, late, absent, total, rate, logs };
    },
    async markAttendance(juniorId, dateStr, status, checkInTime = null) {
      const existingIdx = attendance.findIndex(a => a.juniorId === juniorId && a.date === dateStr);
      const logId = existingIdx >= 0 ? attendance[existingIdx].id : `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      
      const newLog = {
        id: logId,
        juniorId,
        date: dateStr,
        status,
        checkInTime
      };

      if (existingIdx >= 0) {
        attendance[existingIdx] = newLog;
      } else {
        attendance.push(newLog);
      }

      // Always update local cache & localStorage
      syncLocal('attendance', attendance);
      localStorage.setItem('wazir_attendance', JSON.stringify(attendance));

      // Push to Supabase Cloud if available
      if (usingSupabase && supabase) {
        try {
          const { error } = await supabase.from('attendance').upsert([newLog]);
          if (error) {
            console.warn("Supabase attendance upsert warning:", error.message);
          } else {
            console.log("Successfully synced attendance record to Supabase Cloud:", newLog);
          }
        } catch (err) {
          console.error("Supabase attendance sync error:", err);
        }
      }
      
      return newLog;
    },
    async markBulkAttendance(dateStr, status) {
      const juniors = this.getJuniors();
      const now = new Date().toISOString();
      const logsToUpsert = juniors.map(j => {
        const existingIdx = attendance.findIndex(a => a.juniorId === j.id && a.date === dateStr);
        const logId = existingIdx >= 0 ? attendance[existingIdx].id : `att_${j.id}_${dateStr}`;
        return {
          id: logId,
          juniorId: j.id,
          date: dateStr,
          status: status,
          checkInTime: status === 'Absent' ? null : now
        };
      });

      logsToUpsert.forEach(newLog => {
        const idx = attendance.findIndex(a => a.juniorId === newLog.juniorId && a.date === dateStr);
        if (idx >= 0) attendance[idx] = newLog;
        else attendance.push(newLog);
      });

      syncLocal('attendance', attendance);
      localStorage.setItem('wazir_attendance', JSON.stringify(attendance));

      if (usingSupabase && supabase) {
        try {
          const { error } = await supabase.from('attendance').upsert(logsToUpsert);
          if (error) console.warn("Bulk attendance upsert warning:", error.message);
          else console.log("Bulk attendance synced to Supabase Cloud for date:", dateStr);
        } catch (err) {
          console.error("Bulk attendance cloud sync error:", err);
        }
      }

      triggerUIRefresh();
      return logsToUpsert;
    },

    // Notifications
    getNotifications(userId) {
      return notifications.filter(n => n.userId === userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    getUnreadNotificationCount(userId) {
      return notifications.filter(n => n.userId === userId && !n.read).length;
    },
    async addNotification(userId, title, message, type) {
      const newNotif = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        userId,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        type
      };
      
      // Cache Update
      notifications.unshift(newNotif);
      syncLocal('notifications', notifications);

      if (usingSupabase) {
        await supabase.from('notifications').insert([newNotif]);
      }
      return newNotif;
    },
    async markNotificationRead(notifId) {
      const notif = notifications.find(n => n.id === notifId);
      if (notif) {
        notif.read = true;
        syncLocal('notifications', notifications);

        if (usingSupabase) {
          await supabase.from('notifications').update({ read: true }).eq('id', notifId);
        }
      }
    },
    async markAllNotificationsRead(userId) {
      notifications.forEach(n => {
        if (n.userId === userId) n.read = true;
      });
      syncLocal('notifications', notifications);

      if (usingSupabase) {
        await supabase.from('notifications').update({ read: true }).eq('userId', userId);
      }
    },

    // Email logs
    getEmailLogs() {
      return emailLogs;
    },
    async addEmailLog(emailData) {
      const newEmail = {
        id: `email_${Date.now()}`,
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        sentAt: new Date().toISOString(),
        taskId: emailData.taskId
      };

      // Cache Update
      emailLogs.unshift(newEmail);
      syncLocal('email_logs', emailLogs);

      if (usingSupabase) {
        await supabase.from('email_logs').insert([newEmail]);
      }
      return newEmail;
    },

    // Utilities
    formatFriendlyDate(dateString) {
      if (!dateString) return "";
      const d = new Date(dateString);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${minutes} ${ampm}`;
    },

    async resetStore() {
      if (usingSupabase) {
        try {
          // Truncate tables
          await Promise.all([
            supabase.from('email_logs').delete().neq('id', ''),
            supabase.from('notifications').delete().neq('id', ''),
            supabase.from('requests').delete().neq('id', ''),
            supabase.from('tasks').delete().neq('id', ''),
            supabase.from('attendance').delete().neq('id', '')
          ]);

          // Re-insert initial seeding
          await Promise.all([
            supabase.from('tasks').insert(DEFAULT_TASKS),
            supabase.from('requests').insert(DEFAULT_REQUESTS),
            supabase.from('notifications').insert(DEFAULT_NOTIFICATIONS),
            supabase.from('email_logs').insert(DEFAULT_EMAIL_LOGS),
            supabase.from('attendance').insert(DEFAULT_ATTENDANCE)
          ]);
        } catch (err) {
          console.error("Error resetting Supabase database:", err.message);
        }
      } else {
        localStorage.removeItem('wazir_users');
        localStorage.removeItem('wazir_tasks');
        localStorage.removeItem('wazir_requests');
        localStorage.removeItem('wazir_notifications');
        localStorage.removeItem('wazir_email_logs');
        localStorage.removeItem('wazir_attendance');
        localStorage.removeItem('wazir_active_role');
        localStorage.removeItem('wazir_selected_junior');
      }
      window.location.reload();
    }
  };
})();
