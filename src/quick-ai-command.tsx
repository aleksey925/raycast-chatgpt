import { Action, ActionPanel, Clipboard, Detail, getSelectedText, Icon, LaunchProps, List, open } from "@raycast/api";
import { useModel } from "./hooks/useModel";
import { useChat } from "./hooks/useChat";
import { useEffect, useState } from "react";
import { canAccessBrowserExtension, getBrowserContent } from "./utils/browser";
import { PrimaryAction } from "./actions";
import { Model } from "./type";

export default function QuickAiCommand(props: LaunchProps<{ arguments: Arguments.QuickAiCommand }>) {
  const models = useModel();
  const chat = useChat([]);
  const [userInput, setUserInput] = useState<string | null>(null);
  const [userInputExtractError, setUserInputExtractError] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const targetModel = models.data.find((model) => model.id === props.arguments.modelId);

  useEffect(() => {
    (async () => {
      if (targetModel) {
        setUserInputExtractError(null);
        let text: string | null = null;
        if (targetModel.quickCommandSource === "clipboard") {
          text = (await Clipboard.readText()) || null;
        } else if (targetModel.quickCommandSource === "selectedText") {
          await getSelectedText(); // This is a workaround to get the actual selected text; otherwise, it can return the previously selected text.
          text = await getSelectedText();
        } else {
          try {
            text = await getBrowserContent();
            console.log(text);
          } catch (error) {
            setUserInputExtractError("Could not connect to the Browser Extension. Make sure a Browser Tab is focused.");
          }
        }
        setUserInput(text || "");
      }
    })();
  }, [targetModel]);

  useEffect(() => {
    if (userInput && targetModel) {
      setAiAnswer(null);
      chat.ask(userInput, [], targetModel);
    }
  }, [userInput, targetModel]);

  useEffect(() => {
    if (!chat.streamData && !chat.isLoading && chat.data.length > 0) {
      const lastChat = chat.data[chat.data.length - 1];
      setAiAnswer(lastChat.answer);
    } else {
      setAiAnswer(chat.streamData?.answer || null);
    }
  }, [chat.streamData, chat.isLoading, chat.data]);

  if (props.arguments.modelId === "") {
    return (
      <Detail
        markdown={
          "It is a meta command needed to create a 'Quicklink' for a model that will serve as a quick command." +
          "You shouldn't run it manually."
        }
      />
    );
  }
  if (models.isLoading && !userInput) {
    return <Detail markdown="" />;
  }
  if (!targetModel) {
    return (
      <Detail
        markdown={
          `Model with id=${props.arguments.modelId} not found. This model may have been deleted.` +
          `You need to remove this quick link, create the model again, and then create the quick link once more.`
        }
      />
    );
  }
  if (targetModel.quickCommandSource === "browserTab" && !canAccessBrowserExtension()) {
    return (
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
  }

  const content = buildViewContent(targetModel, userInput, aiAnswer, userInputExtractError);
  return (
    <Detail
      markdown={content}
      actions={
        aiAnswer ? (
          <ActionPanel>
            <Action.Paste title="Past Resopnse" content={aiAnswer || ""}></Action.Paste>
            <Action.CopyToClipboard title={`Copy Response`} content={aiAnswer || ""} />
          </ActionPanel>
        ) : (
          <ActionPanel></ActionPanel>
        )
      }
    />
  );
}

function buildViewContent(
  model: Model,
  userInput: string | null,
  aiAnswer: string | null,
  error: string | null
): string {
  let inputTemplate = "";
  if (model.quickCommandIsDisplayInput) {
    inputTemplate = `Input:\n\n\`\`\`${userInput}\`\`\`\n\nOutput:`;
  }

  return `
## ${model.name}

${inputTemplate}
\`\`\`
${aiAnswer || ""}
\`\`\`

---

![AI Icon](icon.png?raycast-width=15&raycast-height=15) ${model.option} ${error || ""}
`;
}
