// Helper Utilities
const Helpers = {
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const locale = (typeof i18n !== 'undefined') ? i18n.getLocale() : 'en-IN';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const locale = (typeof i18n !== 'undefined') ? i18n.getLocale() : 'en-IN';
    return d.toLocaleDateString(locale, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const locale = (typeof i18n !== 'undefined') ? i18n.getLocale() : 'en-IN';
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  },

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  },

  formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  },

  getStatusLabel(status) {
    const key = `status.${status}`;
    return (typeof i18n !== 'undefined') ? i18n.t(key) : status;
  },

  getStatusBadge(status) {
    return `<span class="badge badge-${status}">${this.getStatusLabel(status)}</span>`;
  },

  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  },

  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  truncate(str, len = 50) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  },

  generateAvatar(name, size = 40) {
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const color = colors[(name || '').length % colors.length];
    const initials = this.getInitials(name);
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${size * 0.35}px;flex-shrink:0">${initials}</div>`;
  },

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      const msg = (typeof i18n !== 'undefined') ? i18n.t('toast.copied') : 'Copied to clipboard';
      toast.success(msg);
    });
  },

  parseQuery() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  }
};

window.Helpers = Helpers;
