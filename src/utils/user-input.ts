import { Clipboard, getSelectedText } from "@raycast/api";
import { getBrowserContent } from "./browser";

export async function fetchContent(source: "clipboard" | "selectedText" | "browserTab") {
  let content: string | null = null;
  let error: string | null = null;

  if (source === "clipboard") {
    content = (await Clipboard.readText()) || null;
  } else if (source === "selectedText") {
    // This is a workaround to get the actual selected text;
    // otherwise, it can return the previously selected text.
    for (let i = 0; i < 7; i++) {
      try {
        content = await getSelectedText();
      } catch (err) {
        console.debug(error);
      }
      if (content === null) {
        error = "No text selected. Select some text and run the command again.";
      }
    }
  } else {
    try {
      content = await getBrowserContent();
    } catch (err) {
      error = "Could not connect to the Browser Extension. Make sure a Browser Tab is focused.";
    }
  }

  return { content, error };
}
