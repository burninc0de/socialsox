// src/modules/icons.js

let platformIcons = null;

export async function getPlatformIcons() {
    if (!platformIcons) {
        try {
            platformIcons = await window.electron.getPlatformIcons();
        } catch (error) {
            console.error('Failed to load platform icons:', error);
            // Fallback to empty object to prevent repeated attempts
            platformIcons = {}; 
        }
    }
    return platformIcons;
}
