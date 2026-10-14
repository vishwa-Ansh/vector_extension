import * as vscode from "vscode";
import { AgentViewProvider } from "./agent/AgentViewProvider";
 
console.log(vscode);

export function activate(
	context: vscode.ExtensionContext
) {
	const agentProvider =
		new AgentViewProvider(
			context.extensionUri
		);

	const agentView =
		vscode.window.registerWebviewViewProvider(
			"vector-o.agent",
			agentProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		);

	const openAgent =
		vscode.commands.registerCommand(
			"vector-o.openAgent",
			async () => {
				try {
					await vscode.commands.executeCommand(
						"workbench.action.focusAuxiliaryBar"
					);
				} catch {
					try {
						await vscode.commands.executeCommand(
							"workbench.action.toggleAuxiliaryBar"
						);
					} catch {
						vscode.window.showErrorMessage(
							"VECTOR-Ø: Unable to open Agent panel."
						);
					}
				}
			}
		);

	context.subscriptions.push(
		agentView,
		openAgent
	);

	console.log(
		"VECTOR-Ø: AI Agent activated."
	);
}

export function deactivate() { }