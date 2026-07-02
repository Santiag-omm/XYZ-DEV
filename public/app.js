const state = {
  activeTab: "login"
};

const shell = document.querySelector(".shell");
const message = document.querySelector("#message");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const profile = document.querySelector("#profile");
const tabs = document.querySelectorAll(".tab");
const loginEmailInput = loginForm.elements.email;
const loginPasswordInput = loginForm.elements.password;
const loginCredentialInputs = [loginEmailInput, loginPasswordInput];
const loginError = document.querySelector("#login-error");
const loginWarning = document.querySelector("#login-warning");
const loginLock = document.querySelector("#login-lock");
const loginControls = Array.from(loginForm.querySelectorAll("input, button"));
const registerPhoneInput = registerForm.elements.phone;
const registerPasswordInput = registerForm.elements.password;
const dashboardLogo = document.querySelector(".dashboard-logo");
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
const loginErrorText = "Correo o contrasena incorrectos.";
const loginLockStorageKey = "autopartes.loginLockedUntil";
let loginLockTimer;

const clientRules = {
  name: {
    pattern: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'. -]{2,80}$/u,
    message: "El nombre debe tener 2 a 80 caracteres validos."
  },
  phone: {
    pattern: /^[0-9]{10}$/,
    message: "El telefono debe tener exactamente 10 digitos."
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

registerPasswordInput.addEventListener("input", validatePasswordLive);
registerPhoneInput.addEventListener("input", () => {
  registerPhoneInput.value = registerPhoneInput.value.replace(/\D/g, "").slice(0, 10);
});
loginCredentialInputs.forEach((input) => {
  input.addEventListener("input", clearLoginFeedback);
});

loginForm.addEventListener("submit", (event) => handleSubmit(event, "/api/login"));
registerForm.addEventListener("submit", (event) => handleSubmit(event, "/api/register"));
document.querySelector("#logout-button").addEventListener("click", logout);

validatePasswordLive();
restoreLoginLock();
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
  clearLoginFeedback();
  showMessage("");
  refreshCaptcha();
}

async function handleSubmit(event, endpoint) {
  event.preventDefault();
  const form = event.currentTarget;
  const isLogin = endpoint.endsWith("login");

  if (!validateClient(form)) {
    if (isLogin) {
      showLoginFeedback(loginErrorText);
    }

    return;
  }

  if (isLogin) {
    clearLoginFeedback();
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  const result = await request(endpoint, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!result.ok) {
    if (isLogin && [400, 401, 429].includes(result.status)) {
      showLoginFeedback(result.status === 429 ? result.data.message : loginErrorText);
      refreshCaptcha();
      return;
    }

    if (isLogin && result.status === 423) {
      showLoginFeedback(loginErrorText);
      startLoginLock(result.data.retryAfterMs);
      refreshCaptcha();
      return;
    }

    showMessage(result.data.message || "No se pudo completar la operacion.", true);
    refreshCaptcha();
    return;
  }

  form.reset();
  validatePasswordLive();

  if (endpoint.endsWith("register")) {
    showMessage("Cuenta creada. Ya puedes iniciar sesion.");
    switchTab("login");
    return;
  }

  showProfile(result.data.user);
  clearLoginFeedback();
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

  return score === passwordChecks.length;
}

function validatePasswordLive() {
  const isComplete = updatePasswordStrength(registerPasswordInput.value);
  const hasValue = registerPasswordInput.value.length > 0;

  registerPasswordInput.setCustomValidity(
    isComplete || !hasValue ? "" : clientRules.password.message
  );
  registerPasswordInput.setAttribute("aria-invalid", String(hasValue && !isComplete));
}

function showLoginFeedback(text) {
  loginForm.classList.add("login-failed");
  loginCredentialInputs.forEach((input) => {
    input.classList.add("field-error");
    input.setAttribute("aria-invalid", "true");
    input.setCustomValidity(loginErrorText);
  });
  loginError.textContent = text;
  loginError.classList.remove("hidden");
  loginWarning.classList.remove("hidden");
  showMessage("");
}

function clearLoginFeedback() {
  loginForm.classList.remove("login-failed");
  loginCredentialInputs.forEach((input) => {
    input.classList.remove("field-error");
    input.setAttribute("aria-invalid", "false");
    input.setCustomValidity("");
  });
  loginError.textContent = loginErrorText;
  loginError.classList.add("hidden");
  loginWarning.classList.add("hidden");
}

function startLoginLock(retryAfterMs) {
  const lockedUntil = Date.now() + Math.max(Number(retryAfterMs) || 60 * 1000, 1000);
  localStorage.setItem(loginLockStorageKey, String(lockedUntil));
  renderLoginLock(lockedUntil);
}

function restoreLoginLock() {
  const lockedUntil = Number(localStorage.getItem(loginLockStorageKey));

  if (lockedUntil > Date.now()) {
    renderLoginLock(lockedUntil);
    return;
  }

  localStorage.removeItem(loginLockStorageKey);
}

function renderLoginLock(lockedUntil) {
  loginForm.classList.add("login-locked");
  loginControls.forEach((control) => {
    control.disabled = true;
  });
  loginLock.classList.remove("hidden");

  clearInterval(loginLockTimer);
  updateLoginLockText(lockedUntil);
  loginLockTimer = setInterval(() => updateLoginLockText(lockedUntil), 1000);
}

function updateLoginLockText(lockedUntil) {
  const remainingMs = Number(lockedUntil) - Date.now();

  if (remainingMs <= 0) {
    clearInterval(loginLockTimer);
    localStorage.removeItem(loginLockStorageKey);
    loginForm.classList.remove("login-locked");
    loginControls.forEach((control) => {
      control.disabled = false;
    });
    loginLock.classList.add("hidden");
    clearLoginFeedback();
    refreshCaptcha();
    return;
  }

  loginLock.textContent = `Acceso bloqueado temporalmente. Intenta de nuevo en ${formatCountdown(remainingMs)}.`;
}

function formatCountdown(durationMs) {
  const totalSeconds = Math.ceil(durationMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
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
  shell.classList.remove("dashboard-mode");
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
  shell.classList.add("dashboard-mode");
  document.querySelector(".tabs").classList.add("hidden");
  loginForm.classList.add("hidden");
  registerForm.classList.add("hidden");
  profile.classList.remove("hidden");
  replayDashboardLogo();
}

function replayDashboardLogo() {
  dashboardLogo.classList.remove("reveal-now");
  void dashboardLogo.offsetWidth;
  dashboardLogo.classList.add("reveal-now");
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
