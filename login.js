const AUTH_TOKEN_KEY = 'mit_auth_token';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const button = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('error-msg');

    void redirectIfAuthenticated();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';
        button.disabled = true;
        button.textContent = 'Yoxlanılır...';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.error || 'Giriş alınmadı');
            }

            localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
            window.location.href = 'index.html';
        } catch (error) {
            errorMessage.textContent = error.message;
        } finally {
            button.disabled = false;
            button.textContent = 'Daxil ol';
        }
    });
});

async function redirectIfAuthenticated() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.ok) {
            window.location.href = 'index.html';
            return;
        }
    } catch (error) {
        // Ignore connectivity errors and keep the user on the login screen.
    }

    localStorage.removeItem(AUTH_TOKEN_KEY);
}
