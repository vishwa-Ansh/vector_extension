const vscode = acquireVsCodeApi();

const tabs =
  document.querySelectorAll(".tab");

const issues =
  document.querySelectorAll(".issue");

const refreshButton =
  document.getElementById("refresh");

const scanButton =
  document.getElementById("scan");

const applyFixButton =
  document.getElementById("apply-fix");

const explainButton =
  document.getElementById("explain");

const moreOptionsButton =
  document.getElementById("more-options");

const headerMoreButton =
  document.getElementById("more-header");

const copyFixButton =
  document.getElementById("copy-fix");

const analysisStatus =
  document.getElementById(
    "analysis-status"
  );

const analysisTime =
  document.getElementById(
    "analysis-time"
  );

const issueCount =
  document.getElementById(
    "issue-count"
  );

const criticalCount =
  document.getElementById(
    "critical-count"
  );

const toast =
  document.getElementById("toast");

const toastMessage =
  document.getElementById(
    "toast-message"
  );


let activeTab = "review";

let selectedIssue =
  "null-reference";


const issueData = {

  "null-reference": {
    title:
      "Possible null reference",

    file:
      "App.tsx",

    line:
      42,

    severity:
      "Critical",

    oldCode:
      "const data = user.profile.name;",

    newCode:
      'const data = user?.profile?.name ?? "";'
  },

  "undefined-variable": {
    title:
      "Undefined variable",

    file:
      "api.ts",

    line:
      87,

    severity:
      "Critical",

    oldCode:
      "return response.data;",

    newCode:
      "return response?.data ?? null;"
  },

  "rerender": {
    title:
      "Unnecessary re-render",

    file:
      "Home.tsx",

    line:
      61,

    severity:
      "Warning",

    oldCode:
      "const value = calculate(data);",

    newCode:
      "const value = useMemo(() => calculate(data), [data]);"
  },

  "dependency": {
    title:
      "Missing dependency",

    file:
      "useEffect",

    line:
      24,

    severity:
      "Warning",

    oldCode:
      "useEffect(() => loadData(), []);",

    newCode:
      "useEffect(() => loadData(), [loadData]);"
  },

  "conditional": {
    title:
      "Simplify conditional logic",

    file:
      "utils.ts",

    line:
      19,

    severity:
      "Suggestion",

    oldCode:
      "if (value === true) return true;",

    newCode:
      "return Boolean(value);"
  }

};


/* =========================
   TAB MANAGEMENT
========================= */

function activateTab(
  tabName
) {

  activeTab =
    tabName || "review";

  tabs.forEach(
    (tab) => {

      const isActive =
        tab.dataset.tab ===
        activeTab;

      tab.classList.toggle(
        "active",
        isActive
      );

    }
  );

}


function sendTab(
  tabName
) {

  activateTab(tabName);

  vscode.postMessage({
    type: "tab",
    tab: tabName
  });

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

        sendTab(tabName);

      }
    );

  }
);


/* =========================
   ISSUE MANAGEMENT
========================= */

function selectIssue(
  issueId
) {

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
    issueId
  );

}


function updateSuggestedFix(
  issueId
) {

  const data =
    issueData[issueId];

  if (!data) {
    return;
  }

  const diff =
    document.querySelector(
      ".diff"
    );

  if (!diff) {
    return;
  }

  diff.innerHTML = `
    <div class="diff-line removed">
      <span class="diff-symbol">−</span>
      <code>${escapeHtml(
        data.oldCode
      )}</code>
    </div>

    <div class="diff-line added">
      <span class="diff-symbol">+</span>
      <code>${escapeHtml(
        data.newCode
      )}</code>
    </div>
  `;

}


function escapeHtml(
  value
) {

  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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

        selectIssue(issueId);

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

  analysisStatus.classList.remove(
    "completed"
  );

  analysisStatus.classList.add(
    "analyzing"
  );

  analysisStatus.innerHTML = `
    <span class="status-dot"></span>
    <span>Analyzing</span>
  `;

}


function setCompleted(
  duration
) {

  if (!analysisStatus) {
    return;
  }

  analysisStatus.classList.remove(
    "analyzing"
  );

  analysisStatus.classList.add(
    "completed"
  );

  analysisStatus.innerHTML = `
    <span class="status-dot"></span>
    <span>Completed</span>
  `;

  if (analysisTime) {

    analysisTime.textContent =
      `Completed in ${
        duration || "2.3s"
      }`;

  }

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


if (scanButton) {

  scanButton.addEventListener(
    "click",
    runAgent
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
        issue: selectedIssue,
        file: data.file,
        line: data.line,
        oldCode: data.oldCode,
        newCode: data.newCode
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
        issue: selectedIssue,
        title:
          data?.title || ""
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
        type: "moreOptions"
      });

    }
  );

}


if (headerMoreButton) {

  headerMoreButton.addEventListener(
    "click",
    () => {

      vscode.postMessage({
        type: "moreOptions"
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
          data.newCode
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
   TOAST
========================= */

let toastTimer;

function showToast(
  message
) {

  if (!toast || !toastMessage) {
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
      "activateTab"
    ) {

      activateTab(
        message.tab
      );

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
   INITIAL STATE
========================= */

activateTab(
  "review"
);

selectIssue(
  "null-reference"
);