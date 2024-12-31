import QuickAiCommand from "./views/quick-ai-command";
import { FIX_SPELLING_AND_GRAMMAR_MODEL_ID } from "./hooks/useModel";
import { LaunchProps } from "@raycast/api";

export default function FixSpellingAndGrammar(props: LaunchProps) {
  return <QuickAiCommand {...props} launchContext={{ modelId: FIX_SPELLING_AND_GRAMMAR_MODEL_ID }} />;
}
