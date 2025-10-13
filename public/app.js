const api = {
  async me() {
    const r = await fetch("/api/auth/me", { credentials: "include" })
    return r.json()
  },
  async login(email, password) {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })
    if (!r.ok) throw new Error((await r.json()).error || "Login failed")
    return r.json()
  },
  async logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
  },
  async register(name, email, password) {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
    if (!r.ok) throw new Error((await r.json()).error || "Register failed")
  },
  async user() {
    const r = await fetch("/api/users/me", { credentials: "include" })
    if (!r.ok) return null
    return r.json()
  },
  async createLeave(payload) {
    const r = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error((await r.json()).error || "Create failed")
    return r.json()
  },
  async listLeaves(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null && v !== ""))
    const r = await fetch(`/api/leaves?${qs.toString()}`, { credentials: "include" })
    return r.json()
  },
  async cancelLeave(id) {
    const r = await fetch(`/api/leaves/${id}/cancel`, { method: "POST", credentials: "include" })
    return r.json()
  },
  async decideLeave(id, action) {
    const r = await fetch(`/api/leaves/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    })
    if (!r.ok) throw new Error((await r.json()).error || "Decision failed")
    return r.json()
  },
  async notifications() {
    const r = await fetch("/api/leaves/notifications", { credentials: "include" })
    return r.json()
  },
  async markNotifRead(id) {
    const r = await fetch(`/api/leaves/notifications/${id}/read`, { method: "POST", credentials: "include" })
    return r.json()
  },
}

// DOM helpers
const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => Array.from(document.querySelectorAll(sel))

function show(sectionId) {
  $("#auth-section").classList.add("hidden")
  $("#employee-dashboard").classList.add("hidden")
  $("#admin-dashboard").classList.add("hidden")
  $(sectionId).classList.remove("hidden")
}

function setNav(user) {
  const nav = $("#nav")
  nav.innerHTML = ""
  if (user) {
    const span = document.createElement("span")
    span.textContent = `${user.name} (${user.role})`
    const btn = document.createElement("button")
    btn.textContent = "Logout"
    btn.className = "btn"
    btn.onclick = async () => {
      await api.logout()
      location.reload()
    }
    nav.append(span, btn)
  }
}

function renderBalances(u) {
  const ul = $("#balances")
  ul.innerHTML = `
    <li>Casual: ${u.casual_balance}</li>
    <li>Sick: ${u.sick_balance}</li>
    <li>Personal: ${u.personal_balance}</li>
  `
}

function renderEmpTable(rows) {
  const tbody = $("#emp-requests-table tbody")
  tbody.innerHTML = ""
  for (const r of rows) {
    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.type}</td>
      <td>${r.start_date} → ${r.end_date}</td>
      <td>${r.days}</td>
      <td>${r.status}</td>
      <td>${r.status === "pending" ? '<button class="btn btn-cancel" data-id="' + r.id + '">Cancel</button>' : ""}</td>`
    tbody.appendChild(tr)
  }
  $$(".btn-cancel").forEach((btn) => {
    btn.onclick = async () => {
      await api.cancelLeave(btn.dataset.id)
      await refreshEmployee()
    }
  })
}

function renderAdmTable(rows) {
  const tbody = $("#adm-requests-table tbody")
  tbody.innerHTML = ""
  for (const r of rows) {
    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>${r.id}</td>
      <td><div>${r.user_name}<br/><small>${r.user_email}</small></div></td>
      <td>${r.type}</td>
      <td>${r.start_date} → ${r.end_date}</td>
      <td>${r.days}</td>
      <td>${r.status}</td>
      <td>
        ${
          r.status === "pending"
            ? '<div class="flex"><button class="btn primary btn-approve" data-id="' +
              r.id +
              '">Approve</button><button class="btn btn-reject" data-id="' +
              r.id +
              '">Reject</button></div>'
            : ""
        }
      </td>`
    tbody.appendChild(tr)
  }
  $$(".btn-approve").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await api.decideLeave(btn.dataset.id, "approve")
      } catch (e) {
        alert(e.message)
      }
      await refreshAdmin()
    }
  })
  $$(".btn-reject").forEach((btn) => {
    btn.onclick = async () => {
      await api.decideLeave(btn.dataset.id, "reject")
      await refreshAdmin()
    }
  })
}

function renderNotifications(rows) {
  const ul = $("#notifications")
  ul.innerHTML = ""
  for (const n of rows) {
    const li = document.createElement("li")
    li.innerHTML = `<div class="flex between center">
      <div>${n.message} <br/><small>${new Date(n.created_at).toLocaleString()}</small></div>
      ${n.is_read ? '<span class="hint">read</span>' : '<button class="btn btn-read" data-id="' + n.id + '">Mark read</button>'}
    </div>`
    ul.appendChild(li)
  }
  $$(".btn-read").forEach((btn) => {
    btn.onclick = async () => {
      await api.markNotifRead(btn.dataset.id)
      await loadNotifications()
    }
  })
}

async function loadNotifications() {
  const rows = await api.notifications()
  renderNotifications(rows)
}

async function refreshEmployee() {
  const status = $("#emp-filter-status").value
  const type = $("#emp-filter-type").value
  const rows = await api.listLeaves({ status, type })
  renderEmpTable(rows)
  await loadNotifications()
}

async function refreshAdmin() {
  const status = $("#adm-filter-status").value
  const type = $("#adm-filter-type").value
  const rows = await api.listLeaves({ status, type })
  renderAdmTable(rows)
}

async function bootstrap() {
  const meRes = await api.me()
  const me = meRes.user
  if (!me) {
    show("#auth-section")
    setNav(null)
  } else {
    setNav(me)
    if (me.role === "admin") {
      show("#admin-dashboard")
      await refreshAdmin()
    } else {
      show("#employee-dashboard")
      const u = await api.user()
      renderBalances(u)
      await refreshEmployee()
    }
  }

  // Auth handlers
  $("#login-form").onsubmit = async (e) => {
    e.preventDefault()
    try {
      const email = $("#email").value.trim()
      const password = $("#password").value
      await api.login(email, password)
      location.reload()
    } catch (err) {
      alert(err.message)
    }
  }
  $("#register-form").onsubmit = async (e) => {
    e.preventDefault()
    try {
      await api.register($("#reg-name").value.trim(), $("#reg-email").value.trim(), $("#reg-password").value)
      alert("Registered! Please login.")
      $("#reg-name").value = ""
      $("#reg-email").value = ""
      $("#reg-password").value = ""
    } catch (err) {
      alert(err.message)
    }
  }

  // Employee actions
  $("#leave-form").onsubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        type: $("#type").value,
        start_date: $("#start-date").value,
        end_date: $("#end-date").value,
        reason: $("#reason").value.trim(),
      }
      await api.createLeave(payload)
      $("#reason").value = ""
      await refreshEmployee()
      alert("Leave submitted.")
    } catch (err) {
      alert(err.message)
    }
  }
  $("#emp-refresh").onclick = refreshEmployee
  $("#notif-refresh").onclick = loadNotifications

  // Admin actions
  $("#adm-refresh").onclick = refreshAdmin
}

bootstrap()
