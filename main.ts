import { Plugin } from "obsidian";

export default class ObsidianAgenda extends Plugin {
    onload(): Promise<void> | void {
        console.log("Hello World");
    }
}
