export interface AgentRequest {
    projectPath?: string;
    userRequest: string;
    error?: string | null;
    verificationCommand?: string | null;
    mode?: "chat" | "agent";
}

export interface AgentAction {
    action: string;
    target: string;
    code?: string;
    destination?: string;
}

export interface VerificationResult {
    success: boolean;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    error?: {
        hasError?: boolean;
        type?: string;
        message?: string;
        raw?: string;
    } | null;
}

export interface AgentResult {
    success: boolean;
    mode?: "chat" | "agent";
    response?: string;
    stage?: string;
    attempt?: number;
    message?: string;
    error?: string | null;
    problem?: string | null;
    rootCause?: string | null;
    actions?: AgentAction[];
    actionResults?: Array<{
        action: string;
        target: string;
        success: boolean;
        error?: string;
    }>;
    dependencies?: string[];
    confidence?: number | null;
    verification?: VerificationResult | null;
}

export async function runAgent(
    request: AgentRequest
): Promise<AgentResult> {
    const response = await fetch(
        "http://localhost:4000/api/agent",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        }
    );

    const data =
        (await response.json()) as AgentResult;

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            `Backend error ${response.status}`
        );
    }

    return data;
}