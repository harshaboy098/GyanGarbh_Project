(function () {
  const ROLE_CONFIG = {
    admin: {
      title: 'Super Admin Command Panel',
      kicker: 'Command center',
      welcome: 'Super Admin AI online. Ask for hotels, mitras, customers, bookings, assistants, audit status, or refresh.',
      placeholder: 'Try: show hotels, refresh data, summarize bookings'
    },
    business: {
      title: 'Business Balance Sheet / Logistics AI',
      kicker: 'Owner operations',
      welcome: 'Business AI online. I can summarize bookings, pending confirmations, revenue signals, room inventory, and logistics priorities.',
      placeholder: 'Try: balance sheet, pending logistics, room status'
    },
    mitra: {
      title: 'Mitra Logistics Assistant',
      kicker: 'Field operations',
      welcome: 'Mitra AI online. I can summarize verification work, active tasks, earnings signals, and next logistics actions.',
      placeholder: 'Try: today tasks, logistics, earnings'
    },
    assistant: {
      title: 'Assistant Workflow AI',
      kicker: 'Support operations',
      welcome: 'Assistant AI online. I can help navigate hotels, customers, mitras, Bodhi Path, permissions, and sync checks.',
      placeholder: 'Try: show hotels, sync status, permissions'
    }
  };

  let activeRole = 'assistant';
  let pendingAction = null;

  function ensureStyles() {
    if (document.getElementById('roleAiStyles')) return;
    const style = document.createElement('style');
    style.id = 'roleAiStyles';
    style.textContent = `
      .ai-navbar-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px solid rgba(255, 193, 7, 0.55);
        background: linear-gradient(135deg, #fff7d6 0%, #ffc107 100%);
        color: #102847 !important;
        font-weight: 800;
        letter-spacing: 0;
        text-decoration: none;
        border-radius: 999px;
        padding: 9px 16px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
        transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        cursor: pointer;
      }
      .ai-navbar-btn:hover {
        color: #102847 !important;
        transform: translateY(-1px);
        filter: brightness(1.03);
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
      }
      .ai-sidebar-link {
        border: 1px solid rgba(255, 193, 7, 0.45) !important;
        background: rgba(255, 193, 7, 0.12) !important;
        color: #ffc107 !important;
        font-weight: 800 !important;
      }
      .role-ai-overlay {
        position: fixed;
        inset: 0;
        z-index: 3000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.68);
      }
      .role-ai-panel {
        width: min(100%, 520px);
        max-height: min(720px, 92vh);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid rgba(255, 193, 7, 0.38);
        background: #ffffff;
        box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35);
      }
      .role-ai-head {
        background: linear-gradient(135deg, #102847 0%, #1e3c72 100%);
        color: #ffffff;
        padding: 18px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        border-bottom: 4px solid #ffc107;
      }
      .role-ai-kicker {
        color: #ffd761;
        font-size: 0.78rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .role-ai-head h3 {
        margin: 2px 0 0;
        font-size: 1.12rem;
        font-weight: 800;
        letter-spacing: 0;
      }
      .role-ai-close {
        border: 0;
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        width: 36px;
        height: 36px;
        border-radius: 999px;
        font-size: 1.1rem;
        cursor: pointer;
      }
      .role-ai-messages {
        flex: 1;
        overflow-y: auto;
        min-height: 260px;
        padding: 18px;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .role-ai-msg {
        width: fit-content;
        max-width: 88%;
        padding: 11px 13px;
        border-radius: 14px;
        font-size: 0.9rem;
        line-height: 1.5;
        color: #0f172a;
        background: #ffffff;
        border: 1px solid #e2e8f0;
      }
      .role-ai-msg.user {
        align-self: flex-end;
        background: #1e3c72;
        border-color: #1e3c72;
        color: #ffffff;
      }
      .role-ai-input {
        display: flex;
        gap: 10px;
        padding: 14px;
        border-top: 1px solid #e2e8f0;
        background: #ffffff;
      }
      .role-ai-input input {
        flex: 1;
        min-width: 0;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        padding: 11px 14px;
        outline: none;
      }
      .role-ai-input input:focus {
        border-color: #1e3c72;
        box-shadow: 0 0 0 3px rgba(30, 60, 114, 0.12);
      }
      .role-ai-send,
      .role-ai-apply {
        border: 0;
        border-radius: 999px;
        padding: 10px 15px;
        font-weight: 800;
        cursor: pointer;
      }
      .role-ai-send {
        background: #1e3c72;
        color: #ffffff;
      }
      .role-ai-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 13px 16px;
        background: #fffdf3;
        border-top: 1px solid #f8e6a0;
      }
      .role-ai-footer small {
        color: #64748b;
      }
      .role-ai-apply {
        background: #ffc107;
        color: #102847;
      }
      .role-ai-apply:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      @media (max-width: 640px) {
        .role-ai-overlay { padding: 12px; }
        .role-ai-panel { max-height: 95vh; }
        .role-ai-input { flex-wrap: wrap; }
        .role-ai-send { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    ensureStyles();
    if (document.getElementById('roleAiOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'roleAiOverlay';
    overlay.className = 'role-ai-overlay';
    overlay.innerHTML = `
      <section class="role-ai-panel" role="dialog" aria-modal="true" aria-labelledby="roleAiTitle">
        <header class="role-ai-head">
          <div>
            <div class="role-ai-kicker" id="roleAiKicker"></div>
            <h3 id="roleAiTitle"></h3>
          </div>
          <button class="role-ai-close" type="button" onclick="closeRoleAIAssistant()" aria-label="Close AI panel">&times;</button>
        </header>
        <div class="role-ai-messages" id="roleAiMessages"></div>
        <div class="role-ai-input">
          <input id="roleAiInput" type="text" autocomplete="off">
          <button class="role-ai-send" type="button" onclick="sendRoleAICommand()">Send</button>
        </div>
        <footer class="role-ai-footer">
          <small id="roleAiPending">No pending command</small>
          <button class="role-ai-apply" id="roleAiApplyBtn" type="button" onclick="applyRoleAIChanges()" disabled>Apply Changes</button>
        </footer>
      </section>
    `;
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeRoleAIAssistant();
    });
    document.body.appendChild(overlay);
    document.getElementById('roleAiInput').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') sendRoleAICommand();
    });
  }

  function addMessage(text, sender) {
    const messages = document.getElementById('roleAiMessages');
    const msg = document.createElement('div');
    msg.className = `role-ai-msg ${sender === 'user' ? 'user' : 'assistant'}`;
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function setPending(action, label) {
    pendingAction = action;
    const pending = document.getElementById('roleAiPending');
    const apply = document.getElementById('roleAiApplyBtn');
    if (action) {
      pending.textContent = label || 'Command ready';
      apply.disabled = false;
    } else {
      pending.textContent = 'No pending command';
      apply.disabled = true;
    }
  }

  function tableCount(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    return el.querySelectorAll('tr').length;
  }

  function metricText(id) {
    return document.getElementById(id)?.textContent?.trim() || '';
  }

  function getDashboardData() {
    const custom = window.gyanGarbhDashboardData || {};
    return {
      bookings: custom.bookings || [],
      hotel: custom.hotel || {},
      hotelName: custom.hotelName || localStorage.getItem('hotelName') || '',
      ownerEmail: custom.ownerEmail || localStorage.getItem('hotelOwnerEmail') || '',
      mitraName: custom.mitraName || localStorage.getItem('mitraName') || '',
      earnings: document.getElementById('earnDisplay')?.textContent?.trim() || custom.earnings || ''
    };
  }

  function currency(value) {
    const n = Number(value || 0);
    return n > 0 ? `Rs ${n.toLocaleString('en-IN')}` : 'Rs 0';
  }

  function businessSummary() {
    const data = getDashboardData();
    const bookings = Array.isArray(data.bookings) ? data.bookings : [];
    const confirmed = bookings.filter((b) => String(b.status || '').toLowerCase() === 'confirmed').length;
    const pending = bookings.filter((b) => String(b.status || '').toLowerCase() !== 'confirmed').length;
    const rate = Number(data.hotel.acRoomPrice || data.hotel.nonAcRoomPrice || data.hotel.roomRate || 0);
    const projected = rate * Math.max(bookings.length, 1);
    const rooms = data.hotel.totalRooms || data.hotel.rooms?.length || 'not set';
    return `Current balance view: ${bookings.length} bookings, ${confirmed} confirmed, ${pending} pending, ${rooms} rooms tracked, and projected room revenue around ${currency(projected)} from the visible booking queue.`;
  }

  function logisticsSummary(role) {
    const data = getDashboardData();
    const bookings = Array.isArray(data.bookings) ? data.bookings : [];
    const pending = bookings.filter((b) => String(b.status || '').toLowerCase() !== 'confirmed');
    if (role === 'mitra') {
      return `Mitra logistics: ${bookings.length} verification tasks visible, ${data.earnings ? `${data.earnings} earnings signal, ` : ''}${pending.length} items need follow-up. Prioritize newest check-ins and guest confirmation calls.`;
    }
    return `Logistics queue: ${pending.length} bookings need confirmation or follow-up. Check room availability, confirm guest arrival windows, and refresh bookings after updates.`;
  }

  function adminSummary() {
    return `Admin snapshot: ${metricText('hotels-metric') || tableCount('hotelsTable')} hotels, ${metricText('mitras-metric') || tableCount('mitrasTable')} mitras, ${metricText('customers-metric') || tableCount('customersTable')} customers, ${metricText('assistants-metric') || tableCount('assistantsTable')} assistants, and ${tableCount('bookingsTable')} booking rows currently rendered.`;
  }

  function assistantSummary() {
    return `Assistant snapshot: ${metricText('hotelCount') || tableCount('hotelsTable')} hotels visible, ${metricText('customerCount') || tableCount('customersTable')} customers visible, sync status "${document.getElementById('sync-text')?.textContent || 'available'}". Delete actions remain restricted.`;
  }

  function inferSection(text) {
    if (/assistant/.test(text)) return 'assistants';
    if (/hotel|room|inventory/.test(text)) return 'hotels';
    if (/mitra|guide/.test(text)) return 'mitras';
    if (/customer|guest|enquir|enquiry/.test(text)) return 'customers';
    if (/booking|reservation/.test(text)) return 'bookings';
    if (/bodhi|path|heritage/.test(text)) return document.getElementById('bodhipaths') ? 'bodhipaths' : 'bodhi';
    if (/permission|restriction/.test(text)) return 'permissions';
    if (/activity|audit|log/.test(text)) return 'activity-log';
    if (/setting/.test(text)) return 'settings';
    if (/profile/.test(text)) return 'profile';
    if (/dashboard|overview/.test(text)) return 'dashboard';
    return null;
  }

  function buildResponse(input) {
    const text = input.toLowerCase();
    const section = inferSection(text);
    if (/refresh|sync|reload/.test(text)) {
      setPending({ type: 'refresh' }, 'Ready to refresh dashboard data');
      return 'I can refresh the visible dashboard data now. Use Apply Changes to run the refresh.';
    }
    if (section && /(show|open|go|switch|view|manage)/.test(text)) {
      setPending({ type: 'section', section }, `Ready to open ${section}`);
      return `I found the ${section} workspace. Use Apply Changes and I will switch the dashboard there.`;
    }
    setPending(null);
    if (activeRole === 'admin') return adminSummary();
    if (activeRole === 'business') {
      return /logistic|pending|confirm|task/.test(text) ? logisticsSummary('business') : businessSummary();
    }
    if (activeRole === 'mitra') return logisticsSummary('mitra');
    return assistantSummary();
  }

  function activateSection(section) {
    const controls = Array.from(document.querySelectorAll('a, button'));
    const target = controls.find((el) => {
      const onclick = el.getAttribute('onclick') || '';
      const href = el.getAttribute('href') || '';
      return onclick.includes(`'${section}'`) || onclick.includes(`"${section}"`) || href === `#${section}`;
    });
    if (target) {
      target.click();
      return true;
    }
    if (typeof window.openSection === 'function') {
      window.openSection(section);
      return true;
    }
    return false;
  }

  window.openRoleAIAssistant = function (role) {
    activeRole = role || 'assistant';
    const config = ROLE_CONFIG[activeRole] || ROLE_CONFIG.assistant;
    ensurePanel();
    document.getElementById('roleAiKicker').textContent = config.kicker;
    document.getElementById('roleAiTitle').textContent = config.title;
    document.getElementById('roleAiInput').placeholder = config.placeholder;
    document.getElementById('roleAiMessages').innerHTML = '';
    setPending(null);
    addMessage(config.welcome, 'assistant');
    document.getElementById('roleAiOverlay').style.display = 'flex';
    setTimeout(() => document.getElementById('roleAiInput').focus(), 50);
  };

  window.closeRoleAIAssistant = function () {
    const overlay = document.getElementById('roleAiOverlay');
    if (overlay) overlay.style.display = 'none';
  };

  window.sendRoleAICommand = function () {
    const input = document.getElementById('roleAiInput');
    const value = input.value.trim();
    if (!value) return;
    addMessage(value, 'user');
    input.value = '';
    addMessage(buildResponse(value), 'assistant');
  };

  window.applyRoleAIChanges = function () {
    if (!pendingAction) return;
    if (pendingAction.type === 'section') {
      const ok = activateSection(pendingAction.section);
      addMessage(ok ? `Opened ${pendingAction.section}.` : `I could not find ${pendingAction.section} on this page.`, 'assistant');
    }
    if (pendingAction.type === 'refresh') {
      if (typeof window.loadSectionData === 'function' && window.currentSection) window.loadSectionData(window.currentSection);
      if (typeof window.loadMyBookings === 'function') window.loadMyBookings();
      if (typeof window.loadHotelDetails === 'function') window.loadHotelDetails();
      if (typeof window.fetchAssignedBookings === 'function') window.fetchAssignedBookings();
      if (typeof window.loadDashboardData === 'function') window.loadDashboardData();
      addMessage('Refresh command applied.', 'assistant');
    }
    setPending(null);
  };

  document.addEventListener('DOMContentLoaded', ensureStyles);
})();
