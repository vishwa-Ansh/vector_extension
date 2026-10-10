const vscode = acquireVsCodeApi();

const tabs = document.querySelectorAll(".tab");
const agentTabs = document.querySelectorAll(".agent-tab");
const primaryNavItems = document.querySelectorAll(".primary-nav-item");

const runAgentButton =
  document.getElementById("run-agent");

const rescanButton =
  document.getElementById("rescan");

const settingsButton =
  document.getElementById("settings");

const settingsPanel =
  document.getElementById("settings-panel");

const closeSettingsButton =
  document.getElementById("close-settings");

const themeSelect =
  document.getElementById("theme-select");

const accentSelect =
  document.getElementById("accent-select");

const compactMode =
  document.getElementById("compact-mode");

const showAgentStatus =
  document.getElementById("show-agent-status");

const workspaceStatus =
  document.getElementById("workspace-status");

const storedSettings =
  localStorage.getItem("vector-o-settings");

const defaultSettings = {
  theme: "vscode-dark",
  accent: "blue",
  compact: false,
  showAgentStatus: true
};

let settings = defaultSettings;

if (storedSettings) {
  try {
    settings = {
      ...defaultSettings,
      ...JSON.parse(storedSettings)
    };
  } catch {
    settings = defaultSettings;
  }
}

function saveSettings() {
  localStorage.setItem(
    "vector-o-settings",
    JSON.stringify(settings)
  );
}

function applyTheme() {
  document.body.dataset.theme =
    settings.theme;

  document.body.dataset.accent =
    settings.accent;

  document.body.classList.toggle(
    "compact-mode",
    settings.compact
  );

  const status =
    document.querySelector(".agent-status");

  if (status) {
    status.style.display =
      settings.showAgentStatus
        ? ""
        : "none";
  }
}

function loadSettings() {
  if (themeSelect) {
    themeSelect.value =
      settings.theme;
  }

  if (accentSelect) {
    accentSelect.value =
      settings.accent;
  }

  if (compactMode) {
    compactMode.checked =
      settings.compact;
  }

  if (showAgentStatus) {
    showAgentStatus.checked =
      settings.showAgentStatus;
  }

  applyTheme();
}

function activateAgentTab(tabName) {
  agentTabs.forEach((tab) => {
    tab.classList.toggle(
      "active",
      tab.dataset.tab === tabName
    );
  });
}

function activatePrimaryItem(action) {
  primaryNavItems.forEach((item) => {
    item.classList.toggle(
      "active",
      item.dataset.action === action
    );
  });
}

function sendTab(tabName) {
  activateAgentTab(tabName);

  vscode.postMessage({
    type: "tab",
    tab: tabName
  });
}

function handlePrimaryAction(action) {
  switch (action) {

    case "new-review":
      activatePrimaryItem(action);
      sendTab("review");
      break;

    case "chat":
      activatePrimaryItem(action);
      sendTab("chat");
      break;

    case "code-review":
      activatePrimaryItem(action);
      sendTab("review");
      break;

    case "explain":
      activatePrimaryItem(action);
      sendTab("explain");
      break;

    case "bugs":
      activatePrimaryItem(action);

      vscode.postMessage({
        type: "tab",
        tab: "review",
        mode: "bugs"
      });

      break;

    case "refactor":
      activatePrimaryItem(action);
      sendTab("refactor");
      break;

    case "tests":
      activatePrimaryItem(action);
      sendTab("tests");
      break;

    case "documentation":
      activatePrimaryItem(action);

      vscode.postMessage({
        type: "tab",
        tab: "explain",
        mode: "documentation"
      });

      break;
  }
}

primaryNavItems.forEach((item) => {

  item.addEventListener(
    "click",
    () => {

      const action =
        item.dataset.action;

      if (!action) {
        return;
      }

      handlePrimaryAction(action);
    }
  );

});

agentTabs.forEach((tab) => {

  tab.addEventListener(
    "click",
    () => {

      const tabName =
        tab.dataset.tab;

      if (!tabName) {
        return;
      }

      sendTab(tabName);
    }
  );

});

tabs.forEach((tab) => {

  tab.addEventListener(
    "click",
    () => {

      const tabName =
        tab.dataset.tab;

      if (!tabName) {
        return;
      }

      tabs.forEach((item) => {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      sendTab(tabName);
    }
  );

});

if (runAgentButton) {

  runAgentButton.addEventListener(
    "click",
    () => {

      if (workspaceStatus) {
        workspaceStatus.textContent =
          "Analyzing";
      }

      vscode.postMessage({
        type: "runAgent"
      });

    }
  );

}

if (rescanButton) {

  rescanButton.addEventListener(
    "click",
    () => {

      if (workspaceStatus) {
        workspaceStatus.textContent =
          "Scanning";
      }

      vscode.postMessage({
        type: "rescan"
      });

    }
  );

}

if (settingsButton) {

  settingsButton.addEventListener(
    "click",
    () => {

      settingsPanel?.classList.remove(
        "hidden"
      );

      vscode.postMessage({
        type: "settings"
      });

    }
  );

}

if (closeSettingsButton) {

  closeSettingsButton.addEventListener(
    "click",
    () => {

      settingsPanel?.classList.add(
        "hidden"
      );

    }
  );

}

if (themeSelect) {

  themeSelect.addEventListener(
    "change",
    () => {

      settings.theme =
        themeSelect.value;

      saveSettings();
      applyTheme();

      vscode.postMessage({
        type: "settingsChanged",
        settings
      });

    }
  );

}

if (accentSelect) {

  accentSelect.addEventListener(
    "change",
    () => {

      settings.accent =
        accentSelect.value;

      saveSettings();
      applyTheme();

      vscode.postMessage({
        type: "settingsChanged",
        settings
      });

    }
  );

}

if (compactMode) {

  compactMode.addEventListener(
    "change",
    () => {

      settings.compact =
        compactMode.checked;

      saveSettings();
      applyTheme();

      vscode.postMessage({
        type: "settingsChanged",
        settings
      });

    }
  );

}

if (showAgentStatus) {

  showAgentStatus.addEventListener(
    "change",
    () => {

      settings.showAgentStatus =
        showAgentStatus.checked;

      saveSettings();
      applyTheme();

      vscode.postMessage({
        type: "settingsChanged",
        settings
      });

    }
  );

}

window.addEventListener(
  "message",
  (event) => {

    const message =
      event.data;

    if (!message) {
      return;
    }

    if (
      message.type ===
      "workspaceStatus"
    ) {

      if (!workspaceStatus) {
        return;
      }

      switch (message.status) {

        case "scanning":
          workspaceStatus.textContent =
            "Scanning";
          break;

        case "analyzing":
          workspaceStatus.textContent =
            "Analyzing";
          break;

        case "completed":
          workspaceStatus.textContent =
            "Completed";
          break;

        case "ready":
        default:
          workspaceStatus.textContent =
            "Ready";
          break;
      }

    }

    if (
      message.type ===
      "agentTabChanged"
    ) {

      activateAgentTab(
        message.tab
      );

    }

    if (
      message.type ===
      "activateTab"
    ) {

      activateAgentTab(
        message.tab
      );

    }

    if (
      message.type ===
      "agentFinished"
    ) {

      if (workspaceStatus) {
        workspaceStatus.textContent =
          "Completed";
      }

    }

    if (
      message.type ===
      "agentError"
    ) {

      if (workspaceStatus) {
        workspaceStatus.textContent =
          "Error";
      }

    }

    if (
      message.type ===
      "settingsOpened"
    ) {

      settingsPanel?.classList.remove(
        "hidden"
      );

    }

  }
);

loadSettings();

vscode.postMessage({
  type: "test"
});