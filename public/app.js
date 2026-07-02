const state = {
  activeTab: "login"
};

const message = document.querySelector("#message");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const profile = document.querySelector("#profile");
const tabs = document.querySelectorAll(".tab");
const registerPasswordInput = registerForm.elements.password;
const passwordStrengthBar = document.querySelector("#password-strength-bar");
const passwordStrengthLabel = document.querySelector("#password-strength-label");
const passwordRuleItems = document.querySelectorAll("[data-password-rule]");

const passwordChecks = [
  { key: "length", test: (value) => value.length > 8 },
  { key: "lowercase", test: (value) => /[a-z]/.test(value) },
  { key: "uppercase", test: (value) => /[A-Z]/.test(value) },
  { key: "number", test: (value) => /[0-9]/.test(value) },
  { key: "symbol", test: (value) => /[^A-Za-z0-9\s]/.test(value) }
];

const passwordLabels = ["Sin completar", "Muy debil", "Debil", "Media", "Fuerte", "Completa"];

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
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{9,72}$/,
    message: "La contrasena requiere mas de 8 caracteres, mayuscula, minuscula, numero y simbolo."
  }
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

registerPasswordInput.addEventListener("input", () => {
  updatePasswordStrength(registerPasswordInput.value);
});

loginForm.addEventListener("submit", (event) => handleSubmit(event, "/api/login"));
registerForm.addEventListener("submit", (event) => handleSubmit(event, "/api/register"));
document.querySelector("#logout-button").addEventListener("click", logout);

updatePasswordStrength("");
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
  updatePasswordStrength("");

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
    const value = name === "password" ? input?.value : input?.value.trim();

    if (input && !rule.pattern.test(value)) {
      input.setCustomValidity(rule.message);
      input.reportValidity();
      input.setCustomValidity("");
      return false;
    }
  }

  return true;
}

function updatePasswordStrength(password) {
  const score = passwordChecks.filter((check) => check.test(password)).length;
  const percent = Math.round((score / passwordChecks.length) * 100);

  passwordStrengthBar.style.width = `${percent}%`;
  passwordStrengthBar.dataset.score = String(score);
  passwordStrengthLabel.textContent = `Seguridad: ${percent}% (${passwordLabels[score]})`;

  passwordRuleItems.forEach((item) => {
    const check = passwordChecks.find((rule) => rule.key === item.dataset.passwordRule);
    item.classList.toggle("complete", Boolean(check?.test(password)));
  });
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
