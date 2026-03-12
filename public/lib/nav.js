/**
 * GTM Tools - Shared Navigation Component
 * Include via <script src="/lib/nav.js"></script> in every tool page.
 */

(function() {
  const TOOLS = [
    { href: '/saas-growth-model.html', label: 'SaaS Growth Model', icon: '📊' },
    { href: '/icp-matrix.html', label: 'ICP Matrix', icon: '🎯' },
    { href: '/sales-capacity.html', label: 'Sales Capacity', icon: '👥' },
    { href: '/marketing-plan.html', label: 'Marketing Plan', icon: '📣' },
    { href: '/gtm-lifecycle.html', label: 'GTM Lifecycle', icon: '🔄' },
    { href: '/quote-to-cash.html', label: 'Quote to Cash', icon: '💰' },
    { href: '/lead-sources.html', label: 'Lead Sources', icon: '🏷️' },
  ];

  const HUB_URL = 'https://lsapps.netlify.app';
  const currentPath = window.location.pathname;

  function render() {
    const nav = document.createElement('nav');
    nav.id = 'gtm-nav';
    nav.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 50;
      background: #1a1f2e;
      border-bottom: 1px solid #30363d;
      padding: 0 20px;
      display: flex;
      align-items: center;
      height: 48px;
      font-family: 'Inter', -apple-system, sans-serif;
      gap: 4px;
      overflow-x: auto;
    `;

    // Hub link
    const hubLink = document.createElement('a');
    hubLink.href = HUB_URL;
    hubLink.textContent = '← Hub';
    hubLink.style.cssText = `
      color: #8b949e;
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 10px;
      border-radius: 6px;
      white-space: nowrap;
      margin-right: 8px;
      border-right: 1px solid #30363d;
      padding-right: 16px;
    `;
    hubLink.addEventListener('mouseenter', () => { hubLink.style.color = '#fff'; });
    hubLink.addEventListener('mouseleave', () => { hubLink.style.color = '#8b949e'; });
    nav.appendChild(hubLink);

    // Tool links
    TOOLS.forEach(tool => {
      const a = document.createElement('a');
      a.href = tool.href;
      const isActive = currentPath === tool.href || (currentPath === '/' && tool.href === '/index.html');
      a.style.cssText = `
        color: ${isActive ? '#58a6ff' : '#8b949e'};
        text-decoration: none;
        font-size: 12px;
        font-weight: ${isActive ? '600' : '500'};
        padding: 6px 10px;
        border-radius: 6px;
        white-space: nowrap;
        background: ${isActive ? 'rgba(88, 166, 255, 0.1)' : 'transparent'};
      `;
      a.textContent = `${tool.icon} ${tool.label}`;
      a.addEventListener('mouseenter', () => {
        if (!isActive) { a.style.color = '#fff'; a.style.background = 'rgba(255,255,255,0.05)'; }
      });
      a.addEventListener('mouseleave', () => {
        if (!isActive) { a.style.color = '#8b949e'; a.style.background = 'transparent'; }
      });
      nav.appendChild(a);
    });

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    nav.appendChild(spacer);

    // User display + sign out
    const userArea = document.createElement('div');
    userArea.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';

    const userDisplay = document.createElement('span');
    userDisplay.id = 'user-display';
    userDisplay.style.cssText = 'color:#8b949e;font-size:12px;';
    userArea.appendChild(userDisplay);

    const signOutBtn = document.createElement('button');
    signOutBtn.textContent = 'Sign Out';
    signOutBtn.style.cssText = `
      background: #1a1f2e;
      border: 1px solid #30363d;
      color: #8b949e;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      font-family: Inter, sans-serif;
    `;
    signOutBtn.addEventListener('click', () => {
      if (typeof AuthUI !== 'undefined') AuthUI.signOut();
    });
    userArea.appendChild(signOutBtn);
    nav.appendChild(userArea);

    document.body.prepend(nav);
  }

  // Render nav when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
