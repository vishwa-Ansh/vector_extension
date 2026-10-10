import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class AgentViewProvider
    implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri
    ) { }

    resolveWebviewView(
        webviewView: vscode.WebviewView
    ): void {
        this.view = webviewView;

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

        webview.html =
            this.getHtml(webview);

        webview.onDidReceiveMessage(
            async (message) => {
                await this.handleMessage(message);
            }
        );
    }

    private async handleMessage(
        message: {
            type?: string;
            tab?: string;
        }
    ): Promise<void> {
        switch (message.type) {
            case "runAgent":
                await this.runAgent();
                break;

            case "applyFix":
                await this.applyFix();
                break;

            case "explain":
                this.activateTab("explain");
                break;

            case "tab":
                this.activateTab(
                    message.tab || "review"
                );
                break;

            case "moreOptions":
                await this.showMoreOptions();
                break;

            case "refresh":
                await this.runAgent();
                break;
        }
    }

    private activateTab(
        tab: string
    ): void {
        this.postMessage({
            type: "activateTab",
            tab
        });
    }

    private async runAgent(): Promise<void> {
        this.postMessage({
            type: "analysisStatus",
            status: "analyzing"
        });

        await new Promise<void>(
            (resolve) =>
                setTimeout(resolve, 900)
        );

        this.postMessage({
            type: "analysisStatus",
            status: "completed",
            duration: "2.3s"
        });

        this.postMessage({
            type: "analysisResult",
            errors: 2,
            warnings: 3,
            suggestions: 2,
            total: 5,
            critical: 2
        });
    }

    private async applyFix(): Promise<void> {
        const editor =
            vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showWarningMessage(
                "VECTOR-Ø: No active editor."
            );

            return;
        }

        const document =
            editor.document;

        const text =
            document.getText();

        if (
            text.includes(
                'console.error("Error fetching data:", error);'
            )
        ) {
            const oldText =
                'console.error("Error fetching data:", error);';

            const newText =
                `if (error instanceof Error) {
  console.error("Error fetching data:", error.message);
} else {
  console.error("Error fetching data:", error);
}`;

            const edit =
                new vscode.WorkspaceEdit();

            const range =
                document.getWordRangeAtPosition(
                    editor.selection.active
                );

            if (range) {
                edit.replace(
                    document.uri,
                    new vscode.Range(
                        document.positionAt(
                            document.getText().indexOf(
                                oldText
                            )
                        ),
                        document.positionAt(
                            document.getText().indexOf(
                                oldText
                            ) + oldText.length
                        )
                    ),
                    newText
                );

                await vscode.workspace.applyEdit(
                    edit
                );

                vscode.window.showInformationMessage(
                    "VECTOR-Ø: Fix applied."
                );

                return;
            }
        }

        vscode.window.showInformationMessage(
            "VECTOR-Ø: Suggested fix is ready."
        );
    }

    private async showMoreOptions(): Promise<void> {
        const selection =
            await vscode.window.showQuickPick(
                [
                    "Analyze entire workspace",
                    "Analyze current file",
                    "Explain this issue",
                    "Generate tests",
                    "Refactor code"
                ],
                {
                    placeHolder:
                        "VECTOR-Ø actions"
                }
            );

        if (!selection) {
            return;
        }

        vscode.window.showInformationMessage(
            `VECTOR-Ø: ${selection}`
        );
    }

    private postMessage(
        message: unknown
    ): void {
        this.view?.webview.postMessage(
            message
        );
    }

    private getHtml(
        webview: vscode.Webview
    ): string {
        const uiPath =
            path.join(
                this.extensionUri.fsPath,
                "src",
                "ui",
                "agent"
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

        const csp =
            `
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
      `;

        return html
            .replace(
                "</head>",
                `${csp}</head>`
            )
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
            );
    }
}