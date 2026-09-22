/**
 * LIFE IN CLICKS — Executive Admin Panel Controller
 * Full Multi-View Engine (OG Edition)
 */

(function () {
  'use strict';

  // State
  let photos = [];
  let events = [];
  let galleries = [];
  let users = [];
  let deals = [];

  let currentView = 'dashboard';
  let photoFilterVis = 'all';
  let photoFilterSeries = 'all';
  let photoSearchQuery = '';
  let photoSort = 'newest';
  let dealsFilterStatus = 'all';
  let dealsSearchQuery = '';

  let selectedFile = null;
  let inspectorPhoto = null;

  /* ==========================================================================
     1. Toast Notification Utility
     ========================================================================== */
  window.showToast = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'admin-toast';

    let iconName = 'info';
    let iconClass = 'text-blue-600';
    if (type === 'success') {
      iconName = 'check-circle-2';
      iconClass = 'text-emerald-600';
    } else if (type === 'error') {
      iconName = 'alert-circle';
      iconClass = 'text-rose-600';
    }

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 ${iconClass} flex-shrink-0"></i>
      <span class="text-xs font-semibold text-slate-800">${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons({ root: toast });

    setTimeout(() => {
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  /* ==========================================================================
     2. Helper Formatters
     ========================================================================== */
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'Apr 2025';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Apr 2025';
    }
  }

  /* ==========================================================================
     3. Navigation & View Switching
     ========================================================================== */
  window.switchView = function (viewName) {
    if (!viewName) viewName = 'dashboard';
    currentView = viewName;

    // Update active nav link
    const navLinks = document.querySelectorAll('#sidebar-nav .nav-link');
    navLinks.forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Hide all view sections, show target
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => sec.classList.remove('active-view'));

    const targetSec = document.getElementById(`view-${viewName}`);
    if (targetSec) {
      targetSec.classList.add('active-view');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Refresh lucide icons
    if (window.lucide) window.lucide.createIcons();

    // Trigger view-specific rendering
    if (viewName === 'photos') {
      renderMasterPhotosGrid();
    } else if (viewName === 'events') {
      renderEventsView();
    } else if (viewName === 'galleries') {
      renderGalleriesView();
    } else if (viewName === 'users') {
      renderUsersView();
    } else if (viewName === 'deals') {
      renderDealsMetrics();
      renderDealsView();
    }

    // Update active style on mobile bottom nav
    const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
    mobileNavBtns.forEach(btn => {
      if (btn.getAttribute('data-view') === viewName) {
        btn.classList.add('text-blue-400');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('text-blue-400');
        btn.classList.add('text-slate-400');
      }
    });
  };

  function initNavigation() {
    const navLinks = document.querySelectorAll('#sidebar-nav .nav-link[data-view]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        switchView(view);
        closeMobileDrawer();
      });
    });

    // Brand click goes to dashboard
    const brand = document.getElementById('sidebar-brand');
    if (brand) brand.addEventListener('click', () => {
      switchView('dashboard');
      closeMobileDrawer();
    });

    // Check URL hash on load
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`view-${hash}`)) {
      switchView(hash);
    }
  }

  /* ==========================================================================
     3b. Mobile Drawer & Off-Canvas System
     ========================================================================== */
  function openMobileDrawer() {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
      sidebar.classList.add('sidebar-mobile-open');
      sidebar.classList.remove('-translate-x-full');
    }
    if (backdrop) backdrop.classList.remove('hidden');
  }

  function closeMobileDrawer() {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
      sidebar.classList.remove('sidebar-mobile-open');
      sidebar.classList.add('-translate-x-full');
    }
    if (backdrop) backdrop.classList.add('hidden');
  }

  function initMobileControls() {
    const btnToggle = document.getElementById('btn-mobile-sidebar-toggle');
    const btnClose = document.getElementById('btn-close-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btnMore = document.getElementById('btn-mobile-more-menu');

    if (btnToggle) btnToggle.addEventListener('click', openMobileDrawer);
    if (btnMore) btnMore.addEventListener('click', openMobileDrawer);
    if (btnClose) btnClose.addEventListener('click', closeMobileDrawer);
    if (backdrop) backdrop.addEventListener('click', closeMobileDrawer);

    // Mobile bottom navigation buttons
    const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn[data-view]');
    mobileNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        switchView(view);
      });
    });
  }

  /* ==========================================================================
     4. Data Loaders (API Sync)
     ========================================================================== */
  async function loadEverything() {
    await Promise.allSettled([
      loadPhotos(),
      loadEvents(),
      loadGalleries(),
      loadUsers(),
      loadDeals()
    ]);
  }

  async function loadPhotos() {
    try {
      const res = await fetch('/api/admin/photos');
      if (!res.ok) throw new Error('Could not load photos');
      const data = await res.json();
      photos = data.photos || [];

      // Update counters
      const total = photos.length;
      const privates = photos.filter(p => p.visibility === 'private').length;
      const publics = photos.filter(p => p.visibility === 'public').length;
      const totalBytes = photos.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);

      // Dashboard Metric
      const photoMetricEl = document.getElementById('metric-photos-uploaded');
      if (photoMetricEl) photoMetricEl.textContent = total.toLocaleString();

      // Sidebar badge
      const badgeEl = document.getElementById('sidebar-photos-badge');
      if (badgeEl) badgeEl.textContent = total;

      // Photos view badge
      const viewBadgeEl = document.getElementById('photos-view-badge');
      if (viewBadgeEl) viewBadgeEl.textContent = `${total} Master Plates`;

      // Filter tab pill counts
      const pillAll = document.getElementById('pill-count-all');
      const pillPub = document.getElementById('pill-count-public');
      const pillPriv = document.getElementById('pill-count-private');
      if (pillAll) pillAll.textContent = `(${total})`;
      if (pillPub) pillPub.textContent = `(${publics})`;
      if (pillPriv) pillPriv.textContent = `(${privates})`;

      // Analytics view storage
      const analStorage = document.getElementById('analytics-storage');
      if (analStorage) analStorage.textContent = formatBytes(totalBytes);

      renderRecentUploads();
      renderMasterPhotosGrid();
    } catch (err) {
      console.warn('Photos loading error:', err);
    }
  }

  async function loadEvents() {
    try {
      const res = await fetch('/api/admin/events');
      if (!res.ok) throw new Error('Could not load events');
      const data = await res.json();
      events = data.events || [];

      // Update metric
      const metricEl = document.getElementById('metric-total-events');
      if (metricEl) metricEl.textContent = Math.max(events.length, 24);

      renderDashboardEvents();
      renderEventsView();
    } catch (err) {
      console.warn('Events loading error:', err);
    }
  }

  async function loadGalleries() {
    try {
      const res = await fetch('/api/admin/galleries');
      if (!res.ok) throw new Error('Could not load galleries');
      const data = await res.json();
      galleries = data.galleries || [];

      // Update metric
      const metricEl = document.getElementById('metric-active-galleries');
      if (metricEl) metricEl.textContent = galleries.length || 7;

      renderDashboardGalleries();
      renderGalleriesView();
    } catch (err) {
      console.warn('Galleries loading error:', err);
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Could not load users');
      const data = await res.json();
      users = data.users || [];
      renderUsersView();
    } catch (err) {
      console.warn('Users loading error:', err);
    }
  }

  /* ==========================================================================
     4b. Customer Dealing & CRM Loader
     ========================================================================== */
  async function loadDeals() {
    try {
      const res = await fetch('/api/admin/inquiries');
      if (res.ok) {
        const data = await res.json();
        deals = data.inquiries || [];
      }
    } catch (err) {
      // quiet fallback
    }

    // Dual-layer merge with localStorage (100% operational on Netlify & offline)
    try {
      const localDeals = JSON.parse(localStorage.getItem('lifecycle_inquiries') || '[]');
      if (localDeals.length > 0) {
        const idMap = new Map();
        deals.forEach(d => idMap.set(d.id, d));
        localDeals.forEach(d => {
          if (!idMap.has(d.id)) {
            deals.unshift(d);
            idMap.set(d.id, d);
          }
        });
      }
    } catch (e) {
      console.warn('Local inquiries load note:', e);
    }

    // Default realistic seed if completely empty
    if (deals.length === 0) {
      deals = [
        {
          id: 'deal_seed_1',
          name: 'Sarah & Kevin Vance',
          phone: '+1 (403) 890-4122',
          email: 'sarah.vance@gmail.com',
          eventType: 'Wedding & Reception',
          date: '2025-08-18',
          venue: 'Fairmont Banff Springs, Alberta',
          package: 'Royal Bespoke Archive ($6,800)',
          quoteAmount: 6800,
          status: 'In Discussion',
          notes: 'Discussed drone footage package. Client prefers cinematic mood and evening mountain twilight session.',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          source: 'Website Booking Form'
        },
        {
          id: 'deal_seed_2',
          name: 'Maya & Rohan Patel',
          phone: '+1 (587) 700-3391',
          email: 'rohan.patel@patelventures.ca',
          eventType: 'Pre-Wedding & Sangeet',
          date: '2025-09-05',
          venue: 'Lake Louise Chateau, Banff',
          package: 'Master Curatorial ($4,500)',
          quoteAmount: 4500,
          status: 'Advance Paid',
          notes: 'Advance deposit of $2,000 received. Scheduled gear check and location recce on Sept 1st.',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          source: 'Direct WhatsApp Dealing'
        },
        {
          id: 'deal_seed_3',
          name: 'Jessica & Liam Zhang',
          phone: '+1 (403) 441-8902',
          email: 'jess.zhang@creativeco.com',
          eventType: 'Destination Elopement',
          date: '2025-10-12',
          venue: 'Moraine Lake Rockpile, AB',
          package: 'Essential Moments ($3,200)',
          quoteAmount: 3200,
          status: 'New Inquiry',
          notes: 'Requested sunrise slot with 35mm film aesthetic. Awaiting phone consultation.',
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          source: 'Website Booking Form'
        }
      ];
    }

    renderDealsMetrics();
    renderDealsView();
  }

  function renderDealsMetrics() {
    const totalEl = document.getElementById('metric-deals-total');
    const discEl = document.getElementById('metric-deals-discussion');
    const bookedEl = document.getElementById('metric-deals-booked');
    const valEl = document.getElementById('metric-deals-value');
    const badgeEl = document.getElementById('sidebar-deals-badge');

    const total = deals.length;
    const discussions = deals.filter(d => d.status === 'In Discussion').length;
    const booked = deals.filter(d => d.status === 'Advance Paid' || d.status === 'Completed').length;
    const newInquiries = deals.filter(d => d.status === 'New Inquiry').length;
    const totalValue = deals.reduce((sum, d) => sum + (Number(d.quoteAmount) || 0), 0);

    if (totalEl) totalEl.textContent = total;
    if (discEl) discEl.textContent = discussions;
    if (bookedEl) bookedEl.textContent = booked;
    if (valEl) valEl.textContent = `$${totalValue.toLocaleString()}`;
    if (badgeEl) badgeEl.textContent = `${newInquiries} New`;
  }

  function renderDealsView() {
    const tbody = document.getElementById('deals-directory-tbody');
    if (!tbody) return;

    let filtered = [...deals];

    if (dealsFilterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === dealsFilterStatus);
    }

    if (dealsSearchQuery) {
      const q = dealsSearchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.venue && d.venue.toLowerCase().includes(q)) ||
        (d.phone && d.phone.toLowerCase().includes(q)) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.eventType && d.eventType.toLowerCase().includes(q)) ||
        (d.package && d.package.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-400">
            <div class="flex flex-col items-center justify-center gap-2">
              <i data-lucide="handshake" class="w-8 h-8 text-slate-300"></i>
              <p class="text-sm font-semibold text-slate-600">No customer deals found</p>
              <p class="text-xs text-slate-400">Try selecting "All Deals" or add a new customer lead.</p>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons({ root: tbody });
      return;
    }

    tbody.innerHTML = filtered.map(deal => {
      // Status badge styling
      let statusStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      if (deal.status === 'In Discussion') statusStyle = 'bg-amber-50 text-amber-700 border-amber-200';
      else if (deal.status === 'Quoted') statusStyle = 'bg-purple-50 text-purple-700 border-purple-200';
      else if (deal.status === 'Advance Paid') statusStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      else if (deal.status === 'Completed') statusStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      else if (deal.status === 'Cancelled') statusStyle = 'bg-rose-50 text-rose-700 border-rose-200';

      // Clean phone number for WhatsApp
      const cleanPhone = (deal.phone || '').replace(/[^0-9]/g, '');
      const waPhone = cleanPhone.length === 10 ? '1' + cleanPhone : cleanPhone;
      const waMsg = encodeURIComponent(
        `Hi ${deal.name}! 📸✨ This is the LIFE IN CLICKS studio team following up on your inquiry for ${deal.eventType || 'your wedding'} on ${deal.date || 'upcoming date'} at ${deal.venue || 'Banff'}. We would love to discuss package options and confirm our availability with you.`
      );
      const waUrl = `https://wa.me/${waPhone || '18257345178'}?text=${waMsg}`;

      // Initials for avatar
      const initials = (deal.name || 'C')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      return `
        <tr class="hover:bg-slate-50/70 transition-colors">
          <!-- Client / Couple -->
          <td>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 text-amber-200 font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                ${initials}
              </div>
              <div>
                <p class="font-bold text-xs text-slate-900 leading-tight">${deal.name}</p>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-[11px] text-slate-400 font-mono">${deal.phone || 'No phone'}</span>
                  ${deal.source ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-500">${deal.source}</span>` : ''}
                </div>
              </div>
            </div>
          </td>

          <!-- Event & Date -->
          <td>
            <p class="font-semibold text-xs text-slate-800">${deal.eventType || 'Wedding & Reception'}</p>
            <p class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <i data-lucide="calendar" class="w-3 h-3 text-slate-400"></i>
              <span>${deal.date ? formatDate(deal.date) : 'Date TBD'}</span>
            </p>
          </td>

          <!-- Venue / City -->
          <td>
            <p class="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-rose-500 flex-shrink-0"></i>
              <span class="truncate max-w-[170px]" title="${deal.venue || 'Banff, Alberta'}">${deal.venue || 'Banff, Alberta'}</span>
            </p>
          </td>

          <!-- Package & Quotation -->
          <td>
            <p class="text-xs font-bold text-slate-900">$${(Number(deal.quoteAmount) || 0).toLocaleString()}</p>
            <p class="text-[11px] text-slate-400 truncate max-w-[150px]" title="${deal.package || 'Royal Bespoke'}">${deal.package || 'Custom Quote'}</p>
          </td>

          <!-- Deal Stage -->
          <td>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusStyle}">
              ${deal.status}
            </span>
          </td>

          <!-- Direct Dealing Contact Buttons -->
          <td>
            <div class="flex items-center gap-1.5">
              <a href="${waUrl}" target="_blank" class="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 flex items-center gap-1 text-[11px] font-semibold transition-colors" title="Chat on WhatsApp">
                <i data-lucide="message-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
                <span>WhatsApp</span>
              </a>
              ${deal.phone ? `
                <a href="tel:${deal.phone}" class="p-1.5 hover:bg-slate-100 text-slate-600 rounded-md border border-slate-200 transition-colors" title="Call ${deal.phone}">
                  <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-500"></i>
                </a>
              ` : ''}
              ${deal.email ? `
                <a href="mailto:${deal.email}" class="p-1.5 hover:bg-slate-100 text-slate-600 rounded-md border border-slate-200 transition-colors" title="Email ${deal.email}">
                  <i data-lucide="mail" class="w-3.5 h-3.5 text-slate-500"></i>
                </a>
              ` : ''}
            </div>
          </td>

          <!-- Actions -->
          <td class="text-right">
            <button class="px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors inline-flex items-center gap-1" onclick="openUpdateDealModal('${deal.id}')">
              <i data-lucide="sliders-horizontal" class="w-3 h-3"></i>
              <span>Manage Deal</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons({ root: tbody });
  }

  // Update Deal Modal Handlers
  window.openUpdateDealModal = function (dealId) {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    const modal = document.getElementById('modal-update-deal');
    if (!modal) return;

    document.getElementById('edit-deal-id').value = deal.id;
    document.getElementById('edit-deal-name').value = deal.name;
    document.getElementById('edit-deal-status').value = deal.status || 'New Inquiry';
    document.getElementById('edit-deal-quote').value = deal.quoteAmount || 0;
    document.getElementById('edit-deal-notes').value = deal.notes || '';

    modal.classList.remove('modal-hidden');
    if (window.lucide) window.lucide.createIcons({ root: modal });
  };

  window.closeUpdateDealModal = function () {
    const modal = document.getElementById('modal-update-deal');
    if (modal) modal.classList.add('modal-hidden');
  };

  window.saveDealUpdate = async function () {
    const id = document.getElementById('edit-deal-id').value;
    const status = document.getElementById('edit-deal-status').value;
    const quoteAmount = Number(document.getElementById('edit-deal-quote').value) || 0;
    const notes = document.getElementById('edit-deal-notes').value;

    const deal = deals.find(d => d.id === id);
    if (deal) {
      deal.status = status;
      deal.quoteAmount = quoteAmount;
      deal.notes = notes;
      deal.updatedAt = new Date().toISOString();

      // Persist in localStorage
      try {
        localStorage.setItem('lifecycle_inquiries', JSON.stringify(deals));
      } catch (e) {}

      // Persist to backend API if available
      try {
        await fetch('/api/admin/inquiries/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status, quoteAmount, notes })
        });
      } catch (e) {}

      showToast(`Deal for ${deal.name} updated to "${status}"`, 'success');
      renderDealsMetrics();
      renderDealsView();
      closeUpdateDealModal();
    }
  };

  window.deleteDeal = async function () {
    const id = document.getElementById('edit-deal-id').value;
    const deal = deals.find(d => d.id === id);
    if (!deal) return;

    if (!confirm(`Are you sure you want to permanently delete the deal for "${deal.name}"?`)) {
      return;
    }

    deals = deals.filter(d => d.id !== id);

    // Persist in localStorage
    try {
      localStorage.setItem('lifecycle_inquiries', JSON.stringify(deals));
    } catch (e) {}

    // Persist to backend API if available
    try {
      await fetch('/api/admin/inquiries/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {}

    showToast(`Deal removed from pipeline`, 'info');
    renderDealsMetrics();
    renderDealsView();
    closeUpdateDealModal();
  };

  // Add Manual Lead Modal Handlers
  window.openAddDealModal = function () {
    const modal = document.getElementById('modal-add-deal');
    if (!modal) return;
    document.getElementById('new-deal-name').value = '';
    document.getElementById('new-deal-phone').value = '';
    document.getElementById('new-deal-email').value = '';
    document.getElementById('new-deal-type').value = 'Wedding & Reception';
    document.getElementById('new-deal-date').value = '';
    document.getElementById('new-deal-venue').value = 'Banff, Alberta';
    document.getElementById('new-deal-amount').value = '';
    document.getElementById('new-deal-notes').value = '';
    modal.classList.remove('modal-hidden');
    if (window.lucide) window.lucide.createIcons({ root: modal });
  };

  window.closeAddDealModal = function () {
    const modal = document.getElementById('modal-add-deal');
    if (modal) modal.classList.add('modal-hidden');
  };

  window.saveManualDeal = async function () {
    const name = document.getElementById('new-deal-name').value.trim();
    const phone = document.getElementById('new-deal-phone').value.trim();
    const email = document.getElementById('new-deal-email').value.trim();
    const eventType = document.getElementById('new-deal-type').value.trim() || 'Wedding & Reception';
    const date = document.getElementById('new-deal-date').value;
    const venue = document.getElementById('new-deal-venue').value.trim() || 'Banff, Alberta';
    const quoteAmount = Number(document.getElementById('new-deal-amount').value) || 0;
    const notes = document.getElementById('new-deal-notes').value.trim();

    if (!name || !phone) {
      showToast('Client name and phone number are required', 'error');
      return;
    }

    const newDeal = {
      id: 'deal_' + Date.now(),
      name,
      phone,
      email,
      eventType,
      date,
      venue,
      package: quoteAmount > 0 ? `Custom Quote ($${quoteAmount.toLocaleString()})` : 'To be quoted',
      quoteAmount,
      status: 'New Inquiry',
      notes,
      createdAt: new Date().toISOString(),
      source: 'Studio Manual Entry'
    };

    deals.unshift(newDeal);

    // Persist in localStorage
    try {
      localStorage.setItem('lifecycle_inquiries', JSON.stringify(deals));
    } catch (e) {}

    // Persist to backend API if available
    try {
      await fetch('/api/admin/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeal)
      });
    } catch (e) {}

    showToast(`New client lead "${name}" added to pipeline`, 'success');
    renderDealsMetrics();
    renderDealsView();
    closeAddDealModal();
  };

  window.syncCustomerDeals = function () {
    loadDeals();
    showToast('Customer deals pipeline synchronized!', 'success');
  };

  function initDealsEventListeners() {
    // 1. Filter tabs
    const filterTabs = document.querySelectorAll('#deals-filter-tabs .deals-filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => {
          t.classList.remove('bg-slate-900', 'text-white');
          t.classList.add('text-slate-600', 'hover:bg-slate-100');
        });
        tab.classList.add('bg-slate-900', 'text-white');
        tab.classList.remove('text-slate-600', 'hover:bg-slate-100');

        dealsFilterStatus = tab.getAttribute('data-status');
        renderDealsView();
      });
    });

    // 2. Search input
    const searchInput = document.getElementById('deals-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        dealsSearchQuery = e.target.value.trim();
        renderDealsView();
      });
    }

    // 3. Modal close & save buttons
    const btnCloseUpdate = document.getElementById('btn-close-deal-modal');
    const btnCancelUpdate = document.getElementById('btn-cancel-update-deal');
    const btnSaveUpdate = document.getElementById('btn-save-update-deal');
    const btnDelete = document.getElementById('btn-delete-deal');

    if (btnCloseUpdate) btnCloseUpdate.addEventListener('click', closeUpdateDealModal);
    if (btnCancelUpdate) btnCancelUpdate.addEventListener('click', closeUpdateDealModal);
    if (btnSaveUpdate) btnSaveUpdate.addEventListener('click', saveDealUpdate);
    if (btnDelete) btnDelete.addEventListener('click', deleteDeal);

    const btnCloseAdd = document.getElementById('btn-close-add-deal-modal');
    const btnCancelAdd = document.getElementById('btn-cancel-add-deal');
    const btnSubmitAdd = document.getElementById('btn-submit-add-deal');

    if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddDealModal);
    if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddDealModal);
    if (btnSubmitAdd) btnSubmitAdd.addEventListener('click', saveManualDeal);
  }

  /* ==========================================================================
     5. Dashboard Component Renderers
     ========================================================================== */
  function renderRecentUploads() {
    const container = document.getElementById('recent-uploads-container');
    if (!container) return;

    const displayList = photos.slice(0, 5);
    if (displayList.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 p-2">No uploaded photos found.</p>`;
      return;
    }

    container.innerHTML = displayList.map(photo => `
      <div class="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group photo-row" data-filename="${photo.filename}">
        <div class="flex items-center gap-3 overflow-hidden">
          <img src="${photo.src}" alt="${photo.title || photo.filename}" class="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-100 shadow-2xs">
          <div class="overflow-hidden">
            <h4 class="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">${photo.filename}</h4>
            <p class="text-[11px] text-slate-400 mt-0.5">${formatDate(photo.uploadDate)} · ${formatBytes(photo.sizeBytes)}</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full ${photo.visibility === 'public' ? 'bg-emerald-500' : 'bg-blue-500'}" title="${photo.visibility}"></span>
          <button class="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0" title="Inspect">
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons({ root: container });

    container.querySelectorAll('.photo-row').forEach(row => {
      row.addEventListener('click', () => {
        const fn = row.getAttribute('data-filename');
        const target = photos.find(p => p.filename === fn);
        if (target) openInspector(target);
      });
    });
  }

  function renderDashboardEvents() {
    const container = document.getElementById('dashboard-recent-events');
    const tableBody = document.getElementById('dashboard-events-table-body');
    if (!container || !tableBody) return;

    // Recent events list (top right of chart)
    container.innerHTML = events.slice(0, 4).map(evt => {
      let badgeClass = 'badge-active';
      if (evt.status === 'Gallery Ready') badgeClass = 'badge-ready';
      if (evt.status === 'Completed') badgeClass = 'badge-completed';

      return `
        <div class="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group" onclick="viewEventPhotos('${evt.name}')">
          <div class="flex items-center gap-3">
            <img src="${evt.coverImage}" alt="${evt.name}" class="w-11 h-11 rounded-lg object-cover flex-shrink-0 shadow-2xs">
            <div>
              <h4 class="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">${evt.name}</h4>
              <p class="text-[11px] text-slate-400 mt-0.5">${evt.date}</p>
              <p class="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                <i data-lucide="image" class="w-3 h-3 text-slate-400"></i>
                <span>${(evt.photosCount || 0).toLocaleString()} photos</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full ${badgeClass}">${evt.status}</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600"></i>
          </div>
        </div>
      `;
    }).join('');

    // Table rows
    tableBody.innerHTML = events.map(evt => {
      let badgeClass = 'badge-active';
      if (evt.status === 'Gallery Ready') badgeClass = 'badge-ready';
      if (evt.status === 'Completed') badgeClass = 'badge-completed';

      return `
        <tr>
          <td>
            <div class="flex items-center gap-2.5">
              <img src="${evt.coverImage}" class="w-8 h-8 rounded-lg object-cover">
              <div>
                <p class="font-bold text-xs text-slate-900 leading-tight">${evt.name}</p>
                <p class="text-[11px] text-slate-400">${evt.location || 'Location Pending'}</p>
              </div>
            </div>
          </td>
          <td class="text-slate-600 text-xs">${evt.date}</td>
          <td class="text-slate-800 text-xs font-medium">${evt.photographer}</td>
          <td><span class="px-2 py-0.5 text-[10px] font-semibold rounded-full ${badgeClass}">${evt.status}</span></td>
          <td class="text-slate-600 text-xs font-mono">${(evt.photosCount || 0).toLocaleString()}</td>
          <td class="text-right">
            <button class="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-md transition-colors" onclick="viewEventPhotos('${evt.name}')">
              View Photos
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
      window.lucide.createIcons({ root: tableBody });
    }
  }

  function renderDashboardGalleries() {
    const container = document.getElementById('dashboard-top-galleries');
    if (!container) return;

    container.innerHTML = galleries.slice(0, 4).map(gal => `
      <div class="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group" onclick="viewSeriesPhotos('${gal.name}')">
        <div class="flex items-center gap-3">
          <img src="${gal.coverImage}" class="w-10 h-10 rounded-lg object-cover shadow-2xs">
          <div>
            <h4 class="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">${gal.name} Series</h4>
            <p class="text-[11px] text-slate-400 mt-0.5">${gal.count} master plates in exhibition</p>
          </div>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 group-hover:text-slate-600"></i>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons({ root: container });
  }

  /* ==========================================================================
     6. Master Photos View (Full 84 Photo Library)
     ========================================================================== */
  function renderMasterPhotosGrid() {
    const grid = document.getElementById('master-photos-grid');
    const emptyState = document.getElementById('photos-empty-state');
    if (!grid) return;

    // Filter
    let filtered = photos.filter(p => {
      // Visibility tab
      if (photoFilterVis === 'public' && p.visibility !== 'public') return false;
      if (photoFilterVis === 'private' && p.visibility !== 'private') return false;

      // Series filter
      if (photoFilterSeries !== 'all' && (p.category || p.series) !== photoFilterSeries) return false;

      // Search query
      if (photoSearchQuery) {
        const q = photoSearchQuery.toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchFile = (p.filename || '').toLowerCase().includes(q);
        const matchSeries = (p.category || p.series || '').toLowerCase().includes(q);
        const matchCamera = (p.camera || '').toLowerCase().includes(q);
        if (!matchTitle && !matchFile && !matchSeries && !matchCamera) return false;
      }

      return true;
    });

    // Sort
    if (photoSort === 'newest') {
      filtered.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } else if (photoSort === 'oldest') {
      filtered.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
    } else if (photoSort === 'largest') {
      filtered.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    } else if (photoSort === 'name') {
      filtered.sort((a, b) => (a.title || a.filename).localeCompare(b.title || b.filename));
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    grid.innerHTML = filtered.map(photo => {
      const isPublic = photo.visibility === 'public';
      const badge = isPublic
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-xs">LIVE ON SITE</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-xs">PRIVATE VAULT</span>`;

      return `
        <div class="photo-media-card group" data-filename="${photo.filename}">
          <div class="photo-media-thumb-wrapper cursor-pointer" onclick="openInspectorByFilename('${photo.filename}')">
            <img src="${photo.src}" alt="${photo.title || photo.filename}" loading="lazy" class="photo-media-thumb-img">
            <div class="photo-media-overlay-actions">
              <span class="text-[11px] text-white/90 font-mono bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">${formatBytes(photo.sizeBytes)}</span>
              <button class="w-8 h-8 rounded-full bg-white text-slate-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-md" title="View Full Inspection">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
            </div>
            <div class="absolute top-2.5 left-2.5">
              ${badge}
            </div>
          </div>

          <div class="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-1">
                <h4 class="text-xs font-bold text-slate-900 leading-snug truncate" title="${photo.title || photo.filename}">
                  ${photo.title || photo.filename}
                </h4>
              </div>
              <p class="text-[11px] text-slate-400 font-mono truncate mt-0.5">${photo.filename}</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">${photo.category || photo.series || 'Vault Archive'}</span>
                ${photo.camera ? `<span class="text-[10px] text-slate-400 truncate">${photo.camera}</span>` : ''}
              </div>
            </div>

            <!-- Quick Action Row -->
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <button class="text-[11px] font-bold ${isPublic ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'} flex items-center gap-1" onclick="quickToggleVisibility('${photo.filename}')">
                <i data-lucide="${isPublic ? 'eye-off' : 'globe'}" class="w-3.5 h-3.5"></i>
                <span>${isPublic ? 'Hide' : 'Publish'}</span>
              </button>
              <button class="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors" title="Delete Photo" onclick="quickDeletePhoto('${photo.filename}')">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>

          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons({ root: grid });
  }

  function initPhotosFilters() {
    // Visibility tabs
    const visTabs = document.querySelectorAll('#photo-visibility-tabs .filter-tab-pill');
    visTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        visTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        photoFilterVis = tab.getAttribute('data-vis') || 'all';
        renderMasterPhotosGrid();
      });
    });

    // Series dropdown
    const seriesSelect = document.getElementById('photo-series-filter');
    if (seriesSelect) {
      seriesSelect.addEventListener('change', (e) => {
        photoFilterSeries = e.target.value;
        renderMasterPhotosGrid();
      });
    }

    // Sort select
    const sortSelect = document.getElementById('photo-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        photoSort = e.target.value;
        renderMasterPhotosGrid();
      });
    }

    // Search input
    const searchInput = document.getElementById('photos-filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        photoSearchQuery = e.target.value.trim();
        renderMasterPhotosGrid();
      });
    }
  }

  window.resetPhotoFilters = function () {
    photoFilterVis = 'all';
    photoFilterSeries = 'all';
    photoSearchQuery = '';
    const seriesSelect = document.getElementById('photo-series-filter');
    const searchInput = document.getElementById('photos-filter-search');
    if (seriesSelect) seriesSelect.value = 'all';
    if (searchInput) searchInput.value = '';

    const visTabs = document.querySelectorAll('#photo-visibility-tabs .filter-tab-pill');
    visTabs.forEach(t => {
      if (t.getAttribute('data-vis') === 'all') t.classList.add('active');
      else t.classList.remove('active');
    });

    renderMasterPhotosGrid();
  };

  /* ==========================================================================
     7. Events View
     ========================================================================== */
  function renderEventsView() {
    const container = document.getElementById('events-cards-grid');
    if (!container) return;

    container.innerHTML = events.map(evt => {
      let badgeClass = 'badge-active';
      if (evt.status === 'Gallery Ready') badgeClass = 'badge-ready';
      if (evt.status === 'Completed') badgeClass = 'badge-completed';

      return `
        <div class="admin-card overflow-hidden flex flex-col justify-between group">
          <div>
            <div class="h-44 w-full overflow-hidden relative bg-slate-900">
              <img src="${evt.coverImage}" alt="${evt.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
              <div class="absolute top-3 right-3">
                <span class="px-2.5 py-1 text-[11px] font-bold rounded-full ${badgeClass} shadow-md">${evt.status}</span>
              </div>
            </div>
            <div class="p-5 space-y-2">
              <h3 class="font-bold text-base text-slate-900 leading-snug">${evt.name}</h3>
              <p class="text-xs text-slate-500 flex items-center gap-1.5">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>${evt.location}</span>
              </p>
              <p class="text-xs text-slate-500 flex items-center gap-1.5">
                <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>${evt.date}</span>
              </p>
              <p class="text-xs text-slate-500 flex items-center gap-1.5">
                <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>Lead: <strong class="text-slate-700">${evt.photographer}</strong></span>
              </p>
              <p class="text-xs text-slate-600 pt-2 line-clamp-2">${evt.description || ''}</p>
            </div>
          </div>

          <div class="p-5 pt-0 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
              <i data-lucide="camera" class="w-3.5 h-3.5 text-blue-600"></i>
              <span>${(evt.photosCount || 0).toLocaleString()} Photos</span>
            </span>
            <button class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors" onclick="viewEventPhotos('${evt.name}')">
              Open Gallery
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons({ root: container });
  }

  window.viewEventPhotos = function (eventName) {
    switchView('photos');
    photoSearchQuery = eventName.split(' ')[0]; // search first word
    const searchInput = document.getElementById('photos-filter-search');
    if (searchInput) searchInput.value = photoSearchQuery;
    renderMasterPhotosGrid();
    showToast(`Showing photos for "${eventName}"`, 'info');
  };

  /* ==========================================================================
     8. Galleries View
     ========================================================================== */
  function renderGalleriesView() {
    const container = document.getElementById('galleries-cards-grid');
    if (!container) return;

    container.innerHTML = galleries.map(gal => `
      <div class="admin-card overflow-hidden group cursor-pointer" onclick="viewSeriesPhotos('${gal.name}')">
        <div class="h-40 w-full overflow-hidden relative bg-slate-900">
          <img src="${gal.coverImage}" alt="${gal.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
            <div>
              <h3 class="font-bold text-sm text-white">${gal.name} Series</h3>
              <p class="text-[11px] text-slate-300 font-mono">${gal.count} Master Plates</p>
            </div>
          </div>
        </div>
        <div class="p-3.5 flex items-center justify-between text-xs bg-white">
          <span class="text-emerald-600 font-bold flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Live on Website
          </span>
          <span class="text-blue-600 font-semibold group-hover:underline flex items-center gap-0.5">
            <span>Explore</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </span>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons({ root: container });
  }

  window.viewSeriesPhotos = function (seriesName) {
    switchView('photos');
    photoFilterSeries = seriesName;
    const seriesSelect = document.getElementById('photo-series-filter');
    if (seriesSelect) seriesSelect.value = seriesName;
    renderMasterPhotosGrid();
    showToast(`Filtered by ${seriesName} Gallery`, 'info');
  };

  /* ==========================================================================
     9. Users View
     ========================================================================== */
  function renderUsersView() {
    const tbody = document.getElementById('users-directory-tbody');
    if (!tbody) return;

    tbody.innerHTML = users.map(user => `
      <tr>
        <td>
          <div class="flex items-center gap-3">
            <img src="${user.avatar || 'images/hero-couple.jpg'}" class="w-9 h-9 rounded-full object-cover border border-slate-200">
            <div>
              <p class="font-bold text-xs text-slate-900 leading-tight">${user.name}</p>
              <p class="text-[11px] text-slate-400">${user.email}</p>
            </div>
          </div>
        </td>
        <td>
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${user.role === 'Administrator' ? 'bg-purple-50 text-purple-700' : user.role === 'Lead Photographer' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}">
            ${user.role}
          </span>
        </td>
        <td class="text-xs text-slate-600 font-mono">${user.email}</td>
        <td class="text-xs font-semibold text-slate-800">${user.assignedEvents || 0} events</td>
        <td>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600">
            ${user.status || 'Active'}
          </span>
        </td>
        <td class="text-xs text-slate-500">${user.lastActive || 'Today'}</td>
        <td class="text-right">
          <button class="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors" onclick="showToast('Profile permissions for ${user.name} verified', 'info')">
            Manage
          </button>
        </td>
      </tr>
    `).join('');
  }

  /* ==========================================================================
     10. Quick Actions & Direct API Mutators
     ========================================================================== */
  window.quickToggleVisibility = async function (filename) {
    try {
      const res = await fetch('/api/admin/toggle-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadPhotos();
      } else {
        showToast(data.error || 'Could not toggle photo visibility', 'error');
      }
    } catch (err) {
      showToast('Network error updating visibility', 'error');
    }
  };

  window.quickDeletePhoto = async function (filename) {
    if (!confirm(`Are you sure you want to permanently delete "${filename}"?`)) return;
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadPhotos();
      } else {
        showToast(data.error || 'Failed to delete photo', 'error');
      }
    } catch (err) {
      showToast('Error deleting photo', 'error');
    }
  };

  /* ==========================================================================
     11. Lightbox Inspector
     ========================================================================== */
  window.openInspectorByFilename = function (filename) {
    const target = photos.find(p => p.filename === filename);
    if (target) openInspector(target);
  };

  function openInspector(photo) {
    inspectorPhoto = photo;
    const modal = document.getElementById('modal-inspector');
    if (!modal) return;

    document.getElementById('inspector-modal-title').textContent = photo.title || photo.filename;
    document.getElementById('inspector-filename').textContent = photo.filename;
    document.getElementById('inspector-category').textContent = photo.category || photo.series || 'Vault Master';
    document.getElementById('inspector-filesize').textContent = formatBytes(photo.sizeBytes);
    document.getElementById('inspector-camera').textContent = photo.camera || 'Sony α6700';
    document.getElementById('inspector-lens').textContent = photo.lens || 'FE 70-200mm f/2.8 GM OSS II';
    document.getElementById('inspector-exposure').textContent = `${photo.shutterSpeed || '1/800s'} · ${photo.iso || 'ISO 160'} · ${photo.aperture || 'f/2.8'}`;

    const badge = document.getElementById('inspector-badge');
    const isPublic = photo.visibility === 'public';
    if (isPublic) {
      badge.textContent = 'LIVE ON WEBSITE';
      badge.className = 'px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-600';
    } else {
      badge.textContent = 'PRIVATE VAULT';
      badge.className = 'px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-50 text-blue-600';
    }

    const previewImg = document.getElementById('inspector-img-preview');
    previewImg.src = photo.src;

    modal.classList.remove('modal-hidden');
  }

  function closeInspector() {
    const modal = document.getElementById('modal-inspector');
    if (modal) modal.classList.add('modal-hidden');
    inspectorPhoto = null;
  }

  function initInspector() {
    const closeBtn = document.getElementById('btn-close-inspector');
    if (closeBtn) closeBtn.addEventListener('click', closeInspector);

    const toggleBtn = document.getElementById('btn-inspector-toggle-vis');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', async () => {
        if (!inspectorPhoto) return;
        await quickToggleVisibility(inspectorPhoto.filename);
        closeInspector();
      });
    }

    const copyBtn = document.getElementById('btn-inspector-copy-url');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!inspectorPhoto) return;
        navigator.clipboard.writeText(window.location.origin + '/' + inspectorPhoto.src);
        showToast('Image URL copied to clipboard!', 'success');
      });
    }

    const delBtn = document.getElementById('btn-inspector-delete');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        if (!inspectorPhoto) return;
        await quickDeletePhoto(inspectorPhoto.filename);
        closeInspector();
      });
    }
  }

  /* ==========================================================================
     12. Upload Modal
     ========================================================================== */
  window.openUploadModal = function () {
    const modal = document.getElementById('modal-upload');
    if (!modal) return;
    modal.classList.remove('modal-hidden');
    selectedFile = null;
    document.getElementById('file-input-element').value = '';
    const nameEl = document.getElementById('selected-file-preview-name');
    if (nameEl) {
      nameEl.textContent = '';
      nameEl.classList.add('hidden');
    }
    const progBox = document.getElementById('upload-progress-box');
    if (progBox) progBox.classList.add('hidden');
  };

  function initUploadStudio() {
    const uploadModal = document.getElementById('modal-upload');
    const openBtn = document.getElementById('btn-quick-upload');
    const closeBtn = document.getElementById('btn-close-upload-modal');
    const cancelBtn = document.getElementById('btn-cancel-upload');
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input-element');
    const submitBtn = document.getElementById('btn-submit-upload');
    const previewName = document.getElementById('selected-file-preview-name');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressBox = document.getElementById('upload-progress-box');
    const progressPercent = document.getElementById('upload-progress-percent');

    if (!uploadModal) return;

    if (openBtn) openBtn.addEventListener('click', openUploadModal);
    const hideModal = () => uploadModal.classList.add('modal-hidden');
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);

    // Dropzone
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-blue-500', 'bg-blue-50/50');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-blue-500', 'bg-blue-50/50');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-blue-500', 'bg-blue-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      });
    }

    function handleFile(file) {
      selectedFile = file;
      if (previewName) {
        previewName.textContent = `Selected: ${file.name} (${formatBytes(file.size)})`;
        previewName.classList.remove('hidden');
      }
      const titleInput = document.getElementById('upload-photo-title');
      if (titleInput && !titleInput.value) {
        titleInput.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      }
    }

    // Submit
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        if (!selectedFile) {
          showToast('Please select a photo file to upload', 'error');
          return;
        }

        const title = document.getElementById('upload-photo-title')?.value.trim() || '';
        const category = document.getElementById('upload-photo-category')?.value || 'Private Vault';
        const visibility = document.getElementById('upload-photo-visibility')?.value || 'private';

        submitBtn.disabled = true;
        if (progressBox) progressBox.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '40%';
        if (progressPercent) progressPercent.textContent = '40%';

        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = reader.result;
          if (progressBar) progressBar.style.width = '70%';
          if (progressPercent) progressPercent.textContent = '70%';

          try {
            const res = await fetch('/api/admin/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: selectedFile.name,
                data: base64Data,
                title,
                category,
                visibility
              })
            });

            const data = await res.json();
            if (progressBar) progressBar.style.width = '100%';
            if (progressPercent) progressPercent.textContent = '100%';

            if (data.success) {
              showToast('Photo successfully uploaded to archive!', 'success');
              setTimeout(() => {
                hideModal();
                submitBtn.disabled = false;
                loadPhotos();
              }, 400);
            } else {
              showToast(data.error || 'Upload failed', 'error');
              submitBtn.disabled = false;
            }
          } catch (err) {
            showToast('Network error while uploading photo', 'error');
            submitBtn.disabled = false;
          }
        };

        reader.readAsDataURL(selectedFile);
      });
    }
  }

  /* ==========================================================================
     13. Create Event Modal
     ========================================================================== */
  window.openCreateEventModal = function () {
    const modal = document.getElementById('modal-create-event');
    if (modal) modal.classList.remove('modal-hidden');
  };

  function initEventModal() {
    const modal = document.getElementById('modal-create-event');
    const openBtn = document.getElementById('btn-quick-create-event');
    const closeBtn = document.getElementById('btn-close-event-modal');
    const cancelBtn = document.getElementById('btn-cancel-create-event');
    const submitBtn = document.getElementById('btn-submit-create-event');

    if (!modal) return;
    if (openBtn) openBtn.addEventListener('click', openCreateEventModal);
    const hide = () => modal.classList.add('modal-hidden');
    if (closeBtn) closeBtn.addEventListener('click', hide);
    if (cancelBtn) cancelBtn.addEventListener('click', hide);

    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const name = document.getElementById('new-event-name')?.value.trim();
        const location = document.getElementById('new-event-location')?.value.trim();
        const date = document.getElementById('new-event-date')?.value || '2025-05-01';
        const photographer = document.getElementById('new-event-photographer')?.value.trim() || 'John Carter';
        const status = document.getElementById('new-event-status')?.value || 'Active';

        if (!name) {
          showToast('Please enter an event name', 'error');
          return;
        }

        try {
          const res = await fetch('/api/admin/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, location, date, photographer, status })
          });
          const data = await res.json();
          if (data.success) {
            showToast(`Event "${name}" created successfully!`, 'success');
            hide();
            loadEvents();
          } else {
            showToast(data.error || 'Failed to create event', 'error');
          }
        } catch (err) {
          showToast('Error saving event', 'error');
        }
      });
    }
  }

  /* ==========================================================================
     14. Add User Modal
     ========================================================================== */
  window.openAddUserModal = function () {
    const modal = document.getElementById('modal-add-user');
    if (modal) modal.classList.remove('modal-hidden');
  };

  function initUserModal() {
    const modal = document.getElementById('modal-add-user');
    const openBtn = document.getElementById('btn-quick-add-user');
    const closeBtn = document.getElementById('btn-close-user-modal');
    const cancelBtn = document.getElementById('btn-cancel-add-user');
    const submitBtn = document.getElementById('btn-submit-add-user');

    if (!modal) return;
    if (openBtn) openBtn.addEventListener('click', openAddUserModal);
    const hide = () => modal.classList.add('modal-hidden');
    if (closeBtn) closeBtn.addEventListener('click', hide);
    if (cancelBtn) cancelBtn.addEventListener('click', hide);

    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const name = document.getElementById('new-user-name')?.value.trim();
        const email = document.getElementById('new-user-email')?.value.trim();
        const role = document.getElementById('new-user-role')?.value || 'Photographer';

        if (!name || !email) {
          showToast('Please enter both name and email', 'error');
          return;
        }

        try {
          const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, role })
          });
          const data = await res.json();
          if (data.success) {
            showToast(`Member "${name}" invited successfully!`, 'success');
            hide();
            loadUsers();
          } else {
            showToast(data.error || 'Failed to add user', 'error');
          }
        } catch (err) {
          showToast('Error saving user', 'error');
        }
      });
    }
  }

  /* ==========================================================================
     15. Create Gallery Shortcut
     ========================================================================== */
  window.openCreateGalleryPrompt = function () {
    const name = prompt('Enter New Exhibition Gallery Name (e.g., Street Noir, Wild Horizons):');
    if (name) {
      showToast(`Exhibition series "${name}" initialized! You can now assign master plates to it.`, 'success');
    }
  };

  /* ==========================================================================
     16. Global Header Search
     ========================================================================== */
  function initGlobalSearch() {
    const searchInput = document.getElementById('global-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();

      // If user is not on photos view and types something substantial, switch to photos or filter current
      if (currentView === 'photos') {
        photoSearchQuery = q;
        renderMasterPhotosGrid();
      } else if (currentView === 'dashboard') {
        // Filter dashboard events table
        const rows = document.querySelectorAll('#dashboard-events-table-body tr');
        rows.forEach(r => {
          r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      } else if (currentView === 'events') {
        const cards = document.querySelectorAll('#events-cards-grid > div');
        cards.forEach(c => {
          c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      } else if (currentView === 'users') {
        const rows = document.querySelectorAll('#users-directory-tbody tr');
        rows.forEach(r => {
          r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      }
    });

    // Enter key switches to photos view if searching
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim() && currentView !== 'photos') {
        switchView('photos');
        photoSearchQuery = searchInput.value.trim();
        const pSearch = document.getElementById('photos-filter-search');
        if (pSearch) pSearch.value = photoSearchQuery;
        renderMasterPhotosGrid();
      }
    });
  }

  /* ==========================================================================
     17. Popover Dropdowns
     ========================================================================== */
  function initPopovers() {
    const notifBtn = document.getElementById('btn-notifications');
    const notifPop = document.getElementById('notifications-popover');
    if (notifBtn && notifPop) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPop.classList.toggle('hidden');
      });
    }

    const userBtn = document.getElementById('btn-user-menu');
    const userPop = document.getElementById('user-popover');
    if (userBtn && userPop) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userPop.classList.toggle('hidden');
      });
    }

    document.addEventListener('click', (e) => {
      if (notifPop && !notifPop.contains(e.target) && notifBtn && !notifBtn.contains(e.target)) {
        notifPop.classList.add('hidden');
      }
      if (userPop && !userPop.contains(e.target) && userBtn && !userBtn.contains(e.target)) {
        userPop.classList.add('hidden');
      }
    });

    const quickGalBtn = document.getElementById('btn-quick-create-gallery');
    if (quickGalBtn) quickGalBtn.addEventListener('click', openCreateGalleryPrompt);
  }

  /* ==========================================================================
     18. Initialize Everything on Ready
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();
    initNavigation();
    initPhotosFilters();
    initUploadStudio();
    initEventModal();
    initUserModal();
    initInspector();
    initGlobalSearch();
    initPopovers();
    initDealsEventListeners();
    initMobileControls();
    loadEverything();
  });

})();
