import { canAccessBrowserExtension } from "./utils/browser";
import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_MODEL_ID, DEFAULT_MODELS, useModel } from "./hooks/useModel";
import { showFailureToast } from "@raycast/utils";
import { Conversation, Model } from "./type";
import Ask from "./ask";
import { open } from "@raycast/api";
import { PrimaryAction } from "./actions";
import { useBrowserContent } from "./hooks/useBrowser";
import { CacheAdapter } from "./utils/cache";

export default function Summarize() {
  if (!canAccessBrowserExtension()) {
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

  const { loading, content, error: browserError, retry } = useBrowserContent();
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) {
      return;
    }
    if (browserError) {
      showFailureToast(browserError, { title: "Retrieve content failed" });
      return;
    }
    setQuestion(content || "");
  }, [loading, content, browserError]);

  const { data, isLoading: modelLoading, isDefaultModel } = useModel();

  const [defaultModels, setDefaultModels] = useState<Model[] | null>(null);
  const [separateDefaultModel, setSeparateDefaultModel] = useState<Model[] | null>(null);

  useEffect(() => {
    if (!modelLoading) {
      setSeparateDefaultModel(data.filter((x) => !isDefaultModel(x.id)));
      setDefaultModels(data.filter((x) => isDefaultModel(x.id)) ?? DEFAULT_MODELS);
    }
  }, [modelLoading]);

  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);
  const cache = new CacheAdapter("select_model");

  useEffect(() => {
    const selectModel = cache.get();
    setSelectedModelId(selectModel || DEFAULT_MODEL_ID);
  }, []);

  useEffect(() => {
    cache.set(selectedModelId);
  }, [selectedModelId]);

  const RetryAction = () => {
    // - retry for browser retrieve failed
    // - go back reuse the component
    return <Action title="Retry" icon={Icon.Repeat} onAction={retry} />;
  };

  const { push } = useNavigation();

  return (
    <Form
      isLoading={loading || modelLoading}
      actions={
        <ActionPanel>
          {!content && <RetryAction />}
          <Action
            title="Submit"
            icon={Icon.Checkmark}
            onAction={() => {
              const chooseModel = data.find((x) => x.id === selectedModelId) || DEFAULT_MODELS[0];
              // PS: Ask page back to Summarize is purely new conversation
              // we don't want to maintain the old conversation
              const conversation: Conversation = {
                id: uuidv4(),
                chats: [],
                model: chooseModel,
                pinned: false,
                updated_at: "",
                created_at: new Date().toISOString(),
              };
              push(<Ask conversation={conversation} initialQuestion={question} />);
            }}
          />
          {content && <RetryAction />}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Hydrate the website and prompt..."
        onChange={setQuestion}
        error={error || undefined}
        value={question}
        onFocus={() => {
          setError("");
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setError("Required");
          } else {
            setError("");
          }
        }}
      />
      {
        // the value not match any values warning so annoying
        (defaultModels || separateDefaultModel) && (
          <Form.Dropdown
            id="model"
            title="Model"
            placeholder="Choose model"
            value={selectedModelId}
            onChange={setSelectedModelId}
          >
            {defaultModels &&
              defaultModels.map((model) => <Form.Dropdown.Item value={model.id} title={model.name} key={model.id} />)}
            <Form.Dropdown.Section title="Custom Models">
              {separateDefaultModel &&
                separateDefaultModel.map((model) => (
                  <Form.Dropdown.Item value={model.id} title={model.name} key={model.id} />
                ))}
            </Form.Dropdown.Section>
          </Form.Dropdown>
        )
      }
    </Form>
  );
}
