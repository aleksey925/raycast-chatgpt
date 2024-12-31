import QuickAiCommand from "./views/quick-ai-command";
import { IMPROVE_WRITING_MODEL_ID } from "./hooks/useModel";
import { LaunchProps } from "@raycast/api";

export default function ImproveWriting(props: LaunchProps) {
  return <QuickAiCommand {...props} launchContext={{ modelId: IMPROVE_WRITING_MODEL_ID }} />;
}
