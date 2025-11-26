// Mock Electron API for browser development
if (!window.electron) {
  window.electron = {
    minimizeWindow: () => console.log('[Mock] Minimize window'),
    maximizeWindow: () => console.log('[Mock] Maximize window'),
    closeWindow: () => console.log('[Mock] Close window'),
    
    postToTwitter: async (message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData) => {
      console.log('[Mock] Twitter post would be sent:', { message, hasImage: !!imageData });
      return {
        success: false,
        error: 'Twitter posting requires Electron app (run: npm start)'
      };
    },
    
    readClipboardImage: async () => {
      console.log('[Mock] Read clipboard image');
      return null;
    },
    
    exportCredentials: async (credentials) => {
      console.log('[Mock] Export credentials');
      // Fallback to browser download
      const dataStr = JSON.stringify(credentials, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'socialsox-credentials.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true };
    },
    
    importCredentials: async () => {
      console.log('[Mock] Import credentials');
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            try {
              const text = await file.text();
              const credentials = JSON.parse(text);
              resolve({ success: true, credentials });
            } catch (error) {
              resolve({ success: false, error: error.message });
            }
          } else {
            resolve({ canceled: true });
          }
        };
        input.click();
      });
    }
  };
}
