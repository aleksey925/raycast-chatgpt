import { Action, ActionPanel, Clipboard, Detail, getSelectedText, Icon, LaunchProps, List, open } from "@raycast/api";
import { useModel } from "./hooks/useModel";
import { useChat } from "./hooks/useChat";
import { useEffect, useState } from "react";
import { canAccessBrowserExtension, getBrowserContent } from "./utils/browser";
import { PrimaryAction } from "./actions";
import { Model } from "./type";

export default function QuickAiCommand(props: LaunchProps<{ arguments: Arguments.QuickAiCommand }>) {
  const modelService = useModel();
  const chat = useChat([]);
  const [userInput, setUserInput] = useState<string | null>(null);
  const [userInputError, setUserInputError] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const model = modelService.data.find((model) => model.id === props.arguments.modelId);

  useEffect(() => {
    (async () => {
      if (model) {
        setUserInputError(null);
        let text: string | null = null;
        if (model.quickCommandSource === "clipboard") {
          text = (await Clipboard.readText()) || null;
        } else if (model.quickCommandSource === "selectedText") {
          // This is a workaround to get the actual selected text; otherwise, it can return the previously selected text.
          await getSelectedText();
          text = await getSelectedText();
        } else {
          try {
            text = await getBrowserContent();
          } catch (error) {
            setUserInputError("Could not connect to the Browser Extension. Make sure a Browser Tab is focused.");
          }
        }
        setUserInput(text || "");
      }
    })();
  }, [model]);

  useEffect(() => {
    if (userInput && model) {
      setAiAnswer(null);
      chat.ask(userInput, [], model);
    }
  }, [userInput, model]);

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
  if (modelService.isLoading && !userInput) {
    return <Detail markdown="" />;
  }
  if (!model) {
    return (
      <Detail
        markdown={
          `Model with id=${props.arguments.modelId} not found. This model may have been deleted.` +
          `You need to remove this quick link, create the model again, and then create the quick link once more.`
        }
      />
    );
  }
  if (model.quickCommandSource === "browserTab" && !canAccessBrowserExtension()) {
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

  const content = buildViewContent(model, userInput, aiAnswer, userInputError);
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
