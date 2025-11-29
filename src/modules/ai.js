// AI optimization functions

export async function optimizeTweet(apiKey, message) {
    if (!apiKey || !apiKey.trim()) {
        throw new Error('API key is required');
    }

    if (!message || !message.trim()) {
        throw new Error('Message is required');
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            messages: [
                {
                     role: 'user',
                    content: `optimize this tweet for maximum engagement. Add relevant hashtags. return only the optimized message: "${message}"`
                }
            ],
            model: 'grok-4',
            stream: false,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const optimizedMessage = data.choices?.[0]?.message?.content?.trim();

    if (!optimizedMessage) {
        throw new Error('No optimized message received from API');
    }

    return optimizedMessage;
}

export async function testGrokApi(apiKey) {
    if (!apiKey || !apiKey.trim()) {
        throw new Error('API key is required');
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            messages: [
                {
                    role: 'user',
                    content: 'Hello, just testing the API. Please respond with "API test successful".'
                }
            ],
            model: 'grok-4',
            stream: false,
            temperature: 0.1,
            max_tokens: 50
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
        throw new Error('No response received from API');
    }

    return { success: true, message: responseText };
}