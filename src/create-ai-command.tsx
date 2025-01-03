import { AiCommandForm } from "./views/ai-command/from";
import { useAiCommand } from "./hooks/useAiCommand";

export default function CreateAiCommand() {
  const commands = useAiCommand();

  return <AiCommandForm use={{ commands }} />;
}
