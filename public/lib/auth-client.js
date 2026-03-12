/**
 * LeanScale Auth Client
 *
 * Drop-in auth UI for all vanilla JS microapps.
 * Requires the Supabase JS SDK to be loaded first:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *
 * Usage:
 *   <script>
 *     window.__SUPABASE_URL__ = 'https://xxx.supabase.co';
 *     window.__SUPABASE_ANON_KEY__ = 'your-anon-key';
 *   </script>
 *   <script src="/lib/auth-client.js"></script>
 *   <script>AuthUI.init();</script>
 */

/* global supabase */

const supabaseClient = supabase.createClient(
  window.__SUPABASE_URL__,
  window.__SUPABASE_ANON_KEY__
);

const AuthUI = {
  _onLoginCallbacks: [],

  async init() {
    const params = new URLSearchParams(window.location.search);
    const launchCode = params.get('launch_code');
    const hubToken = params.get('token');
    const hubRefreshToken = params.get('refresh_token');

    if (launchCode) {
      // Scoped launch code flow: redeem via Hub API for tokens
      params.delete('launch_code');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      try {
        const hubOrigin = window.__HUB_ORIGIN__ || 'https://lsapps.netlify.app';
        const resp = await fetch(`${hubOrigin}/api/redeem-code?code=${encodeURIComponent(launchCode)}`);
        if (resp.ok) {
          const { accessToken, refreshToken } = await resp.json();
          const { data: { session }, error } = await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || accessToken,
          });
          if (session && !error) {
            this._handleLogin(session);
          } else {
            this._showLogin();
          }
        } else {
          console.warn('Launch code redemption failed, falling back to login');
          this._showLogin();
        }
      } catch (err) {
        console.error('Launch code redemption error:', err);
        this._showLogin();
      }
    } else if (hubToken) {
      // Legacy hub token passthrough (?token=xxx&refresh_token=xxx)
      params.delete('token');
      params.delete('refresh_token');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      const { data: { session }, error } = await supabaseClient.auth.setSession({
        access_token: hubToken,
        refresh_token: hubRefreshToken || hubToken,
      });
      if (session && !error) {
        this._handleLogin(session);
      } else {
        this._showLogin();
      }
    } else {
      // Check for existing session
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        this._handleLogin(session);
      } else {
        this._showLogin();
      }
    }

    // Listen for auth state changes (handles magic link returns, token refresh, etc.)
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this._handleLogin(session);
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        window.__AUTH_TOKEN__ = session.access_token;
      }
      if (event === 'SIGNED_OUT') {
        this._showLogin();
      }
    });

    // Wire up the login form
    this._wireForm();
  },

  /**
   * Register a callback to run after successful login.
   * Use this to load app data once auth is ready.
   *
   * AuthUI.onLogin(() => loadAppData());
   */
  onLogin(callback) {
    this._onLoginCallbacks.push(callback);
  },

  _handleLogin(session) {
    window.__AUTH_TOKEN__ = session.access_token;
    window.__USER__ = session.user;

    // Toggle containers
    const loginEl = document.getElementById('login-container');
    const appEl = document.getElementById('app-container');
    if (loginEl) loginEl.style.display = 'none';
    if (appEl) appEl.style.display = '';

    // Update user display
    const userEl = document.getElementById('user-display');
    if (userEl) userEl.textContent = session.user.email;

    // Fire callbacks
    for (const cb of this._onLoginCallbacks) {
      try { cb(session); } catch (e) { console.error('onLogin callback error:', e); }
    }
  },

  _showLogin() {
    window.__AUTH_TOKEN__ = null;
    window.__USER__ = null;

    const loginEl = document.getElementById('login-container');
    const appEl = document.getElementById('app-container');
    if (loginEl) loginEl.style.display = 'flex';
    if (appEl) appEl.style.display = 'none';
  },

  _wireForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');

      try {
        errorEl.textContent = '';
        await this.signIn(email, password);
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });

    const magicBtn = document.getElementById('magic-link-btn');
    if (magicBtn) {
      magicBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const errorEl = document.getElementById('login-error');

        if (!email) {
          errorEl.textContent = 'Enter your email first';
          return;
        }

        try {
          errorEl.textContent = '';
          const msg = await this.signInWithMagicLink(email);
          errorEl.style.color = '#4ade80';
          errorEl.textContent = msg;
        } catch (err) {
          errorEl.style.color = '';
          errorEl.textContent = err.message;
        }
      });
    }
  },

  async signIn(email, password) {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signInWithMagicLink(email) {
    const { error } = await supabaseClient.auth.signInWithOtp({ email });
    if (error) throw error;
    return 'Check your email for the login link';
  },

  async signOut() {
    await supabaseClient.auth.signOut();
    window.__AUTH_TOKEN__ = null;
    window.__USER__ = null;
  },

  /**
   * Wrapper for fetch() that auto-includes the auth token.
   * Use this instead of bare fetch() for all API calls.
   *
   * const resp = await AuthUI.apiFetch('/api/projects');
   * const data = await resp.json();
   */
  async apiFetch(url, options = {}) {
    const headers = { ...options.headers };

    // Don't set Content-Type for FormData (browser sets it with boundary)
    const isFormData = options.body instanceof FormData;
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (window.__AUTH_TOKEN__) {
      headers['Authorization'] = `Bearer ${window.__AUTH_TOKEN__}`;
    }

    const resp = await fetch(url, { ...options, headers });

    // Auto-redirect to login on 401
    if (resp.status === 401) {
      console.warn('Session expired, redirecting to login');
      this._showLogin();
      throw new Error('Session expired. Please sign in again.');
    }

    return resp;
  },
};
