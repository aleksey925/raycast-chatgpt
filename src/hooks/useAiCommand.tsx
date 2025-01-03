import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AiCommandHook, AiCommand, Model } from "../type";
import { useModel } from "./useModel";

export const AI_COMMAND_MODEL_PREFIX = "command";
export const DEFAULT_AI_COMMAND_ID_PREFIX: string = "default";
export const FIX_SPELLING_AND_GRAMMAR_AI_COMMAND_ID: string = `${DEFAULT_AI_COMMAND_ID_PREFIX}-fix-spelling-and-grammar`;
export const IMPROVE_WRITING_AI_COMMAND_ID: string = `${DEFAULT_AI_COMMAND_ID_PREFIX}-improve-writing`;
export const DEFAULT_AI_COMMANDS: AiCommand[] = [
  {
    id: FIX_SPELLING_AND_GRAMMAR_AI_COMMAND_ID,
    name: "Fix Spelling and Grammar",
    prompt:
      "You are an assistant that fixes spelling, grammar and punctuation. Don't insert any " +
      "extra information; only provide the corrected text. Answer additional questions that may " +
      "arise after receiving the corrected text.",
    model: "gpt-4o-mini",
    temperature: "0.7",
    contentSource: "selectedText",
    isDisplayInput: true,
  },
  {
    id: IMPROVE_WRITING_AI_COMMAND_ID,
    name: "Improve Writing",
    prompt: `Act as a spelling corrector, content writer, and text improver/editor. Reply to each message only with the rewritten text.
Strictly follow these rules:
- Correct spelling, grammar, and punctuation errors in the given text
- Enhance clarity and conciseness without altering the original meaning
- Divide lengthy sentences into shorter, more readable ones
- Eliminate unnecessary repetition while preserving important points
- Prioritize active voice over passive voice for a more engaging tone
- Opt for simpler, more accessible vocabulary when possible
- ALWAYS ensure the original meaning and intention of the given text
- ALWAYS detect and maintain the original language of the text
- ALWAYS maintain the existing tone of voice and style, e.g. formal, casual, polite, etc.
- NEVER surround the improved text with quotes or any additional formatting
- If the text is already well-written and requires no improvement, don't change the given text`,
    model: "gpt-4o-mini",
    temperature: "0.7",
    contentSource: "selectedText",
    isDisplayInput: true,
  },
  {
    id: `${DEFAULT_AI_COMMAND_ID_PREFIX}-summarize-webpage`,
    name: "Summarize Webpage",
    prompt:
      "Read and summarize the main ideas and key points from this text. Summarize the information concisely and clearly.",
    model: "gpt-4o-mini",
    temperature: "1",
    contentSource: "browserTab",
    isDisplayInput: false,
  },
];

export function useAiCommand(): AiCommandHook {
  const { add: addModel, update: updateModel, remove: removeModel } = useModel();
  const [data, setData] = useState<AiCommand[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const isInitialMount = useRef(true);

  useEffect(() => {
    (async () => {
      const storedCommands: AiCommand[] = JSON.parse((await LocalStorage.getItem<string>("aiCommands")) || "[]");

      if (storedCommands.length === 0) {
        setData(DEFAULT_AI_COMMANDS);
        DEFAULT_AI_COMMANDS.forEach((cmd) => {
          addModel(mapCommandToModel(cmd));
        });
      } else {
        const allCommands = [
          ...storedCommands,
          ...DEFAULT_AI_COMMANDS.filter(
            (defaultCmd) => !storedCommands.some((cmd: AiCommand) => cmd.id === defaultCmd.id)
          ),
        ];
        setData(allCommands);
        allCommands.forEach((cmd) => {
          addModel(mapCommandToModel(cmd));
        });
      }
      setLoading(false);
      isInitialMount.current = false;
    })();
  }, []);

  useEffect(() => {
    // Avoid saving when initial loading
    if (isInitialMount.current) {
      return;
    }
    LocalStorage.setItem("aiCommands", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (command: AiCommand) => {
      const toast = await showToast({
        title: "Saving your AI command...",
        style: Toast.Style.Animated,
      });
      setData([...data, command]);
      addModel(mapCommandToModel(command));
      toast.title = "AI command saved!";
      toast.style = Toast.Style.Success;
    },
    [addModel, setData, data]
  );

  const update = useCallback(
    async (command: AiCommand) => {
      setData((prev) => {
        return prev.map((x) => {
          if (x.id === command.id) {
            updateModel(mapCommandToModel(command));
            return command;
          }
          return x;
        });
      });
    },
    [updateModel, setData, data]
  );

  const remove = useCallback(
    async (command: AiCommand) => {
      const toast = await showToast({
        title: "Removing your AI command...",
        style: Toast.Style.Animated,
      });
      setData((prev) => prev.filter((x) => x.id !== command.id));
      removeModel(mapCommandToModel(command));
      toast.title = "AI command removed!";
      toast.style = Toast.Style.Success;
    },
    [removeModel, setData, data]
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing AI commands...",
      style: Toast.Style.Animated,
    });

    data.forEach((cmd) => {
      removeModel(mapCommandToModel(cmd));
    });
    DEFAULT_AI_COMMANDS.forEach((cmd) => {
      addModel(mapCommandToModel(cmd));
    });
    setData(DEFAULT_AI_COMMANDS);

    toast.title = "AI commands cleared!";
    toast.style = Toast.Style.Success;
  }, [removeModel, setData, data]);

  const setCommand = useCallback(
    async (commands: AiCommand[]) => {
      setData(commands);
    },
    [setData]
  );

  const isDefault = useCallback((id: string): boolean => {
    return DEFAULT_AI_COMMANDS.some((defaultCommand) => defaultCommand.id === id);
  }, []);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear, setCommand, isDefault }),
    [data, isLoading, add, update, remove, clear, setCommand, isDefault]
  );
}

export function mapCommandToModel(command: AiCommand): Model {
  return {
    id: `${AI_COMMAND_MODEL_PREFIX}-${command.id}`,
    name: command.name,
    option: command.model,
    prompt: command.prompt,
    temperature: command.temperature,
    pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
