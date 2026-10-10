const vscode = acquireVsCodeApi();

const tabs = document.querySelectorAll(".tab");
const runAgent = document.getElementById("run-agent");
const rescan = document.getElementById("rescan");
const settings = document.getElementById("settings");

const workspaceStatus = document.getElementById("workspace-status");

const errorCount = document.getElementById("error-count");
const logicCount = document.getElementById("logic-count");
const packageCount = document.getElementById("package-count");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => {
      item.classList.remove("active");
    });

    tab.classList.add("active");

    vscode.postMessage({
      type: "tab",
      tab: tab.dataset.tab
    });
  });
});

runAgent.addEventListener("click", () => {
  workspaceStatus.textContent =
    "Agent is analyzing your workspace...";

  runAgent.disabled = true;

  vscode.postMessage({
    type: "runAgent"
  });
});

rescan.addEventListener("click", () => {
  workspaceStatus.textContent =
    "Scanning workspace...";

  vscode.postMessage({
    type: "rescan"
  });
});

settings.addEventListener("click", () => {
  vscode.postMessage({
    type: "settings"
  });
});

window.addEventListener("message", (event) => {
  const message = event.data;

  switch (message.type) {
    case "workspaceStatus":
      workspaceStatus.textContent = message.value;
      break;

    case "issues":
      errorCount.textContent = message.errors ?? 0;
      logicCount.textContent = message.logic ?? 0;
      packageCount.textContent = message.packages ?? 0;
      break;

    case "agentFinished":
      workspaceStatus.textContent =
        "Analysis completed.";

      runAgent.disabled = false;
      break;

    case "agentError":
      workspaceStatus.textContent =
        "Agent encountered an error.";

      runAgent.disabled = false;
      break;
  }
});