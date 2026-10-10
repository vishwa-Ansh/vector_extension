import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class SidebarProvider
  implements vscode.WebviewViewProvider {
  private primaryView?: vscode.WebviewView;
  private agentView?: vscode.WebviewView;

  private activeTab = "review";

  constructor(
    private readonly extensionUri: vscode.Uri
  ) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView
  ): void {
    const webview =
      webviewView.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(
          this.extensionUri,
          "src",
          "ui"
        )
      ]
    };

    if (
      webviewView.viewType ===
      "vector-o.agent"
    ) {
      this.agentView = webviewView;

      webview.html =
        this.getAgentContent(webview);

      webview.onDidReceiveMessage(
        (message) =>
          this.handleAgentMessage(message)
      );

      return;
    }

    this.primaryView = webviewView;

    webview.html =
      this.getPrimaryContent(webview);

    webview.onDidReceiveMessage(
      (message) =>
        this.handlePrimaryMessage(message)
    );
  }

  private handlePrimaryMessage(
    message: any
  ) {
    switch (message.type) {
      case "test":
        this.sendPrimary({
          type: "workspaceStatus",
          status: "ready"
        });
        break;

      case "tab":
        this.activeTab =
          message.tab || "review";

        this.sendAgent({
          type: "activateTab",
          tab: this.activeTab
        });

        break;

      case "runAgent":
        this.runAgent();
        break;

      case "rescan":
        this.scanWorkspace();
        break;

      case "settings":
        this.sendPrimary({
          type: "settingsOpened"
        });
        break;

      case "settingsChanged":
        this.broadcastSettings(
          message.settings
        );
        break;

      case "applyFix":
        this.applyFix();
        break;

      case "explainIssue":
        this.activeTab = "explain";

        this.sendAgent({
          type: "activateTab",
          tab: "explain"
        });

        break;

      case "moreOptions":
        vscode.window.showInformationMessage(
          "VECTOR-Ø: More options coming soon."
        );
        break;
    }
  }

  private handleAgentMessage(
    message: any
  ) {
    switch (message.type) {
      case "tab":
        this.activeTab =
          message.tab || "review";

        this.sendPrimary({
          type: "agentTabChanged",
          tab: this.activeTab
        });

        break;

      case "runAgent":
        this.runAgent();
        break;

      case "applyFix":
        this.applyFix();
        break;

      case "explainIssue":
        this.activeTab = "explain";

        this.sendAgent({
          type: "activateTab",
          tab: "explain"
        });

        break;

      case "settings":
        this.sendPrimary({
          type: "settingsOpened"
        });
        break;

      case "moreOptions":
        vscode.window.showInformationMessage(
          "VECTOR-Ø: More options coming soon."
        );
        break;
    }
  }

  private sendPrimary(
    message: any
  ) {
    this.primaryView?.webview.postMessage(
      message
    );
  }

  private sendAgent(
    message: any
  ) {
    this.agentView?.webview.postMessage(
      message
    );
  }

  private broadcastSettings(
    settings: any
  ) {
    this.sendPrimary({
      type: "settingsSync",
      settings
    });

    this.sendAgent({
      type: "settingsSync",
      settings
    });
  }

  private async runAgent() {
    this.sendPrimary({
      type: "workspaceStatus",
      status: "analyzing"
    });

    this.sendAgent({
      type: "agentStatus",
      status: "analyzing"
    });

    await new Promise<void>(
      (resolve) =>
        setTimeout(resolve, 1200)
    );

    this.sendAgent({
      type: "agentFinished"
    });

    this.sendAgent({
      type: "issues",
      issues: {
        errors: 2,
        warnings: 3,
        suggestions: 2,
        total: 5,
        critical: 2
      }
    });

    this.sendPrimary({
      type: "workspaceStatus",
      status: "completed"
    });
  }

  private async scanWorkspace() {
    const workspace =
      vscode.workspace.workspaceFolders?.[0];

    if (!workspace) {
      vscode.window.showWarningMessage(
        "VECTOR-Ø: No workspace opened."
      );
      return;
    }

    this.sendPrimary({
      type: "workspaceStatus",
      status: "scanning"
    });

    try {
      const files =
        await vscode.workspace.findFiles(
          new vscode.RelativePattern(
            workspace,
            "**/*"
          ),
          "**/{node_modules,.git,dist,build,.next}/**",
          500
        );

      this.sendPrimary({
        type: "workspaceStatus",
        status: "ready",
        fileCount: files.length
      });
    } catch {
      this.sendPrimary({
        type: "workspaceStatus",
        status: "ready"
      });
    }
  }

  private async applyFix() {
    const editor =
      vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showWarningMessage(
        "VECTOR-Ø: No active editor."
      );
      return;
    }

    vscode.window.showInformationMessage(
      "VECTOR-Ø: Fix engine will be connected here."
    );
  }

  private getPrimaryContent(
    webview: vscode.Webview
  ): string {
    const uiPath = path.join(
      this.extensionUri.fsPath,
      "src",
      "ui",
      "webview"
    );

    const html =
      fs.readFileSync(
        path.join(
          uiPath,
          "index.html"
        ),
        "utf8"
      );

    const css =
      fs.readFileSync(
        path.join(
          uiPath,
          "style.css"
        ),
        "utf8"
      );

    const js =
      fs.readFileSync(
        path.join(
          uiPath,
          "app.js"
        ),
        "utf8"
      );

    const logo =
      webview.asWebviewUri(
        vscode.Uri.joinPath(
          this.extensionUri,
          "src",
          "ui",
          "assets",
          "vector.png"
        )
      );

    return this.withCsp(
      html
        .replace(
          '<link rel="stylesheet" href="style.css">',
          `<style>${css}</style>`
        )
        .replace(
          '<script src="app.js"></script>',
          `<script>${js}</script>`
        )
        .replace(
          "../assets/vector.png",
          logo.toString()
        ),
      webview
    );
  }

  private getAgentContent(
    webview: vscode.Webview
  ): string {
    const uiPath = path.join(
      this.extensionUri.fsPath,
      "src",
      "ui",
      "webview"
    );

    const css =
      fs.readFileSync(
        path.join(
          uiPath,
          "style.css"
        ),
        "utf8"
      );

    const js =
      fs.readFileSync(
        path.join(
          uiPath,
          "app.js"
        ),
        "utf8"
      );

    const html = `
<!DOCTYPE html>

<html lang="en">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>VECTOR-Ø</title>

  <style>
    ${css}
  </style>

</head>

<body>

  <div class="agent-shell">

    <header class="agent-header">

      <div class="agent-brand">

        <div class="agent-brand-mark">
          V
        </div>

        <div class="agent-brand-info">

          <div class="agent-title">
            VECTOR-Ø
          </div>

          <div class="agent-subtitle">
            AI Coding Agent
          </div>

        </div>

      </div>

      <div class="agent-header-actions">

        <button
          class="agent-icon-button"
          id="agent-refresh"
          title="Run Agent"
        >
          ↻
        </button>

        <button
          class="agent-icon-button"
          id="agent-settings"
          title="Settings"
        >
          ⚙
        </button>

      </div>

    </header>

    <section class="agent-intro">

      <div class="agent-heading">
        AI Coding Agent for Developers
      </div>

      <div class="agent-description">
        Analyze, understand and improve your codebase.
      </div>

    </section>

    <nav class="agent-tabs">

      <button
        class="agent-tab active"
        data-tab="review"
      >
        Review
      </button>

      <button
        class="agent-tab"
        data-tab="chat"
      >
        Chat
      </button>

      <button
        class="agent-tab"
        data-tab="explain"
      >
        Explain
      </button>

      <button
        class="agent-tab"
        data-tab="refactor"
      >
        Refactor
      </button>

      <button
        class="agent-tab"
        data-tab="tests"
      >
        Tests
      </button>

    </nav>

    <main class="agent-content">

      <section class="analysis-section">

        <div class="section-header">

          <div>

            <div class="section-title">
              Code Analysis
            </div>

            <div class="section-subtitle">
              Completed in 2.3s
            </div>

          </div>

          <div class="analysis-status">

            <span class="status-dot"></span>

            Completed

          </div>

        </div>

        <div class="analysis-stats">

          <div class="analysis-stat error">
            <strong>2</strong>
            <span>Errors</span>
          </div>

          <div class="analysis-stat warning">
            <strong>3</strong>
            <span>Warnings</span>
          </div>

          <div class="analysis-stat suggestion">
            <strong>2</strong>
            <span>Suggestions</span>
          </div>

        </div>

      </section>

      <section class="issues-section">

        <div class="section-header">

          <div>

            <div class="section-title">
              Issues Found
            </div>

            <div class="section-subtitle">
              5 issues · 2 critical
            </div>

          </div>

          <button
            class="section-action"
            id="scan-again"
          >
            Scan
          </button>

        </div>

        <div class="issue-list">

          <div class="issue-item critical">

            <div class="issue-icon">
              ×
            </div>

            <div class="issue-content">

              <div class="issue-title">
                Possible null reference
              </div>

              <div class="issue-location">
                App.tsx · line 42
              </div>

            </div>

            <div class="issue-severity">
              Critical
            </div>

          </div>

          <div class="issue-item critical">

            <div class="issue-icon">
              ×
            </div>

            <div class="issue-content">

              <div class="issue-title">
                Undefined variable
              </div>

              <div class="issue-location">
                api.ts · line 87
              </div>

            </div>

            <div class="issue-severity">
              Critical
            </div>

          </div>

          <div class="issue-item warning">

            <div class="issue-icon">
              !
            </div>

            <div class="issue-content">

              <div class="issue-title">
                Unnecessary re-render
              </div>

              <div class="issue-location">
                Home.tsx · line 61
              </div>

            </div>

            <div class="issue-severity">
              Warning
            </div>

          </div>

          <div class="issue-item warning">

            <div class="issue-icon">
              !
            </div>

            <div class="issue-content">

              <div class="issue-title">
                Missing dependency
              </div>

              <div class="issue-location">
                useEffect · line 24
              </div>

            </div>

            <div class="issue-severity">
              Warning
            </div>

          </div>

          <div class="issue-item suggestion">

            <div class="issue-icon">
              i
            </div>

            <div class="issue-content">

              <div class="issue-title">
                Simplify conditional logic
              </div>

              <div class="issue-location">
                utils.ts · line 19
              </div>

            </div>

            <div class="issue-severity">
              Suggestion
            </div>

          </div>

        </div>

      </section>

      <section class="fix-section">

        <div class="section-header">

          <div>

            <div class="section-title">
              Suggested Fix
            </div>

            <div class="section-subtitle">
              VECTOR-Ø generated solution
            </div>

          </div>

        </div>

        <div class="diff-container">

          <div class="diff-line removed">
            - const data = user.profile.name;
          </div>

          <div class="diff-line added">
            + const data = user?.profile?.name ?? "";
          </div>

        </div>

        <div class="fix-actions">

          <button
            class="primary-action"
            id="apply-fix"
          >
            Apply Fix
          </button>

          <button
            class="secondary-action"
            id="explain-issue"
          >
            Explain
          </button>

          <button
            class="secondary-action"
            id="more-options"
          >
            More Options
          </button>

        </div>

      </section>

    </main>

  </div>

  <script>
    ${js}
  </script>

  <script>

    const agentVscode =
      acquireVsCodeApi();

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

          document
            .querySelectorAll(
              ".agent-tab"
            )
            .forEach((tab) => {

              tab.classList.toggle(
                "active",
                tab.dataset.tab ===
                  message.tab
              );

            });

        }

        if (
          message.type ===
          "agentFinished"
        ) {

          document.body.dataset.status =
            "completed";

        }

        if (
          message.type ===
          "agentStatus"
        ) {

          document.body.dataset.status =
            message.status || "";

        }

        if (
          message.type ===
          "settingsSync"
        ) {

          const settings =
            message.settings;

          if (!settings) {
            return;
          }

          document.body.dataset.theme =
            settings.theme || "vscode-dark";

          document.body.dataset.accent =
            settings.accent || "blue";

          document.body.classList.toggle(
            "compact-mode",
            Boolean(settings.compact)
          );

        }

      }
    );

    document
      .getElementById("apply-fix")
      ?.addEventListener(
        "click",
        () => {

          agentVscode.postMessage({
            type: "applyFix"
          });

        }
      );

    document
      .getElementById("explain-issue")
      ?.addEventListener(
        "click",
        () => {

          agentVscode.postMessage({
            type: "explainIssue"
          });

        }
      );

    document
      .getElementById("more-options")
      ?.addEventListener(
        "click",
        () => {

          agentVscode.postMessage({
            type: "moreOptions"
          });

        }
      );

    document
      .getElementById("agent-refresh")
      ?.addEventListener(
        "click",
        () => {

          agentVscode.postMessage({
            type: "runAgent"
          });

        }
      );

    document
      .getElementById("agent-settings")
      ?.addEventListener(
        "click",
        () => {

          agentVscode.postMessage({
            type: "settings"
          });

        }
      );

    document
      .getElementById("scan-again")
      ?.addEventListener(
        "click",
        () => {

          agentVscode.postMessage({
            type: "runAgent"
          });

        }
      );

  </script>

</body>

</html>
`;

    return this.withCsp(
      html,
      webview
    );
  }

  private withCsp(
    html: string,
    webview: vscode.Webview
  ): string {
    return html.replace(
      "<head>",
      `
<head>

<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'none';
    img-src ${webview.cspSource} https:;
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src ${webview.cspSource} 'unsafe-inline';
    font-src ${webview.cspSource};
  "
>
`
    );
  }
}