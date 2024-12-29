import {
  Action,
  ActionPanel,
  Application,
  Detail,
  getFrontmostApplication,
  Icon,
  LaunchProps,
  List,
  open,
} from "@raycast/api";
import { useModel } from "./hooks/useModel";
import { useChat } from "./hooks/useChat";
import { useEffect, useState } from "react";
import { canAccessBrowserExtension } from "./utils/browser";
import { PrimaryAction } from "./actions";
import { Model } from "./type";
import { fetchContent } from "./utils/user-input";
import { getAppIconPath } from "./utils/icon";

export default function QuickAiCommand(props: LaunchProps) {
  const modelHook = useModel();
  const chat = useChat([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [userInput, setUserInput] = useState<string | null>(null);
  const [userInputError, setUserInputError] = useState<string | null>(null);
  const [userInputIsLoading, setUserInputIsLoading] = useState<boolean>(true);
  const [frontmostApp, setFrontmostApp] = useState<Application>();

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

  if (requestModelId === undefined) {
    return DIRECT_CMD_LAUNCH_VIEW;
  }
  if (modelHook.isLoading) {
    return <Detail markdown="" />;
  }
  if (!model) {
    return buildModelNotFoundView(requestModelId);
  }
  if (model.quickCommandSource === "none" || model.quickCommandSource === undefined) {
    return buildUnsupportedModelView(model.name);
  } else if (model.quickCommandSource === "browserTab" && !canAccessBrowserExtension()) {
    return BROWSER_EXTENSION_NOT_AVAILABLE_VIEW;
  }

  const content = buildViewContent(model, frontmostApp, userInput, aiAnswer, chat.isAborted, userInputError);

  const actions: JSX.Element[] = [];
  if (!chat.isAborted) {
    if (chat.isLoading) {
      actions.push(<Action key="cancel" title="Cancel" icon={Icon.Stop} onAction={chat.abort} />);
    } else {
      const copyToClipboard = (
        <Action.CopyToClipboard key="copyToClipboard" title={`Copy Response`} content={aiAnswer || ""} />
      );
      if (model?.quickCommandSource === "selectedText") {
        actions.push(
          <Action.Paste
            key="pasteToActiveApp"
            title={`Paste Response to ${frontmostApp ? frontmostApp.name : "Active App"}`}
            content={aiAnswer || ""}
            icon={frontmostApp ? { fileIcon: frontmostApp.path } : Icon.AppWindow}
          />
        );
        actions.push(copyToClipboard);
      } else {
        actions.push(copyToClipboard);
      }
    }
  }
  return <Detail markdown={content} actions={<ActionPanel>{actions}</ActionPanel>} />;
}

function buildViewContent(
  model: Model,
  frontmostApp: Application | undefined,
  userInput: string | null,
  aiAnswer: string | null,
  isAborted: boolean,
  error: string | null
): string {
  let inputTemplate = "";
  if (model.quickCommandIsDisplayInput) {
    inputTemplate = `${userInput || "..."}\n\n---\n\n`;
  }

  return `${generateTitleSvg(model.name, frontmostApp, model?.quickCommandSource)}

${inputTemplate}

${aiAnswer || "..."}

${generateStatFooterSvg(model.option, isAborted ? "Canceled" : null, error)}
`;
}

function generateTitleSvg(
  title: string,
  frontmostApp: Application | undefined,
  usrInpSource: "none" | "clipboard" | "selectedText" | "browserTab" | undefined
): string {
  const appIconWidthHeight = 17;
  const totalWidth = 700;
  const titleWidth = totalWidth - appIconWidthHeight;

  let appIcon = "";
  let appIconPath = "";
  if (usrInpSource === "clipboard") {
    appIconPath = "clipboard.svg";
  } else if (frontmostApp?.path) {
    try {
      appIconPath = getAppIconPath(frontmostApp.path).replace(/ /g, "%20");
    } catch (e) {
      console.error(e);
    }
  }
  if (appIconPath) {
    appIcon = `&#x200b;![App Icon](${appIconPath}?raycast-width=${appIconWidthHeight}&raycast-height=${appIconWidthHeight}) `;
  }

  const titleImage = `
<svg xmlns="http://www.w3.org/2000/svg" width="${titleWidth}" height="${appIconWidthHeight}" style="background: transparent;">
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

  return `${appIcon}![Command Name](data:image/svg+xml;base64,${Buffer.from(titleImage, "utf-8").toString("base64")})`;
}

function generateStatFooterSvg(model: string, warning: string | null, error: string | null) {
  const charWidth = 7;
  const textLength = (warning || error || "").length;
  const textWidth = textLength * charWidth;
  const modelIconWidthHeight = 15;
  const totalWidth = 700;
  const statWidth = totalWidth - modelIconWidthHeight;

  const statImage = `
<svg xmlns="http://www.w3.org/2000/svg" width="${statWidth}" height="17" style="background: transparent;">
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
  
  <text x="5" y="16" class="model-text">${model}</text>

  ${
    error
      ? `<text x="${statWidth - textWidth}" y="16" class="error-text">${error}</text>`
      : warning
      ? `<text x="${statWidth - textWidth}" y="16" class="warning-text">${warning}</text>`
      : ""
  }
</svg>`;

  const modelIcon = `&#x200b;![Model Icon](icon.png?raycast-width=${modelIconWidthHeight}&raycast-height=${modelIconWidthHeight})`;
  return `${modelIcon}![Command Footer](data:image/svg+xml;base64,${Buffer.from(statImage, "utf-8").toString("base64")})`;
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
      markdown={`Model ${model_name} is not suitable for quick commands. You need to set the "Quick command source" to use this model as a quick command.`}
    />
  );
}

const DIRECT_CMD_LAUNCH_VIEW = (
  <Detail
    markdown={
      "It is a meta command needed to create a 'Quicklink' for a model that will serve as a quick command." +
      "You shouldn't run it manually."
    }
  />
);

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
