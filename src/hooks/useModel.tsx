import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Model, ModelHook } from "../type";
import { getConfiguration, useChatGPT } from "./useChatGPT";
import { useProxy } from "./useProxy";

export const DEFAULT_MODEL_ID: string = "default";
export const DEFAULT_MODEL_ID_PREFIX: string = DEFAULT_MODEL_ID;
export const FIX_SPELLING_AND_GRAMMAR_MODEL_ID: string = `${DEFAULT_MODEL_ID_PREFIX}-fix-spelling-and-grammar`;
export const DEFAULT_MODELS: Model[] = [
  {
    id: DEFAULT_MODEL_ID,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    name: "Default",
    prompt: "You are a helpful assistant.",
    option: "gpt-4o-mini",
    temperature: "1",
    pinned: false,
    vision: false,
    quickCommandSource: "none",
    quickCommandIsDisplayInput: false,
  },
  {
    id: FIX_SPELLING_AND_GRAMMAR_MODEL_ID,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    name: "Fix Spelling and Grammar",
    prompt:
      "You are an assistant that fixes spelling, grammar and punctuation. Don't insert any " +
      "extra information; only provide the corrected text. Answer additional questions that may " +
      "arise after receiving the corrected text.",
    option: "gpt-4o-mini",
    temperature: "0.7",
    pinned: false,
    vision: false,
    quickCommandSource: "selectedText",
    quickCommandIsDisplayInput: true,
  },
  {
    id: `${DEFAULT_MODEL_ID_PREFIX}-summarize-webpage`,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    name: "Summarize Webpage",
    prompt:
      "Read and summarize the main ideas and key points from this text. Summarize the information concisely and clearly.",
    option: "gpt-4o-mini",
    temperature: "1",
    pinned: false,
    vision: false,
    quickCommandSource: "browserTab",
    quickCommandIsDisplayInput: false,
  },
];

export function useModel(): ModelHook {
  const [data, setData] = useState<Model[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isFetching, setFetching] = useState<boolean>(true);
  const gpt = useChatGPT();
  const proxy = useProxy();
  const { useAzure, isCustomModel } = getConfiguration();
  const [option, setOption] = useState<Model["option"][]>(["gpt-4o-mini", "chatgpt-4o-latest"]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isCustomModel) {
      // If choose to use custom model, we don't need to fetch models from the API
      setFetching(false);
      return;
    }
    if (!useAzure) {
      gpt.models
        .list({ httpAgent: proxy })
        .then((res) => {
          let models = res.data;
          // some provider return text/plain content type
          // and the sdk `defaultParseResponse` simply return `text`
          if (models.length === 0) {
            try {
              const body = JSON.parse((res as unknown as { body: string }).body);
              models = body.data;
            } catch (e) {
              // ignore try to parse it
            }
          }
          setOption(models.map((x) => x.id));
        })
        .catch(async (err) => {
          console.error(err);
          if (!(err instanceof Error || err.message)) {
            return;
          }
          await showToast(
            err.message.includes("401")
              ? {
                  title: "Could not authenticate to API",
                  message: "Please ensure that your API token is valid",
                  style: Toast.Style.Failure,
                }
              : {
                  title: "Error",
                  message: err.message,
                  style: Toast.Style.Failure,
                }
          );
        })
        .finally(() => {
          setFetching(false);
        });
    } else {
      setFetching(false);
    }
  }, [gpt]);

  useEffect(() => {
    (async () => {
      const storedModels: Model[] = JSON.parse((await LocalStorage.getItem<string>("models")) || "[]");

      if (storedModels.length === 0) {
        setData(DEFAULT_MODELS);
      } else {
        const allModels = [
          ...storedModels,
          ...DEFAULT_MODELS.filter(
            (defaultModel) => !storedModels.some((model: Model) => model.id === defaultModel.id)
          ),
        ];
        setData(allModels);
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
    LocalStorage.setItem("models", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Saving your model...",
        style: Toast.Style.Animated,
      });
      const newModel: Model = { ...model, created_at: new Date().toISOString() };
      setData([...data, newModel]);
      toast.title = "Model saved!";
      toast.style = Toast.Style.Success;
    },
    [setData, data]
  );

  const update = useCallback(
    async (model: Model) => {
      setData((prev) => {
        return prev.map((x) => {
          if (x.id === model.id) {
            return model;
          }
          return x;
        });
      });
    },
    [setData, data]
  );

  const remove = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Remove your model...",
        style: Toast.Style.Animated,
      });
      const newModels: Model[] = data.filter((oldModel) => oldModel.id !== model.id);
      setData(newModels);
      toast.title = "Model removed!";
      toast.style = Toast.Style.Success;
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing models...",
      style: Toast.Style.Animated,
    });
    setData(DEFAULT_MODELS);
    toast.title = "Models cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  const setModels = useCallback(
    async (models: Model[]) => {
      setData(models);
    },
    [setData]
  );

  const isDefaultModel = useCallback((id: string): boolean => {
    return DEFAULT_MODELS.some((defaultModel) => defaultModel.id === id);
  }, []);

  return useMemo(
    () => ({ data, isLoading, option, add, update, remove, clear, setModels, isFetching, isDefaultModel }),
    [data, isLoading, option, add, update, remove, clear, setModels, isFetching, isDefaultModel]
  );
}
