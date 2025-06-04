document.addEventListener('DOMContentLoaded', () => {
    const modelSelector = document.getElementById('modelSelector');

    // Load previously selected model or default to 'rf'
    chrome.storage.local.get(['selectedModel'], (result) => {
        modelSelector.value = result.selectedModel || 'rf';
    });

    // Save model selection on change
    modelSelector.addEventListener('change', () => {
        const selectedModel = modelSelector.value;
        chrome.storage.local.set({ selectedModel });
        console.log(`Model set to: ${selectedModel}`);
    });
});
  