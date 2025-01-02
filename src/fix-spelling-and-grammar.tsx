import Command from "./views/ai-command/command";
import { FIX_SPELLING_AND_GRAMMAR_AI_COMMAND_ID } from "./hooks/useAiCommand";
import { LaunchProps } from "@raycast/api";

export default function FixSpellingAndGrammar(props: LaunchProps) {
  return <Command {...props} launchContext={{ commandId: FIX_SPELLING_AND_GRAMMAR_AI_COMMAND_ID }} />;
}
