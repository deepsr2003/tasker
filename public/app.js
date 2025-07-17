document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const addTaskForm = document.getElementById('add-task-form');
    const taskList = document.getElementById('task-list');
    const logoutBtn = document.getElementById('logout-btn');
    const welcomeUsername = document.getElementById('welcome-username');
    const authMessage = document.getElementById('auth-message');
    const appMessage = document.getElementById('app-message');
    const newTaskTitleInput = document.getElementById('new-task-title');

    let token = localStorage.getItem('token');

    // --- API Functions ---
    const api = {
        call: async (endpoint, method = 'GET', body = null) => {
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            try {
                const response = await fetch(`/api${endpoint}`, {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : null,
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Something went wrong');
                }
                return response.status === 204 ? null : response.json();
            } catch (error) {
                console.error('API Call Error:', error);
                throw error;
            }
        }
    };

    // --- UI Logic ---
    const showMessage = (element, message, isError = true) => {
        element.textContent = message;
        element.className = `message ${isError ? 'error' : 'success'}`;
        setTimeout(() => element.textContent = '', 3000);
    };

    const renderTasks = (taskData) => {
        taskList.innerHTML = '';
        if (!taskData || !taskData.tasks || taskData.tasks.length === 0) {
            taskList.innerHTML = '<li>No tasks yet. Add one!</li>';
            return;
        }
        taskData.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = task.completed ? 'completed' : '';
            li.dataset.id = task.id;
            li.innerHTML = `
                <span class="task-title">${task.title}</span>
                <button class="delete-btn">✖</button>
            `;
            taskList.appendChild(li);
        });
    };

    const showAppView = (username) => {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        welcomeUsername.textContent = username;
        fetchAndRenderTasks();
    };

    const showAuthView = () => {
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        localStorage.removeItem('token');
        token = null;
    };

    // --- App Flow ---
    const fetchAndRenderTasks = async () => {
        try {
            const tasks = await api.call('/tasks');
            renderTasks(tasks);
        } catch (error) {
            showMessage(appMessage, error.message);
            if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
                showAuthView();
            }
        }
    };

    const init = () => {
        if (token) {
            // A simple way to get username is to decode the JWT (without verification, as server does that)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                showAppView(payload.username);
            } catch {
                showAuthView();
            }
        } else {
            showAuthView();
        }
    };

    // --- Event Listeners ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        try {
            await api.call('/auth/register', 'POST', { username, password });
            showMessage(authMessage, 'Registration successful! Please log in.', false);
            registerForm.reset();
        } catch (error) {
            showMessage(authMessage, error.message);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        try {
            const data = await api.call('/auth/login', 'POST', { username, password });
            token = data.token;
            localStorage.setItem('token', token);
            loginForm.reset();
            showAppView(username);
        } catch (error) {
            showMessage(authMessage, error.message);
        }
    });

    logoutBtn.addEventListener('click', () => {
        showAuthView();
    });

    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = newTaskTitleInput.value;
        try {
            await api.call('/tasks', 'POST', { title });
            newTaskTitleInput.value = '';
            fetchAndRenderTasks();
        } catch (error) {
            showMessage(appMessage, error.message);
        }
    });

    taskList.addEventListener('click', async (e) => {
        const li = e.target.closest('li');
        if (!li || !li.dataset.id) return;

        const taskId = li.dataset.id;
        
        if (e.target.classList.contains('delete-btn')) {
            try {
                await api.call(`/tasks/${taskId}`, 'DELETE');
                fetchAndRenderTasks();
            } catch (error) {
                showMessage(appMessage, error.message);
            }
        } else if (e.target.classList.contains('task-title')) {
            try {
                await api.call(`/tasks/${taskId}/toggle`, 'PATCH');
                fetchAndRenderTasks();
            } catch (error) {
                showMessage(appMessage, error.message);
            }
        }
    });

    init();
});
