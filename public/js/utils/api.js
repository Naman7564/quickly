// API Utility
const API_BASE = '/api';

class Api {
  constructor() {
    this.token = localStorage.getItem('quickly_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('quickly_token', token);
    } else {
      localStorage.removeItem('quickly_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('quickly_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const token = this.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.setToken(null);
          localStorage.removeItem('quickly_user');
          if (!window.location.pathname.includes('login')) {
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url);
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  }

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

window.api = new Api();
