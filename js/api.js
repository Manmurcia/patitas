(() => {
    const config = window.PATITAS_CONFIG;
    let csrfToken = '';

    async function request(path, options = {}) {
        if (!config.apiBaseUrl) {
            throw new Error('La API del refugio aún no está configurada.');
        }

        const method = options.method || 'GET';
        const headers = options.body ? { 'Content-Type': 'application/json' } : {};
        if (path.startsWith('/admin/') && !['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
        const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, '')}/api${path}`, {
            method,
            credentials: 'include',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (response.status === 204) {
            if (path === '/admin/session' && method === 'DELETE') csrfToken = '';
            return null;
        }

        const contentType = response.headers.get('content-type') || '';
        const result = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

        if (path === '/admin/session' && result && typeof result === 'object') {
            if (typeof result.csrfToken === 'string') csrfToken = result.csrfToken;
            if (method === 'DELETE') csrfToken = '';
        }

        if (!response.ok) {
            const message = result && typeof result === 'object' && result.message
                ? result.message
                : `La solicitud falló (${response.status}).`;
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return result;
    }

    window.PatitasApi = {
        isConfigured: () => Boolean(config.apiBaseUrl),
        request
    };
})();
