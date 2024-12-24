import { List } from "@raycast/api";
import { useEffect } from "react";
import { ChangeModelProp } from "../../type";
import { CacheAdapter } from "../../utils/cache";
import { DEFAULT_MODEL_ID, useModel } from "../../hooks/useModel";

export const ModelDropdown = (props: ChangeModelProp) => {
  const { models, onModelChange, selectedModel } = props;
  const { isDefaultModel } = useModel();
  const separateDefaultModel = models.filter((x) => !isDefaultModel(x.id));
  const defaultModels = models.filter((x) => isDefaultModel(x.id));

  const cache = new CacheAdapter("select_model");

  // it should same as `DropDown.storeValue`
  useEffect(() => {
    const selectModel = cache.get();
    onModelChange(selectModel ?? DEFAULT_MODEL_ID);
  }, []);

  useEffect(() => {
    cache.set(selectedModel);
  }, [selectedModel]);

  /**
   * fix https://github.com/raycast/extensions/issues/10391#issuecomment-19131903
   *
   * we can't use `DropDown.storeValue`, because it will reset `selectedModel` to default when the component rerender.
   */
  return (
    <List.Dropdown tooltip="Select Model" value={selectedModel} onChange={onModelChange}>
      {defaultModels &&
        defaultModels.map((model) => <List.Dropdown.Item key={model.id} title={model.name} value={model.id} />)}
      <List.Dropdown.Section title="Pinned">
        {separateDefaultModel
          .filter((x) => x.pinned)
          .map((model) => (
            <List.Dropdown.Item key={model.id} title={model.name} value={model.id} />
          ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Models">
        {separateDefaultModel
          .filter((x) => !x.pinned)
          .map((model) => (
            <List.Dropdown.Item key={model.id} title={model.name} value={model.id} />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};
