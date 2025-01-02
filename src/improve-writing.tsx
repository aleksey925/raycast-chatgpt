import Command from "./views/ai-command/command";
import { IMPROVE_WRITING_AI_COMMAND_ID } from "./hooks/useAiCommand";
import { LaunchProps } from "@raycast/api";

export default function ImproveWriting(props: LaunchProps) {
  return <Command {...props} launchContext={{ commandId: IMPROVE_WRITING_AI_COMMAND_ID }} />;
}
