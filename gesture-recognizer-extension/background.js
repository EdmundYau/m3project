chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSelectedModel') {
        // Get data from storage
        chrome.storage.local.get(['selectedModel'], (result) => {
            // Make sure to send a response even if result is empty
            const model = result.selectedModel || 'knn';
            console.log("Background: sending model:", model);
            sendResponse({ selectedModel: model });
        });

        // This is critical - it tells Chrome to keep the message channel open
        // for an asynchronous response
        return true;
    }

    if (message.action === 'predictGesture') {
        console.log("Background received points:", message.points);
        fetch('http://localhost:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: message.points })
        })
            .then(response => response.json())
            .then(data => {
                console.log("Prediction result:", data);
                sendResponse({ prediction: data.prediction });
            })
            .catch(error => {
                console.error("API error:", error);
                sendResponse({ error: error.message });
            });

        // Let Chrome know we will respond asynchronously
        return true;
    }
});