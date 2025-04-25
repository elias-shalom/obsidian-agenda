import { Plugin } from "obsidian";

export default class ObsidianAgenda extends Plugin {
    onload(): Promise<void> | void {
        console.log("Hello World! This is my first plugin!");
        this.addRibbonIcon("dice", "Sample Plugin", () => {
            console.log("This is my first plugin!");
        });
    }

    onunload() {
        console.log('Descargando mi plugin');
        // Limpiar recursos si es necesario
    }

    
}
