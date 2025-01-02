import { Action, ActionPanel, Icon, LaunchProps, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { DestructiveAction } from "./actions";
import { AiCommand } from "./type";
import packageJson from "../package.json";
import { useAiCommand } from "./hooks/useAiCommand";
import { AiCommandForm, iconsByContentSource } from "./views/ai-command/from";
import Command from "./views/ai-command/command";

export default function EntryPoint(props: LaunchProps) {
  const requestModelId = props.launchContext?.commandId;
  if (requestModelId) {
    return <Command {...props} />;
  }
  return <SearchAiCommand />;
}

function SearchAiCommand() {
  const commands = useAiCommand();
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);

  const sortedCommands = commands.data.sort((a, b) => a.name.localeCompare(b.name));
  const filteredCommands = sortedCommands
    .filter((value, index, self) => index === self.findIndex((cmd) => cmd.id === value.id))
    .filter((cmd) => {
      if (searchText === "") return true;
      return cmd.name.toLowerCase().includes(searchText.toLowerCase());
    });

  const getActionPanel = (cmd: AiCommand) => (
    <ActionPanel>
      <Action
        title={"Edit AI Command"}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        icon={Icon.Text}
        onAction={() => navigation.push(<AiCommandForm cmd={cmd} use={{ commands }} />)}
      />
      <Action
        title={"Create AI Command"}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={Icon.Text}
        onAction={() => navigation.push(<AiCommandForm name={searchText} use={{ commands }} />)}
      />
      <Action
        title={"Duplicate AI Command"}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        icon={Icon.Text}
        onAction={() => navigation.push(<AiCommandForm name={searchText} use={{ commands }} />)}
      />
      <Action.CreateQuicklink
        quicklink={{
          name: cmd.name,
          link: `raycast://extensions/${packageJson.author}/${
            packageJson.name
          }/search-ai-command?context=${encodeURIComponent(JSON.stringify({ commandId: cmd.id }))}`,
        }}
      />

      <ActionPanel.Section>
        {!commands.isDefault(cmd.id) && (
          <DestructiveAction
            title="Remove"
            dialog={{
              title: "Are you sure you want to remove this AI command from your collection?",
            }}
            onAction={() => commands.remove(cmd)}
          />
        )}
        <DestructiveAction
          title={"Reset"}
          dialog={{
            title:
              "Are you sure? All your custom AI commands will be deleted, and default AI commands will be recreated with their default values.",
          }}
          icon={Icon.Undo}
          onAction={() => commands.clear()}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "x" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail={false}
      isLoading={commands.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedCommandId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedCommandId) {
          setSelectedCommandId(id);
        }
      }}
      searchBarPlaceholder="Search AI commands..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <List.Section title="Built-In">
        {filteredCommands
          .filter((cmd) => commands.isDefault(cmd.id))
          .map((cmd) => (
            <List.Item
              id={cmd.id}
              key={cmd.id}
              title={cmd.name}
              accessories={[{ icon: iconsByContentSource[cmd.contentSource] }, { text: cmd.model }]}
              actions={selectedCommandId === cmd.id ? getActionPanel(cmd) : undefined}
            />
          ))}
      </List.Section>
      <List.Section title="Custom">
        {filteredCommands
          .filter((cmd) => !commands.isDefault(cmd.id))
          .map((cmd) => (
            <List.Item
              id={cmd.id}
              key={cmd.id}
              title={cmd.name}
              accessories={[{ icon: iconsByContentSource[cmd.contentSource] }, { text: cmd.model }]}
              actions={selectedCommandId === cmd.id ? getActionPanel(cmd) : undefined}
            />
          ))}
      </List.Section>
    </List>
  );
}
