import {
  Action,
  ActionPanel,
  Application,
  Detail,
  getFrontmostApplication,
  Icon,
  LaunchProps,
  List,
  Navigation,
  open,
  useNavigation,
} from "@raycast/api";
import { useModel } from "../hooks/useModel";
import { useChat } from "../hooks/useChat";
import React, { useEffect, useState } from "react";
import { canAccessBrowserExtension } from "../utils/browser";
import { PrimaryAction } from "../actions";
import { ChatHook, Model } from "../type";
import { fetchContent } from "../utils/user-input";
import { getAppIconPath } from "../utils/icon";
import Ask from "../ask";
import { v4 as uuidv4 } from "uuid";

export default function QuickAiCommand(props: LaunchProps) {
  const navigation = useNavigation();
  const modelHook = useModel();
  const chat = useChat([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [userInput, setUserInput] = useState<string | null>(null);
  const [userInputError, setUserInputError] = useState<string | null>(null);
  const [userInputIsLoading, setUserInputIsLoading] = useState<boolean>(true);
  const [frontmostApp, setFrontmostApp] = useState<Application | null>(null);

  const requestModelId = props.launchContext?.modelId;
  const model = modelHook.data.find((model) => model.id === requestModelId);

  useEffect(() => {
    getFrontmostApplication().then(setFrontmostApp);
  }, []);

  useEffect(() => {
    (async () => {
      if (!model) {
        return;
      }
      if (model.quickCommandSource === "none" || model.quickCommandSource === undefined) {
        return;
      }
      const { content, error } = await fetchContent(model?.quickCommandSource);
      setUserInput(content);
      setUserInputError(error);
      setUserInputIsLoading(false);
    })();
  }, [model]);

  useEffect(() => {
    if (!userInputIsLoading && userInput && model) {
      setAiAnswer(null);
      chat.ask(userInput, [], model);
    }
  }, [userInputIsLoading, userInput, model]);

  useEffect(() => {
    if (!chat.streamData && !chat.isLoading && chat.data.length > 0) {
      const lastChat = chat.data[chat.data.length - 1];
      setAiAnswer(lastChat.answer);
    } else {
      setAiAnswer(chat.streamData?.answer || null);
    }
  }, [chat.streamData, chat.isLoading, chat.data]);

  if (!model) {
    return buildModelNotFoundView(requestModelId);
  }
  if (model.quickCommandSource === "none" || model.quickCommandSource === undefined) {
    return buildUnsupportedModelView(model.name);
  } else if (model.quickCommandSource === "browserTab" && !canAccessBrowserExtension()) {
    return BROWSER_EXTENSION_NOT_AVAILABLE_VIEW;
  }

  const viewBuilder = new QuickCommandViewBuilder(
    model,
    chat,
    navigation,
    frontmostApp,
    userInput,
    aiAnswer,
    userInputError
  );

  return <Detail markdown={viewBuilder.buildContent()} actions={viewBuilder.buildActionPanel()} />;
}

class QuickCommandViewBuilder {
  iconSizePx: number;
  charWidthPx: number;
  totalViewWidthPx: number;

  model: Model;
  chat: ChatHook;
  navigation: Navigation;
  frontmostApp: Application | null;
  userInput: string | null;
  aiAnswer: string | null;
  error: string | null;

  constructor(
    model: Model,
    chat: ChatHook,
    navigation: Navigation,
    frontmostApp: Application | null,
    userInput: string | null,
    aiAnswer: string | null,
    error: string | null
  ) {
    this.totalViewWidthPx = 700;
    this.iconSizePx = 17;
    this.charWidthPx = 7;

    this.model = model;
    this.chat = chat;
    this.navigation = navigation;
    this.frontmostApp = frontmostApp;
    this.userInput = userInput;
    this.aiAnswer = aiAnswer;
    this.error = error;
  }

  buildContent(): string {
    let inputTemplate = "";
    if (this.model.quickCommandIsDisplayInput) {
      // Show user input as preformatted text because it allows the text to be displayed
      // exactly as it is. If we don't wrap it or format it as a quote, some symbols may be
      // rendered as Markdown markup.
      inputTemplate = `\`\`\`\n${(this.userInput || "...").trim()}\n\`\`\``;
    }

    return `${this.generateTitleSvg(this.model.name)}

${inputTemplate}

${this.aiAnswer || "..."}

${this.generateStatFooterSvg(this.model.option, this.chat.isAborted ? "Canceled" : null, this.error)}`;
  }

  generateTitleSvg(title: string): string {
    const width = this.totalViewWidthPx - this.iconSizePx;
    const titleImage = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${this.iconSizePx}" style="background: transparent;">
  <style>
    .text { 
      font-size: 14px; 
      fill: grey; 
      font-family: Arial, sans-serif;
      font-weight: bold;
    }
  </style>
  <text x="0" y="16" class="text">${title}</text>
</svg>`;

    return `${this.getFrontmostAppIcon()}![CommandName](data:image/svg+xml;base64,${Buffer.from(
      titleImage,
      "utf-8"
    ).toString("base64")})`;
  }

  generateStatFooterSvg(model: string, warning: string | null, error: string | null) {
    const textWidth = (warning || error || "").length * this.charWidthPx;
    const width = this.totalViewWidthPx - this.iconSizePx;

    const statImage = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${this.iconSizePx}" style="background: transparent;">
  <style>
    .model-text { 
      font-size: 13px; 
      fill: grey; 
      font-family: Arial, sans-serif; 
    }
    .warning-text { 
      font-size: 13px; 
      fill: yellow; 
      font-family: Arial, sans-serif; 
    }
    .error-text { 
      font-size: 13px; 
      fill: red; 
      font-family: Arial, sans-serif; 
    }
  </style>
  
  <text x="5" y="14.5" class="model-text">${model}</text>

  ${
    error
      ? `<text x="${width - textWidth}" y="14.5" class="error-text">${error}</text>`
      : warning
      ? `<text x="${width - textWidth}" y="14.5" class="warning-text">${warning}</text>`
      : ""
  }
</svg>`;

    const modelIcon = `&#x200b;![ModelIcon](icon.png?raycast-width=${this.iconSizePx}&raycast-height=${this.iconSizePx})`;
    return `${modelIcon}![CommandFooter](data:image/svg+xml;base64,${Buffer.from(statImage, "utf-8").toString(
      "base64"
    )})`;
  }

  getFrontmostAppIcon(): string {
    let appIconPath = "";
    if (this.model.quickCommandSource === "clipboard") {
      appIconPath = "clipboard.svg";
    } else if (this.frontmostApp?.path) {
      try {
        appIconPath = getAppIconPath(this.frontmostApp.path).replace(/ /g, "%20");
      } catch (e) {
        console.error(e);
      }
    }
    const markdownIcon = `&#x200b;![AppIcon](${appIconPath}?raycast-width=${this.iconSizePx}&raycast-height=${this.iconSizePx}) `;
    return appIconPath ? markdownIcon : "";
  }

  buildActionPanel(): React.JSX.Element {
    const actions: React.JSX.Element[] = [];
    if (!this.chat.isAborted) {
      if (this.chat.isLoading) {
        actions.push(<Action key="cancel" title="Cancel" icon={Icon.Stop} onAction={this.chat.abort} />);
      } else {
        const copyToClipboard = (
          <Action.CopyToClipboard key="copyToClipboard" title={`Copy Response`} content={this.aiAnswer || ""} />
        );
        if (this.model?.quickCommandSource === "selectedText") {
          actions.push(
            <Action.Paste
              key="pasteToActiveApp"
              title={`Paste Response to ${this.frontmostApp ? this.frontmostApp.name : "Active App"}`}
              content={this.aiAnswer || ""}
              icon={this.frontmostApp ? { fileIcon: this.frontmostApp.path } : Icon.AppWindow}
            />
          );
          actions.push(copyToClipboard);
        } else {
          actions.push(copyToClipboard);
        }
        actions.push(
          <Action
            key="continueInChat"
            title="Continue in Chat"
            icon={Icon.Message}
            onAction={() => {
              this.navigation.push(
                <Ask
                  conversation={{
                    id: uuidv4(),
                    chats: this.chat.data,
                    model: this.model,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    pinned: false,
                  }}
                />
              );
            }}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
          />
        );
      }
    }

    return <ActionPanel>{actions}</ActionPanel>;
  }
}

function buildModelNotFoundView(modelId: string) {
  return (
    <Detail
      markdown={
        `Model with id=${modelId} not found. This model may have been deleted.` +
        `You need to remove this quick link, create the model again, and then create the quick link once more.`
      }
    />
  );
}

function buildUnsupportedModelView(model_name: string) {
  return (
    <Detail
      markdown={`Model ${model_name} is not suitable for quick commands. You need to set the 
      "Quick command source" to use this model as a quick command.`}
    />
  );
}

const BROWSER_EXTENSION_NOT_AVAILABLE_VIEW = (
  <List
    actions={
      <ActionPanel>
        <PrimaryAction title="Install" onAction={() => open("https://www.raycast.com/browser-extension")} />
      </ActionPanel>
    }
  >
    <List.EmptyView
      icon={Icon.BoltDisabled}
      title={"Browser Extension Required"}
      description={"This command need install Raycast browser extension to work. Please install it first"}
    />
  </List>
);