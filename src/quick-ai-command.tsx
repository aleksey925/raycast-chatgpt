import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import { useModel } from "./hooks/useModel";
import useUserInput from "./hooks/useUserInput";
import { useChat } from "./hooks/useChat";
import { useEffect, useState } from "react";

export default function QuickAiCommand(props: LaunchProps<{ arguments: Arguments.QuickAiCommand }>) {
  const models = useModel();
  const chat = useChat([]);
  const { ready: isUserInputReady, text: userInput } = useUserInput();
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const targetModel = models.data.find((model) => model.id === props.arguments.modelId);

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

  if (models.isLoading || !isUserInputReady) {
    return <Detail markdown="" />;
  }
  if (!targetModel) {
    return <Detail markdown="Model required for running quick AI command not found" />;
  }

  const message = `
## ${targetModel.name}

Question:
\`\`\`
${userInput}
\`\`\`

Answer:
\`\`\`
${aiAnswer || ""}
\`\`\`

---

![AI Icon](icon.png?raycast-width=15&raycast-height=15) ${targetModel.option}
`;
  return (
    <Detail
      markdown={message}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Paste title="Past Resopnse" content={aiAnswer || ""}></Action.Paste>
            <Action.CopyToClipboard title={`Copy Response`} content={aiAnswer || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
