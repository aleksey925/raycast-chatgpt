import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { CSVPrompt, Model, ModelHook } from "../../type";
import { parse } from "csv-parse/sync";
import { useCallback, useState } from "react";
import { getConfiguration } from "../../hooks/useChatGPT";
import { quickCommandSourceIcons, quickCommandSourceTitles } from "../../utils/views";

export const ModelForm = (props: { model?: Model; use: { models: ModelHook }; name?: string }) => {
  const { use, model } = props;
  const { pop } = useNavigation();
  const { isCustomModel } = getConfiguration();

  const { handleSubmit, itemProps, setValue } = useForm<Model>({
    onSubmit: async (model) => {
      let updatedModel: Model = { ...model, updated_at: new Date().toISOString() };
      updatedModel = { ...updatedModel, temperature: updatedModel.temperature };
      if (props.model) {
        const toast = await showToast({
          title: "Update your model...",
          style: Toast.Style.Animated,
        });
        use.models.update({ ...updatedModel, id: props.model.id, created_at: props.model.created_at });
        toast.title = "Model updated!";
        toast.style = Toast.Style.Success;
      } else {
        await showToast({
          title: "Save your model...",
          style: Toast.Style.Animated,
        });
        use.models.add({
          ...updatedModel,
          id: uuidv4(),
          created_at: new Date().toISOString(),
        });
        await showToast({
          title: "Model saved",
          style: Toast.Style.Animated,
        });
      }
      pop();
    },
    validation: {
      name: FormValidation.Required,
      temperature: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            if (numValue < 0) {
              return "Minimal value is 0";
            } else if (numValue > 2) {
              return "Maximal value is 2";
            }
          }
        } else {
          return FormValidation.Required;
        }
      },
    },
    initialValues: {
      name: model?.name ?? props.name ?? "",
      temperature: model?.temperature.toString() ?? "1",
      option: model?.option ?? "gpt-4o-mini",
      prompt: model?.prompt ?? "You are a helpful assistant.",
      pinned: model?.pinned ?? false,
      vision: model?.vision ?? false,
      quickCommandSource: model?.quickCommandSource ?? "none",
    },
  });

  const MODEL_OPTIONS = use.models.option;

  const { isLoading, data } = useFetch<CSVPrompt[]>(
    "https://raw.githubusercontent.com/awesome-chatgpt-prompts/awesome-chatgpt-prompts-github/awesome-chatgpt-prompts/prompts.csv",
    {
      parseResponse: async (response) => {
        try {
          const text = await response.text();
          return parse(text, {
            columns: true,
            skipEmptyLines: true,
            skipRecordsWithError: true,
            skipRecordsWithEmptyValues: true,
          });
        } catch (error) {
          return [];
        }
      },
      keepPreviousData: true,
    }
  );

  const setPrompt = useCallback(
    (value: string) => {
      if (value !== "none") {
        setValue("prompt", value);
      }
    },
    [setValue]
  );

  const [showAwesomePrompts, setShowAwesomePrompts] = useState(false);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action
            title="Toggle Awesome Prompts"
            icon={{ source: "🧠" }}
            onAction={() => setShowAwesomePrompts((s) => !s)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Name your model" {...itemProps.name} />
      {showAwesomePrompts && (
        <Form.Dropdown
          id="template"
          title="Awesome Prompts"
          isLoading={isLoading}
          defaultValue="none"
          onChange={setPrompt}
        >
          <Form.Dropdown.Item value="none" title="Choose an Awesome ChatGPT Prompts" icon={"🧠"} />
          {(data || []).map((prompt) => (
            <Form.Dropdown.Item value={prompt.prompt} title={prompt.act} key={prompt.prompt} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea title="Prompt" placeholder="Describe your prompt" {...itemProps.prompt} />
      <Form.TextField
        title="Creativity"
        placeholder="Set the required level of creativity (0 - 2)"
        info="Concrete tasks, such as fixing grammar, require less creativity, while open-ended questions, such as generating ideas, require more."
        {...itemProps.temperature}
      />
      {isCustomModel ? (
        <Form.TextField title="Model" placeholder="Custom model name" {...itemProps.option} />
      ) : (
        <Form.Dropdown title="Model" placeholder="Choose model option" {...itemProps.option}>
          {MODEL_OPTIONS.map((option) => (
            <Form.Dropdown.Item value={option} title={option} key={option} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Checkbox title="Vision" label="Enable vision capabilities" {...itemProps.vision} />
      {model?.id !== "default" && <Form.Checkbox title="Pinned" label="Pin model" {...itemProps.pinned} />}
      <Form.Separator />
      <Form.Dropdown
        title="Quick command source"
        placeholder="Source of the data to be processed"
        info={
          "If you select the source, you will be able to create a command from this model that will function " +
          "as a standard command. This command will be able to retrieve your data from the chosen " +
          "source and process it according to your prompt."
        }
        {...itemProps.quickCommandSource}
      >
        <Form.Dropdown.Item value="none" title={quickCommandSourceTitles["none"]} />
        <Form.Dropdown.Item
          value="selectedText"
          title={quickCommandSourceTitles["selectedText"]}
          icon={quickCommandSourceIcons["selectedText"]}
        />
        <Form.Dropdown.Item
          value="clipboard"
          title={quickCommandSourceTitles["clipboard"]}
          icon={quickCommandSourceIcons["clipboard"]}
        />
      </Form.Dropdown>
    </Form>
  );
};
