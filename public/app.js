const state = {
  activeTab: "login"
};

const message = document.querySelector("#message");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const profile = document.querySelector("#profile");
const tabs = document.querySelectorAll(".tab");

const clientRules = {
  name: {
    pattern: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'. -]{2,80}$/u,
    message: "El nombre debe tener 2 a 80 caracteres validos."
  },
  phone: {
    pattern: /^\+?[0-9 ()-]{8,20}$/,
    message: "El telefono debe tener 8 a 20 caracteres validos."
  },
  address: {
    pattern: /^.{8,180}$/u,
    message: "La direccion debe tener 8 a 180 caracteres."
  },
  password: {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,72}$/,
    message: "La contrasena requiere mayuscula, minuscula, numero y simbolo."
  }
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

loginForm.addEventListener("submit", (event) => handleSubmit(event, "/api/login"));
registerForm.addEventListener("submit", (event) => handleSubmit(event, "/api/register"));
document.querySelector("#logout-button").addEventListener("click", logout);

refreshCaptcha();
loadProfile();

function switchTab(tabName) {
  state.activeTab = tabName;
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  loginForm.classList.toggle("hidden", tabName !== "login");
  registerForm.classList.toggle("hidden", tabName !== "register");
  showMessage("");
  refreshCaptcha();
}

async function handleSubmit(event, endpoint) {
  event.preventDefault();
  const form = event.currentTarget;

  if (!validateClient(form)) {
    return;
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  const result = await request(endpoint, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!result.ok) {
    showMessage(result.data.message || "No se pudo completar la operacion.", true);
    refreshCaptcha();
    return;
  }

  form.reset();

  if (endpoint.endsWith("register")) {
    showMessage("Cuenta creada. Ya puedes iniciar sesion.");
    switchTab("login");
    return;
  }

  showProfile(result.data.user);
  showMessage("Sesion iniciada.");
}

function validateClient(form) {
  if (!form.reportValidity()) {
    return false;
  }

  for (const [name, rule] of Object.entries(clientRules)) {
    const input = form.elements[name];
    if (input && !rule.pattern.test(input.value.trim())) {
      input.setCustomValidity(rule.message);
      input.reportValidity();
      input.setCustomValidity("");
      return false;
    }
  }

  return true;
}

async function refreshCaptcha() {
  const result = await request("/api/captcha");
  if (!result.ok) {
    showMessage("No se pudo cargar el CAPTCHA.", true);
    return;
  }

  document.querySelectorAll("[data-captcha-question]").forEach((node) => {
    node.textContent = result.data.question;
  });
}

async function loadProfile() {
  const result = await request("/api/me");
  if (result.ok) {
    showProfile(result.data.user);
  }
}

async function logout() {
  await request("/api/logout", { method: "POST" });
  profile.classList.add("hidden");
  document.querySelector(".tabs").classList.remove("hidden");
  loginForm.classList.toggle("hidden", state.activeTab !== "login");
  registerForm.classList.toggle("hidden", state.activeTab !== "register");
  showMessage("Sesion cerrada.");
  refreshCaptcha();
}

function showProfile(user) {
  document.querySelector("[data-profile='name']").textContent = user.name;
  document.querySelector("[data-profile='email']").textContent = user.email;
  document.querySelector("[data-profile='address']").textContent = user.address;
  document.querySelector(".tabs").classList.add("hidden");
  loginForm.classList.add("hidden");
  registerForm.classList.add("hidden");
  profile.classList.remove("hidden");
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}
