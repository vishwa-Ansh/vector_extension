import * as vscode from "vscode";
import { SidebarProvider } from "./ui/SidebarProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("VECTOR-Ø: activate() started");

  const provider = new SidebarProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "vector-o.sidebar",
      provider
    )
  );

  const openAgent = vscode.commands.registerCommand(
    "vector-o.openAgent",
    async () => {
      await vscode.commands.executeCommand(
        "workbench.view.extension.vector-o"
      );
    }
  );

  context.subscriptions.push(openAgent);

  console.log("VECTOR-Ø: provider registered");
}

export function deactivate() {}