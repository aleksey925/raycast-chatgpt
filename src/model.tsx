import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { DestructiveAction, PinAction } from "./actions";
import { PreferencesActionSection } from "./actions/preferences";
import { DEFAULT_MODELS, useModel } from "./hooks/useModel";
import { Model } from "./type";
import { ModelForm } from "./views/model/form";
import { ModelListView } from "./views/model/list";
import { ExportData, ImportData } from "./utils/import-export";
import { ImportForm } from "./views/import-form";
import packageJson from "../package.json";

export default function Model() {
  const models = useModel();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const { push } = useNavigation();

  const getActionPanel = (model: Model) => (
    <ActionPanel>
      <Action
        title={"Edit Model"}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        icon={Icon.Text}
        onAction={() => push(<ModelForm model={model} use={{ models }} />)}
      />
      <Action
        title={"Create Model"}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={Icon.Text}
        onAction={() => push(<ModelForm name={searchText} use={{ models }} />)}
      />
      {!model.quickCommandSource || model.quickCommandSource == "none" ? null : (
        <Action.CreateQuicklink
          quicklink={{
            name: model.name,
            link: `raycast://extensions/${packageJson.author}/${
              packageJson.name
            }/quick-ai-command?arguments=${encodeURIComponent(JSON.stringify({ modelId: model.id }))}`,
          }}
        />
      )}
      <ActionPanel.Section title="Actions">
        <Action title={"Export Models"} icon={Icon.Upload} onAction={() => ExportData(models.data, "Models")} />
        <Action
          title={"Import Models"}
          icon={Icon.Download}
          onAction={() =>
            push(
              <ImportForm
                moduleName="Models"
                onSubmit={async (file) => {
                  ImportData<Model>("models", file).then((data) => {
                    models.setModels(data);
                  });
                }}
              />
            )
          }
        />
        <DestructiveAction
          title={"Reset Models"}
          dialog={{
            title:
              "Are you sure? All your models will be deleted, and default models will be recreated with default values.",
          }}
          icon={Icon.Undo}
          onAction={() => models.clear()}
          shortcut={null}
        />
      </ActionPanel.Section>
      {!models.isDefaultModel(model.id) && (
        <>
          <PinAction
            title={model.pinned ? "Unpin Model" : "Pin Model"}
            isPinned={model.pinned}
            onAction={() => models.update({ ...model, pinned: !model.pinned })}
          />
          <ActionPanel.Section title="Delete">
            <DestructiveAction
              title="Remove"
              dialog={{
                title: "Are you sure you want to remove this model from your collection?",
              }}
              onAction={() => models.remove(model)}
            />
          </ActionPanel.Section>
        </>
      )}
      <PreferencesActionSection />
    </ActionPanel>
  );

  const sortedModels = sortModels(models.data);

  const filteredModels = sortedModels
    .filter((value, index, self) => index === self.findIndex((model) => model.id === value.id))
    .filter((model) => {
      if (searchText === "") {
        return true;
      }
      return (
        model.prompt.toLowerCase().includes(searchText.toLowerCase()) ||
        model.name.toLowerCase().includes(searchText.toLowerCase()) ||
        model.temperature.toLocaleString().toLowerCase().includes(searchText.toLowerCase())
      );
    });

  const defaultModelsOnly = filteredModels.filter((x) => models.isDefaultModel(x.id)) ?? DEFAULT_MODELS;

  const customModelsOnly = filteredModels.filter((x) => !models.isDefaultModel(x.id));

  return (
    <List
      isShowingDetail // always show detail view, since the default model is always selected
      isLoading={models.isLoading || models.isFetching}
      filtering={false}
      throttle={false}
      selectedItemId={selectedModelId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedModelId) {
          setSelectedModelId(id);
        }
      }}
      searchBarPlaceholder="Search model..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {models.isFetching ? (
        <List.EmptyView />
      ) : (
        <>
          <ModelListView
            key="default"
            models={defaultModelsOnly}
            selectedModel={selectedModelId}
            actionPanel={getActionPanel}
          />
          <ModelListView
            key="pinned"
            title="Pinned"
            models={customModelsOnly.filter((x) => x.pinned)}
            selectedModel={selectedModelId}
            actionPanel={getActionPanel}
          />
          <ModelListView
            key="models"
            title="Models"
            models={customModelsOnly.filter((x) => !x.pinned)}
            selectedModel={selectedModelId}
            actionPanel={getActionPanel}
          />
        </>
      )}
    </List>
  );
}

function sortModels(models: Model[]): Model[] {
  return models.sort((a, b) => {
    if (a.name === "Default") return -1;
    if (b.name === "Default") return 1;
    return a.name.localeCompare(b.name);
  });
}
