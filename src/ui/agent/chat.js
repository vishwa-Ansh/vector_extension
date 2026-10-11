const vscode = acquireVsCodeApi();

const messagesContainer =
  document.getElementById("chat-messages");

const chatEmpty =
  document.getElementById("chat-empty");

const chatInput =
  document.getElementById("chat-input");

const sendButton =
  document.getElementById("send-message");

const newChatButton =
  document.getElementById("new-chat");

const backButton =
  document.getElementById("back-to-review");

const typingIndicator =
  document.getElementById("typing-indicator");

const contextFile =
  document.getElementById("context-file");

const clearContext =
  document.getElementById("clear-context");

const menuButton =
  document.getElementById("chat-menu");

const menuPanel =
  document.getElementById("chat-menu-panel");

const suggestionButtons =
  document.querySelectorAll(".suggestion");

let messages = [];
let isGenerating = false;

function initialize() {
  setupInput();
  setupButtons();
  setupSuggestions();
  setupMenu();

  vscode.postMessage({
    type: "chatReady"
  });
}

function setupInput() {
  chatInput.addEventListener(
    "input",
    () => {
      autoResize();
      updateSendButton();
    }
  );

  chatInput.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        sendMessage();
      }
    }
  );
}

function setupButtons() {
  sendButton.addEventListener(
    "click",
    sendMessage
  );

  newChatButton.addEventListener(
    "click",
    clearConversation
  );

  backButton.addEventListener(
    "click",
    () => {
      vscode.postMessage({
        type: "backToReview"
      });
    }
  );

  clearContext.addEventListener(
    "click",
    () => {
      contextFile.textContent =
        "No file context";

      vscode.postMessage({
        type: "clearChatContext"
      });
    }
  );
}

function setupSuggestions() {
  suggestionButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const prompt =
            button.dataset.prompt;

          if (!prompt) {
            return;
          }

          chatInput.value = prompt;

          autoResize();
          updateSendButton();

          chatInput.focus();
        }
      );
    }
  );
}

function setupMenu() {
  menuButton.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();

      menuPanel.classList.toggle(
        "hidden"
      );
    }
  );

  menuPanel.addEventListener(
    "click",
    (event) => {
      const action =
        event.target.dataset.action;

      if (!action) {
        return;
      }

      if (action === "clear") {
        clearConversation();
      }

      if (action === "export") {
        exportConversation();
      }

      menuPanel.classList.add(
        "hidden"
      );
    }
  );

  document.addEventListener(
    "click",
    () => {
      menuPanel.classList.add(
        "hidden"
      );
    }
  );
}

function autoResize() {
  chatInput.style.height = "auto";

  const height =
    Math.min(
      chatInput.scrollHeight,
      180
    );

  chatInput.style.height =
    `${height}px`;
}

function updateSendButton() {
  const hasText =
    chatInput.value.trim().length > 0;

  sendButton.disabled =
    !hasText || isGenerating;
}

function sendMessage() {
  if (isGenerating) {
    return;
  }

  const text =
    chatInput.value.trim();

  if (!text) {
    return;
  }

  addMessage(
    "user",
    text
  );

  chatInput.value = "";

  autoResize();
  updateSendButton();

  hideEmptyState();

  showTyping();

  isGenerating = true;

  updateSendButton();

  vscode.postMessage({
    type: "chat",
    message: text
  });
}

function addMessage(
  role,
  content
) {
  const message = {
    id: Date.now(),
    role,
    content
  };

  messages.push(message);

  renderMessage(message);

  scrollToBottom();
}

function renderMessage(message) {
  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    `chat-message ${message.role}`;

  const avatar =
    document.createElement(
      "div"
    );

  avatar.className =
    "message-avatar";

  avatar.textContent =
    message.role === "user"
      ? "You"
      : "V";

  const body =
    document.createElement(
      "div"
    );

  body.className =
    "message-body";

  const content =
    document.createElement(
      "div"
    );

  content.className =
    "message-content";

  content.innerHTML =
    formatMessage(
      message.content
    );

  body.appendChild(content);

  if (
    message.role === "assistant"
  ) {
    const actions =
      createMessageActions(
        message.content
      );

    body.appendChild(actions);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(body);

  messagesContainer.appendChild(
    wrapper
  );
}

function createMessageActions(
  content
) {
  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "message-actions";

  const copy =
    document.createElement(
      "button"
    );

  copy.textContent =
    "Copy";

  copy.addEventListener(
    "click",
    async () => {
      try {
        await navigator.clipboard.writeText(
          content
        );

        copy.textContent =
          "Copied";

        setTimeout(() => {
          copy.textContent =
            "Copy";
        }, 1200);
      } catch {
        copy.textContent =
          "Failed";
      }
    }
  );

  actions.appendChild(copy);

  return actions;
}

function formatMessage(
  text
) {
  const escaped =
    escapeHtml(text);

  const codeBlocks =
    [];

  const withPlaceholders =
    escaped.replace(
      /```(\w+)?\n?([\s\S]*?)```/g,
      (_, language, code) => {
        const index =
          codeBlocks.length;

        codeBlocks.push({
          language:
            language || "code",
          code:
            code.trim()
        });

        return `___CODE_BLOCK_${index}___`;
      }
    );

  let formatted =
    withPlaceholders
      .replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
      )
      .replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
      )
      .replace(
        /\n/g,
        "<br>"
      );

  codeBlocks.forEach(
    (block, index) => {
      const codeHtml =
        createCodeBlock(
          block.language,
          block.code
        );

      formatted =
        formatted.replace(
          `___CODE_BLOCK_${index}___`,
          codeHtml
        );
    }
  );

  return formatted;
}

function createCodeBlock(
  language,
  code
) {
  const safeLanguage =
    escapeHtml(language);

  const safeCode =
    escapeHtml(code);

  return `
    <div class="code-block">
      <div class="code-header">
        <span>${safeLanguage}</span>
        <button
          class="copy-code"
          data-code="${escapeAttribute(code)}"
        >
          Copy
        </button>
      </div>
      <pre><code>${safeCode}</code></pre>
    </div>
  `;
}

function escapeHtml(
  value
) {
  return value
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

function escapeAttribute(
  value
) {
  return value
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    );
}

function showTyping() {
  typingIndicator.classList.remove(
    "hidden"
  );

  scrollToBottom();
}

function hideTyping() {
  typingIndicator.classList.add(
    "hidden"
  );
}

function hideEmptyState() {
  if (!chatEmpty) {
    return;
  }

  chatEmpty.classList.add(
    "hidden"
  );
}

function showEmptyState() {
  if (!chatEmpty) {
    return;
  }

  chatEmpty.classList.remove(
    "hidden"
  );
}

function clearConversation() {
  messages = [];

  const messageElements =
    messagesContainer.querySelectorAll(
      ".chat-message"
    );

  messageElements.forEach(
    (element) => {
      element.remove();
    }
  );

  showEmptyState();

  chatInput.value = "";

  autoResize();
  updateSendButton();

  vscode.postMessage({
    type: "clearChat"
  });
}

function exportConversation() {
  if (!messages.length) {
    return;
  }

  const text =
    messages
      .map(
        (message) => {
          const name =
            message.role === "user"
              ? "You"
              : "VECTOR-Ø";

          return `${name}:\n${message.content}`;
        }
      )
      .join("\n\n");

  vscode.postMessage({
    type: "exportChat",
    content: text
  });
}

function scrollToBottom() {
  requestAnimationFrame(
    () => {
      messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
    }
  );
}

function handleAssistantMessage(
  content
) {
  hideTyping();

  isGenerating = false;

  addMessage(
    "assistant",
    content
  );

  updateSendButton();
}

function handleChatError(
  message
) {
  hideTyping();

  isGenerating = false;

  addMessage(
    "assistant",
    `Unable to generate a response.\n\n${message}`
  );

  updateSendButton();
}

function setCurrentFile(
  fileName
) {
  contextFile.textContent =
    fileName ||
    "No file context";
}

window.addEventListener(
  "message",
  (event) => {
    const message =
      event.data;

    switch (message.type) {
      case "chatResponse":
        handleAssistantMessage(
          message.content || ""
        );
        break;

      case "chatError":
        handleChatError(
          message.message ||
            "Unknown error."
        );
        break;

      case "currentFile":
        setCurrentFile(
          message.fileName
        );
        break;

      case "chatReset":
        clearConversation();
        break;
    }
  }
);

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        ".copy-code"
      );

    if (!button) {
      return;
    }

    const code =
      button.dataset.code || "";

    const decoded =
      code
        .replace(
          /&quot;/g,
          '"'
        )
        .replace(
          /&lt;/g,
          "<"
        )
        .replace(
          /&gt;/g,
          ">"
        )
        .replace(
          /&amp;/g,
          "&"
        );

    try {
      await navigator.clipboard.writeText(
        decoded
      );

      button.textContent =
        "Copied";

      setTimeout(() => {
        button.textContent =
          "Copy";
      }, 1200);
    } catch {
      button.textContent =
        "Failed";
    }
  }
);

initialize();