import * as vscode from "vscode";
import * as path from  "path";
import * as fs from "fs";

type PageName = "review" | "chat";

export class AgentviewProviderNew implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    
    constructor(
        private readonly _extensionUri: vscode.Uri
    ) { }   

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
}