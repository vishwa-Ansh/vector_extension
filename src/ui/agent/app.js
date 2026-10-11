const vscode = acquireVsCodeApi();

const tabs =
  document.querySelectorAll(".tab");

const issues =
  document.querySelectorAll(".issue");

const refreshButton =
  document.getElementById("refresh");

const newAgentButton =
  document.getElementById("new-agent");

const menuButton =
  document.getElementById("menu");

const fullscreenButton =
  document.getElementById("fullscreen");

const closeButton =
  document.getElementById("close");

const copyFixButton =
  document.getElementById("copy-fix");

const applyFixButton =
  document.getElementById("apply-fix");

const explainButton =
  document.getElementById("explain");

const moreOptionsButton =
  document.getElementById("more-options");

const menuPanel =
  document.getElementById("menu-panel");

const themePanel =
  document.getElementById("theme-panel");

const themeOptions =
  document.querySelectorAll(".theme-option");

const analysisStatus =
  document.getElementById("analysis-status");

const issueCount =
  document.getElementById("issue-count");

const criticalCount =
  document.getElementById("critical-count");

const fixLine =
  document.getElementById("fix-line");

const toast =
  document.getElementById("toast");

const toastMessage =
  document.getElementById("toast-message");

let activeTab = "review";

let selectedIssue =
  "null-reference";

let toastTimer;


/* =========================
   ISSUE DATA
========================= */

const issueData = {
  "null-reference": {
    title:
      "'error' is of type 'unknown'",

    description:
      "Use proper type checking for error object",

    line: 12,

    severity:
      "Critical",

    file:
      "App.tsx",

    oldCode:
      'console.error("Error fetching data:", error);',

    newCode: [
      "if (error instanceof Error) {",
      '  console.error("Error fetching data:", error.message);',
      "} else {",
      '  console.error("Error fetching data:", error);',
      "}"
    ]
  },

  "return-type": {
    title:
      "Missing return type on function",

    description:
      "Add explicit return type",

    line: 5,

    severity:
      "Warning",

    file:
      "App.tsx",

    oldCode:
      "function getData() {",

    newCode: [
      "function getData(): Promise<Data> {"
    ]
  },

  "api": {
    title:
      "API call not optimized",

    description:
      "Consider adding loading state cleanup",

    line: 8,

    severity:
      "Suggestion",

    file:
      "api.ts",

    oldCode:
      "const response = await fetch(url);",

    newCode: [
      "setLoading(true);",
      "",
      "try {",
      "  const response = await fetch(url);",
      "  return await response.json();",
      "} finally {",
      "  setLoading(false);",
      "}"
    ]
  },

  "any-type": {
    title:
      "Use of any type",

    description:
      "Consider using proper TypeScript types",

    line: 4,

    severity:
      "Suggestion",

    file:
      "types.ts",

    oldCode:
      "const result: any = response;",

    newCode: [
      "const result: ApiResponse = response;"
    ]
  },

  "component": {
    title:
      "Component can be broken down",

    description:
      "Consider splitting into smaller components",

    line: 24,

    severity:
      "Suggestion",

    file:
      "Home.tsx",

    oldCode:
      "return <LargeComponent />;",

    newCode: [
      "return (",
      "  <PageLayout>",
      "    <Header />",
      "    <Content />",
      "  </PageLayout>",
      ");"
    ]
  }
};


/* =========================
   THEME
========================= */

function getSavedTheme() {
  try {
    const saved =
      localStorage.getItem(
        "vector-o-theme"
      );

    const allowed = [
      "dark",
      "light",
      "system",
      "vscode-dark",
      "vscode-light",
      "vscode-contrast"
    ];

    if (
      saved &&
      allowed.includes(saved)
    ) {
      return saved;
    }
  } catch {}

  return "dark";
}


function saveTheme(theme) {
  try {
    localStorage.setItem(
      "vector-o-theme",
      theme
    );
  } catch {}
}


function getSystemTheme() {
  if (
    window.matchMedia &&
    window.matchMedia(
      "(prefers-color-scheme: light)"
    ).matches
  ) {
    return "light";
  }

  return "dark";
}


function applyTheme(theme) {
  const themes = [
    "light",
    "vscode-dark",
    "vscode-light",
    "vscode-contrast"
  ];

  document.body.classList.remove(
    "light",
    "vscode-dark",
    "vscode-light",
    "vscode-contrast"
  );

  if (theme === "system") {
    const systemTheme =
      getSystemTheme();

    if (systemTheme === "light") {
      document.body.classList.add(
        "light"
      );
    }
  } else if (themes.includes(theme)) {
    document.body.classList.add(
      theme
    );
  }

  themeOptions.forEach(
    (option) => {
      const active =
        option.dataset.theme ===
        theme;

      option.classList.toggle(
        "active",
        active
      );

      const check =
        option.querySelector(
          "span:last-child"
        );

      if (check) {
        check.textContent =
          active ? "✓" : "";
      }
    }
  );

  saveTheme(theme);
}


function initializeTheme() {
  const theme =
    getSavedTheme();

  applyTheme(theme);
}


themeOptions.forEach(
  (option) => {
    option.addEventListener(
      "click",
      () => {
        const theme =
          option.dataset.theme;

        if (!theme) {
          return;
        }

        applyTheme(theme);

        themePanel.classList.add(
          "hidden"
        );

        menuPanel.classList.add(
          "hidden"
        );

        showToast(
          `Theme changed to ${
            theme.charAt(0).toUpperCase() +
            theme.slice(1)
          }.`
        );
      }
    );
  }
);


if (window.matchMedia) {
  const systemTheme =
    window.matchMedia(
      "(prefers-color-scheme: light)"
    );

  systemTheme.addEventListener(
    "change",
    () => {
      if (
        getSavedTheme() ===
        "system"
      ) {
        applyTheme(
          "system"
        );
      }
    }
  );
}


/* =========================
   MENU
========================= */

function closeMenus() {
  menuPanel.classList.add(
    "hidden"
  );

  themePanel.classList.add(
    "hidden"
  );
}


function toggleMenu() {
  const wasHidden =
    menuPanel.classList.contains(
      "hidden"
    );

  closeMenus();

  if (wasHidden) {
    menuPanel.classList.remove(
      "hidden"
    );
  }
}


if (menuButton) {
  menuButton.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();

      toggleMenu();
    }
  );
}


document
  .querySelectorAll(".menu-item")
  .forEach(
    (item) => {
      item.addEventListener(
        "click",
        () => {
          const action =
            item.dataset.menu;

          if (action === "theme") {
            themePanel.classList.toggle(
              "hidden"
            );

            return;
          }

          closeMenus();

          if (action === "settings") {
            vscode.postMessage({
              type: "settings"
            });

            showToast(
              "VECTOR-Ø settings are coming soon."
            );

            return;
          }

          if (action === "history") {
            vscode.postMessage({
              type: "clearHistory"
            });

            showToast(
              "Analysis history cleared."
            );

            return;
          }

          if (action === "export") {
            vscode.postMessage({
              type: "exportReport"
            });

            showToast(
              "Preparing analysis report..."
            );

            return;
          }

          if (action === "about") {
            showToast(
              "VECTOR-Ø AI Coding Agent"
            );
          }
        }
      );
    }
  );


document.addEventListener(
  "click",
  (event) => {
    if (
      !menuPanel.contains(
        event.target
      ) &&
      !themePanel.contains(
        event.target
      ) &&
      !menuButton.contains(
        event.target
      )
    ) {
      closeMenus();
    }
  }
);


/* =========================
   TABS
========================= */

function activateTab(
  tabName
) {
  activeTab =
    tabName || "review";

  tabs.forEach(
    (tab) => {
      tab.classList.toggle(
        "active",
        tab.dataset.tab ===
          activeTab
      );
    }
  );
}


tabs.forEach(
  (tab) => {
    tab.addEventListener(
      "click",
      () => {
        const tabName =
          tab.dataset.tab;

        if (!tabName) {
          return;
        }

        /*
         * CHAT
         *
         * Chat is not a normal
         * Review tab. It opens
         * chat.html inside the
         * same VECTOR-Ø webview.
         */

        if (
          tabName === "chat"
        ) {
          vscode.postMessage({
            type: "openChat"
          });

          return;
        }

        activateTab(
          tabName
        );

        vscode.postMessage({
          type: "tab",
          tab: tabName
        });

        if (
          tabName !== "review"
        ) {
          showToast(
            `${capitalize(tabName)} mode selected.`
          );
        }
      }
    );
  }
);


/* =========================
   ISSUE SELECTION
========================= */

function selectIssue(
  issueId
) {
  const data =
    issueData[issueId];

  if (!data) {
    return;
  }

  selectedIssue =
    issueId;

  issues.forEach(
    (issue) => {
      issue.classList.toggle(
        "selected",
        issue.dataset.issue ===
          issueId
      );
    }
  );

  updateSuggestedFix(
    data
  );
}


function updateSuggestedFix(
  data
) {
  const diff =
    document.querySelector(
      ".diff"
    );

  if (!diff) {
    return;
  }

  if (fixLine) {
    fixLine.textContent =
      `(Line ${data.line})`;
  }

  const removed =
    document.createElement(
      "div"
    );

  removed.className =
    "diff-line removed";

  removed.innerHTML = `
    <span class="diff-symbol">−</span>
    <code>${escapeHtml(
      data.oldCode
    )}</code>
  `;

  diff.innerHTML = "";

  diff.appendChild(
    removed
  );

  data.newCode.forEach(
    (line) => {
      const added =
        document.createElement(
          "div"
        );

      added.className =
        "diff-line added";

      added.innerHTML = `
        <span class="diff-symbol">+</span>
        <code>${escapeHtml(
          line
        )}</code>
      `;

      diff.appendChild(
        added
      );
    }
  );
}


function escapeHtml(
  value
) {
  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


issues.forEach(
  (issue) => {
    issue.addEventListener(
      "click",
      () => {
        const issueId =
          issue.dataset.issue;

        if (!issueId) {
          return;
        }

        selectIssue(
          issueId
        );
      }
    );
  }
);


/* =========================
   ANALYSIS
========================= */

function setAnalyzing() {
  if (!analysisStatus) {
    return;
  }

  analysisStatus.innerHTML = `
    <span
      class="status-check"
      style="
        background:#45bfff;
        color:#07131f;
      "
    >
      ◌
    </span>

    <span>
      Analyzing...
    </span>
  `;
}


function setCompleted(
  duration
) {
  if (!analysisStatus) {
    return;
  }

  analysisStatus.innerHTML = `
    <span class="status-check">
      ✓
    </span>

    <span>
      Completed in ${
        duration || "2.3s"
      }
    </span>
  `;
}


function runAgent() {
  setAnalyzing();

  vscode.postMessage({
    type: "runAgent"
  });
}


if (refreshButton) {
  refreshButton.addEventListener(
    "click",
    runAgent
  );
}


if (newAgentButton) {
  newAgentButton.addEventListener(
    "click",
    () => {
      selectedIssue =
        "null-reference";

      selectIssue(
        selectedIssue
      );

      activateTab(
        "review"
      );

      runAgent();
    }
  );
}


/* =========================
   FULLSCREEN
========================= */

if (fullscreenButton) {
  fullscreenButton.addEventListener(
    "click",
    () => {
      vscode.postMessage({
        type: "fullscreen"
      });

      showToast(
        "Use the VS Code panel controls to resize VECTOR-Ø."
      );
    }
  );
}


/* =========================
   CLOSE
========================= */

if (closeButton) {
  closeButton.addEventListener(
    "click",
    () => {
      vscode.postMessage({
        type: "close"
      });
    }
  );
}


/* =========================
   APPLY FIX
========================= */

if (applyFixButton) {
  applyFixButton.addEventListener(
    "click",
    () => {
      const data =
        issueData[
          selectedIssue
        ];

      if (!data) {
        return;
      }

      vscode.postMessage({
        type: "applyFix",

        issue:
          selectedIssue,

        file:
          data.file,

        line:
          data.line,

        oldCode:
          data.oldCode,

        newCode:
          data.newCode.join("\n")
      });

      showToast(
        "VECTOR-Ø is applying the suggested fix..."
      );
    }
  );
}


/* =========================
   EXPLAIN
========================= */

if (explainButton) {
  explainButton.addEventListener(
    "click",
    () => {
      const data =
        issueData[
          selectedIssue
        ];

      vscode.postMessage({
        type: "explain",

        issue:
          selectedIssue,

        title:
          data?.title || "",

        description:
          data?.description || ""
      });

      activateTab(
        "explain"
      );
    }
  );
}


/* =========================
   MORE OPTIONS
========================= */

if (moreOptionsButton) {
  moreOptionsButton.addEventListener(
    "click",
    () => {
      vscode.postMessage({
        type: "moreOptions",

        issue:
          selectedIssue
      });
    }
  );
}


/* =========================
   COPY FIX
========================= */

if (copyFixButton) {
  copyFixButton.addEventListener(
    "click",
    async () => {
      const data =
        issueData[
          selectedIssue
        ];

      if (!data) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          data.newCode.join("\n")
        );

        showToast(
          "Suggested fix copied."
        );
      } catch {
        showToast(
          "Unable to copy fix."
        );
      }
    }
  );
}


/* =========================
   VS CODE MESSAGES
========================= */

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
      "analysisStatus"
    ) {
      if (
        message.status ===
        "analyzing"
      ) {
        setAnalyzing();
      }

      if (
        message.status ===
        "completed"
      ) {
        setCompleted(
          message.duration
        );
      }
    }

    if (
      message.type ===
      "analysisResult"
    ) {
      if (issueCount) {
        issueCount.textContent =
          String(
            message.total ??
              5
          );
      }

      if (criticalCount) {
        criticalCount.textContent =
          String(
            message.critical ??
              2
          );
      }
    }

    if (
      message.type ===
      "activateTab"
    ) {
      activateTab(
        message.tab
      );
    }

    if (
      message.type ===
      "fixApplied"
    ) {
      showToast(
        "Fix applied successfully."
      );
    }

    if (
      message.type ===
      "error"
    ) {
      showToast(
        message.message ||
          "VECTOR-Ø encountered an error."
      );
    }
  }
);


/* =========================
   TOAST
========================= */

function showToast(
  message
) {
  if (
    !toast ||
    !toastMessage
  ) {
    return;
  }

  toastMessage.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () => {
        toast.classList.remove(
          "show"
        );
      },
      2600
    );
}


function capitalize(
  value
) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}


/* =========================
   INITIAL STATE
========================= */

initializeTheme();

activateTab(
  "review"
);

selectIssue(
  "null-reference"
);