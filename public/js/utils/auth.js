// Auth Utility
const Auth = {
  getUser() {
    try {
      const user = localStorage.getItem('quickly_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem('quickly_user', JSON.stringify(user));
  },

  isLoggedIn() {
    return !!localStorage.getItem('quickly_token') && !!this.getUser();
  },

  getRole() {
    const user = this.getUser();
    return user ? user.role : null;
  },

  logout() {
    localStorage.removeItem('quickly_token');
    localStorage.removeItem('quickly_user');
    window.location.href = '/login';
  },

  requireAuth(allowedRoles = []) {
    if (!this.isLoggedIn()) {
      window.location.href = '/login';
      return false;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(this.getRole())) {
      this.redirectToDashboard();
      return false;
    }

    return true;
  },

  redirectToDashboard() {
    const role = this.getRole();
    switch (role) {
      case 'shop_owner':
        window.location.href = '/dashboard';
        break;
      case 'driver':
        window.location.href = '/driver';
        break;
      case 'admin':
        window.location.href = '/admin';
        break;
      default:
        window.location.href = '/login';
    }
  },

  async loadUser() {
    try {
      const res = await api.get('/auth/me');
      if (res.success) {
        this.setUser(res.data);
        return res.data;
      }
    } catch {
      this.logout();
    }
    return null;
  }
};

window.Auth = Auth;
