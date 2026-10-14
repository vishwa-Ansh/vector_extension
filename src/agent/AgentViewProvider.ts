import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { runAgent as runBackendAgent } from "../api/client";

type PageName = "review" | "chat";

export class AgentViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  private currentPage: PageName = "review";

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    const webview = webviewView.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "src", "ui")],
    };

    this.renderPage("review");

    webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: {
    type?: string;
    tab?: string;
    issue?: string;
    file?: string;
    line?: number;
    oldCode?: string;
    newCode?: string;
    title?: string;
    description?: string;
    message?: string;
  }): Promise<void> {
    switch (message.type) {
      case "openChat":
        this.renderPage("chat");
        break;

      case "backToReview":
        this.renderPage("review");
        break;

      case "chat":
        await this.handleChat(message);
        break;

      case "chatReady":
        await this.sendCurrentFile();
        break;

      case "runAgent":
        await this.runAgent();
        break;

      case "applyFix":
        await this.applyFix(message);
        break;

      case "explain":
        this.activateTab("explain");
        break;

      case "tab":
        this.activateTab(message.tab || "review");
        break;

      case "moreOptions":
        await this.showMoreOptions();
        break;

      case "refresh":
        await this.runAgent();
        break;

      case "settings":
        vscode.window.showInformationMessage(
          "VECTOR-Ø settings are coming soon.",
        );
        break;

      case "clearHistory":
        this.postMessage({
          type: "chatReset",
        });
        break;

      case "exportReport":
        vscode.window.showInformationMessage(
          "VECTOR-Ø report export is coming soon.",
        );
        break;

      case "fullscreen":
        vscode.window.showInformationMessage(
          "Use the VS Code panel controls to resize VECTOR-Ø.",
        );
        break;

      case "close":
        await vscode.commands.executeCommand(
          "workbench.action.closeAuxiliaryBar",
        );
        break;
    }
  }

  private getProjectPath(): string {
    const workspace = vscode.workspace.workspaceFolders?.[0];

    if (workspace) {
      return workspace.uri.fsPath;
    }

    const editor = vscode.window.activeTextEditor;

    if (editor) {
      return path.dirname(editor.document.fileName);
    }

    throw new Error("No VS Code workspace or active file is open.");
  }

  private renderPage(page: PageName): void {
    if (!this.view) {
      return;
    }

    this.currentPage = page;

    const webview = this.view.webview;

    webview.html = this.getHtml(webview, page);
  }

  private getHtml(webview: vscode.Webview, page: PageName): string {
    const basePath = path.join(this.extensionUri.fsPath, "src", "ui", "agent");

    const pagePath = path.join(
      basePath,
      page === "chat" ? "chat.html" : "index.html",
    );

    const cssPath = path.join(
      basePath,
      page === "chat" ? "chat.css" : "style.css",
    );

    const jsPath = path.join(basePath, page === "chat" ? "chat.js" : "app.js");

    let html = fs.readFileSync(pagePath, "utf8");

    const css = fs.readFileSync(cssPath, "utf8");

    const js = fs.readFileSync(jsPath, "utf8");

    const logo = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "src",
        "ui",
        "assets",
        "vector.png",
      ),
    );

    const nonce = this.createNonce();

    const csp = `
			<meta
				http-equiv="Content-Security-Policy"
				content="
					default-src 'none';
					img-src ${webview.cspSource} https: data:;
					style-src ${webview.cspSource} 'unsafe-inline';
					script-src 'nonce-${nonce}';
					font-src ${webview.cspSource} https:;
					connect-src ${webview.cspSource} https:;
				"
			>
		`;

    html = html.replace("</head>", `${csp}</head>`);

    html = html.replace(/<link[^>]+href=["']style\.css["'][^>]*>/gi, "");

    html = html.replace(
      /<script[^>]+src=["']app\.js["'][^>]*><\/script>/gi,
      "",
    );

    html = html.replace(
      /<script[^>]+src=["']chat\.js["'][^>]*><\/script>/gi,
      "",
    );

    html = html.replace(
      "</head>",
      `
					<style>
						${css}
					</style>
				</head>
			`,
    );

    html = html.replace(
      "</body>",
      `
					<script nonce="${nonce}">
						${js}
					</script>
				</body>
			`,
    );

    html = html.replace(/\.\.\/assets\/vector\.png/g, logo.toString());

    html = html.replace(
      /src=["']assets\/vector\.png["']/g,
      `src="${logo.toString()}"`,
    );

    return html;
  }

  private createNonce(): string {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let result = "";

    for (let i = 0; i < 32; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }

    return result;
  }

  private activateTab(tab: string): void {
    this.postMessage({
      type: "activateTab",
      tab,
    });
  }

  private async runAgent(): Promise<void> {
    this.postMessage({
      type: "analysisStatus",
      status: "analyzing",
    });

    try {
      const projectPath = this.getProjectPath();

      const result = await runBackendAgent({
        projectPath,
        userRequest:
          "Analyze the project and find real code errors. Do not consider missing documentation, README files, optional improvements, or suggestions as errors.",
      });

      if (!result.success) {
        throw new Error(
          result.error || result.message || "VECTOR-Ø agent failed.",
        );
      }

      this.postMessage({
        type: "analysisStatus",
        status: "completed",
      });

      this.postMessage({
        type: "analysisResult",
        result,
      });
    } catch (error) {
      this.postMessage({
        type: "analysisStatus",
        status: "error",
      });

      vscode.window.showErrorMessage(
        `VECTOR-Ø: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async applyFix(message: {
    issue?: string;
    file?: string;
    line?: number;
    oldCode?: string;
    newCode?: string;
  }): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showWarningMessage("VECTOR-Ø: No active editor.");

      return;
    }

    const oldCode = message.oldCode;

    const newCode = message.newCode;

    if (!oldCode || !newCode) {
      vscode.window.showWarningMessage("VECTOR-Ø: Invalid fix data.");

      return;
    }

    const document = editor.document;

    const text = document.getText();

    const index = text.indexOf(oldCode);

    if (index === -1) {
      vscode.window.showWarningMessage(
        "VECTOR-Ø: Suggested code was not found in the active file.",
      );

      return;
    }

    const start = document.positionAt(index);

    const end = document.positionAt(index + oldCode.length);

    const edit = new vscode.WorkspaceEdit();

    edit.replace(document.uri, new vscode.Range(start, end), newCode);

    const applied = await vscode.workspace.applyEdit(edit);

    if (!applied) {
      vscode.window.showErrorMessage("VECTOR-Ø: Unable to apply fix.");

      return;
    }

    vscode.window.showInformationMessage("VECTOR-Ø: Fix applied successfully.");

    this.postMessage({
      type: "fixApplied",
    });
  }

  private async showMoreOptions(): Promise<void> {
    const selection = await vscode.window.showQuickPick(
      [
        "Analyze entire workspace",
        "Analyze current file",
        "Explain this issue",
        "Generate tests",
        "Refactor code",
      ],
      {
        placeHolder: "VECTOR-Ø actions",
      },
    );

    if (!selection) {
      return;
    }

    vscode.window.showInformationMessage(`VECTOR-Ø: ${selection}`);
  }

  private async handleChat(message: { message?: string }): Promise<void> {
    const userMessage = message.message?.trim();

    if (!userMessage) {
      return;
    }

    this.postMessage({
      type: "chatTyping",
      active: true,
    });

    try {
      const projectPath = this.getProjectPath();

      const result = await runBackendAgent({
        projectPath,
        userRequest: userMessage,
      });

      if (!result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "VECTOR-Ø could not process the request.",
        );
      }

      const responseParts: string[] = [];

      if (result.problem) {
        responseParts.push(result.problem);
      }

      if (result.rootCause) {
        responseParts.push(`Root cause: ${result.rootCause}`);
      }

      if (result.verification) {
        const verification = result.verification;

        responseParts.push(
          `Verification: ${verification.success ? "Passed" : "Failed"}`,
        );
      }

      if (result.actions && result.actions.length > 0) {
        const actionText = result.actions
          .map((action) => `${action.action}: ${action.target}`)
          .join("\n");

        responseParts.push(`Actions:\n${actionText}`);
      }

      if (result.dependencies && result.dependencies.length > 0) {
        responseParts.push(`Dependencies:\n${result.dependencies.join("\n")}`);
      }

      const response =
        responseParts.join("\n\n") || "Analysis completed successfully.";

      this.postMessage({
        type: "chatResponse",
        content: response,
      });

      this.postMessage({
        type: "agentResult",
        result,
      });
    } catch (error) {
      this.postMessage({
        type: "chatError",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.postMessage({
        type: "chatTyping",
        active: false,
      });
    }
  }

  private async sendCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      this.postMessage({
        type: "currentFile",
        fileName: "No active file",
      });

      return;
    }

    this.postMessage({
      type: "currentFile",
      fileName: path.basename(editor.document.fileName),
    });
  }

  private postMessage(message: unknown): void {
    this.view?.webview.postMessage(message);
  }
}
