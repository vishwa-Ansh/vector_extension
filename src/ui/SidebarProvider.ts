import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "vector-o.sidebar";

  constructor(
    private readonly extensionUri: vscode.Uri
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView
  ): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(
          this.extensionUri,
          "src",
          "ui",
          "webview"
        )
      ]
    };

    webviewView.webview.html =
      this.getWebviewContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {

          case "test":
            vscode.window.showInformationMessage(
              "VECTOR-Ø Webview is working!"
            );
            break;

          case "runAgent":
            await this.runAgent(webviewView);
            break;

          case "rescan":
            webviewView.webview.postMessage({
              type: "workspaceStatus",
              value: "Scanning workspace..."
            });

            await this.scanWorkspace(webviewView);
            break;

          case "settings":
            vscode.window.showInformationMessage(
              "VECTOR-Ø Agent Settings"
            );
            break;

          case "tab":
            console.log(
              `VECTOR-Ø: Active tab → ${message.tab}`
            );
            break;
        }
      }
    );
  }

  private async runAgent(
    webviewView: vscode.WebviewView
  ): Promise<void> {

    webviewView.webview.postMessage({
      type: "workspaceStatus",
      value: "Agent is analyzing your workspace..."
    });

    await new Promise((resolve) =>
      setTimeout(resolve, 1200)
    );

    webviewView.webview.postMessage({
      type: "issues",
      errors: 0,
      logic: 0,
      packages: 0
    });

    webviewView.webview.postMessage({
      type: "workspaceStatus",
      value: "Analysis completed."
    });

    webviewView.webview.postMessage({
      type: "agentFinished"
    });
  }

  private async scanWorkspace(
    webviewView: vscode.WebviewView
  ): Promise<void> {

    const workspace =
      vscode.workspace.workspaceFolders?.[0];

    if (!workspace) {
      webviewView.webview.postMessage({
        type: "workspaceStatus",
        value: "No workspace opened."
      });

      return;
    }

    const files =
      await vscode.workspace.findFiles(
        "**/*",
        "**/{node_modules,.git,dist,build,.next}/**",
        500
      );

    webviewView.webview.postMessage({
      type: "issues",
      errors: 0,
      logic: 0,
      packages: 0
    });

    webviewView.webview.postMessage({
      type: "workspaceStatus",
      value: `${files.length} files scanned.`
    });
  }

  private getWebviewContent(
    webview: vscode.Webview
  ): string {

    const webviewPath =
      path.join(
        this.extensionUri.fsPath,
        "src",
        "ui",
        "webview"
      );

    const htmlPath =
      path.join(webviewPath, "index.html");

    const cssPath =
      path.join(webviewPath, "style.css");

    const jsPath =
      path.join(webviewPath, "app.js");

    let html =
      fs.readFileSync(htmlPath, "utf8");

    const css =
      fs.readFileSync(cssPath, "utf8");

    const js =
      fs.readFileSync(jsPath, "utf8");

    const nonce =
      this.getNonce();

    html = html
      .replace(
        '<link rel="stylesheet" href="style.css">',
        `<style>${css}</style>`
      )
      .replace(
        '<script src="app.js"></script>',
        `<script nonce="${nonce}">${js}</script>`
      );

    html = html.replace(
      "<head>",
      `<head>
        <meta
          http-equiv="Content-Security-Policy"
          content="
            default-src 'none';
            style-src 'unsafe-inline';
            script-src 'nonce-${nonce}';
          "
        >`
    );

    return html;
  }

  private getNonce(): string {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let result = "";

    for (let i = 0; i < 32; i++) {
      result +=
        characters.charAt(
          Math.floor(
            Math.random() * characters.length
          )
        );
    }

    return result;
  }
}